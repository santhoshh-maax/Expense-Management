const validateCategoryInput = (req) => {
  const errors = [];
  const { name, type, icon, color } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Category name is required' });
  } else if (name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Category name must not exceed 50 characters' });
  }

  if (!type || !['expense', 'income'].includes(type.toLowerCase())) {
    errors.push({ field: 'type', message: 'Category type must be "expense" or "income"' });
  }

  if (icon && typeof icon !== 'string') {
    errors.push({ field: 'icon', message: 'Icon identifier must be a string' });
  }

  return errors;
};

module.exports = {
  validateCategoryInput,
};
