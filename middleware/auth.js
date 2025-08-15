const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'evaluation-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

// Middleware to authenticate JWT token
const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Authentication error',
        error: err.message 
      });
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Invalid token.' 
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated.' 
      });
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

// Middleware to check if user is authenticated (session-based)
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required.' 
    });
  }
  
  if (!req.user.isActive) {
    return res.status(403).json({ 
      success: false, 
      message: 'Account is deactivated.' 
    });
  }
  
  next();
};

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware to extract and validate SSO user info
const extractSSOUserInfo = (req, res, next) => {
  if (req.user && req.user.provider !== 'local') {
    // User is authenticated via SSO
    req.ssoUser = {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      provider: req.user.provider,
      department: req.user.department,
      jobTitle: req.user.jobTitle
    };
  }
  next();
};

// Middleware to refresh JWT token if close to expiry
const refreshTokenIfNeeded = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    try {
      const decoded = jwt.decode(token);
      const now = Date.now() / 1000;
      
      // If token expires in less than 1 hour, provide a new one
      if (decoded.exp - now < 3600) {
        const newToken = generateToken(req.user._id);
        res.setHeader('X-New-Token', newToken);
      }
    } catch (error) {
      // Token is invalid, but let other middleware handle it
    }
  }
  
  next();
};

// Middleware to log authentication events
const logAuthEvent = (event, details = {}) => {
  return (req, res, next) => {
    const logData = {
      event,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id,
      ...details
    };
    
    console.log('Auth Event:', JSON.stringify(logData, null, 2));
    
    // In production, you might want to send this to a logging service
    // like Winston, Sentry, or CloudWatch
    
    next();
  };
};

module.exports = {
  generateToken,
  authenticate,
  requireAdmin,
  requireAuth,
  optionalAuth,
  authRateLimit,
  extractSSOUserInfo,
  refreshTokenIfNeeded,
  logAuthEvent
};