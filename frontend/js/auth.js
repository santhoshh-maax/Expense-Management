/**
 * Authentication Module using Firebase Authentication SDK
 * with automatic fallback for Quick Demo and unconfigured Firebase projects
 */

const Auth = {
  user: null,
  isInitialized: false,
  isUsingFallback: false,

  async init() {
    if (this.isInitialized) return;

    // Check if Firebase is loaded in the window
    if (window.firebase && window.CONFIG && window.CONFIG.FIREBASE_CONFIG) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(window.CONFIG.FIREBASE_CONFIG);
        }
        this.auth = firebase.auth();

        // Listen for Auth State Changes
        await new Promise((resolve) => {
          const unsubscribe = this.auth.onAuthStateChanged((user) => {
            if (user) {
              this.user = user;
            }
            resolve();
          });
          // Timeout safeguard so page doesn't hang if offline
          setTimeout(() => {
            if (!this.user) {
              const stored = localStorage.getItem('demo_session_user');
              if (stored) {
                try { this.user = JSON.parse(stored); } catch (e) {}
              }
            }
            resolve();
          }, 800);
        });

        this.isInitialized = true;
      } catch (e) {
        console.warn('[Auth] Firebase init note:', e.message);
        this.enableFallbackAuth();
      }
    } else {
      this.enableFallbackAuth();
    }
  },

  enableFallbackAuth() {
    this.isUsingFallback = true;
    const stored = localStorage.getItem('demo_session_user');
    if (stored) {
      try {
        this.user = JSON.parse(stored);
      } catch (err) {
        this.user = null;
      }
    }
    this.isInitialized = true;
  },

  async getIdToken() {
    if (this.user && typeof this.user.getIdToken === 'function') {
      try {
        return await this.user.getIdToken();
      } catch (e) {
        console.warn('[Auth] Live token fetch error, using cached session:', e.message);
      }
    }
    if (this.user && this.user.token) {
      return this.user.token;
    }
    // Check fallback storage
    const stored = localStorage.getItem('demo_session_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.token || 'mock-token-demo-user';
    }
    return null;
  },

  getUserProfile() {
    if (!this.user) return null;
    return {
      uid: this.user.uid,
      email: this.user.email,
      displayName: this.user.displayName || localStorage.getItem('user_display_name') || 'Demo User',
    };
  },

  // Instant one-click Quick Demo login
  async loginDemo() {
    return this.fallbackLogin('demo@expensetracker.com', 'Demo1234!');
  },

  async register(name, email, password) {
    await this.init();

    if (!this.isUsingFallback && this.auth) {
      try {
        const credential = await this.auth.createUserWithEmailAndPassword(email, password);
        await credential.user.updateProfile({ displayName: name });
        this.user = credential.user;
        localStorage.setItem('user_display_name', name);
        localStorage.removeItem('demo_session_user');
        return { success: true, user: this.user };
      } catch (err) {
        // If Firebase Auth is not yet toggled ON in Firebase console or API key invalid:
        if (
          err.code === 'auth/configuration-not-found' ||
          err.code === 'auth/api-key-not-valid' ||
          err.code === 'auth/invalid-api-key' ||
          err.code === 'auth/network-request-failed'
        ) {
          console.warn(`[Auth] Firebase Auth returned "${err.code}". Using local demo session for registration.`);
          return this.fallbackRegister(name, email, password);
        }
        throw err;
      }
    }

    return this.fallbackRegister(name, email, password);
  },

  fallbackRegister(name, email, password) {
    const uid = 'demo_' + Date.now();
    const userObj = {
      uid,
      email,
      displayName: name,
      token: `mock-token-${uid}`,
    };
    this.user = userObj;
    localStorage.setItem('demo_session_user', JSON.stringify(userObj));
    localStorage.setItem('user_display_name', name);
    return { success: true, user: userObj };
  },

  async login(email, password) {
    await this.init();

    if (!this.isUsingFallback && this.auth) {
      try {
        const credential = await this.auth.signInWithEmailAndPassword(email, password);
        this.user = credential.user;
        if (credential.user.displayName) {
          localStorage.setItem('user_display_name', credential.user.displayName);
        }
        localStorage.removeItem('demo_session_user');
        return { success: true, user: this.user };
      } catch (err) {
        // If Firebase Auth is not yet enabled in Firebase console:
        if (
          err.code === 'auth/configuration-not-found' ||
          err.code === 'auth/api-key-not-valid' ||
          err.code === 'auth/invalid-api-key' ||
          err.code === 'auth/network-request-failed'
        ) {
          console.warn(`[Auth] Firebase Auth returned "${err.code}". Using local demo session for login.`);
          return this.fallbackLogin(email, password);
        }
        throw err;
      }
    }

    return this.fallbackLogin(email, password);
  },

  fallbackLogin(email, password) {
    const uid = 'demo_' + email.replace(/[^a-zA-Z0-9]/g, '');
    const userObj = {
      uid,
      email,
      displayName: email.split('@')[0],
      token: `mock-token-${uid}`,
    };
    this.user = userObj;
    localStorage.setItem('demo_session_user', JSON.stringify(userObj));
    localStorage.setItem('user_display_name', userObj.displayName);
    return { success: true, user: userObj };
  },

  async logout() {
    if (this.auth && typeof this.auth.signOut === 'function') {
      try {
        await this.auth.signOut();
      } catch (e) {
        console.error('SignOut error:', e);
      }
    }
    this.user = null;
    localStorage.removeItem('demo_session_user');
    window.location.href = 'login.html';
  },

  async requireAuth() {
    await this.init();
    const token = await this.getIdToken();
    if (!token) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  async redirectIfAuthenticated() {
    await this.init();
    const token = await this.getIdToken();
    if (token) {
      window.location.href = 'dashboard.html';
      return true;
    }
    return false;
  },
};

window.Auth = Auth;
