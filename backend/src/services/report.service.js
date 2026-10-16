const { getFirebase } = require('../config/firebase');

class ReportService {
  /**
   * Safe CSV cell escaping to prevent Formula Injection (CSV Injection / CWE-1236)
   */
  escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');

    // Formula injection vulnerability mitigation:
    // If the string starts with =, +, -, @, or tab/carriage return, prepend an apostrophe
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    return `"${str}"`;
  }

  /**
   * Get comprehensive analytics report for a date range
   */
  async getAnalytics(uid, startDate, endDate) {
    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.get();

    const transactions = [];
    snapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    // Filter current period
    const currentPeriodTransactions = transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryExpenseMap = {};
    const categoryIncomeMap = {};

    currentPeriodTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') {
        totalIncome += amt;
        const cat = t.category || 'Other Income';
        categoryIncomeMap[cat] = (categoryIncomeMap[cat] || 0) + amt;
      } else if (t.type === 'expense') {
        totalExpense += amt;
        const cat = t.category || 'Other';
        categoryExpenseMap[cat] = (categoryExpenseMap[cat] || 0) + amt;
      }
    });

    totalIncome = Number(totalIncome.toFixed(2));
    totalExpense = Number(totalExpense.toFixed(2));
    const netSavings = Number((totalIncome - totalExpense).toFixed(2));
    const savingsRate = totalIncome > 0 ? Number(((netSavings / totalIncome) * 100).toFixed(1)) : 0;

    // Highest-spending categories
    const categoryBreakdown = Object.entries(categoryExpenseMap)
      .map(([name, amount]) => {
        const percentage = totalExpense > 0 ? Number(((amount / totalExpense) * 100).toFixed(1)) : 0;
        return {
          name,
          amount: Number(amount.toFixed(2)),
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    // Period Comparison: Calculate previous period of equal duration
    let previousPeriod = null;
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffMs = e.getTime() - s.getTime();
      const prevEnd = new Date(s.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - diffMs);

      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      let prevIncome = 0;
      let prevExpense = 0;

      transactions.forEach((t) => {
        if (t.date >= prevStartStr && t.date <= prevEndStr) {
          if (t.type === 'income') prevIncome += Number(t.amount || 0);
          if (t.type === 'expense') prevExpense += Number(t.amount || 0);
        }
      });

      const expenseChangePct = prevExpense > 0 ? Number((((totalExpense - prevExpense) / prevExpense) * 100).toFixed(1)) : null;

      previousPeriod = {
        startDate: prevStartStr,
        endDate: prevEndStr,
        totalIncome: Number(prevIncome.toFixed(2)),
        totalExpense: Number(prevExpense.toFixed(2)),
        expenseChangePercentage: expenseChangePct,
      };
    }

    return {
      period: { startDate, endDate },
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        transactionCount: currentPeriodTransactions.length,
      },
      categoryBreakdown,
      previousPeriod,
    };
  }

  /**
   * Export transactions as CSV with security escaping
   */
  async generateTransactionsCsv(uid, filters = {}) {
    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.get();

    let list = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() });
    });

    // Apply any filter
    if (filters.type && filters.type !== 'all') {
      list = list.filter((t) => t.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      list = list.filter((t) => t.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.startDate) {
      list = list.filter((t) => t.date >= filters.startDate);
    }
    if (filters.endDate) {
      list = list.filter((t) => t.date <= filters.endDate);
    }

    // Sort by date desc
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const headers = ['Date', 'Type', 'Category', 'Title', 'Amount', 'Payment Method', 'Notes'];
    const rows = [headers.map((h) => `"${h}"`).join(',')];

    for (const t of list) {
      const row = [
        this.escapeCsvCell(t.date),
        this.escapeCsvCell(t.type.toUpperCase()),
        this.escapeCsvCell(t.category),
        this.escapeCsvCell(t.title),
        this.escapeCsvCell(Number(t.amount).toFixed(2)),
        this.escapeCsvCell(t.paymentMethod || 'Cash'),
        this.escapeCsvCell(t.notes || ''),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\r\n');
  }
}

module.exports = new ReportService();
