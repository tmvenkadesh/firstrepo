const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  questionType: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'coding', 'text'],
    default: 'multiple_choice',
    required: true
  },
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  correctAnswer: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, or object
    required: true
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'javascript',
      'python',
      'java',
      'csharp',
      'cpp',
      'html_css',
      'react',
      'nodejs',
      'databases',
      'algorithms',
      'data_structures',
      'system_design',
      'devops',
      'testing',
      'git',
      'general_programming',
      'web_development',
      'mobile_development',
      'cloud_computing',
      'security'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  timeLimit: {
    type: Number, // in seconds
    default: 60,
    min: 15,
    max: 600
  },
  points: {
    type: Number,
    default: function() {
      switch(this.difficulty) {
        case 'easy': return 1;
        case 'medium': return 2;
        case 'hard': return 3;
        default: return 2;
      }
    },
    min: 1,
    max: 5
  },
  usage: {
    timesAsked: {
      type: Number,
      default: 0
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageTime: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  version: {
    type: Number,
    default: 1
  },
  codeSnippet: {
    language: {
      type: String,
      enum: ['javascript', 'python', 'java', 'csharp', 'cpp', 'html', 'css', 'sql', 'none'],
      default: 'none'
    },
    code: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
questionSchema.index({ category: 1, difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ isActive: 1 });
questionSchema.index({ 'usage.timesAsked': 1 });
questionSchema.index({ createdBy: 1 });

// Add pagination plugin
questionSchema.plugin(mongoosePaginate);

// Virtual for success rate
questionSchema.virtual('successRate').get(function() {
  if (this.usage.totalAttempts === 0) return 0;
  return Math.round((this.usage.correctAnswers / this.usage.totalAttempts) * 100);
});

// Pre-save middleware to validate options for multiple choice questions
questionSchema.pre('save', function(next) {
  if (this.questionType === 'multiple_choice') {
    if (!this.options || this.options.length < 2) {
      return next(new Error('Multiple choice questions must have at least 2 options'));
    }
    
    const correctOptions = this.options.filter(option => option.isCorrect);
    if (correctOptions.length === 0) {
      return next(new Error('Multiple choice questions must have at least one correct option'));
    }
    
    // Set correctAnswer based on correct options
    if (correctOptions.length === 1) {
      this.correctAnswer = correctOptions[0].text;
    } else {
      this.correctAnswer = correctOptions.map(option => option.text);
    }
  }
  
  if (this.questionType === 'true_false') {
    if (!this.options || this.options.length !== 2) {
      this.options = [
        { text: 'True', isCorrect: this.correctAnswer === 'True' || this.correctAnswer === true },
        { text: 'False', isCorrect: this.correctAnswer === 'False' || this.correctAnswer === false }
      ];
    }
  }
  
  next();
});

// Method to get question for display (without revealing correct answer)
questionSchema.methods.getForDisplay = function() {
  const question = this.toObject();
  delete question.correctAnswer;
  delete question.usage;
  
  // Remove isCorrect flag from options
  if (question.options) {
    question.options = question.options.map(option => ({
      _id: option._id,
      text: option.text
    }));
  }
  
  return question;
};

// Method to validate answer
questionSchema.methods.validateAnswer = function(userAnswer) {
  if (this.questionType === 'multiple_choice') {
    if (Array.isArray(this.correctAnswer)) {
      // Multiple correct answers
      if (!Array.isArray(userAnswer)) return false;
      return this.correctAnswer.sort().toString() === userAnswer.sort().toString();
    } else {
      // Single correct answer
      return this.correctAnswer === userAnswer;
    }
  }
  
  if (this.questionType === 'true_false') {
    const normalizedCorrect = this.correctAnswer.toString().toLowerCase();
    const normalizedUser = userAnswer.toString().toLowerCase();
    return normalizedCorrect === normalizedUser;
  }
  
  if (this.questionType === 'text' || this.questionType === 'coding') {
    // For text and coding questions, we might need fuzzy matching or manual review
    // For now, exact match (case-insensitive)
    return this.correctAnswer.toLowerCase().trim() === userAnswer.toLowerCase().trim();
  }
  
  return false;
};

// Method to update usage statistics
questionSchema.methods.updateUsage = function(isCorrect, timeSpent) {
  this.usage.timesAsked += 1;
  this.usage.totalAttempts += 1;
  
  if (isCorrect) {
    this.usage.correctAnswers += 1;
  }
  
  // Update average time
  const totalTime = (this.usage.averageTime * (this.usage.totalAttempts - 1)) + timeSpent;
  this.usage.averageTime = Math.round(totalTime / this.usage.totalAttempts);
  
  return this.save();
};

// Static method to get questions by category and difficulty
questionSchema.statics.findByFilters = function(filters = {}) {
  const query = { isActive: true };
  
  if (filters.category) query.category = filters.category;
  if (filters.difficulty) query.difficulty = filters.difficulty;
  if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };
  
  return this.find(query);
};

// Static method to get random questions
questionSchema.statics.getRandomQuestions = async function(count, filters = {}, excludeIds = []) {
  const matchStage = { 
    isActive: true,
    _id: { $nin: excludeIds }
  };
  
  if (filters.category) matchStage.category = filters.category;
  if (filters.difficulty) matchStage.difficulty = filters.difficulty;
  if (filters.tags && filters.tags.length > 0) matchStage.tags = { $in: filters.tags };
  
  const questions = await this.aggregate([
    { $match: matchStage },
    { $sample: { size: count } }
  ]);
  
  return questions;
};

// Static method to get questions with weighted randomization (less asked questions have higher probability)
questionSchema.statics.getWeightedRandomQuestions = async function(count, filters = {}, excludeIds = []) {
  const matchStage = { 
    isActive: true,
    _id: { $nin: excludeIds }
  };
  
  if (filters.category) matchStage.category = filters.category;
  if (filters.difficulty) matchStage.difficulty = filters.difficulty;
  if (filters.tags && filters.tags.length > 0) matchStage.tags = { $in: filters.tags };
  
  // Get questions with inverse weight based on usage
  const questions = await this.aggregate([
    { $match: matchStage },
    {
      $addFields: {
        weight: {
          $divide: [
            1,
            { $add: ['$usage.timesAsked', 1] }
          ]
        }
      }
    },
    { $sort: { weight: -1 } },
    { $limit: count * 2 }, // Get more than needed to add randomness
    { $sample: { size: count } }
  ]);
  
  return questions;
};

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;