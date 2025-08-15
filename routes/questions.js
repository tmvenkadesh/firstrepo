const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const Question = require('../models/Question');
const QuestionService = require('../services/questionService');
const UserQuestionHistory = require('../models/UserQuestionHistory');
const router = express.Router();

// @route   GET /api/questions
// @desc    Get questions for evaluation (randomized)
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      count = 10,
      categories,
      difficulties,
      tags,
      level,
      type = 'random' // random, adaptive, recommended, skill-assessment
    } = req.query;

    const userId = req.user._id;
    const parsedCount = parseInt(count);

    let questions;

    switch (type) {
      case 'level':
        if (!level) {
          return res.status(400).json({
            success: false,
            message: 'Level is required for level-based questions'
          });
        }
        questions = await QuestionService.getQuestionsByLevel(userId, level, parsedCount);
        break;

      case 'skill-assessment':
        const assessmentCategories = categories ? categories.split(',') : ['javascript', 'html_css', 'general_programming'];
        questions = await QuestionService.getSkillAssessmentQuestions(userId, assessmentCategories, parsedCount);
        break;

      case 'recommended':
        questions = await QuestionService.getRecommendedQuestions(userId, parsedCount);
        break;

      case 'adaptive':
        // Get session history from request body or session
        const sessionHistory = req.body.sessionHistory || [];
        questions = [await QuestionService.getAdaptiveNextQuestion(userId, sessionHistory)];
        break;

      default:
        const options = {
          count: parsedCount,
          categories: categories ? categories.split(',') : [],
          difficulties: difficulties ? difficulties.split(',') : [],
          tags: tags ? tags.split(',') : []
        };
        questions = await QuestionService.getRandomizedQuestions(userId, options);
    }

    res.json({
      success: true,
      data: questions,
      sessionId: QuestionService.generateSessionId(),
      count: questions.length
    });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// @route   POST /api/questions/validate
// @desc    Validate user answer and get feedback
// @access  Private
router.post('/validate', authenticate, async (req, res) => {
  try {
    const { questionId, userAnswer, sessionId, timeSpent } = req.body;

    if (!questionId || userAnswer === undefined || !sessionId || timeSpent === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: questionId, userAnswer, sessionId, timeSpent'
      });
    }

    const result = await QuestionService.validateAnswer(
      req.user._id,
      questionId,
      userAnswer,
      sessionId,
      parseInt(timeSpent)
    );

    // Update user stats
    await req.user.updateStats(result.pointsEarned, parseInt(timeSpent));

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Validate answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate answer'
    });
  }
});

// @route   GET /api/questions/categories
// @desc    Get available question categories
// @access  Private
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await Question.distinct('category', { isActive: true });
    const categoryStats = await Promise.all(
      categories.map(async (category) => {
        const count = await Question.countDocuments({ category, isActive: true });
        const difficulties = await Question.distinct('difficulty', { category, isActive: true });
        return { category, count, difficulties };
      })
    );

    res.json({
      success: true,
      data: categoryStats
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// @route   GET /api/questions/stats/:id
// @desc    Get question statistics
// @access  Private
router.get('/stats/:id', authenticate, async (req, res) => {
  try {
    const stats = await QuestionService.getQuestionStats(req.params.id);
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get question stats error:', error);
    res.status(404).json({
      success: false,
      message: 'Question not found or failed to fetch statistics'
    });
  }
});

// ADMIN ROUTES

// @route   GET /api/questions/admin
// @desc    Get all questions for admin management
// @access  Admin
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
      ]
    };

    const questions = await Question.paginate(query, options);

    res.json({
      success: true,
      data: questions.docs,
      pagination: {
        page: questions.page,
        pages: questions.totalPages,
        total: questions.totalDocs,
        limit: questions.limit
      }
    });

  } catch (error) {
    console.error('Get admin questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch questions'
    });
  }
});

// @route   POST /api/questions/admin
// @desc    Create new question
// @access  Admin
router.post('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const questionData = {
      ...req.body,
      createdBy: req.user._id
    };

    const question = new Question(questionData);
    await question.save();

    await question.populate([
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: question
    });

  } catch (error) {
    console.error('Create question error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create question'
    });
  }
});

// @route   PUT /api/questions/admin/:id
// @desc    Update question
// @access  Admin
router.put('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = {
      ...req.body,
      lastModifiedBy: req.user._id,
      version: req.body.version ? req.body.version + 1 : 2
    };

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' }
    ]);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });

  } catch (error) {
    console.error('Update question error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update question'
    });
  }
});

// @route   DELETE /api/questions/admin/:id
// @desc    Delete (deactivate) question
// @access  Admin
router.delete('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Soft delete - deactivate instead of removing
    question.isActive = false;
    question.lastModifiedBy = req.user._id;
    await question.save();

    res.json({
      success: true,
      message: 'Question deactivated successfully'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question'
    });
  }
});

// @route   POST /api/questions/admin/bulk
// @desc    Bulk create questions
// @access  Admin
router.post('/admin/bulk', authenticate, requireAdmin, async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'Questions must be an array'
      });
    }

    const questionsWithCreator = questions.map(q => ({
      ...q,
      createdBy: req.user._id
    }));

    const result = await Question.insertMany(questionsWithCreator, { ordered: false });

    res.status(201).json({
      success: true,
      message: `Successfully created ${result.length} questions`,
      data: { created: result.length, total: questions.length }
    });

  } catch (error) {
    console.error('Bulk create questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create questions in bulk'
    });
  }
});

// @route   POST /api/questions/admin/validate-pool
// @desc    Validate question pool sufficiency
// @access  Admin
router.post('/admin/validate-pool', authenticate, requireAdmin, async (req, res) => {
  try {
    const validation = await QuestionService.validateQuestionPool(req.body);
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Validate question pool error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate question pool'
    });
  }
});

module.exports = router;