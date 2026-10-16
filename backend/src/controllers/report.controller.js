const reportService = require('../services/report.service');
const { successResponse } = require('../utils/response.utils');

class ReportController {
  async getAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const data = await reportService.getAnalytics(req.user.uid, startDate, endDate);
      return successResponse(res, 'Analytics report retrieved successfully', data, 200);
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req, res, next) {
    try {
      const csvData = await reportService.generateTransactionsCsv(req.user.uid, req.query);
      const filename = `transactions_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ReportController();
