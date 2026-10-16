const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { validateCategoryInput } = require('../validators/category.validator');

router.use(requireAuth);

router.get('/categories', categoryController.getAll);
router.post('/categories', validate(validateCategoryInput), categoryController.create);
router.patch('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.delete);

module.exports = router;
