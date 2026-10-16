const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/reports/summary', reportController.getAnalytics);
router.get('/reports/export', reportController.exportCsv);

module.exports = router;
