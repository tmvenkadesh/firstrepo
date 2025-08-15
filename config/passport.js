const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const SamlStrategy = require('passport-saml').Strategy;
const User = require('../models/User');

// JWT Strategy for API authentication
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET || 'evaluation-jwt-secret'
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// OAuth2 Strategy for Enterprise SSO (Azure AD, Okta, etc.)
if (process.env.SSO_OAUTH_ENABLED === 'true') {
  passport.use('oauth2', new OAuth2Strategy({
    authorizationURL: process.env.SSO_AUTHORIZATION_URL,
    tokenURL: process.env.SSO_TOKEN_URL,
    clientID: process.env.SSO_CLIENT_ID,
    clientSecret: process.env.SSO_CLIENT_SECRET,
    callbackURL: process.env.SSO_CALLBACK_URL || '/api/auth/sso/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from profile
      const userInfo = await getUserInfoFromToken(accessToken);
      
      let user = await User.findOne({ email: userInfo.email });
      
      if (!user) {
        user = new User({
          email: userInfo.email,
          name: userInfo.name || userInfo.displayName,
          ssoId: userInfo.sub || userInfo.id,
          provider: 'oauth2',
          role: 'user'
        });
        await user.save();
      } else {
        // Update user info from SSO
        user.name = userInfo.name || userInfo.displayName || user.name;
        user.ssoId = userInfo.sub || userInfo.id || user.ssoId;
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// SAML Strategy for Enterprise SSO
if (process.env.SSO_SAML_ENABLED === 'true') {
  passport.use('saml', new SamlStrategy({
    entryPoint: process.env.SAML_ENTRY_POINT,
    issuer: process.env.SAML_ISSUER,
    callbackUrl: process.env.SAML_CALLBACK_URL || '/api/auth/saml/callback',
    cert: process.env.SAML_CERT,
    privateCert: process.env.SAML_PRIVATE_CERT
  }, async (profile, done) => {
    try {
      const email = profile.email || profile.nameID;
      const name = profile.displayName || profile.name || profile.firstName + ' ' + profile.lastName;
      
      let user = await User.findOne({ email: email });
      
      if (!user) {
        user = new User({
          email: email,
          name: name,
          ssoId: profile.nameID,
          provider: 'saml',
          role: 'user'
        });
        await user.save();
      } else {
        user.name = name || user.name;
        user.ssoId = profile.nameID || user.ssoId;
        user.lastLogin = new Date();
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Helper function to get user info from OAuth2 access token
async function getUserInfoFromToken(accessToken) {
  const fetch = require('node-fetch');
  
  try {
    const response = await fetch(process.env.SSO_USERINFO_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error('Error fetching user info: ' + error.message);
  }
}

module.exports = passport;