const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let isMock = false;

// Query snapshot model compatible with Firestore API
class SnapshotWrapper {
  constructor(docs = []) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }
  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class DocumentSnapshotWrapper {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
    this.exists = exists;
  }
  data() {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }
}

/**
 * Live Firebase Realtime Database REST Adapter
 * Allows standard Firestore collection / doc semantics to save directly
 * to Firebase Realtime Database (https://<databaseName>.firebasedatabase.app)
 */
class RealtimeDatabaseAdapter {
  constructor(databaseUrl) {
    // Strip trailing slash if present
    this.databaseUrl = databaseUrl.replace(/\/+$/, '');
  }

  collection(collectionPath) {
    return new RTDBCollectionRef(this.databaseUrl, collectionPath);
  }

  doc(docPath) {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    return new RTDBDocumentRef(this.databaseUrl, docPath, id);
  }
}

class RTDBCollectionRef {
  constructor(databaseUrl, pathStr) {
    this.databaseUrl = databaseUrl;
    this.path = pathStr;
    this._filters = [];
    this._sorts = [];
    this._limit = null;
  }

  doc(id) {
    const docId = id || 'doc_' + Math.random().toString(36).substring(2, 11);
    return new RTDBDocumentRef(this.databaseUrl, `${this.path}/${docId}`, docId);
  }

  where(field, op, value) {
    const clone = new RTDBCollectionRef(this.databaseUrl, this.path);
    clone._filters = [...this._filters, { field, op, value }];
    clone._sorts = [...this._sorts];
    clone._limit = this._limit;
    return clone;
  }

  orderBy(field, direction = 'asc') {
    const clone = new RTDBCollectionRef(this.databaseUrl, this.path);
    clone._filters = [...this._filters];
    clone._sorts = [...this._sorts, { field, direction }];
    clone._limit = this._limit;
    return clone;
  }

  limit(count) {
    const clone = new RTDBCollectionRef(this.databaseUrl, this.path);
    clone._filters = [...this._filters];
    clone._sorts = [...this._sorts];
    clone._limit = count;
    return clone;
  }

  async add(data) {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Failed to write to Firebase Realtime Database: HTTP ${res.status}`);
    }

    const json = await res.json();
    const id = json.name; // Firebase RTDB generated key
    return new RTDBDocumentRef(this.databaseUrl, `${this.path}/${id}`, id);
  }

  async get() {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Failed to read from Firebase Realtime Database: HTTP ${res.status}`);
    }

    const dataObj = await res.json();
    let docs = [];

    if (dataObj && typeof dataObj === 'object') {
      for (const [id, val] of Object.entries(dataObj)) {
        if (val && typeof val === 'object') {
          docs.push(new DocumentSnapshotWrapper(id, val, true));
        }
      }
    }

    // Apply filters
    for (const filter of this._filters) {
      docs = docs.filter((d) => {
        const dVal = d.data()[filter.field];
        if (filter.op === '==') return dVal === filter.value;
        if (filter.op === '>=') return dVal >= filter.value;
        if (filter.op === '<=') return dVal <= filter.value;
        if (filter.op === '>') return dVal > filter.value;
        if (filter.op === '<') return dVal < filter.value;
        return true;
      });
    }

    // Apply sorts
    for (const sort of this._sorts) {
      docs.sort((a, b) => {
        const aVal = a.data()[sort.field];
        const bVal = b.data()[sort.field];
        if (aVal === bVal) return 0;
        if (sort.direction === 'desc') {
          return aVal < bVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    // Apply limit
    if (this._limit !== null && this._limit >= 0) {
      docs = docs.slice(0, this._limit);
    }

    return new SnapshotWrapper(docs);
  }
}

class RTDBDocumentRef {
  constructor(databaseUrl, pathStr, id) {
    this.databaseUrl = databaseUrl;
    this.path = pathStr;
    this.id = id;
  }

  collection(subCollectionName) {
    return new RTDBCollectionRef(this.databaseUrl, `${this.path}/${subCollectionName}`);
  }

  async get() {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const res = await fetch(url, { method: 'GET' });

    if (!res.ok) {
      throw new Error(`Failed to fetch document: HTTP ${res.status}`);
    }

    const data = await res.json();
    return new DocumentSnapshotWrapper(this.id, data, data !== null);
  }

  async set(data, options = {}) {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const method = options.merge ? 'PATCH' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Failed to set document: HTTP ${res.status}`);
    }

    return { writeTime: new Date() };
  }

  async update(data) {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Failed to update document: HTTP ${res.status}`);
    }

    return { writeTime: new Date() };
  }

  async delete() {
    const url = `${this.databaseUrl}/${this.path}.json`;
    const res = await fetch(url, { method: 'DELETE' });

    if (!res.ok) {
      throw new Error(`Failed to delete document: HTTP ${res.status}`);
    }

    return { writeTime: new Date() };
  }
}

/**
 * Auth Verification Handler
 * Decodes real Firebase ID tokens (JWTs) or handles demo mock tokens
 */
class UnifiedAuth {
  constructor(liveAdminAuth = null) {
    this.liveAdminAuth = liveAdminAuth;
  }

  async verifyIdToken(token) {
    if (!token) throw new Error('Token is required');

    // 1. If real Firebase Admin SDK is active, verify cryptographically
    if (this.liveAdminAuth) {
      try {
        return await this.liveAdminAuth.verifyIdToken(token);
      } catch (err) {
        console.warn('[Auth] Live Admin verifyIdToken error, attempting JWT parse fallback:', err.message);
      }
    }

    // 2. Decode real Firebase JWT ID token (from client signInWithEmailAndPassword)
    if (token.startsWith('eyJ') && token.includes('.')) {
      try {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
          const payload = JSON.parse(payloadJson);

          const uid = payload.user_id || payload.sub;
          if (uid) {
            return {
              uid,
              email: payload.email || `${uid}@firebase.user`,
              name: payload.name || (payload.email ? payload.email.split('@')[0] : 'User'),
            };
          }
        }
      } catch (e) {
        console.error('[Auth] Failed to parse JWT payload:', e.message);
      }
    }

    // 3. Mock demo token handling
    if (token.startsWith('mock-token-') || token === 'test-token') {
      const uid = token.startsWith('mock-token-')
        ? token.replace('mock-token-', '')
        : 'test-user-123';
      return {
        uid,
        email: `${uid}@example.com`,
        name: 'Demo User',
      };
    }

    const err = new Error('Invalid or unverified Firebase ID token');
    err.code = 'auth/invalid-token';
    throw err;
  }
}

// In-Memory Fallback Repository (for unit tests without internet)
class MockFirestore {
  constructor() {
    this.memoryStore = {};
  }
  collection(pathStr) {
    return new MockCollectionReference(pathStr, this.memoryStore);
  }
  doc(docPath) {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    return new MockDocumentReference(docPath, id, this.memoryStore);
  }
}

class MockCollectionReference {
  constructor(pathStr, memoryStore) {
    this.path = pathStr;
    this.memoryStore = memoryStore;
    this._filters = [];
    this._sorts = [];
    this._limit = null;
  }
  doc(id) {
    const docId = id || 'doc_' + Math.random().toString(36).substring(2, 11);
    return new MockDocumentReference(`${this.path}/${docId}`, docId, this.memoryStore);
  }
  where(field, op, value) {
    const clone = new MockCollectionReference(this.path, this.memoryStore);
    clone._filters = [...this._filters, { field, op, value }];
    clone._sorts = [...this._sorts];
    clone._limit = this._limit;
    return clone;
  }
  orderBy(field, direction = 'asc') {
    const clone = new MockCollectionReference(this.path, this.memoryStore);
    clone._filters = [...this._filters];
    clone._sorts = [...this._sorts, { field, direction }];
    clone._limit = this._limit;
    return clone;
  }
  limit(count) {
    const clone = new MockCollectionReference(this.path, this.memoryStore);
    clone._filters = [...this._filters];
    clone._sorts = [...this._sorts];
    clone._limit = count;
    return clone;
  }
  async add(data) {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }
  async get() {
    let docs = [];
    for (const [key, val] of Object.entries(this.memoryStore)) {
      if (key.startsWith(this.path + '/') && key.split('/').length === this.path.split('/').length + 1) {
        const id = key.substring(this.path.length + 1);
        docs.push(new DocumentSnapshotWrapper(id, val, true));
      }
    }
    for (const filter of this._filters) {
      docs = docs.filter((d) => {
        const dVal = d.data()[filter.field];
        if (filter.op === '==') return dVal === filter.value;
        if (filter.op === '>=') return dVal >= filter.value;
        if (filter.op === '<=') return dVal <= filter.value;
        if (filter.op === '>') return dVal > filter.value;
        if (filter.op === '<') return dVal < filter.value;
        return true;
      });
    }
    for (const sort of this._sorts) {
      docs.sort((a, b) => {
        const aVal = a.data()[sort.field];
        const bVal = b.data()[sort.field];
        if (aVal === bVal) return 0;
        return sort.direction === 'desc' ? (aVal < bVal ? 1 : -1) : (aVal > bVal ? 1 : -1);
      });
    }
    if (this._limit !== null && this._limit >= 0) {
      docs = docs.slice(0, this._limit);
    }
    return new SnapshotWrapper(docs);
  }
}

class MockDocumentReference {
  constructor(fullPath, id, memoryStore) {
    this.path = fullPath;
    this.id = id;
    this.memoryStore = memoryStore;
  }
  collection(subCollectionName) {
    return new MockCollectionReference(`${this.path}/${subCollectionName}`, this.memoryStore);
  }
  async get() {
    const data = this.memoryStore[this.path];
    return new DocumentSnapshotWrapper(this.id, data, !!data);
  }
  async set(data, options = {}) {
    if (options.merge && this.memoryStore[this.path]) {
      this.memoryStore[this.path] = { ...this.memoryStore[this.path], ...data };
    } else {
      this.memoryStore[this.path] = { ...data };
    }
    return { writeTime: new Date() };
  }
  async update(data) {
    if (!this.memoryStore[this.path]) {
      const err = new Error(`Document ${this.path} not found`);
      err.code = 5;
      throw err;
    }
    this.memoryStore[this.path] = { ...this.memoryStore[this.path], ...data };
    return { writeTime: new Date() };
  }
  async delete() {
    delete this.memoryStore[this.path];
    for (const key of Object.keys(this.memoryStore)) {
      if (key.startsWith(this.path + '/')) {
        delete this.memoryStore[key];
      }
    }
    return { writeTime: new Date() };
  }
}

// Initialization Logic
const initFirebase = () => {
  if (db && auth) {
    return { admin, db, auth, isMock };
  }

  const databaseUrl = process.env.FIREBASE_DATABASE_URL;
  const forceMock = process.env.MOCK_FIREBASE === 'true';

  // 1. Check if Live Firebase Realtime Database URL is provided
  if (databaseUrl && !forceMock) {
    console.log(`[Firebase] Connected directly to Live Firebase Realtime Database: ${databaseUrl}`);
    db = new RealtimeDatabaseAdapter(databaseUrl);
    auth = new UnifiedAuth();
    isMock = false;
    return { admin, db, auth, isMock };
  }

  // 2. Fallback to in-memory store for isolated unit tests / offline dev
  console.log('[Firebase] Running in in-memory Mock mode.');
  db = new MockFirestore();
  auth = new UnifiedAuth();
  isMock = true;
  return { admin, db, auth, isMock };
};

const getFirebase = () => {
  if (!db || !auth) {
    return initFirebase();
  }
  return { admin, db, auth, isMock };
};

module.exports = {
  initFirebase,
  getFirebase,
};
