const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Placeholder routes for evaluation sessions
// Will be implemented in task 3

// @route   GET /api/evaluations
// @desc    Get evaluation history (placeholder)
// @access  Private
router.get('/', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Evaluation history endpoint - to be implemented',
    data: []
  });
});

// @route   POST /api/evaluations/start
// @desc    Start evaluation session (placeholder)
// @access  Private
router.post('/start', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Start evaluation endpoint - to be implemented'
  });
});

module.exports = router;