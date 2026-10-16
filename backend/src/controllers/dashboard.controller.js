const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/response.utils');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const { month, year } = req.query;
      const data = await dashboardService.getSummary(req.user.uid, month, year);
      return successResponse(res, 'Dashboard summary retrieved successfully', data, 200);
    } catch (err) {
      next(err);
    }
  }

  async getCharts(req, res, next) {
    try {
      const { month, year } = req.query;
      const data = await dashboardService.getCharts(req.user.uid, month, year);
      return successResponse(res, 'Dashboard chart data retrieved successfully', data, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DashboardController();
