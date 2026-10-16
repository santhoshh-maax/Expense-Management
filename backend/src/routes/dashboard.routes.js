const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/dashboard/summary', dashboardController.getSummary);
router.get('/dashboard/charts', dashboardController.getCharts);

module.exports = router;
