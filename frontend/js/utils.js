/**
 * Frontend Utility Functions
 */

const Utils = {
  // Current user preferences cache
  preferences: {
    currency: localStorage.getItem('user_currency') || 'INR',
    currencySymbol: localStorage.getItem('user_currency_symbol') || '₹',
    dateFormat: localStorage.getItem('user_date_format') || 'DD-MM-YYYY',
  },

  setPreferences(prefs) {
    if (prefs.currency) {
      this.preferences.currency = prefs.currency;
      localStorage.setItem('user_currency', prefs.currency);
    }
    if (prefs.currencySymbol) {
      this.preferences.currencySymbol = prefs.currencySymbol;
      localStorage.setItem('user_currency_symbol', prefs.currencySymbol);
    }
    if (prefs.dateFormat) {
      this.preferences.dateFormat = prefs.dateFormat;
      localStorage.setItem('user_date_format', prefs.dateFormat);
    }
  },

  /**
   * Format monetary amount according to selected currency
   */
  formatCurrency(amount) {
    const num = Number(amount || 0);
    const sym = this.preferences.currencySymbol || '₹';
    return `${sym}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Format ISO date string (YYYY-MM-DD) according to user preferences
   */
  formatDate(isoDateStr) {
    if (!isoDateStr) return '-';
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    const [year, month, day] = parts;

    const fmt = this.preferences.dateFormat || 'DD-MM-YYYY';
    if (fmt === 'DD-MM-YYYY') return `${day}/${month}/${year}`;
    if (fmt === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
    return `${year}-${month}-${day}`;
  },

  /**
   * Escape HTML to safeguard against XSS attacks
   */
  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  /**
   * Trigger Lucide icons re-render
   */
  renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  /**
   * Toast notification system
   */
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <span class="toast-message">${this.escapeHTML(message)}</span>
      <button class="toast-close" type="button">&times;</button>
    `;

    container.appendChild(toast);
    this.renderIcons();

    // Trigger slide-in
    setTimeout(() => toast.classList.add('show'), 10);

    const closeToast = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', closeToast);
    setTimeout(closeToast, duration);
  },

  /**
   * Custom Confirmation Dialog Modal
   * Returns a Promise resolving to true (confirmed) or false (cancelled)
   */
  confirm(options = {}) {
    const {
      title = 'Confirm Action',
      message = 'Are you sure you want to proceed?',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false,
    } = options;

    return new Promise((resolve) => {
      let modal = document.getElementById('app-confirm-modal');
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = 'app-confirm-modal';
      modal.className = 'modal-backdrop active';
      modal.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>${this.escapeHTML(title)}</h3>
          </div>
          <div class="modal-body">
            <p>${this.escapeHTML(message)}</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="confirm-cancel-btn">${this.escapeHTML(cancelText)}</button>
            <button type="button" class="btn ${isDestructive ? 'btn-danger' : 'btn-primary'}" id="confirm-ok-btn">${this.escapeHTML(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cleanup = (result) => {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
        resolve(result);
      };

      document.getElementById('confirm-cancel-btn').addEventListener('click', () => cleanup(false));
      document.getElementById('confirm-ok-btn').addEventListener('click', () => cleanup(true));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) cleanup(false);
      });
    });
  },
};

window.Utils = Utils;
