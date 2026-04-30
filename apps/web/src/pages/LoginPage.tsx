import { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, UserPlus, LogIn, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { login, register } from '../lib/api';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldFocus, setFieldFocus] = useState<string | null>(null);
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on mount or mode change
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 150);
  }, [mode]);

  function validateField(field: string, value: string): string | null {
    switch (field) {
      case 'username':
        if (!value.trim()) return 'Username is required';
        if (value.length < 3) return 'Username must be at least 3 characters';
        if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
        return null;
      case 'email': {
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return null;
      }
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return null;
      default:
        return null;
    }
  }

  function getFieldError(field: string): string | null {
    let value: string;
    switch (field) {
      case 'username':
        value = username;
        break;
      case 'email':
        value = email;
        break;
      case 'password':
        value = password;
        break;
      default:
        return null;
    }
    return validateField(field, value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate all fields
    const errors: string[] = [];
    const usernameError = validateField('username', username);
    if (usernameError) errors.push(usernameError);

    if (mode === 'register') {
      const emailError = validateField('email', email);
      if (emailError) {
        errors.push(emailError);
      }
    }

    const passwordError = validateField('password', password);
    if (passwordError) errors.push(passwordError);

    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setLoading(true);

    try {
      let data: { token: string; user: { firstLogin?: boolean } };

      if (mode === 'login') {
        data = await login({ username, password });
      } else {
        data = await register({ username, email, password });
      }

      localStorage.setItem('agentroom_token', data.token);

      // Check if this is the user's first login
      if (data.user.firstLogin) {
        // Redirect to first login password change page
        navigate('/first-login-change');
      } else {
        // Normal login - go to rooms
        navigate('/rooms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleInputFocus(field: string) {
    setFieldFocus(field);
  }

  function handleInputBlur(field: string) {
    setFieldFocus(null);
    const fieldError = getFieldError(field);
    if (fieldError && !error.startsWith(fieldError.split('.')[0])) {
      setError(fieldError);
    }
  }

  function handleInputChange(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (value: string) => {
      setter(value);
      if (error) {
        const currentField = setter === setUsername ? 'username' : setter === setEmail ? 'email' : 'password';
        const fieldError = getFieldError(currentField);
        if (fieldError === error || (fieldError === null && error.includes(fieldError || ''))) {
          setError('');
        }
      }
    };
  }

  function getFieldStatus(field: string): 'default' | 'focus' | 'valid' | 'error' {
    if (fieldFocus === field) return 'focus';
    let value: string;
    switch (field) {
      case 'username':
        value = username;
        break;
      case 'email':
        value = email;
        break;
      case 'password':
        value = password;
        break;
      default:
        value = '';
    }
    const fieldError = getFieldError(field);
    if (value && !fieldError && (field !== 'email' || mode === 'register')) {
      return 'valid';
    }
    if (value && fieldError) return 'error';
    return 'default';
  }

  const getModeTitle = () => {
    if (mode === 'login') return 'Welcome Back';
    return 'Create Account';
  };

  const getModeSubtitle = () => {
    if (mode === 'login') return 'Enter your credentials to access the agent grid.';
    return 'Register to join and create your first agent room.';
  };

  return (
    <div className="login-screen">
      <div className="login-bg">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="login-container">
        <div className="login-card slide-up">
          <div className="login-header">
            <div className="login-logo-icon">
              <ShieldCheck size={32} color="var(--accent)" />
            </div>
            <h1>{getModeTitle()}</h1>
            <p>{getModeSubtitle()}</p>
          </div>

          <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={mode === 'login'}
              aria-controls="auth-form-login"
              className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              <LogIn size={16} />
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={mode === 'register'}
              aria-controls="auth-form-register"
              className={`toggle-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
              type="button"
            >
              <UserPlus size={16} />
              Register
            </button>
          </div>

          <form
            ref={formRef}
            id="auth-form-login"
            role="tabpanel"
            onSubmit={handleSubmit}
            aria-labelledby="login-tab"
          >
            <div className="field">
              <label htmlFor="username">Username</label>
              <div className={`input-wrapper input-wrapper-${getFieldStatus('username')}`}>
                <Lock className="input-icon-left" size={16} />
                <input
                  ref={mode === 'login' ? firstInputRef : undefined}
                  id="username"
                  type="text"
                  className="input"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => handleInputChange(setUsername)(e.target.value)}
                  onFocus={() => handleInputFocus('username')}
                  onBlur={() => handleInputBlur('username')}
                  autoComplete="username"
                  autoFocus={mode === 'login'}
                  required
                  disabled={loading}
                  aria-invalid={getFieldStatus('username') === 'error'}
                  aria-describedby={getFieldStatus('username') === 'error' ? 'username-error' : undefined}
                />
                {getFieldStatus('username') === 'valid' && (
                  <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                )}
              </div>
              {getFieldStatus('username') === 'error' && (
                <span id="username-error" className="field-error">
                  <AlertCircle size={12} />
                  {getFieldError('username')}
                </span>
              )}
            </div>

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="email">Email</label>
                <div className={`input-wrapper input-wrapper-${getFieldStatus('email')}`}>
                  <input
                    ref={firstInputRef}
                    id="email"
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => handleInputChange(setEmail)(e.target.value)}
                    onFocus={() => handleInputFocus('email')}
                    onBlur={() => handleInputBlur('email')}
                    autoComplete="email"
                    required
                    disabled={loading}
                    aria-invalid={getFieldStatus('email') === 'error'}
                    aria-describedby={getFieldStatus('email') === 'error' ? 'email-error' : undefined}
                  />
                  {getFieldStatus('email') === 'valid' && (
                    <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                  )}
                </div>
                {getFieldStatus('email') === 'error' && (
                  <span id="email-error" className="field-error">
                    <AlertCircle size={12} />
                    {getFieldError('email')}
                  </span>
                )}
              </div>
            )}

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className={`input-wrapper input-wrapper-${getFieldStatus('password')}`}>
                <Lock className="input-icon-left" size={16} />
                <input
                  ref={mode === 'register' ? firstInputRef : undefined}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handleInputChange(setPassword)(e.target.value)}
                  onFocus={() => handleInputFocus('password')}
                  onBlur={() => handleInputBlur('password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  disabled={loading}
                  aria-invalid={getFieldStatus('password') === 'error'}
                  aria-describedby={getFieldStatus('password') === 'error' ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {getFieldStatus('password') === 'valid' && !showPassword && (
                  <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                )}
              </div>
              {getFieldStatus('password') === 'error' && (
                <span id="password-error" className="field-error">
                  <AlertCircle size={12} />
                  {getFieldError('password')}
                </span>
              )}
            </div>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={`btn btn-primary login-btn ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
              aria-busy={loading}
            >
              {loading && <Loader2 size={16} className="spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <footer className="login-footer">
            <span>AgentRoom</span>
            <span className="footer-divider">•</span>
            <span>Protocol v2.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}