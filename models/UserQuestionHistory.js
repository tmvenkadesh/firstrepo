const mongoose = require('mongoose');

const userQuestionHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  userAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    required: true,
    min: 0
  },
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  questionData: {
    // Store question snapshot at the time of answering
    questionText: String,
    category: String,
    difficulty: String,
    correctAnswer: mongoose.Schema.Types.Mixed,
    explanation: String,
    maxPoints: Number
  },
  feedback: {
    type: String,
    trim: true
  },
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
userQuestionHistorySchema.index({ userId: 1, createdAt: -1 });
userQuestionHistorySchema.index({ sessionId: 1, createdAt: 1 });
userQuestionHistorySchema.index({ userId: 1, questionId: 1 });
userQuestionHistorySchema.index({ userId: 1, 'questionData.category': 1 });
userQuestionHistorySchema.index({ userId: 1, isCorrect: 1 });

// Static method to get user's recent questions (to avoid repeats)
userQuestionHistorySchema.statics.getRecentQuestions = function(userId, days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    userId: userId,
    createdAt: { $gte: cutoffDate }
  }).distinct('questionId');
};

// Static method to get user's performance by category
userQuestionHistorySchema.statics.getUserPerformanceByCategory = function(userId, timeFrame = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - timeFrame);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: '$questionData.category',
        totalQuestions: { $sum: 1 },
        correctAnswers: {
          $sum: { $cond: ['$isCorrect', 1, 0] }
        },
        totalPoints: { $sum: '$pointsEarned' },
        averageTime: { $avg: '$timeSpent' },
        totalTime: { $sum: '$timeSpent' }
      }
    },
    {
      $addFields: {
        successRate: {
          $round: [
            { $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] },
            1
          ]
        }
      }
    },
    {
      $sort: { totalQuestions: -1 }
    }
  ]);
};

// Static method to get user's performance trend
userQuestionHistorySchema.statics.getUserPerformanceTrend = function(userId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalQuestions: { $sum: 1 },
        correctAnswers: {
          $sum: { $cond: ['$isCorrect', 1, 0] }
        },
        totalPoints: { $sum: '$pointsEarned' },
        averageTime: { $avg: '$timeSpent' }
      }
    },
    {
      $addFields: {
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          }
        },
        successRate: {
          $round: [
            { $multiply: [{ $divide: ['$correctAnswers', '$totalQuestions'] }, 100] },
            1
          ]
        }
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $project: {
        _id: 0,
        date: 1,
        totalQuestions: 1,
        correctAnswers: 1,
        totalPoints: 1,
        averageTime: 1,
        successRate: 1
      }
    }
  ]);
};

// Static method to check if user has answered a question before
userQuestionHistorySchema.statics.hasUserAnsweredQuestion = function(userId, questionId) {
  return this.findOne({
    userId: userId,
    questionId: questionId
  });
};

// Static method to get questions user hasn't answered
userQuestionHistorySchema.statics.getUnansweredQuestions = async function(userId, totalQuestions) {
  const answeredQuestionIds = await this.find({ userId: userId }).distinct('questionId');
  
  const Question = mongoose.model('Question');
  return Question.find({
    _id: { $nin: answeredQuestionIds },
    isActive: true
  }).limit(totalQuestions);
};

// Method to calculate points earned based on correctness, time, and difficulty
userQuestionHistorySchema.methods.calculatePoints = function() {
  if (!this.isCorrect) {
    this.pointsEarned = 0;
    return 0;
  }
  
  let basePoints = this.questionData.maxPoints || 1;
  
  // Time bonus: faster answers get more points (up to 50% bonus)
  const maxTime = 120; // 2 minutes max for full time bonus
  const timeBonus = Math.max(0, (maxTime - this.timeSpent) / maxTime) * 0.5;
  
  this.pointsEarned = Math.round(basePoints * (1 + timeBonus));
  return this.pointsEarned;
};

// Instance method to provide detailed feedback
userQuestionHistorySchema.methods.getDetailedFeedback = function() {
  const feedback = {
    isCorrect: this.isCorrect,
    pointsEarned: this.pointsEarned,
    timeSpent: this.timeSpent,
    correctAnswer: this.questionData.correctAnswer,
    explanation: this.questionData.explanation
  };
  
  if (this.isCorrect) {
    if (this.timeSpent < 30) {
      feedback.message = 'Excellent! Quick and correct.';
    } else if (this.timeSpent < 60) {
      feedback.message = 'Great job! Correct answer.';
    } else {
      feedback.message = 'Correct, but consider reviewing for faster response time.';
    }
  } else {
    if (this.timeSpent > 60) {
      feedback.message = 'Take time to understand the concept better.';
    } else {
      feedback.message = 'Review the explanation and try similar questions.';
    }
  }
  
  return feedback;
};

const UserQuestionHistory = mongoose.model('UserQuestionHistory', userQuestionHistorySchema);

module.exports = UserQuestionHistory;