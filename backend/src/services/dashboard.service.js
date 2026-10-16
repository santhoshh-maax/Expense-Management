const { getFirebase } = require('../config/firebase');
const { getMonthRange } = require('../utils/date.utils');

class DashboardService {
  /**
   * Get dashboard metrics and summary cards data
   */
  async getSummary(uid, month, year) {
    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.get();

    const allTransactions = [];
    snapshot.forEach((doc) => {
      allTransactions.push({ id: doc.id, ...doc.data() });
    });

    const now = new Date();
    const selYear = year ? parseInt(year, 10) : now.getFullYear();
    const selMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const { startStr, endStr } = getMonthRange(selYear, selMonth);

    let allTimeIncome = 0;
    let allTimeExpense = 0;
    let periodIncome = 0;
    let periodExpense = 0;
    let periodRecordCount = 0;

    allTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') {
        allTimeIncome += amt;
        if (t.date >= startStr && t.date <= endStr) {
          periodIncome += amt;
          periodRecordCount++;
        }
      } else if (t.type === 'expense') {
        allTimeExpense += amt;
        if (t.date >= startStr && t.date <= endStr) {
          periodExpense += amt;
          periodRecordCount++;
        }
      }
    });

    const totalBalance = Number((allTimeIncome - allTimeExpense).toFixed(2));
    const netCashFlow = Number((periodIncome - periodExpense).toFixed(2));

    // Get budget usage for the period
    const budgetsRef = db.collection(`users/${uid}/budgets`);
    const budgetsSnapshot = await budgetsRef
      .where('month', '==', selMonth)
      .where('year', '==', selYear)
      .get();

    let totalBudgetLimit = 0;
    budgetsSnapshot.forEach((doc) => {
      const b = doc.data();
      if (b.categoryId === 'all') {
        totalBudgetLimit = Number(b.amount || 0);
      }
    });

    let budgetUsagePercentage = null;
    if (totalBudgetLimit > 0) {
      budgetUsagePercentage = Number(((periodExpense / totalBudgetLimit) * 100).toFixed(1));
    }

    // Recent 5 transactions
    const sorted = [...allTransactions].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const recentTransactions = sorted.slice(0, 5);

    return {
      period: {
        month: selMonth,
        year: selYear,
        startDate: startStr,
        endDate: endStr,
      },
      cards: {
        totalBalance,
        periodIncome: Number(periodIncome.toFixed(2)),
        periodExpense: Number(periodExpense.toFixed(2)),
        netCashFlow,
        periodRecordCount,
        totalBudgetLimit,
        budgetUsagePercentage,
      },
      recentTransactions,
    };
  }

  /**
   * Get dynamic Chart.js ready datasets for Dashboard
   */
  async getCharts(uid, month, year) {
    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.get();

    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    const now = new Date();
    const selYear = year ? parseInt(year, 10) : now.getFullYear();
    const selMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const { startStr, endStr } = getMonthRange(selYear, selMonth);

    // 1. Category Breakdown (Doughnut Chart) for selected period
    const categoryTotals = {};
    transactions.forEach((t) => {
      if (t.type === 'expense' && t.date >= startStr && t.date <= endStr) {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount || 0);
      }
    });

    const categoryBreakdown = {
      labels: Object.keys(categoryTotals),
      data: Object.values(categoryTotals).map((v) => Number(v.toFixed(2))),
    };

    // 2. Spending Trends over current selected month (Daily aggregate line chart)
    const dailyExpenses = {};
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyExpenses[dayStr] = 0;
    }

    transactions.forEach((t) => {
      if (t.type === 'expense' && dailyExpenses[t.date] !== undefined) {
        dailyExpenses[t.date] += Number(t.amount || 0);
      }
    });

    const spendingTrends = {
      labels: Object.keys(dailyExpenses).map((d) => d.split('-')[2]), // Day numbers
      data: Object.values(dailyExpenses).map((v) => Number(v.toFixed(2))),
    };

    // 3. Monthly Income vs Expenses (Last 6 months Bar Chart)
    const monthlyComparison = {
      labels: [],
      income: [],
      expense: [],
    };

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const { startStr: mStart, endStr: mEnd } = getMonthRange(y, m);

      let mInc = 0;
      let mExp = 0;

      transactions.forEach((t) => {
        if (t.date >= mStart && t.date <= mEnd) {
          if (t.type === 'income') mInc += Number(t.amount || 0);
          if (t.type === 'expense') mExp += Number(t.amount || 0);
        }
      });

      monthlyComparison.labels.push(monthLabel);
      monthlyComparison.income.push(Number(mInc.toFixed(2)));
      monthlyComparison.expense.push(Number(mExp.toFixed(2)));
    }

    return {
      categoryBreakdown,
      spendingTrends,
      monthlyComparison,
    };
  }
}

module.exports = new DashboardService();
