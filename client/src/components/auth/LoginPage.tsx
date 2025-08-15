import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, ssoConfig } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }

    // Check for SSO errors in URL params
    const errorParam = searchParams.get('error');
    if (errorParam) {
      switch (errorParam) {
        case 'sso_error':
          setError('SSO authentication failed. Please try again.');
          break;
        case 'sso_failed':
          setError('SSO login was unsuccessful. Please try again.');
          break;
        case 'session_error':
          setError('Session error occurred. Please try logging in again.');
          break;
        case 'saml_error':
          setError('SAML authentication failed. Please try again.');
          break;
        case 'saml_failed':
          setError('SAML login was unsuccessful. Please try again.');
          break;
        default:
          setError('Authentication error occurred. Please try again.');
      }
    }

    // Handle token from URL (SSO redirect)
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Remove token from URL and redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = (provider: { name: string; displayName: string; loginUrl: string }) => {
    // Redirect to SSO provider
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}${provider.loginUrl}`;
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Online Evaluation Tools</h1>
          <p>Sign in to access your developer evaluations</p>
        </div>

        <div className="login-form-container">
          {/* SSO Login Options */}
          {ssoConfig?.ssoEnabled && ssoConfig.providers.length > 0 && (
            <div className="sso-section">
              <h3>Enterprise Login</h3>
              {ssoConfig.providers.map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  className="sso-button"
                  onClick={() => handleSSOLogin(provider)}
                >
                  Sign in with {provider.displayName}
                </button>
              ))}
              
              <div className="divider">
                <span>or</span>
              </div>
            </div>
          )}

          {/* Local Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;