const Question = require('../models/Question');
const UserQuestionHistory = require('../models/UserQuestionHistory');
const { v4: uuidv4 } = require('uuid');

class QuestionService {
  
  // Get randomized questions for a user session
  static async getRandomizedQuestions(userId, options = {}) {
    const {
      count = 10,
      categories = [],
      difficulties = [],
      tags = [],
      avoidRecentQuestions = true,
      recentDays = 7,
      useWeightedRandomization = true
    } = options;

    try {
      // Get questions user has answered recently to avoid repeats
      let excludeIds = [];
      if (avoidRecentQuestions) {
        excludeIds = await UserQuestionHistory.getRecentQuestions(userId, recentDays);
      }

      // Build filters
      const filters = {};
      if (categories.length > 0) filters.category = { $in: categories };
      if (difficulties.length > 0) filters.difficulty = { $in: difficulties };
      if (tags.length > 0) filters.tags = { $in: tags };

      let questions;
      
      if (useWeightedRandomization) {
        // Use weighted randomization (less asked questions preferred)
        questions = await Question.getWeightedRandomQuestions(count, filters, excludeIds);
      } else {
        // Use simple randomization
        questions = await Question.getRandomQuestions(count, filters, excludeIds);
      }

      // If we don't have enough unique questions, fill with previously asked ones
      if (questions.length < count && excludeIds.length > 0) {
        const additionalCount = count - questions.length;
        const additionalQuestions = await Question.getRandomQuestions(
          additionalCount,
          filters,
          questions.map(q => q._id)
        );
        questions = [...questions, ...additionalQuestions];
      }

      // Convert to display format (remove answers)
      return questions.map(q => {
        const question = new Question(q);
        return question.getForDisplay();
      });

    } catch (error) {
      console.error('Error getting randomized questions:', error);
      throw new Error('Failed to fetch randomized questions');
    }
  }

  // Get questions by specific criteria with smart selection
  static async getQuestionsByLevel(userId, level, count = 10) {
    const levelConfigs = {
      beginner: {
        difficulties: ['easy', 'medium'],
        categories: ['javascript', 'html_css', 'general_programming'],
        weights: { easy: 0.7, medium: 0.3 }
      },
      intermediate: {
        difficulties: ['medium', 'hard'],
        categories: ['javascript', 'python', 'react', 'nodejs', 'databases'],
        weights: { medium: 0.6, hard: 0.4 }
      },
      advanced: {
        difficulties: ['hard'],
        categories: ['algorithms', 'system_design', 'devops', 'security'],
        weights: { hard: 1.0 }
      }
    };

    const config = levelConfigs[level];
    if (!config) {
      throw new Error('Invalid level specified');
    }

    // Get questions for each difficulty based on weights
    const questions = [];
    
    for (const [difficulty, weight] of Object.entries(config.weights)) {
      const difficultyCount = Math.ceil(count * weight);
      const difficultyQuestions = await this.getRandomizedQuestions(userId, {
        count: difficultyCount,
        categories: config.categories,
        difficulties: [difficulty]
      });
      questions.push(...difficultyQuestions);
    }

    // Shuffle and return exact count
    return this.shuffleArray(questions).slice(0, count);
  }

  // Get questions for skill assessment in specific categories
  static async getSkillAssessmentQuestions(userId, categories, totalQuestions = 20) {
    const questions = [];
    const questionsPerCategory = Math.ceil(totalQuestions / categories.length);

    for (const category of categories) {
      // Get balanced questions across difficulties for each category
      const easyCount = Math.ceil(questionsPerCategory * 0.3);
      const mediumCount = Math.ceil(questionsPerCategory * 0.5);
      const hardCount = questionsPerCategory - easyCount - mediumCount;

      const categoryQuestions = await Promise.all([
        this.getRandomizedQuestions(userId, {
          count: easyCount,
          categories: [category],
          difficulties: ['easy']
        }),
        this.getRandomizedQuestions(userId, {
          count: mediumCount,
          categories: [category],
          difficulties: ['medium']
        }),
        this.getRandomizedQuestions(userId, {
          count: hardCount,
          categories: [category],
          difficulties: ['hard']
        })
      ]);

      questions.push(...categoryQuestions.flat());
    }

    return this.shuffleArray(questions).slice(0, totalQuestions);
  }

  // Validate user answer and record history
  static async validateAnswer(userId, questionId, userAnswer, sessionId, timeSpent) {
    try {
      const question = await Question.findById(questionId);
      if (!question) {
        throw new Error('Question not found');
      }

      const isCorrect = question.validateAnswer(userAnswer);
      
      // Create history record
      const historyRecord = new UserQuestionHistory({
        userId,
        questionId,
        sessionId,
        userAnswer,
        isCorrect,
        timeSpent,
        questionData: {
          questionText: question.questionText,
          category: question.category,
          difficulty: question.difficulty,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          maxPoints: question.points
        }
      });

      // Calculate points
      const pointsEarned = historyRecord.calculatePoints();

      // Update question usage statistics
      await question.updateUsage(isCorrect, timeSpent);

      // Save history record
      await historyRecord.save();

      return {
        isCorrect,
        pointsEarned,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        feedback: historyRecord.getDetailedFeedback()
      };

    } catch (error) {
      console.error('Error validating answer:', error);
      throw new Error('Failed to validate answer');
    }
  }

  // Get adaptive next question based on user performance
  static async getAdaptiveNextQuestion(userId, sessionHistory = []) {
    try {
      // Analyze recent performance
      const recentPerformance = this.analyzePerformance(sessionHistory);
      
      let targetDifficulty = 'medium';
      let preferredCategories = [];

      if (recentPerformance.successRate > 0.8) {
        // User is doing well, increase difficulty
        targetDifficulty = recentPerformance.averageDifficulty === 'easy' ? 'medium' : 'hard';
      } else if (recentPerformance.successRate < 0.4) {
        // User is struggling, decrease difficulty
        targetDifficulty = recentPerformance.averageDifficulty === 'hard' ? 'medium' : 'easy';
      }

      // Focus on categories where user needs improvement
      if (recentPerformance.weakCategories.length > 0) {
        preferredCategories = recentPerformance.weakCategories.slice(0, 3);
      }

      const questions = await this.getRandomizedQuestions(userId, {
        count: 1,
        categories: preferredCategories,
        difficulties: [targetDifficulty],
        avoidRecentQuestions: true,
        recentDays: 1 // Only avoid questions from current session
      });

      return questions[0] || null;

    } catch (error) {
      console.error('Error getting adaptive question:', error);
      throw new Error('Failed to get adaptive question');
    }
  }

  // Analyze user performance for adaptive questioning
  static analyzePerformance(sessionHistory) {
    if (!sessionHistory || sessionHistory.length === 0) {
      return {
        successRate: 0.5,
        averageDifficulty: 'medium',
        weakCategories: [],
        strongCategories: []
      };
    }

    const totalQuestions = sessionHistory.length;
    const correctAnswers = sessionHistory.filter(h => h.isCorrect).length;
    const successRate = correctAnswers / totalQuestions;

    // Calculate difficulty distribution
    const difficultyCount = sessionHistory.reduce((acc, h) => {
      acc[h.difficulty] = (acc[h.difficulty] || 0) + 1;
      return acc;
    }, {});

    const averageDifficulty = Object.keys(difficultyCount).reduce((prev, curr) =>
      difficultyCount[prev] > difficultyCount[curr] ? prev : curr
    );

    // Analyze category performance
    const categoryPerformance = sessionHistory.reduce((acc, h) => {
      if (!acc[h.category]) {
        acc[h.category] = { total: 0, correct: 0 };
      }
      acc[h.category].total++;
      if (h.isCorrect) acc[h.category].correct++;
      return acc;
    }, {});

    const categoryStats = Object.keys(categoryPerformance).map(category => ({
      category,
      successRate: categoryPerformance[category].correct / categoryPerformance[category].total,
      total: categoryPerformance[category].total
    }));

    const weakCategories = categoryStats
      .filter(stat => stat.successRate < 0.5 && stat.total >= 2)
      .map(stat => stat.category);

    const strongCategories = categoryStats
      .filter(stat => stat.successRate > 0.8 && stat.total >= 2)
      .map(stat => stat.category);

    return {
      successRate,
      averageDifficulty,
      weakCategories,
      strongCategories,
      totalQuestions,
      correctAnswers
    };
  }

  // Get question recommendations based on user history
  static async getRecommendedQuestions(userId, count = 5) {
    try {
      // Get user's performance by category
      const categoryPerformance = await UserQuestionHistory.getUserPerformanceByCategory(userId);
      
      // Identify areas for improvement
      const improvementAreas = categoryPerformance
        .filter(cat => cat.successRate < 70 || cat.totalQuestions < 5)
        .sort((a, b) => a.successRate - b.successRate)
        .slice(0, 3);

      if (improvementAreas.length === 0) {
        // User is doing well, provide mixed questions
        return this.getRandomizedQuestions(userId, { count });
      }

      // Get questions from improvement areas
      const categories = improvementAreas.map(area => area._id);
      return this.getRandomizedQuestions(userId, {
        count,
        categories,
        difficulties: ['easy', 'medium'],
        avoidRecentQuestions: true
      });

    } catch (error) {
      console.error('Error getting recommended questions:', error);
      return this.getRandomizedQuestions(userId, { count });
    }
  }

  // Utility method to shuffle array
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Get question statistics
  static async getQuestionStats(questionId) {
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const totalAttempts = await UserQuestionHistory.countDocuments({ questionId });
    const correctAttempts = await UserQuestionHistory.countDocuments({ 
      questionId, 
      isCorrect: true 
    });

    const avgTimeResult = await UserQuestionHistory.aggregate([
      { $match: { questionId: question._id } },
      { $group: { _id: null, avgTime: { $avg: '$timeSpent' } } }
    ]);

    return {
      id: questionId,
      timesAsked: totalAttempts,
      successRate: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
      averageTime: avgTimeResult.length > 0 ? Math.round(avgTimeResult[0].avgTime) : 0,
      difficulty: question.difficulty,
      category: question.category
    };
  }

  // Generate session ID for tracking
  static generateSessionId() {
    return uuidv4();
  }

  // Validate question pool sufficiency
  static async validateQuestionPool(requirements) {
    const {
      totalQuestions,
      categories = [],
      difficulties = [],
      minQuestionsPerCategory = 5
    } = requirements;

    const validationResults = {
      isValid: true,
      issues: [],
      recommendations: []
    };

    // Check total question count
    const totalAvailable = await Question.countDocuments({ isActive: true });
    if (totalAvailable < totalQuestions) {
      validationResults.isValid = false;
      validationResults.issues.push(
        `Insufficient total questions: need ${totalQuestions}, available ${totalAvailable}`
      );
    }

    // Check category distribution
    if (categories.length > 0) {
      for (const category of categories) {
        const categoryCount = await Question.countDocuments({
          category,
          isActive: true
        });
        
        if (categoryCount < minQuestionsPerCategory) {
          validationResults.issues.push(
            `Insufficient questions in category '${category}': need ${minQuestionsPerCategory}, available ${categoryCount}`
          );
        }
      }
    }

    // Check difficulty distribution
    if (difficulties.length > 0) {
      for (const difficulty of difficulties) {
        const difficultyCount = await Question.countDocuments({
          difficulty,
          isActive: true
        });
        
        const minRequired = Math.ceil(totalQuestions / difficulties.length);
        if (difficultyCount < minRequired) {
          validationResults.issues.push(
            `Insufficient questions for difficulty '${difficulty}': recommended ${minRequired}, available ${difficultyCount}`
          );
        }
      }
    }

    if (validationResults.issues.length > 0) {
      validationResults.isValid = false;
      validationResults.recommendations.push(
        'Add more questions to the database',
        'Consider adjusting evaluation parameters',
        'Review question distribution across categories and difficulties'
      );
    }

    return validationResults;
  }
}

module.exports = QuestionService;