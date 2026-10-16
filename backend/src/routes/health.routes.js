const express = require('express');
const router = express.Router();
const { getFirebase } = require('../config/firebase');

router.get('/health', (req, res) => {
  const { isMock } = getFirebase();
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: isMock ? 'mock_memory' : 'firestore_live',
  });
});

module.exports = router;
