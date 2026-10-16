const categoryService = require('../services/category.service');
const { successResponse } = require('../utils/response.utils');

class CategoryController {
  async getAll(req, res, next) {
    try {
      const type = req.query.type || null;
      const categories = await categoryService.getCategories(req.user.uid, type);
      return successResponse(res, 'Categories retrieved successfully', categories, 200);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const category = await categoryService.createCategory(req.user.uid, req.body);
      return successResponse(res, 'Category created successfully', category, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await categoryService.updateCategory(req.user.uid, req.params.id, req.body);
      return successResponse(res, 'Category updated successfully', updated, 200);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const force = req.query.force === 'true';
      const result = await categoryService.deleteCategory(req.user.uid, req.params.id, force);
      return successResponse(res, 'Category deleted successfully', result, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CategoryController();
