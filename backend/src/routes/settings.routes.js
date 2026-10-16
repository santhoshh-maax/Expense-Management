const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/settings', settingsController.getSettings);
router.patch('/settings', settingsController.updateSettings);

module.exports = router;
