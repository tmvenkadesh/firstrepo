const express = require('express');
const passport = require('passport');
const { generateToken, authRateLimit, logAuthEvent } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// @route   POST /api/auth/login
// @desc    Local login (fallback if SSO is not available)
// @access  Public
router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || user.provider !== 'local') {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      user: user.getPublicProfile(),
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/sso
// @desc    Initiate SSO login
// @access  Public
router.get('/sso', (req, res, next) => {
  const provider = req.query.provider || 'oauth2';
  
  if (!['oauth2', 'saml'].includes(provider)) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported SSO provider'
    });
  }

  // Store return URL in session
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo;
  }

  passport.authenticate(provider)(req, res, next);
});

// @route   GET /api/auth/sso/callback
// @desc    SSO callback handler
// @access  Public
router.get('/sso/callback', 
  logAuthEvent('sso_callback_attempt'),
  (req, res, next) => {
    const provider = req.query.provider || 'oauth2';
    
    passport.authenticate(provider, (err, user, info) => {
      if (err) {
        console.error('SSO authentication error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=sso_error`);
      }

      if (!user) {
        console.error('SSO authentication failed:', info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=sso_failed`);
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('SSO login session error:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=session_error`);
        }

        // Generate JWT token for API access
        const token = generateToken(user._id);
        
        // Get return URL or default to dashboard
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;

        // Redirect to client with token
        res.redirect(`${process.env.CLIENT_URL}${returnTo}?token=${token}`);
      });
    })(req, res, next);
  }
);

// @route   GET /api/auth/saml/callback
// @desc    SAML callback handler
// @access  Public
router.post('/saml/callback', 
  logAuthEvent('saml_callback_attempt'),
  (req, res, next) => {
    passport.authenticate('saml', (err, user, info) => {
      if (err) {
        console.error('SAML authentication error:', err);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=saml_error`);
      }

      if (!user) {
        console.error('SAML authentication failed:', info);
        return res.redirect(`${process.env.CLIENT_URL}/login?error=saml_failed`);
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('SAML login session error:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login?error=session_error`);
        }

        // Generate JWT token for API access
        const token = generateToken(user._id);
        
        // Get return URL or default to dashboard
        const returnTo = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;

        // Redirect to client with token
        res.redirect(`${process.env.CLIENT_URL}${returnTo}?token=${token}`);
      });
    })(req, res, next);
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error destroying session'
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', passport.authenticate('jwt', { session: false }), (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  res.json({
    success: true,
    user: req.user.getPublicProfile()
  });
});

// @route   GET /api/auth/config
// @desc    Get SSO configuration for client
// @access  Public
router.get('/config', (req, res) => {
  const config = {
    ssoEnabled: process.env.SSO_OAUTH_ENABLED === 'true' || process.env.SSO_SAML_ENABLED === 'true',
    providers: []
  };

  if (process.env.SSO_OAUTH_ENABLED === 'true') {
    config.providers.push({
      name: 'oauth2',
      displayName: process.env.SSO_PROVIDER_NAME || 'Enterprise SSO',
      loginUrl: '/api/auth/sso?provider=oauth2'
    });
  }

  if (process.env.SSO_SAML_ENABLED === 'true') {
    config.providers.push({
      name: 'saml',
      displayName: process.env.SAML_PROVIDER_NAME || 'SAML SSO',
      loginUrl: '/api/auth/sso?provider=saml'
    });
  }

  res.json({
    success: true,
    config
  });
});

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh', passport.authenticate('jwt', { session: false }), (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  const newToken = generateToken(req.user._id);

  res.json({
    success: true,
    token: newToken,
    user: req.user.getPublicProfile()
  });
});

module.exports = router;