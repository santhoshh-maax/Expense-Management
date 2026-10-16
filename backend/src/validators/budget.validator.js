const validateBudgetInput = (req) => {
  const errors = [];
  const { categoryId, categoryName, amount, month, year } = req.body;

  if (!categoryId || typeof categoryId !== 'string') {
    errors.push({ field: 'categoryId', message: 'Category ID is required ("all" for total budget)' });
  }

  const numAmount = Number(amount);
  if (amount === undefined || isNaN(numAmount) || numAmount <= 0) {
    errors.push({ field: 'amount', message: 'Budget limit amount must be a positive number greater than 0' });
  }

  const numMonth = Number(month);
  if (!month || isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
    errors.push({ field: 'month', message: 'Month must be between 1 and 12' });
  }

  const numYear = Number(year);
  if (!year || isNaN(numYear) || numYear < 2000 || numYear > 2100) {
    errors.push({ field: 'year', message: 'Year must be a valid 4-digit year' });
  }

  return errors;
};

module.exports = {
  validateBudgetInput,
};
