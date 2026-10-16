/**
 * User Settings & Preferences Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await window.Auth.requireAuth();
  if (!isAuth) return;

  window.Utils.renderIcons();

  // Profile in topbar
  const profile = window.Auth.getUserProfile();
  if (profile) {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initials');
    if (nameEl) nameEl.textContent = profile.displayName || profile.email;
    if (avatarEl) avatarEl.textContent = (profile.displayName || profile.email || 'U')[0].toUpperCase();
  }

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('drawer-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('active');
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('drawer-open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logout-nav-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const confirmed = await window.Utils.confirm({
        title: 'Sign Out',
        message: 'Are you sure you want to sign out?',
      });
      if (confirmed) await window.Auth.logout();
    });
  }

  // Form Elements
  const form = document.getElementById('settings-form');
  const currencySelect = document.getElementById('settings-currency');
  const dateFormatSelect = document.getElementById('settings-date-format');
  const displayNameInput = document.getElementById('settings-display-name');
  const emailInput = document.getElementById('settings-email');

  if (emailInput && profile) {
    emailInput.value = profile.email || 'user@example.com';
  }

  // Fetch current settings from backend
  try {
    const res = await window.Api.get('/settings');
    if (res && res.success) {
      const s = res.data;
      if (currencySelect) currencySelect.value = s.currency || 'INR';
      if (dateFormatSelect) dateFormatSelect.value = s.dateFormat || 'DD-MM-YYYY';
      if (displayNameInput) displayNameInput.value = s.displayName || profile.displayName || '';

      window.Utils.setPreferences({
        currency: s.currency,
        currencySymbol: s.currencySymbol,
        dateFormat: s.dateFormat,
      });
    }
  } catch (err) {
    console.warn('Could not fetch settings from backend:', err);
  }

  // Save Settings
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('settings-save-btn');

      const currency = currencySelect.value;
      const dateFormat = dateFormatSelect.value;
      const displayName = displayNameInput.value.trim();

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await window.Api.patch('/settings', {
          currency,
          dateFormat,
          displayName,
        });

        if (res && res.success) {
          window.Utils.setPreferences({
            currency: res.data.currency,
            currencySymbol: res.data.currencySymbol,
            dateFormat: res.data.dateFormat,
          });

          if (displayName) {
            localStorage.setItem('user_display_name', displayName);
            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.textContent = displayName;
          }

          window.Utils.showToast('Preferences updated successfully!', 'success');
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to save settings', 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Preferences';
      }
    });
  }
});
