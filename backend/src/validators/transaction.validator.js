const { isValidISODate } = require('../utils/date.utils');

const validateTransactionInput = (req) => {
  const errors = [];
  const { type, title, amount, category, date, paymentMethod, notes } = req.body;

  // Type validation
  if (!type || !['expense', 'income'].includes(type.toLowerCase())) {
    errors.push({ field: 'type', message: 'Type must be either "expense" or "income"' });
  }

  // Title validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title or description is required' });
  } else if (title.trim().length > 120) {
    errors.push({ field: 'title', message: 'Title cannot exceed 120 characters' });
  }

  // Amount validation
  const numAmount = Number(amount);
  if (amount === undefined || amount === null || isNaN(numAmount) || numAmount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a valid positive number greater than 0' });
  }

  // Category validation
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Category is required' });
  }

  // Date validation
  if (!date || !isValidISODate(date)) {
    errors.push({ field: 'date', message: 'Date must be a valid date in YYYY-MM-DD format' });
  }

  // Optional fields
  if (paymentMethod && typeof paymentMethod !== 'string') {
    errors.push({ field: 'paymentMethod', message: 'Payment method must be a string' });
  }

  if (notes && typeof notes !== 'string') {
    errors.push({ field: 'notes', message: 'Notes must be a string' });
  }

  return errors;
};

const validateTransactionUpdate = (req) => {
  const errors = [];
  const { type, title, amount, category, date, paymentMethod, notes } = req.body;

  if (type !== undefined && !['expense', 'income'].includes(type.toLowerCase())) {
    errors.push({ field: 'type', message: 'Type must be either "expense" or "income"' });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    } else if (title.trim().length > 120) {
      errors.push({ field: 'title', message: 'Title cannot exceed 120 characters' });
    }
  }

  if (amount !== undefined) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be a positive number greater than 0' });
    }
  }

  if (date !== undefined && !isValidISODate(date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
  }

  return errors;
};

module.exports = {
  validateTransactionInput,
  validateTransactionUpdate,
};
