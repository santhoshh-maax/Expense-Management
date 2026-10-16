/**
 * Budget Management Controller
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

  // Period Selector Setup
  const monthSelector = document.getElementById('budget-month-select');
  const yearSelector = document.getElementById('budget-year-select');

  const now = new Date();
  if (monthSelector) monthSelector.value = String(now.getMonth() + 1);
  if (yearSelector) yearSelector.value = String(now.getFullYear());

  const handlePeriodChange = () => {
    const m = monthSelector ? monthSelector.value : now.getMonth() + 1;
    const y = yearSelector ? yearSelector.value : now.getFullYear();
    loadBudgets(m, y);
  };

  if (monthSelector) monthSelector.addEventListener('change', handlePeriodChange);
  if (yearSelector) yearSelector.addEventListener('change', handlePeriodChange);

  // Modal Setup
  setupBudgetModal();

  // Load Initial Budgets
  await loadBudgets(now.getMonth() + 1, now.getFullYear());
});

async function loadBudgets(month, year) {
  const container = document.getElementById('budgets-grid');
  const emptyState = document.getElementById('budgets-empty-state');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 32px;">Loading budgets...</div>';

  try {
    const res = await window.Api.get('/budgets', { month, year });
    container.innerHTML = '';

    if (!res || !res.success || !res.data.budgets || res.data.budgets.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    res.data.budgets.forEach((b) => {
      const isExceeded = b.status === 'exceeded';
      const isWarning = b.status === 'warning';

      let statusBadge = `<span class="badge" style="background:#ecfdf5; color:#10b981;">On Track</span>`;
      let barClass = 'normal';

      if (isExceeded) {
        statusBadge = `<span class="badge badge-expense">Exceeded (${b.percentage}%)</span>`;
        barClass = 'exceeded';
      } else if (isWarning) {
        statusBadge = `<span class="badge" style="background:#fffbeb; color:#f59e0b;">Warning (${b.percentage}%)</span>`;
        barClass = 'warning';
      }

      const card = document.createElement('div');
      card.className = 'chart-card col-6';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-main);">${window.Utils.escapeHTML(b.categoryName)}</h3>
            <span class="text-muted" style="font-size: 13px;">${b.categoryId === 'all' ? 'Overall Monthly Spending Limit' : 'Category Spending Limit'}</span>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div style="margin: 16px 0;">
          <div style="display:flex; justify-content:space-between; font-size: 13px; margin-bottom: 6px;">
            <span>Spent: <strong>${window.Utils.formatCurrency(b.spent)}</strong></span>
            <span>Limit: <strong>${window.Utils.formatCurrency(b.amount)}</strong></span>
          </div>
          <div class="progress-container">
            <div class="progress-bar ${barClass}" style="width: ${Math.min(b.percentage, 100)}%;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            <span>${b.remaining >= 0 ? `Remaining: ${window.Utils.formatCurrency(b.remaining)}` : `Over budget by: ${window.Utils.formatCurrency(Math.abs(b.remaining))}`}</span>
            <span>${b.percentage}% used</span>
          </div>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
          <button class="btn btn-secondary btn-sm edit-budget-btn" data-id="${b.id}" data-category-id="${b.categoryId}" data-amount="${b.amount}" data-name="${window.Utils.escapeHTML(b.categoryName)}">
            <i data-lucide="edit-2"></i> Edit
          </button>
          <button class="btn btn-danger btn-sm delete-budget-btn" data-id="${b.id}">
            <i data-lucide="trash-2"></i> Delete
          </button>
        </div>
      `;
      container.appendChild(card);
    });

    window.Utils.renderIcons();

    // Attach button listeners
    document.querySelectorAll('.edit-budget-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        openBudgetModal({
          categoryId: btn.dataset.categoryId,
          categoryName: btn.dataset.name,
          amount: btn.dataset.amount,
        });
      });
    });

    document.querySelectorAll('.delete-budget-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleDeleteBudget(btn.dataset.id));
    });
  } catch (err) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--expense-red); padding: 32px;">Failed to load budgets: ${err.message}</div>`;
  }
}

function setupBudgetModal() {
  const modal = document.getElementById('budget-modal');
  const form = document.getElementById('budget-form');
  const openBtn = document.getElementById('add-budget-btn');
  const closeBtn = document.getElementById('budget-modal-close-btn');
  const cancelBtn = document.getElementById('budget-modal-cancel-btn');

  if (!modal || !form) return;

  const openModal = async () => {
    form.reset();
    await populateBudgetCategories();
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
    const submitBtn = document.getElementById('budget-submit-btn');
    const categorySelect = document.getElementById('budget-category');
    const amountInput = document.getElementById('budget-amount');
    const monthSelect = document.getElementById('budget-month-select');
    const yearSelect = document.getElementById('budget-year-select');

    const categoryId = categorySelect.value;
    const categoryName = categorySelect.options[categorySelect.selectedIndex]?.text || '';
    const amount = parseFloat(amountInput.value);
    const month = parseInt(monthSelect.value, 10);
    const year = parseInt(yearSelect.value, 10);

    if (isNaN(amount) || amount <= 0) {
      window.Utils.showToast('Please enter a valid positive budget amount.', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const payload = {
        categoryId,
        categoryName,
        amount,
        month,
        year,
      };

      const res = await window.Api.post('/budgets', payload);
      if (res && res.success) {
        window.Utils.showToast('Budget saved successfully!', 'success');
        closeModal();
        await loadBudgets(month, year);
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to save budget', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Budget';
    }
  });
}

function openBudgetModal(budget) {
  const modal = document.getElementById('budget-modal');
  if (!modal) return;
  populateBudgetCategories().then(() => {
    const categorySelect = document.getElementById('budget-category');
    const amountInput = document.getElementById('budget-amount');
    if (categorySelect) categorySelect.value = budget.categoryId;
    if (amountInput) amountInput.value = budget.amount;
    modal.classList.add('active');
  });
}

async function populateBudgetCategories() {
  const select = document.getElementById('budget-category');
  if (!select) return;

  select.innerHTML = '<option value="all">Total Monthly Budget (All Expenses)</option>';

  try {
    const res = await window.Api.get('/categories', { type: 'expense' });
    if (res && res.success) {
      res.data.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn('Could not populate budget categories', err);
  }
}

async function handleDeleteBudget(id) {
  const confirmed = await window.Utils.confirm({
    title: 'Delete Budget',
    message: 'Are you sure you want to delete this budget?',
    confirmText: 'Delete',
    isDestructive: true,
  });

  if (confirmed) {
    try {
      const res = await window.Api.delete(`/budgets/${id}`);
      if (res && res.success) {
        window.Utils.showToast('Budget deleted successfully.', 'success');
        const m = document.getElementById('budget-month-select')?.value || new Date().getMonth() + 1;
        const y = document.getElementById('budget-year-select')?.value || new Date().getFullYear();
        await loadBudgets(m, y);
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to delete budget', 'error');
    }
  }
}
