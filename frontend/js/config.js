/**
 * Application Configuration
 * Updated with Firebase credentials and Realtime Database URL
 */

const CONFIG = {
  // Automatically associates with the backend on whatever host/port it runs
  API_BASE_URL: window.API_BASE_URL || (window.location.origin && window.location.origin.startsWith('http') ? window.location.origin + '/api/v1' : 'http://localhost:5000/api/v1'),

  // Real Firebase Web Client Configuration
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDwrlnu_o21Nj5gwezUKZLL9QCHlMVw5Yk",
    authDomain: "expense-tracker-c431a.firebaseapp.com",
    databaseURL: "https://expense-tracker-c431a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "expense-tracker-c431a",
    storageBucket: "expense-tracker-c431a.firebasestorage.app",
    messagingSenderId: "52689355419",
    appId: "1:52689355419:web:107f51863b018a021bfc3e"
  },

  // Fallback demo mode enabled as safeguard for offline or test environments
  ENABLE_DEMO_AUTH_FALLBACK: true,
};

window.CONFIG = CONFIG;
