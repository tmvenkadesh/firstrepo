const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Placeholder routes for admin panel
// Will be implemented in task 5

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard data (placeholder)
// @access  Admin
router.get('/dashboard', authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin dashboard endpoint - to be implemented',
    data: {}
  });
});

// @route   GET /api/admin/users
// @desc    Get all users (placeholder)
// @access  Admin
router.get('/users', authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin users endpoint - to be implemented',
    data: []
  });
});

module.exports = router;