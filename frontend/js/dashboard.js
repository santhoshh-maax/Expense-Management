/**
 * Dashboard Controller & Visualizations
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check Authentication
  const isAuth = await window.Auth.requireAuth();
  if (!isAuth) return;

  // Render icons
  window.Utils.renderIcons();

  // Populate user profile info in topbar
  const profile = window.Auth.getUserProfile();
  if (profile) {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-initials');
    if (nameEl) nameEl.textContent = profile.displayName || profile.email;
    if (avatarEl) avatarEl.textContent = (profile.displayName || profile.email || 'U')[0].toUpperCase();
  }

  // Mobile menu drawer toggle
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
        message: 'Are you sure you want to sign out of your account?',
        confirmText: 'Sign Out',
        isDestructive: false,
      });
      if (confirmed) {
        await window.Auth.logout();
      }
    });
  }

  // Period Selector Setup
  const monthSelector = document.getElementById('dashboard-month-select');
  const yearSelector = document.getElementById('dashboard-year-select');

  const now = new Date();
  if (monthSelector) monthSelector.value = String(now.getMonth() + 1);
  if (yearSelector) yearSelector.value = String(now.getFullYear());

  const handlePeriodChange = () => {
    const m = monthSelector ? monthSelector.value : now.getMonth() + 1;
    const y = yearSelector ? yearSelector.value : now.getFullYear();
    loadDashboard(m, y);
  };

  if (monthSelector) monthSelector.addEventListener('change', handlePeriodChange);
  if (yearSelector) yearSelector.addEventListener('change', handlePeriodChange);

  // Setup Global Quick Add Expense/Income Modal
  setupTransactionModal();

  // Load Dashboard Data
  await loadDashboard(now.getMonth() + 1, now.getFullYear());
});

// Chart instances
let categoryDoughnutChart = null;
let spendingTrendsLineChart = null;
let incomeExpenseBarChart = null;

async function loadDashboard(month, year) {
  try {
    // 1. Fetch Summary
    const summaryRes = await window.Api.get('/dashboard/summary', { month, year });
    if (summaryRes && summaryRes.success) {
      renderSummaryCards(summaryRes.data.cards);
      renderRecentTransactions(summaryRes.data.recentTransactions);
    }

    // 2. Fetch Charts
    const chartsRes = await window.Api.get('/dashboard/charts', { month, year });
    if (chartsRes && chartsRes.success) {
      renderCharts(chartsRes.data);
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
    window.Utils.showToast(err.message || 'Error loading dashboard data', 'error');
  }
}

function renderSummaryCards(cards) {
  const totalBalanceEl = document.getElementById('card-total-balance');
  const periodIncomeEl = document.getElementById('card-period-income');
  const periodExpenseEl = document.getElementById('card-period-expense');
  const netCashFlowEl = document.getElementById('card-net-cashflow');
  const budgetUsageEl = document.getElementById('card-budget-usage');
  const budgetSubtextEl = document.getElementById('card-budget-subtext');

  if (totalBalanceEl) totalBalanceEl.textContent = window.Utils.formatCurrency(cards.totalBalance);
  if (periodIncomeEl) periodIncomeEl.textContent = window.Utils.formatCurrency(cards.periodIncome);
  if (periodExpenseEl) periodExpenseEl.textContent = window.Utils.formatCurrency(cards.periodExpense);

  if (netCashFlowEl) {
    netCashFlowEl.textContent = window.Utils.formatCurrency(cards.netCashFlow);
    netCashFlowEl.className = 'metric-value ' + (cards.netCashFlow >= 0 ? 'text-success' : 'text-danger');
  }

  if (budgetUsageEl) {
    if (cards.totalBudgetLimit > 0) {
      budgetUsageEl.textContent = `${cards.budgetUsagePercentage}%`;
      if (budgetSubtextEl) {
        budgetSubtextEl.textContent = `of ${window.Utils.formatCurrency(cards.totalBudgetLimit)} budget`;
      }
      budgetUsageEl.className = 'metric-value ' + (cards.budgetUsagePercentage > 100 ? 'text-danger' : (cards.budgetUsagePercentage >= 80 ? 'text-warning' : 'text-success'));
    } else {
      budgetUsageEl.textContent = 'Not Set';
      if (budgetSubtextEl) budgetSubtextEl.textContent = 'Set limit in Budgets';
    }
  }
}

function renderRecentTransactions(transactions) {
  const container = document.getElementById('recent-transactions-tbody');
  const emptyState = document.getElementById('recent-empty-state');
  if (!container) return;

  container.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  transactions.forEach((t) => {
    const isIncome = t.type === 'income';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 600;">${window.Utils.escapeHTML(t.title)}</div>
        <small class="text-muted">${window.Utils.escapeHTML(t.paymentMethod || 'Cash')}</small>
      </td>
      <td>
        <span class="badge badge-category">${window.Utils.escapeHTML(t.category)}</span>
      </td>
      <td class="text-muted">${window.Utils.formatDate(t.date)}</td>
      <td style="font-weight: 700;" class="${isIncome ? 'text-success' : 'text-danger'}">
        ${isIncome ? '+' : '-'}${window.Utils.formatCurrency(t.amount)}
      </td>
      <td>
        <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">
          ${isIncome ? 'Income' : 'Expense'}
        </span>
      </td>
    `;
    container.appendChild(tr);
  });
}

function renderCharts(data) {
  if (!window.Chart) return;

  // Chart defaults for clean styling
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = '#64748b';

  // 1. Category Doughnut Chart
  const doughnutCtx = document.getElementById('categoryDoughnutChart')?.getContext('2d');
  if (doughnutCtx) {
    if (categoryDoughnutChart) categoryDoughnutChart.destroy();

    const hasData = data.categoryBreakdown.data && data.categoryBreakdown.data.length > 0;
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

    categoryDoughnutChart = new Chart(doughnutCtx, {
      type: 'doughnut',
      data: {
        labels: hasData ? data.categoryBreakdown.labels : ['No Expenses Yet'],
        datasets: [{
          data: hasData ? data.categoryBreakdown.data : [1],
          backgroundColor: hasData ? colors.slice(0, data.categoryBreakdown.labels.length) : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
          tooltip: {
            callbacks: {
              label: (context) => hasData ? ` ${context.label}: ${window.Utils.formatCurrency(context.raw)}` : ' No data recorded',
            },
          },
        },
        cutout: '70%',
      },
    });
  }

  // 2. Spending Trends Line Chart
  const lineCtx = document.getElementById('spendingTrendsChart')?.getContext('2d');
  if (lineCtx) {
    if (spendingTrendsLineChart) spendingTrendsLineChart.destroy();

    spendingTrendsLineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: data.spendingTrends.labels,
        datasets: [{
          label: 'Daily Spending',
          data: data.spendingTrends.data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Day ${items[0].label}`,
              label: (item) => ` Spent: ${window.Utils.formatCurrency(item.raw)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => window.Utils.preferences.currencySymbol + val,
            },
          },
        },
      },
    });
  }

  // 3. Monthly Income vs Expenses Bar Chart
  const barCtx = document.getElementById('incomeExpenseBarChart')?.getContext('2d');
  if (barCtx) {
    if (incomeExpenseBarChart) incomeExpenseBarChart.destroy();

    incomeExpenseBarChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: data.monthlyComparison.labels,
        datasets: [
          {
            label: 'Income',
            data: data.monthlyComparison.income,
            backgroundColor: '#10b981',
            borderRadius: 6,
          },
          {
            label: 'Expense',
            data: data.monthlyComparison.expense,
            backgroundColor: '#ef4444',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${window.Utils.formatCurrency(context.raw)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => window.Utils.preferences.currencySymbol + val,
            },
          },
        },
      },
    });
  }
}

// Global Add Transaction Modal Controller
function setupTransactionModal() {
  const modal = document.getElementById('transaction-modal');
  const form = document.getElementById('transaction-form');
  const addBtn = document.getElementById('topbar-add-expense-btn');
  const closeBtn = document.getElementById('modal-close-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const typeSelect = document.getElementById('tx-type');
  const categorySelect = document.getElementById('tx-category');

  if (!modal || !form) return;

  const openModal = async () => {
    form.reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    await populateCategories(typeSelect.value);
    modal.classList.add('active');
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (addBtn) addBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      populateCategories(typeSelect.value);
    });
  }

  // Submit Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('tx-submit-btn');

    // Validation
    const title = document.getElementById('tx-title').value.trim();
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const paymentMethod = document.getElementById('tx-payment-method').value;
    const notes = document.getElementById('tx-notes').value.trim();

    if (!title || isNaN(amount) || amount <= 0 || !category || !date) {
      window.Utils.showToast('Please fill all required fields correctly.', 'warning');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';

      const payload = { type, title, amount, category, date, paymentMethod, notes };
      const res = await window.Api.post('/transactions', payload);

      if (res && res.success) {
        window.Utils.showToast('Transaction saved successfully!', 'success');
        closeModal();
        const m = document.getElementById('dashboard-month-select')?.value || new Date().getMonth() + 1;
        const y = document.getElementById('dashboard-year-select')?.value || new Date().getFullYear();
        await loadDashboard(m, y);
      }
    } catch (err) {
      window.Utils.showToast(err.message || 'Failed to save transaction', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Transaction';
    }
  });
}

async function populateCategories(type) {
  const select = document.getElementById('tx-category');
  if (!select) return;

  select.innerHTML = '<option value="">Loading categories...</option>';

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
  } catch (err) {
    select.innerHTML = '<option value="Other">Other</option>';
  }
}
