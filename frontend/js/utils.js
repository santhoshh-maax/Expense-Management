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

  /**
   * Initializes mobile drawer, backdrop, close button, and mobile bottom navigation
   */
  initMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return; // Not an app layout page (e.g. login/register)

    // 1. Ensure backdrop exists
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      sidebar.parentElement.insertBefore(backdrop, sidebar);
    }

    // 2. Ensure close button exists in sidebar header
    const sidebarHeader = sidebar.querySelector('.sidebar-header');
    if (sidebarHeader && !sidebarHeader.querySelector('.sidebar-close-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'sidebar-close-btn';
      closeBtn.setAttribute('aria-label', 'Close sidebar navigation');
      closeBtn.innerHTML = '<i data-lucide="x"></i>';
      sidebarHeader.appendChild(closeBtn);

      closeBtn.addEventListener('click', () => {
        sidebar.classList.remove('drawer-open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      });
    }

    const openDrawer = () => {
      sidebar.classList.add('drawer-open');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      sidebar.classList.remove('drawer-open');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    };

    // Close when clicking backdrop
    backdrop.addEventListener('click', closeDrawer);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('drawer-open')) {
        closeDrawer();
      }
    });

    // Close drawer when clicking a nav item on mobile
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          closeDrawer();
        }
      });
    });

    // 3. Inject Mobile Bottom Navigation Bar (if not present)
    if (!document.getElementById('mobile-bottom-nav')) {
      const bottomNav = document.createElement('nav');
      bottomNav.id = 'mobile-bottom-nav';
      bottomNav.className = 'mobile-bottom-nav';
      bottomNav.setAttribute('aria-label', 'Mobile Navigation');

      const currentPath = window.location.pathname.toLowerCase();
      const isDashboard = currentPath.endsWith('dashboard.html') || currentPath === '/' || currentPath.endsWith('/');
      const isTransactions = currentPath.endsWith('transactions.html');
      const isBudgets = currentPath.endsWith('budgets.html');
      const isReports = currentPath.endsWith('reports.html');

      bottomNav.innerHTML = `
        <a href="dashboard.html" class="mobile-nav-item ${isDashboard ? 'active' : ''}">
          <i data-lucide="layout-dashboard"></i>
          <span>Overview</span>
        </a>
        <a href="transactions.html" class="mobile-nav-item ${isTransactions ? 'active' : ''}">
          <i data-lucide="arrow-left-right"></i>
          <span>Records</span>
        </a>
        <a href="budgets.html" class="mobile-nav-item ${isBudgets ? 'active' : ''}">
          <i data-lucide="target"></i>
          <span>Budgets</span>
        </a>
        <a href="reports.html" class="mobile-nav-item ${isReports ? 'active' : ''}">
          <i data-lucide="bar-chart-3"></i>
          <span>Reports</span>
        </a>
        <button type="button" class="mobile-nav-item mobile-menu-trigger" aria-label="Open navigation menu">
          <i data-lucide="menu"></i>
          <span>Menu</span>
        </button>
      `;

      document.body.appendChild(bottomNav);

      const menuTrigger = bottomNav.querySelector('.mobile-menu-trigger');
      if (menuTrigger) {
        menuTrigger.addEventListener('click', (e) => {
          e.preventDefault();
          openDrawer();
        });
      }
    }

    this.renderIcons();
  },
};

window.Utils = Utils;

// Initialize mobile responsiveness automatically once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.Utils.initMobileNav();
});

