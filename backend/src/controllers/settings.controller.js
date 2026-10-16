const settingsService = require('../services/settings.service');
const { successResponse } = require('../utils/response.utils');

class SettingsController {
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings(req.user.uid);
      return successResponse(res, 'Settings retrieved successfully', settings, 200);
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const updated = await settingsService.updateSettings(req.user.uid, req.body);
      return successResponse(res, 'Settings updated successfully', updated, 200);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SettingsController();
