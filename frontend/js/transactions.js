/**
 * Transactions Page Controller - Full CRUD, Search, Filters, Sorting, Pagination
 */

document.addEventListener('DOMContentLoaded', async () => {
  const isAuth = await window.Auth.requireAuth();
  if (!isAuth) return;

  window.Utils.renderIcons();

  // Populate profile info
  const profile = window.Auth.getUserProfile();
  if (profile) {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initials');
    if (nameEl) nameEl.textContent = profile.displayName || profile.email;
    if (avatarEl) avatarEl.textContent = (profile.displayName || profile.email || 'U')[0].toUpperCase();
  }

  // Mobile menu toggle
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

  // Logout handler
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

  // State
  let currentPage = 1;
  const limit = 10;
  let editingId = null;

  // Populate Filter Categories
  await loadFilterCategories();

  // Filter elements
  const searchInput = document.getElementById('filter-search');
  const typeSelect = document.getElementById('filter-type');
  const categorySelect = document.getElementById('filter-category');
  const startDateInput = document.getElementById('filter-start-date');
  const endDateInput = document.getElementById('filter-end-date');
  const sortSelect = document.getElementById('filter-sort');
  const clearBtn = document.getElementById('filter-clear-btn');

  // Debounced search
  let debounceTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        currentPage = 1;
        fetchAndRenderTransactions();
      }, 300);
    });
  }

  if (typeSelect) typeSelect.addEventListener('change', () => { currentPage = 1; fetchAndRenderTransactions(); });
  if (categorySelect) categorySelect.addEventListener('change', () => { currentPage = 1; fetchAndRenderTransactions(); });
  if (startDateInput) startDateInput.addEventListener('change', () => { currentPage = 1; fetchAndRenderTransactions(); });
  if (endDateInput) endDateInput.addEventListener('change', () => { currentPage = 1; fetchAndRenderTransactions(); });
  if (sortSelect) sortSelect.addEventListener('change', () => { currentPage = 1; fetchAndRenderTransactions(); });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (typeSelect) typeSelect.value = 'all';
      if (categorySelect) categorySelect.value = 'all';
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      if (sortSelect) sortSelect.value = 'date_desc';
      currentPage = 1;
      fetchAndRenderTransactions();
    });
  }

  // Pagination buttons
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        fetchAndRenderTransactions();
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      fetchAndRenderTransactions();
    });
  }

  // Modal Setup
  setupTransactionModal();

  // Fetch initial list
  await fetchAndRenderTransactions();

  async function fetchAndRenderTransactions() {
    const tbody = document.getElementById('transactions-tbody');
    const emptyState = document.getElementById('transactions-empty-state');
    const paginationControls = document.getElementById('pagination-controls');
    const pageInfo = document.getElementById('page-info');

    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px;">Loading transactions...</td></tr>';

    let sortBy = 'date';
    let sortOrder = 'desc';
    if (sortSelect && sortSelect.value) {
      const parts = sortSelect.value.split('_');
      sortBy = parts[0];
      sortOrder = parts[1];
    }

    const params = {
      page: currentPage,
      limit,
      search: searchInput ? searchInput.value.trim() : '',
      type: typeSelect ? typeSelect.value : '',
      category: categorySelect ? categorySelect.value : '',
      startDate: startDateInput ? startDateInput.value : '',
      endDate: endDateInput ? endDateInput.value : '',
      sortBy,
      sortOrder,
    };

    try {
      const res = await window.Api.get('/transactions', params);
      tbody.innerHTML = '';

      if (!res || !res.success || !res.data.transactions || res.data.transactions.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (paginationControls) paginationControls.style.display = 'none';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';
      if (paginationControls) paginationControls.style.display = 'flex';

      const { transactions, pagination } = res.data;

      // Update Pagination state
      if (pageInfo) {
        pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages} (${pagination.totalRecords} total)`;
      }
      if (prevBtn) prevBtn.disabled = !pagination.hasPrevPage;
      if (nextBtn) nextBtn.disabled = !pagination.hasNextPage;

      transactions.forEach((t) => {
        const isIncome = t.type === 'income';
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${window.Utils.formatDate(t.date)}</strong></td>
          <td>
            <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
              ${isIncome ? 'Income' : 'Expense'}
            </span>
          </td>
          <td>
            <div style="font-weight: 600;">${window.Utils.escapeHTML(t.title)}</div>
            ${t.notes ? `<small class="text-muted">${window.Utils.escapeHTML(t.notes)}</small>` : ''}
          </td>
          <td>
            <span class="badge badge-category">${window.Utils.escapeHTML(t.category)}</span>
          </td>
          <td><small class="text-muted">${window.Utils.escapeHTML(t.paymentMethod || 'Cash')}</small></td>
          <td style="font-weight: 700;" class="${isIncome ? 'text-success' : 'text-danger'}">
            ${isIncome ? '+' : '-'}${window.Utils.formatCurrency(t.amount)}
          </td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm edit-tx-btn" data-id="${t.id}" title="Edit Transaction">
                <i data-lucide="edit-2"></i> Edit
              </button>
              <button class="btn btn-danger btn-sm delete-tx-btn" data-id="${t.id}" title="Delete Transaction">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });

      window.Utils.renderIcons();

      // Attach row action listeners
      document.querySelectorAll('.edit-tx-btn').forEach((btn) => {
        btn.addEventListener('click', () => openEditModal(btn.dataset.id));
      });

      document.querySelectorAll('.delete-tx-btn').forEach((btn) => {
        btn.addEventListener('click', () => handleDelete(btn.dataset.id));
      });
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--expense-red); padding: 24px;">Failed to load transactions: ${err.message}</td></tr>`;
    }
  }

  async function loadFilterCategories() {
    const sel = document.getElementById('filter-category');
    if (!sel) return;
    try {
      const res = await window.Api.get('/categories');
      if (res && res.success) {
        sel.innerHTML = '<option value="all">All Categories</option>';
        res.data.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.name;
          opt.textContent = cat.name;
          sel.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Could not load categories for filter', e);
    }
  }

  function setupTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    const openAddBtn = document.getElementById('add-transaction-page-btn');
    const topbarAddBtn = document.getElementById('topbar-add-expense-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');
    const typeSelect = document.getElementById('tx-type');

    if (!modal || !form) return;

    const openModal = async () => {
      editingId = null;
      document.getElementById('modal-title').textContent = 'Add Transaction';
      document.getElementById('tx-submit-btn').textContent = 'Save Transaction';
      form.reset();
      document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
      await populateCategories(typeSelect.value);
      modal.classList.add('active');
    };

    const closeModal = () => modal.classList.remove('active');

    if (openAddBtn) openAddBtn.addEventListener('click', openModal);
    if (topbarAddBtn) topbarAddBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (typeSelect) {
      typeSelect.addEventListener('change', () => populateCategories(typeSelect.value));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('tx-submit-btn');

      const title = document.getElementById('tx-title').value.trim();
      const amount = parseFloat(document.getElementById('tx-amount').value);
      const type = document.getElementById('tx-type').value;
      const category = document.getElementById('tx-category').value;
      const date = document.getElementById('tx-date').value;
      const paymentMethod = document.getElementById('tx-payment-method').value;
      const notes = document.getElementById('tx-notes').value.trim();

      if (!title || isNaN(amount) || amount <= 0 || !category || !date) {
        window.Utils.showToast('Please check all required fields.', 'warning');
        return;
      }

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        const payload = { type, title, amount, category, date, paymentMethod, notes };

        if (editingId) {
          await window.Api.patch(`/transactions/${editingId}`, payload);
          window.Utils.showToast('Transaction updated successfully!', 'success');
        } else {
          await window.Api.post('/transactions', payload);
          window.Utils.showToast('Transaction added successfully!', 'success');
        }

        closeModal();
        await fetchAndRenderTransactions();
      } catch (err) {
        window.Utils.showToast(err.message || 'Error saving transaction', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingId ? 'Update Transaction' : 'Save Transaction';
      }
    });
  }

  async function openEditModal(id) {
    const modal = document.getElementById('transaction-modal');
    if (!modal) return;

    try {
      const res = await window.Api.get(`/transactions/${id}`);
      if (!res || !res.success) throw new Error('Transaction details not found');
      const t = res.data;

      editingId = id;
      document.getElementById('modal-title').textContent = 'Edit Transaction';
      document.getElementById('tx-submit-btn').textContent = 'Update Transaction';

      document.getElementById('tx-type').value = t.type;
      await populateCategories(t.type);
      document.getElementById('tx-title').value = t.title;
      document.getElementById('tx-amount').value = t.amount;
      document.getElementById('tx-category').value = t.category;
      document.getElementById('tx-date').value = t.date;
      document.getElementById('tx-payment-method').value = t.paymentMethod || 'Cash';
      document.getElementById('tx-notes').value = t.notes || '';

      modal.classList.add('active');
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to open transaction for edit', 'error');
    }
  }

  async function handleDelete(id) {
    const confirmed = await window.Utils.confirm({
      title: 'Delete Transaction',
      message: 'Are you sure you want to permanently delete this transaction? This action cannot be undone.',
      confirmText: 'Delete',
      isDestructive: true,
    });

    if (confirmed) {
      try {
        const res = await window.Api.delete(`/transactions/${id}`);
        if (res && res.success) {
          window.Utils.showToast('Transaction deleted successfully.', 'success');
          await fetchAndRenderTransactions();
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to delete transaction', 'error');
      }
    }
  }

  async function populateCategories(type) {
    const select = document.getElementById('tx-category');
    if (!select) return;
    try {
      const res = await window.Api.get('/categories', { type });
      if (res && res.success) {
        select.innerHTML = '<option value="">Select Category</option>';
        res.data.forEach((cat) => {
          const opt = document.createElement('option');
          opt.value = cat.name;
          opt.textContent = cat.name;
          select.appendChild(opt);
        });
      }
    } catch (e) {
      select.innerHTML = '<option value="Other">Other</option>';
    }
  }
});
