const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  ssoId: {
    type: String,
    sparse: true,
    unique: true
  },
  provider: {
    type: String,
    enum: ['local', 'oauth2', 'saml'],
    default: 'local'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  department: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      system: {
        type: Boolean,
        default: true
      }
    }
  },
  stats: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    bestScore: {
      type: Number,
      default: 0
    },
    totalTimeSpent: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ ssoId: 1 });
userSchema.index({ role: 1 });

// Hash password before saving (only for local auth users)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Update user statistics
userSchema.methods.updateStats = async function(score, timeSpent) {
  this.stats.totalAttempts += 1;
  this.stats.totalTimeSpent += timeSpent;
  
  // Calculate new average score
  const totalScore = (this.stats.averageScore * (this.stats.totalAttempts - 1)) + score;
  this.stats.averageScore = Math.round(totalScore / this.stats.totalAttempts);
  
  // Update best score if current score is higher
  if (score > this.stats.bestScore) {
    this.stats.bestScore = score;
  }
  
  this.lastLogin = new Date();
  await this.save();
};

// Get user's public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    role: this.role,
    department: this.department,
    jobTitle: this.jobTitle,
    profilePicture: this.profilePicture,
    stats: this.stats,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

// Hide sensitive information when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.ssoId;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;