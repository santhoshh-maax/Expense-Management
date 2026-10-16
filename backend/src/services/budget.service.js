const { getFirebase } = require('../config/firebase');
const { getMonthRange } = require('../utils/date.utils');

class BudgetService {
  /**
   * Set or update a budget for a given month and category
   */
  async setBudget(uid, budgetData) {
    const { db } = getFirebase();
    const budgetsRef = db.collection(`users/${uid}/budgets`);

    const month = parseInt(budgetData.month, 10);
    const year = parseInt(budgetData.year, 10);
    const categoryId = budgetData.categoryId || 'all';
    const categoryName = budgetData.categoryName || (categoryId === 'all' ? 'Total Monthly Budget' : 'Category Budget');
    const amount = Number(parseFloat(budgetData.amount).toFixed(2));

    // Check if budget already exists for this category + month + year
    const existingSnapshot = await budgetsRef
      .where('categoryId', '==', categoryId)
      .where('month', '==', month)
      .where('year', '==', year)
      .get();

    const now = new Date().toISOString();

    if (!existingSnapshot.empty) {
      // Update existing
      const existingDoc = existingSnapshot.docs[0];
      const docRef = db.doc(`users/${uid}/budgets/${existingDoc.id}`);
      await docRef.update({
        amount,
        categoryName,
        updatedAt: now,
      });

      return {
        id: existingDoc.id,
        categoryId,
        categoryName,
        amount,
        month,
        year,
        updatedAt: now,
      };
    }

    // Create new budget record
    const newBudget = {
      categoryId,
      categoryName,
      amount,
      month,
      year,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await budgetsRef.add(newBudget);
    return {
      id: docRef.id,
      ...newBudget,
    };
  }

  /**
   * Get budgets for a month with calculated actual spending and percentage
   */
  async getBudgets(uid, month, year) {
    const { db } = getFirebase();
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const budgetsRef = db.collection(`users/${uid}/budgets`);
    const budgetsSnapshot = await budgetsRef
      .where('month', '==', m)
      .where('year', '==', y)
      .get();

    const budgets = [];
    budgetsSnapshot.forEach((doc) => {
      budgets.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Calculate actual spending from user's expense transactions for this month
    const { startStr, endStr } = getMonthRange(y, m);
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const transSnapshot = await transactionsRef.get();

    let totalExpenseSpent = 0;
    const categorySpendingMap = {};

    transSnapshot.forEach((doc) => {
      const t = doc.data();
      // Only include expenses within the selected month
      if (t.type === 'expense' && t.date >= startStr && t.date <= endStr) {
        const amt = Number(t.amount || 0);
        totalExpenseSpent += amt;

        const cat = (t.category || 'Other').toLowerCase();
        categorySpendingMap[cat] = (categorySpendingMap[cat] || 0) + amt;
      }
    });

    // Enrich budgets with spent, remaining, percentage, and status
    const enrichedBudgets = budgets.map((b) => {
      let spent = 0;
      if (b.categoryId === 'all') {
        spent = totalExpenseSpent;
      } else {
        const catKey = (b.categoryName || '').toLowerCase();
        spent = categorySpendingMap[catKey] || 0;
      }

      spent = Number(spent.toFixed(2));
      const remaining = Number((b.amount - spent).toFixed(2));
      const percentage = b.amount > 0 ? Number(((spent / b.amount) * 100).toFixed(1)) : 0;

      let status = 'normal'; // normal (<80%), warning (80-99%), exceeded (>=100%)
      if (percentage >= 100) {
        status = 'exceeded';
      } else if (percentage >= 80) {
        status = 'warning';
      }

      return {
        ...b,
        spent,
        remaining,
        percentage,
        status,
      };
    });

    return {
      month: m,
      year: y,
      totalSpentThisMonth: Number(totalExpenseSpent.toFixed(2)),
      budgets: enrichedBudgets,
    };
  }

  /**
   * Delete a budget
   */
  async deleteBudget(uid, budgetId) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/budgets/${budgetId}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Budget not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await docRef.delete();
    return { success: true, message: 'Budget deleted successfully' };
  }
}

module.exports = new BudgetService();
