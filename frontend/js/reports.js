/**
 * Reports & Analytics Controller
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

  // Date Range Controls
  const startDateInput = document.getElementById('report-start-date');
  const endDateInput = document.getElementById('report-end-date');
  const applyBtn = document.getElementById('report-apply-btn');
  const exportBtn = document.getElementById('report-export-csv-btn');

  // Default to "This Month"
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (startDateInput) startDateInput.value = startOfMonth.toISOString().split('T')[0];
  if (endDateInput) endDateInput.value = endOfMonth.toISOString().split('T')[0];

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      const today = new Date();

      if (preset === 'this-month') {
        const s = new Date(today.getFullYear(), today.getMonth(), 1);
        const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDateInput.value = s.toISOString().split('T')[0];
        endDateInput.value = e.toISOString().split('T')[0];
      } else if (preset === 'last-month') {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0);
        startDateInput.value = s.toISOString().split('T')[0];
        endDateInput.value = e.toISOString().split('T')[0];
      } else if (preset === 'last-30-days') {
        const s = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDateInput.value = s.toISOString().split('T')[0];
        endDateInput.value = today.toISOString().split('T')[0];
      } else if (preset === 'this-year') {
        const s = new Date(today.getFullYear(), 0, 1);
        const e = new Date(today.getFullYear(), 11, 31);
        startDateInput.value = s.toISOString().split('T')[0];
        endDateInput.value = e.toISOString().split('T')[0];
      }

      loadReports(startDateInput.value, endDateInput.value);
    });
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      loadReports(startDateInput.value, endDateInput.value);
    });
  }

  // Export CSV Handler
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Generating CSV...';

        const sDate = startDateInput.value;
        const eDate = endDateInput.value;
        const csvContent = await window.Api.get('/reports/export', { startDate: sDate, endDate: eDate });

        // Trigger safe file download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `expense_report_${sDate}_to_${eDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.Utils.showToast('CSV report exported successfully!', 'success');
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to export CSV', 'error');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = '<i data-lucide="download"></i> Export to CSV';
        window.Utils.renderIcons();
      }
    });
  }

  // Initial load
  await loadReports(startDateInput.value, endDateInput.value);
});

let reportCategoryChart = null;

async function loadReports(startDate, endDate) {
  try {
    const res = await window.Api.get('/reports/summary', { startDate, endDate });
    if (!res || !res.success) throw new Error('Failed to load reports');

    const data = res.data;

    // Summary Cards
    const incEl = document.getElementById('report-total-income');
    const expEl = document.getElementById('report-total-expense');
    const netEl = document.getElementById('report-net-savings');
    const rateEl = document.getElementById('report-savings-rate');

    if (incEl) incEl.textContent = window.Utils.formatCurrency(data.summary.totalIncome);
    if (expEl) expEl.textContent = window.Utils.formatCurrency(data.summary.totalExpense);
    if (netEl) {
      netEl.textContent = window.Utils.formatCurrency(data.summary.netSavings);
      netEl.className = 'metric-value ' + (data.summary.netSavings >= 0 ? 'text-success' : 'text-danger');
    }
    if (rateEl) rateEl.textContent = `${data.summary.savingsRate}%`;

    // Period Comparison
    const comparisonEl = document.getElementById('report-comparison-box');
    if (comparisonEl && data.previousPeriod) {
      const prev = data.previousPeriod;
      let changeText = 'No previous expense data';
      if (prev.expenseChangePercentage !== null) {
        const isUp = prev.expenseChangePercentage > 0;
        changeText = `<span class="${isUp ? 'text-danger' : 'text-success'} font-bold">${isUp ? '↑ +' : '↓ '}${prev.expenseChangePercentage}%</span> vs previous period (${window.Utils.formatCurrency(prev.totalExpense)})`;
      }
      comparisonEl.innerHTML = `
        <div style="font-size: 13px; color: var(--text-muted);">
          Previous Period (${window.Utils.formatDate(prev.startDate)} - ${window.Utils.formatDate(prev.endDate)}):
          ${changeText}
        </div>
      `;
    }

    // Category Breakdown List
    const categoryList = document.getElementById('report-category-list');
    if (categoryList) {
      categoryList.innerHTML = '';
      if (!data.categoryBreakdown || data.categoryBreakdown.length === 0) {
        categoryList.innerHTML = '<p class="text-muted" style="text-align:center; padding: 24px;">No expense records in this date range.</p>';
      } else {
        data.categoryBreakdown.forEach((cat) => {
          const item = document.createElement('div');
          item.style.marginBottom = '14px';
          item.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom: 4px;">
              <span class="font-semibold">${window.Utils.escapeHTML(cat.name)}</span>
              <strong>${window.Utils.formatCurrency(cat.amount)} <small class="text-muted">(${cat.percentage}%)</small></strong>
            </div>
            <div class="progress-container">
              <div class="progress-bar normal" style="width: ${cat.percentage}%;"></div>
            </div>
          `;
          categoryList.appendChild(item);
        });
      }
    }

    // Chart
    renderReportCategoryChart(data.categoryBreakdown);
  } catch (err) {
    console.error(err);
    window.Utils.showToast(err.message || 'Error loading report data', 'error');
  }
}

function renderReportCategoryChart(categories) {
  const ctx = document.getElementById('reportCategoryChart')?.getContext('2d');
  if (!ctx || !window.Chart) return;

  if (reportCategoryChart) reportCategoryChart.destroy();

  const labels = categories.map((c) => c.name);
  const amounts = categories.map((c) => c.amount);

  reportCategoryChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Expense Amount',
        data: amounts.length > 0 ? amounts : [0],
        backgroundColor: '#3b82f6',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Spent: ${window.Utils.formatCurrency(ctx.raw)}`,
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
