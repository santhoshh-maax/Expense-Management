const transactionService = require('../services/transaction.service');
const { successResponse } = require('../utils/response.utils');

class TransactionController {
  async create(req, res, next) {
    try {
      const transaction = await transactionService.createTransaction(req.user.uid, req.body);
      return successResponse(res, 'Transaction created successfully', transaction, 201);
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await transactionService.getTransactions(req.user.uid, req.query);
      return successResponse(res, 'Transactions retrieved successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const transaction = await transactionService.getTransactionById(req.user.uid, req.params.id);
      return successResponse(res, 'Transaction retrieved successfully', transaction, 200);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await transactionService.updateTransaction(req.user.uid, req.params.id, req.body);
      return successResponse(res, 'Transaction updated successfully', updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await transactionService.deleteTransaction(req.user.uid, req.params.id);
      return successResponse(res, 'Transaction deleted successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TransactionController();
