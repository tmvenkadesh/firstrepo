const jwt = require('jsonwebtoken');

// Helper function to decode Azure AD JWT token
const decodeAzureADToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return {
      sub: decoded.payload.sub,
      email: decoded.payload.email || decoded.payload.preferred_username,
      name: decoded.payload.name || decoded.payload.given_name + ' ' + decoded.payload.family_name,
      displayName: decoded.payload.name,
      department: decoded.payload.department,
      jobTitle: decoded.payload.job_title,
      groups: decoded.payload.groups || []
    };
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
};

// Helper function to decode Okta token
const decodeOktaToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return {
      sub: decoded.payload.sub,
      email: decoded.payload.email,
      name: decoded.payload.name,
      displayName: decoded.payload.name,
      department: decoded.payload.department,
      jobTitle: decoded.payload.title,
      groups: decoded.payload.groups || []
    };
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
};

// Extract user information based on provider
const extractUserInfo = (profile, provider) => {
  switch (provider) {
    case 'azure':
      return {
        id: profile.sub || profile.oid,
        email: profile.email || profile.preferred_username,
        name: profile.name || `${profile.given_name} ${profile.family_name}`,
        displayName: profile.name,
        department: profile.department,
        jobTitle: profile.job_title
      };
    
    case 'okta':
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        displayName: profile.name,
        department: profile.department,
        jobTitle: profile.title
      };
    
    case 'saml':
      return {
        id: profile.nameID,
        email: profile.email || profile.nameID,
        name: profile.displayName || profile.name || 
              `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        displayName: profile.displayName,
        department: profile.department,
        jobTitle: profile.jobTitle || profile.title
      };
    
    default:
      return {
        id: profile.id || profile.sub,
        email: profile.email,
        name: profile.name || profile.displayName,
        displayName: profile.displayName || profile.name,
        department: profile.department,
        jobTitle: profile.jobTitle || profile.title
      };
  }
};

// Validate required SSO configuration
const validateSSOConfig = (provider) => {
  const requiredEnvVars = {
    oauth2: [
      'SSO_CLIENT_ID',
      'SSO_CLIENT_SECRET',
      'SSO_AUTHORIZATION_URL',
      'SSO_TOKEN_URL',
      'SSO_USERINFO_URL'
    ],
    saml: [
      'SAML_ENTRY_POINT',
      'SAML_ISSUER',
      'SAML_CERT'
    ]
  };

  const required = requiredEnvVars[provider];
  if (!required) {
    throw new Error(`Unknown SSO provider: ${provider}`);
  }

  const missing = required.filter(envVar => !process.env[envVar]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for ${provider} SSO: ${missing.join(', ')}`);
  }
};

// Generate SSO configuration object
const generateSSOConfig = () => {
  const config = {
    ssoEnabled: false,
    providers: []
  };

  // Check OAuth2 configuration
  if (process.env.SSO_OAUTH_ENABLED === 'true') {
    try {
      validateSSOConfig('oauth2');
      config.ssoEnabled = true;
      config.providers.push({
        name: 'oauth2',
        displayName: process.env.SSO_PROVIDER_NAME || 'Enterprise SSO',
        loginUrl: '/api/auth/sso?provider=oauth2',
        type: 'oauth2'
      });
    } catch (error) {
      console.error('OAuth2 SSO configuration error:', error.message);
    }
  }

  // Check SAML configuration
  if (process.env.SSO_SAML_ENABLED === 'true') {
    try {
      validateSSOConfig('saml');
      config.ssoEnabled = true;
      config.providers.push({
        name: 'saml',
        displayName: process.env.SAML_PROVIDER_NAME || 'SAML SSO',
        loginUrl: '/api/auth/sso?provider=saml',
        type: 'saml'
      });
    } catch (error) {
      console.error('SAML SSO configuration error:', error.message);
    }
  }

  return config;
};

module.exports = {
  decodeAzureADToken,
  decodeOktaToken,
  extractUserInfo,
  validateSSOConfig,
  generateSSOConfig
};