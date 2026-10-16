const budgetService = require('../services/budget.service');
const { successResponse } = require('../utils/response.utils');

class BudgetController {
  async getBudgets(req, res, next) {
    try {
      const now = new Date();
      const month = req.query.month || now.getMonth() + 1;
      const year = req.query.year || now.getFullYear();

      const result = await budgetService.getBudgets(req.user.uid, month, year);
      return successResponse(res, 'Budgets retrieved successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }

  async setBudget(req, res, next) {
    try {
      const budget = await budgetService.setBudget(req.user.uid, req.body);
      return successResponse(res, 'Budget saved successfully', budget, 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteBudget(req, res, next) {
    try {
      const result = await budgetService.deleteBudget(req.user.uid, req.params.id);
      return successResponse(res, 'Budget deleted successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BudgetController();
