const { getFirebase } = require('../config/firebase');

const DEFAULT_CATEGORIES = [
  // Expense
  { id: 'def_food', name: 'Food and Dining', type: 'expense', icon: 'utensils', isDefault: true },
  { id: 'def_transport', name: 'Transport', type: 'expense', icon: 'car', isDefault: true },
  { id: 'def_shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', isDefault: true },
  { id: 'def_bills', name: 'Bills and Utilities', type: 'expense', icon: 'receipt', isDefault: true },
  { id: 'def_housing', name: 'Housing', type: 'expense', icon: 'home', isDefault: true },
  { id: 'def_health', name: 'Healthcare', type: 'expense', icon: 'activity', isDefault: true },
  { id: 'def_education', name: 'Education', type: 'expense', icon: 'book-open', isDefault: true },
  { id: 'def_entertainment', name: 'Entertainment', type: 'expense', icon: 'film', isDefault: true },
  { id: 'def_travel', name: 'Travel', type: 'expense', icon: 'plane', isDefault: true },
  { id: 'def_other', name: 'Other Expense', type: 'expense', icon: 'package', isDefault: true },

  // Income
  { id: 'def_salary', name: 'Salary', type: 'income', icon: 'briefcase', isDefault: true },
  { id: 'def_freelance', name: 'Freelance', type: 'income', icon: 'laptop', isDefault: true },
  { id: 'def_business', name: 'Business', type: 'income', icon: 'trending-up', isDefault: true },
  { id: 'def_investment', name: 'Investment Income', type: 'income', icon: 'pie-chart', isDefault: true },
  { id: 'def_other_income', name: 'Other Income', type: 'income', icon: 'dollar-sign', isDefault: true },
];

class CategoryService {
  /**
   * Fetch all categories for a user (defaults + user-defined)
   */
  async getCategories(uid, type = null) {
    const { db } = getFirebase();
    const categoriesRef = db.collection(`users/${uid}/categories`);
    const snapshot = await categoriesRef.get();

    const customCategories = [];
    snapshot.forEach((doc) => {
      customCategories.push({
        id: doc.id,
        ...doc.data(),
        isDefault: false,
      });
    });

    let all = [...DEFAULT_CATEGORIES, ...customCategories];

    if (type) {
      all = all.filter((c) => c.type.toLowerCase() === type.toLowerCase());
    }

    return all;
  }

  /**
   * Create a new custom category for the authenticated user
   */
  async createCategory(uid, categoryData) {
    const { db } = getFirebase();
    const categoriesRef = db.collection(`users/${uid}/categories`);

    const newCategory = {
      name: categoryData.name.trim(),
      type: categoryData.type.toLowerCase(),
      icon: categoryData.icon || (categoryData.type === 'income' ? 'dollar-sign' : 'tag'),
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await categoriesRef.add(newCategory);
    return {
      id: docRef.id,
      ...newCategory,
    };
  }

  /**
   * Update custom category
   */
  async updateCategory(uid, categoryId, updateData) {
    // Defaults cannot be overwritten or altered directly
    if (categoryId.startsWith('def_')) {
      const err = new Error('Default categories cannot be modified.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_OPERATION';
      throw err;
    }

    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/categories/${categoryId}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payload = {
      ...updateData,
      updatedAt: new Date().toISOString(),
    };
    delete payload.id;
    delete payload.isDefault;

    await docRef.update(payload);
    const updated = await docRef.get();
    return {
      id: categoryId,
      ...updated.data(),
    };
  }

  /**
   * Delete category with transaction dependency check
   */
  async deleteCategory(uid, categoryId, force = false) {
    if (categoryId.startsWith('def_')) {
      const err = new Error('Default system categories cannot be deleted.');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_OPERATION';
      throw err;
    }

    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/categories/${categoryId}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const categoryData = doc.data();

    // Check if any transaction is using this category
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.where('category', '==', categoryData.name).limit(1).get();

    if (!snapshot.empty && !force) {
      const err = new Error(`Category "${categoryData.name}" is currently in use by existing transactions. Confirm or reassign transactions before deletion.`);
      err.statusCode = 409;
      err.code = 'CATEGORY_IN_USE';
      throw err;
    }

    await docRef.delete();
    return { success: true, message: 'Category deleted successfully' };
  }
}

module.exports = new CategoryService();
