const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { validateBudgetInput } = require('../validators/budget.validator');

router.use(requireAuth);

router.get('/budgets', budgetController.getBudgets);
router.post('/budgets', validate(validateBudgetInput), budgetController.setBudget);
router.delete('/budgets/:id', budgetController.deleteBudget);

module.exports = router;
