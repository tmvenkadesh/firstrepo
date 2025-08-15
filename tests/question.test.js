const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Question = require('../models/Question');
const QuestionService = require('../services/questionService');

// Test database
const MONGODB_TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/evaluation-tools-test';

describe('Question Management', () => {
  let adminUser, regularUser, adminToken, userToken;

  beforeAll(async () => {
    await mongoose.connect(MONGODB_TEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Create test users
    adminUser = new User({
      email: 'admin@test.com',
      name: 'Admin User',
      password: 'password123',
      role: 'admin',
      provider: 'local'
    });
    await adminUser.save();

    regularUser = new User({
      email: 'user@test.com',
      name: 'Regular User',
      password: 'password123',
      role: 'user',
      provider: 'local'
    });
    await regularUser.save();

    // Login users to get tokens
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    userToken = userLogin.body.token;
  });

  beforeEach(async () => {
    // Clean up questions before each test
    await Question.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Question.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Question Model', () => {
    it('should create a valid multiple choice question', async () => {
      const questionData = {
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false }
        ],
        difficulty: 'easy',
        category: 'general_programming',
        createdBy: adminUser._id
      };

      const question = new Question(questionData);
      await question.save();

      expect(question.questionText).toBe('What is 2 + 2?');
      expect(question.correctAnswer).toBe('4');
      expect(question.options.length).toBe(3);
      expect(question.points).toBe(1); // easy questions should have 1 point
    });

    it('should validate answer correctly', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false }
        ],
        difficulty: 'easy',
        category: 'general_programming',
        createdBy: adminUser._id
      });
      await question.save();

      expect(question.validateAnswer('4')).toBe(true);
      expect(question.validateAnswer('3')).toBe(false);
    });

    it('should handle true/false questions', async () => {
      const question = new Question({
        questionText: 'JavaScript is a programming language.',
        questionType: 'true_false',
        correctAnswer: true,
        difficulty: 'easy',
        category: 'javascript',
        createdBy: adminUser._id
      });
      await question.save();

      expect(question.options.length).toBe(2);
      expect(question.validateAnswer('true')).toBe(true);
      expect(question.validateAnswer(true)).toBe(true);
      expect(question.validateAnswer('false')).toBe(false);
    });

    it('should not reveal correct answer in display format', async () => {
      const question = new Question({
        questionText: 'What is 2 + 2?',
        questionType: 'multiple_choice',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true }
        ],
        difficulty: 'easy',
        category: 'general_programming',
        createdBy: adminUser._id
      });
      await question.save();

      const displayQuestion = question.getForDisplay();
      
      expect(displayQuestion.correctAnswer).toBeUndefined();
      expect(displayQuestion.usage).toBeUndefined();
      expect(displayQuestion.options[0].isCorrect).toBeUndefined();
      expect(displayQuestion.options[1].isCorrect).toBeUndefined();
    });
  });

  describe('Question Service', () => {
    beforeEach(async () => {
      // Create sample questions
      const sampleQuestions = [
        {
          questionText: 'Easy JavaScript Question 1',
          questionType: 'multiple_choice',
          options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
          difficulty: 'easy',
          category: 'javascript',
          createdBy: adminUser._id
        },
        {
          questionText: 'Easy JavaScript Question 2',
          questionType: 'multiple_choice',
          options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
          difficulty: 'easy',
          category: 'javascript',
          createdBy: adminUser._id
        },
        {
          questionText: 'Hard Python Question',
          questionType: 'text',
          correctAnswer: 'Complex answer',
          difficulty: 'hard',
          category: 'python',
          createdBy: adminUser._id
        }
      ];

      await Question.insertMany(sampleQuestions);
    });

    it('should get randomized questions', async () => {
      const questions = await QuestionService.getRandomizedQuestions(regularUser._id, {
        count: 2,
        categories: ['javascript'],
        difficulties: ['easy']
      });

      expect(questions).toHaveLength(2);
      expect(questions[0].category).toBe('javascript');
      expect(questions[0].difficulty).toBe('easy');
      expect(questions[0].correctAnswer).toBeUndefined();
    });

    it('should validate answer and create history', async () => {
      const question = await Question.findOne({ category: 'javascript' });
      const sessionId = QuestionService.generateSessionId();

      const result = await QuestionService.validateAnswer(
        regularUser._id,
        question._id,
        question.correctAnswer,
        sessionId,
        30
      );

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBeGreaterThan(0);
      expect(result.feedback).toBeDefined();
    });

    it('should get questions by level', async () => {
      const beginnerQuestions = await QuestionService.getQuestionsByLevel(
        regularUser._id,
        'beginner',
        2
      );

      expect(beginnerQuestions).toHaveLength(2);
      // Should contain mostly easy and medium questions for beginner level
      const difficulties = beginnerQuestions.map(q => q.difficulty);
      expect(difficulties.every(d => ['easy', 'medium'].includes(d))).toBe(true);
    });

    it('should analyze performance correctly', () => {
      const sessionHistory = [
        { isCorrect: true, difficulty: 'easy', category: 'javascript' },
        { isCorrect: false, difficulty: 'easy', category: 'javascript' },
        { isCorrect: true, difficulty: 'medium', category: 'python' }
      ];

      const analysis = QuestionService.analyzePerformance(sessionHistory);

      expect(analysis.successRate).toBeCloseTo(0.67, 2);
      expect(analysis.totalQuestions).toBe(3);
      expect(analysis.correctAnswers).toBe(2);
    });

    it('should validate question pool sufficiency', async () => {
      const validation = await QuestionService.validateQuestionPool({
        totalQuestions: 5,
        categories: ['javascript', 'python'],
        difficulties: ['easy', 'hard'],
        minQuestionsPerCategory: 1
      });

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect insufficient question pool', async () => {
      const validation = await QuestionService.validateQuestionPool({
        totalQuestions: 100, // More than we have
        categories: ['javascript'],
        minQuestionsPerCategory: 50 // More than available
      });

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Question API Endpoints', () => {
    beforeEach(async () => {
      // Create sample questions
      await Question.create([
        {
          questionText: 'Sample Question 1',
          questionType: 'multiple_choice',
          options: [{ text: 'A', isCorrect: true }, { text: 'B', isCorrect: false }],
          difficulty: 'easy',
          category: 'javascript',
          createdBy: adminUser._id
        },
        {
          questionText: 'Sample Question 2',
          questionType: 'text',
          correctAnswer: 'Answer',
          difficulty: 'medium',
          category: 'python',
          createdBy: adminUser._id
        }
      ]);
    });

    describe('GET /api/questions', () => {
      it('should get random questions for authenticated user', async () => {
        const res = await request(app)
          .get('/api/questions?count=1')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.sessionId).toBeDefined();
        expect(res.body.data[0].correctAnswer).toBeUndefined();
      });

      it('should filter questions by category', async () => {
        const res = await request(app)
          .get('/api/questions?categories=javascript&count=1')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(res.body.data[0].category).toBe('javascript');
      });

      it('should reject unauthenticated requests', async () => {
        await request(app)
          .get('/api/questions')
          .expect(401);
      });
    });

    describe('POST /api/questions/validate', () => {
      it('should validate correct answer', async () => {
        const question = await Question.findOne({ category: 'javascript' });
        
        const res = await request(app)
          .post('/api/questions/validate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            questionId: question._id,
            userAnswer: question.correctAnswer,
            sessionId: 'test-session-123',
            timeSpent: 45
          })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.isCorrect).toBe(true);
        expect(res.body.data.pointsEarned).toBeGreaterThan(0);
      });

      it('should validate incorrect answer', async () => {
        const question = await Question.findOne({ category: 'javascript' });
        
        const res = await request(app)
          .post('/api/questions/validate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            questionId: question._id,
            userAnswer: 'wrong answer',
            sessionId: 'test-session-123',
            timeSpent: 60
          })
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.isCorrect).toBe(false);
        expect(res.body.data.pointsEarned).toBe(0);
      });

      it('should require all fields', async () => {
        await request(app)
          .post('/api/questions/validate')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            questionId: 'test-id',
            userAnswer: 'answer'
            // missing sessionId and timeSpent
          })
          .expect(400);
      });
    });

    describe('Admin Question Management', () => {
      it('should allow admin to create questions', async () => {
        const questionData = {
          questionText: 'New admin question?',
          questionType: 'multiple_choice',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          difficulty: 'medium',
          category: 'general_programming',
          tags: ['test', 'admin']
        };

        const res = await request(app)
          .post('/api/questions/admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(questionData)
          .expect(201);

        expect(res.body.success).toBe(true);
        expect(res.body.data.questionText).toBe(questionData.questionText);
        expect(res.body.data.createdBy._id).toBe(adminUser._id.toString());
      });

      it('should prevent non-admin from creating questions', async () => {
        const questionData = {
          questionText: 'Unauthorized question?',
          questionType: 'multiple_choice',
          options: [
            { text: 'Option A', isCorrect: true },
            { text: 'Option B', isCorrect: false }
          ],
          difficulty: 'easy',
          category: 'general_programming'
        };

        await request(app)
          .post('/api/questions/admin')
          .set('Authorization', `Bearer ${userToken}`)
          .send(questionData)
          .expect(403);
      });

      it('should allow admin to get all questions', async () => {
        const res = await request(app)
          .get('/api/questions/admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
      });

      it('should allow admin to update questions', async () => {
        const question = await Question.findOne();
        
        const updates = {
          questionText: 'Updated question text',
          difficulty: 'hard'
        };

        const res = await request(app)
          .put(`/api/questions/admin/${question._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.questionText).toBe(updates.questionText);
        expect(res.body.data.difficulty).toBe(updates.difficulty);
      });

      it('should allow admin to deactivate questions', async () => {
        const question = await Question.findOne();
        
        const res = await request(app)
          .delete(`/api/questions/admin/${question._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);

        // Check that question is deactivated, not deleted
        const updatedQuestion = await Question.findById(question._id);
        expect(updatedQuestion.isActive).toBe(false);
      });
    });

    describe('GET /api/questions/categories', () => {
      it('should return available categories with stats', async () => {
        const res = await request(app)
          .get('/api/questions/categories')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].category).toBeDefined();
        expect(res.body.data[0].count).toBeDefined();
        expect(res.body.data[0].difficulties).toBeDefined();
      });
    });
  });
});