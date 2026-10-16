/**
 * Categories Management Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await window.Auth.requireAuth();
  if (!isAuth) return;

  window.Utils.renderIcons();

  // Profile
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

  // Category Modal Setup
  setupCategoryModal();

  // Load categories
  await loadCategories();
});

async function loadCategories() {
  const expenseGrid = document.getElementById('expense-categories-grid');
  const incomeGrid = document.getElementById('income-categories-grid');

  if (expenseGrid) expenseGrid.innerHTML = '<div>Loading...</div>';
  if (incomeGrid) incomeGrid.innerHTML = '<div>Loading...</div>';

  try {
    const res = await window.Api.get('/categories');
    if (!res || !res.success) throw new Error('Failed to load categories');

    const categories = res.data;
    if (expenseGrid) expenseGrid.innerHTML = '';
    if (incomeGrid) incomeGrid.innerHTML = '';

    categories.forEach((cat) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.style.padding = '16px';

      const isDefault = cat.isDefault;
      const isIncome = cat.type === 'income';

      card.innerHTML = `
        <div style="display:flex; align-items:center; gap: 12px;">
          <div class="metric-icon-box ${isIncome ? 'green' : 'blue'}" style="width: 36px; height: 36px;">
            <i data-lucide="${cat.icon || 'tag'}"></i>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 14px;">${window.Utils.escapeHTML(cat.name)}</div>
            <span class="text-muted" style="font-size: 11px;">${isDefault ? 'Default' : 'Custom'}</span>
          </div>
        </div>
        ${
          !isDefault
            ? `<button class="btn btn-danger btn-sm delete-cat-btn" data-id="${cat.id}" data-name="${window.Utils.escapeHTML(cat.name)}">
                <i data-lucide="trash-2"></i>
               </button>`
            : `<span class="badge" style="font-size:11px; background:#f1f5f9; color:#64748b;">System</span>`
        }
      `;

      if (isIncome && incomeGrid) {
        incomeGrid.appendChild(card);
      } else if (!isIncome && expenseGrid) {
        expenseGrid.appendChild(card);
      }
    });

    window.Utils.renderIcons();

    // Attach delete listeners
    document.querySelectorAll('.delete-cat-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleDeleteCategory(btn.dataset.id, btn.dataset.name));
    });
  } catch (err) {
    window.Utils.showToast(err.message || 'Error fetching categories', 'error');
  }
}

function setupCategoryModal() {
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const openBtn = document.getElementById('add-category-btn');
  const closeBtn = document.getElementById('cat-modal-close-btn');
  const cancelBtn = document.getElementById('cat-modal-cancel-btn');

  if (!modal || !form) return;

  const openModal = () => {
    form.reset();
    modal.classList.add('active');
  };

  const closeModal = () => modal.classList.remove('active');

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('cat-submit-btn');
    const name = document.getElementById('cat-name').value.trim();
    const type = document.getElementById('cat-type').value;
    const icon = document.getElementById('cat-icon').value || 'tag';

    if (!name) {
      window.Utils.showToast('Please enter a category name.', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating...';

      const res = await window.Api.post('/categories', { name, type, icon });
      if (res && res.success) {
        window.Utils.showToast('Category created successfully!', 'success');
        closeModal();
        await loadCategories();
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to create category', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Category';
    }
  });
}

async function handleDeleteCategory(id, name) {
  const confirmed = await window.Utils.confirm({
    title: 'Delete Category',
    message: `Are you sure you want to delete category "${name}"?`,
    confirmText: 'Delete',
    isDestructive: true,
  });

  if (confirmed) {
    try {
      const res = await window.Api.delete(`/categories/${id}`);
      if (res && res.success) {
        window.Utils.showToast('Category deleted successfully.', 'success');
        await loadCategories();
      }
    } catch (err) {
      if (err.status === 409) {
        const forceConfirm = await window.Utils.confirm({
          title: 'Category in Use',
          message: `${err.message} Do you want to force delete it?`,
          confirmText: 'Force Delete',
          isDestructive: true,
        });
        if (forceConfirm) {
          await window.Api.delete(`/categories/${id}?force=true`);
          window.Utils.showToast('Category force deleted.', 'success');
          await loadCategories();
        }
      } else {
        window.Utils.showToast(err.message || 'Error deleting category', 'error');
      }
    }
  }
}
