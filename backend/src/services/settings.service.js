const { getFirebase } = require('../config/firebase');

const DEFAULT_SETTINGS = {
  currency: 'INR',
  currencySymbol: '₹',
  dateFormat: 'DD-MM-YYYY',
  theme: 'light',
  displayName: 'User',
};

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
};

class SettingsService {
  async getSettings(uid) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/settings/preferences`);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { ...DEFAULT_SETTINGS };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...doc.data(),
    };
  }

  async updateSettings(uid, data) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/settings/preferences`);

    const payload = {};
    if (data.currency) {
      payload.currency = data.currency;
      payload.currencySymbol = CURRENCY_SYMBOLS[data.currency] || data.currency;
    }
    if (data.dateFormat) payload.dateFormat = data.dateFormat;
    if (data.theme) payload.theme = data.theme;
    if (data.displayName) payload.displayName = data.displayName.trim();
    payload.updatedAt = new Date().toISOString();

    await docRef.set(payload, { merge: true });
    return this.getSettings(uid);
  }
}

module.exports = new SettingsService();
