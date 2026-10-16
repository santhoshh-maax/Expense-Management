const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { successResponse } = require('../utils/response.utils');

router.get('/auth/me', requireAuth, (req, res) => {
  return successResponse(res, 'User identity verified', {
    user: req.user,
  });
});

module.exports = router;
