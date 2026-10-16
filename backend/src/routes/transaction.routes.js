const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { validateTransactionInput, validateTransactionUpdate } = require('../validators/transaction.validator');

// All transaction routes are protected by Firebase Auth verification
router.use(requireAuth);

router.get('/transactions', transactionController.getAll);
router.get('/transactions/:id', transactionController.getById);
router.post('/transactions', validate(validateTransactionInput), transactionController.create);
router.patch('/transactions/:id', validate(validateTransactionUpdate), transactionController.update);
router.delete('/transactions/:id', transactionController.delete);

module.exports = router;
