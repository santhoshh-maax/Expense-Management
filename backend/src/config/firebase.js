const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let auth = null;
let isMock = false;

// In-Memory Repository for Mock / Development Mode
class MockQuerySnapshot {
  constructor(docs = []) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }
  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class MockDocumentSnapshot {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data ? JSON.parse(JSON.stringify(data)) : null;
    this.exists = exists;
  }
  data() {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
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
    const fullPath = `${this.path}/${docId}`;
    return new MockDocumentReference(fullPath, docId, this.memoryStore);
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
        docs.push(new MockDocumentSnapshot(id, val, true));
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

    return new MockQuerySnapshot(docs);
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
    return new MockDocumentSnapshot(this.id, data, !!data);
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
      err.code = 5; // NOT_FOUND
      throw err;
    }
    this.memoryStore[this.path] = { ...this.memoryStore[this.path], ...data };
    return { writeTime: new Date() };
  }

  async delete() {
    delete this.memoryStore[this.path];
    // Also remove subcollections
    for (const key of Object.keys(this.memoryStore)) {
      if (key.startsWith(this.path + '/')) {
        delete this.memoryStore[key];
      }
    }
    return { writeTime: new Date() };
  }
}

class MockFirestore {
  constructor() {
    this.memoryStore = {};
  }

  collection(collectionName) {
    return new MockCollectionReference(collectionName, this.memoryStore);
  }

  doc(docPath) {
    const parts = docPath.split('/');
    const id = parts[parts.length - 1];
    return new MockDocumentReference(docPath, id, this.memoryStore);
  }

  // Clear for tests
  _reset() {
    this.memoryStore = {};
  }
}

class MockAuth {
  async verifyIdToken(token) {
    if (!token) throw new Error('Token is required');
    if (token === 'invalid-token') {
      const err = new Error('Decoding Firebase ID token failed');
      err.code = 'auth/argument-error';
      throw err;
    }
    // Support mock dev token or simulated user token
    if (token.startsWith('mock-token-') || token === 'test-token' || token.length > 10) {
      const uid = token.startsWith('mock-token-') ? token.replace('mock-token-', '') : (token === 'test-token' ? 'test-user-123' : 'user_' + token.substring(0, 10));
      return {
        uid,
        email: `${uid}@example.com`,
        name: 'Demo User',
      };
    }
    throw new Error('Invalid token');
  }
}

// Initialization Logic
const initFirebase = () => {
  if (db && auth) {
    return { admin, db, auth, isMock };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const forceMock = process.env.MOCK_FIREBASE === 'true';

  if (forceMock) {
    console.log('[Firebase] Running in MOCK mode (in-memory Firestore & Auth active for local development / testing).');
    isMock = true;
    db = new MockFirestore();
    auth = new MockAuth();
    return { admin, db, auth, isMock };
  }

  try {
    let credential = null;

    if (serviceAccountKey) {
      let parsed = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
      credential = admin.credential.cert(parsed);
    } else if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      credential = admin.credential.cert(path.resolve(serviceAccountPath));
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: projectId || undefined,
        databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
      });
      db = admin.firestore();
      auth = admin.auth();
      isMock = false;
      console.log('[Firebase] Successfully initialized with live Firebase Admin SDK credentials.');
    } else {
      console.warn('[Firebase] Warning: No service account credentials found. Falling back to MOCK mode.');
      isMock = true;
      db = new MockFirestore();
      auth = new MockAuth();
    }
  } catch (err) {
    console.warn(`[Firebase] Initialization warning: ${err.message}. Falling back to MOCK mode.`);
    isMock = true;
    db = new MockFirestore();
    auth = new MockAuth();
  }

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
