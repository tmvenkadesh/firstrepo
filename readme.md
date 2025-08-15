# Online Evaluation Tools

A comprehensive platform for developers to evaluate their technical knowledge through randomized questions with enterprise SSO authentication.

## 🚀 Features

### ✅ Implemented (Task 1: Enterprise SSO Authentication)

- **Enterprise SSO Integration**: OAuth 2.0 and SAML support for Azure AD, Okta, and other identity providers
- **Secure Authentication**: JWT-based API authentication with session management
- **User Management**: Complete user profile system with role-based access control
- **Protected Routes**: Frontend route protection with automatic redirects
- **Session Persistence**: Secure session handling with automatic token refresh
- **Fallback Authentication**: Local login system for non-SSO environments

### 🔄 Coming Next

- **Question Bank Management**: Dynamic question storage and randomization (Task 2)
- **Timed Evaluation Sessions**: Real-time countdown timers and session management (Task 3)
- **User Dashboard**: Evaluation history, results, and performance analytics (Task 4)
- **Admin Panel**: System configuration and comprehensive reporting (Task 5)

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB with Mongoose
- Passport.js for authentication
- JWT for API security
- Helmet for security headers

**Frontend:**
- React with TypeScript
- React Router for navigation
- Axios for API communication
- CSS3 with responsive design

**Authentication:**
- OAuth 2.0 (Azure AD, Okta)
- SAML 2.0
- JWT tokens
- Session management

## 📋 Prerequisites

- Node.js 16 or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd online-evaluation-tools
   ```

2. **Run the setup script**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

3. **Configure environment variables**
   ```bash
   # Copy and edit the environment file
   cp .env.example .env
   # Update with your configuration
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1: Backend server
   npm run dev
   
   # Terminal 2: Frontend server
   cd client && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🔐 SSO Configuration

### OAuth 2.0 (Azure AD)

```env
SSO_OAUTH_ENABLED=true
SSO_PROVIDER_NAME=Microsoft Azure AD
SSO_CLIENT_ID=your-azure-client-id
SSO_CLIENT_SECRET=your-azure-client-secret
SSO_AUTHORIZATION_URL=https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize
SSO_TOKEN_URL=https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token
SSO_USERINFO_URL=https://graph.microsoft.com/v1.0/me
SSO_CALLBACK_URL=http://localhost:5000/api/auth/sso/callback
```

### SAML 2.0

```env
SSO_SAML_ENABLED=true
SAML_PROVIDER_NAME=Your SAML Provider
SAML_ENTRY_POINT=https://your-saml-provider.com/sso/saml
SAML_ISSUER=your-app-identifier
SAML_CALLBACK_URL=http://localhost:5000/api/auth/saml/callback
SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │────│   Express API   │────│    MongoDB      │
│                 │    │                 │    │                 │
│ - Authentication│    │ - JWT Auth      │    │ - User Data     │
│ - Protected     │    │ - SSO Routes    │    │ - Sessions      │
│   Routes        │    │ - User Mgmt     │    │ - Config        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
              SSO Providers
         (Azure AD, Okta, SAML)
```

## 🔒 Security Features

- **Helmet.js**: Security headers protection
- **Rate Limiting**: API endpoint protection
- **CORS**: Configured cross-origin requests
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcryptjs for local passwords
- **Session Security**: HttpOnly cookies with CSRF protection
- **Input Validation**: Request sanitization and validation

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Local login
- `GET /api/auth/sso?provider=oauth2` - Initiate OAuth SSO
- `GET /api/auth/sso?provider=saml` - Initiate SAML SSO
- `GET /api/auth/sso/callback` - OAuth callback
- `POST /api/auth/saml/callback` - SAML callback
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `GET /api/auth/config` - Get SSO configuration

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run with coverage
npm run test:coverage

# Run frontend tests
cd client && npm test
```

## 🚀 Deployment

### Production Build

```bash
# Build the React client
npm run build

# Start production server
npm start
```

### Environment Variables

Ensure all production environment variables are set:

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-connection
JWT_SECRET=your-super-secure-jwt-secret
SESSION_SECRET=your-super-secure-session-secret
CLIENT_URL=https://your-domain.com
```

## 📚 Project Structure

```
online-evaluation-tools/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   └── ...
├── config/                 # Server configuration
├── models/                 # Database models
├── routes/                 # API routes
├── middleware/             # Custom middleware
├── utils/                  # Utility functions
├── tests/                  # Test files
├── scripts/                # Setup scripts
├── .env.example            # Environment template
└── server.js               # Main server file
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Status**: 🟢 Task 1 Complete (Enterprise SSO Authentication System)

**Next**: Task 2 - Question Bank Management and Randomization Engine