const { getFirebase } = require('../config/firebase');

class TransactionService {
  /**
   * Create a new transaction scoped to the user
   */
  async createTransaction(uid, data) {
    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);

    const now = new Date().toISOString();
    const transaction = {
      type: data.type.toLowerCase(),
      title: data.title.trim(),
      amount: Number(parseFloat(data.amount).toFixed(2)),
      category: data.category.trim(),
      categoryId: data.categoryId || null,
      date: data.date,
      paymentMethod: data.paymentMethod ? data.paymentMethod.trim() : 'Cash',
      notes: data.notes ? data.notes.trim() : '',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await transactionsRef.add(transaction);
    return {
      id: docRef.id,
      ...transaction,
    };
  }

  /**
   * Fetch transactions with filtering, search, sorting and pagination
   */
  async getTransactions(uid, options = {}) {
    const {
      search = '',
      type = '',
      category = '',
      startDate = '',
      endDate = '',
      sortBy = 'date',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = options;

    const { db } = getFirebase();
    const transactionsRef = db.collection(`users/${uid}/transactions`);
    const snapshot = await transactionsRef.get();

    let list = [];
    snapshot.forEach((doc) => {
      list.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // 1. Filter by Type
    if (type && type !== 'all') {
      list = list.filter((t) => t.type.toLowerCase() === type.toLowerCase());
    }

    // 2. Filter by Category
    if (category && category !== 'all' && category !== 'All') {
      list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }

    // 3. Filter by Date Range
    if (startDate) {
      list = list.filter((t) => t.date >= startDate);
    }
    if (endDate) {
      list = list.filter((t) => t.date <= endDate);
    }

    // 4. Search Filter
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => {
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          (t.paymentMethod && t.paymentMethod.toLowerCase().includes(q)) ||
          t.amount.toString().includes(q)
        );
      });
    }

    // 5. Sorting
    list.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'date') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      // Default string sort
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA === valB) return 0;
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    const totalRecords = list.length;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const totalPages = Math.ceil(totalRecords / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedItems = list.slice(startIndex, startIndex + limitNum);

    return {
      transactions: paginatedItems,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(uid, id) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/transactions/${id}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  /**
   * Update transaction
   */
  async updateTransaction(uid, id, updateData) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/transactions/${id}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const payload = {};
    if (updateData.type !== undefined) payload.type = updateData.type.toLowerCase();
    if (updateData.title !== undefined) payload.title = updateData.title.trim();
    if (updateData.amount !== undefined) payload.amount = Number(parseFloat(updateData.amount).toFixed(2));
    if (updateData.category !== undefined) payload.category = updateData.category.trim();
    if (updateData.categoryId !== undefined) payload.categoryId = updateData.categoryId;
    if (updateData.date !== undefined) payload.date = updateData.date;
    if (updateData.paymentMethod !== undefined) payload.paymentMethod = updateData.paymentMethod.trim();
    if (updateData.notes !== undefined) payload.notes = updateData.notes.trim();
    payload.updatedAt = new Date().toISOString();

    await docRef.update(payload);
    const updated = await docRef.get();

    return {
      id: updated.id,
      ...updated.data(),
    };
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(uid, id) {
    const { db } = getFirebase();
    const docRef = db.doc(`users/${uid}/transactions/${id}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      const err = new Error('Transaction not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await docRef.delete();
    return { success: true, message: 'Transaction deleted successfully' };
  }
}

module.exports = new TransactionService();
