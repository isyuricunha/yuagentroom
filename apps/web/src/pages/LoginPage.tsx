import { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
  LogIn,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { login, register } from '../lib/api';

type AuthMode = 'login' | 'register';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    hasMinLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldFocus, setFieldFocus] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus first input on mount or mode change
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 150);
  }, [mode]);

  const getPasswordStrength = (pwd: string): PasswordStrength => {
    const hasMinLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    // eslint-disable-next-line no-useless-escape
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(pwd);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    let label: string;
    let color: string;

    if (score <= 1) {
      label = 'Muito fraca';
      color = 'var(--error)';
    } else if (score === 2) {
      label = 'Fraca';
      color = 'var(--error)';
    } else if (score === 3) {
      label = 'Média';
      color = '#f59e0b';
    } else if (score === 4) {
      label = 'Forte';
      color = 'var(--success, #10b981)';
    } else {
      label = 'Muito forte';
      color = 'var(--success, #10b981)';
    }

    return {
      score,
      label,
      color,
      requirements: {
        hasMinLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecial,
      },
    };
  };

  const passwordStrength = getPasswordStrength(password);

  function validateField(field: string, value: string): string | null {
    switch (field) {
      case 'identifier':
        if (!value.trim()) return 'Username ou email é obrigatório';
        if (value.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return 'Digite um email válido';
        } else {
          if (value.length < 3) return 'Username deve ter pelo menos 3 caracteres';
          if (!/^[a-zA-Z0-9_@.]+$/.test(value))
            return 'Username pode conter apenas letras, números, underscores, @ e pontos';
        }
        return null;
      case 'email': {
        if (!value.trim()) return 'Email é obrigatório';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Digite um email válido';
        return null;
      }
      case 'password':
        if (!value) return 'Senha é obrigatória';
        if (value.length < 8) return 'Senha deve ter pelo menos 8 caracteres';
        return null;
      default:
        return null;
    }
  }

  function getFieldError(field: string): string | null {
    let value: string;
    switch (field) {
      case 'identifier':
        value = identifier;
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

  function isIdentifierEmail(): boolean {
    return identifier.includes('@');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate all fields
    const errors: string[] = [];
    const identifierError = validateField('identifier', identifier);
    if (identifierError) errors.push(identifierError);

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
        // Determine if identifier is email or username
        const loginInput = {
          username: isIdentifierEmail() ? undefined : identifier,
          email: isIdentifierEmail() ? identifier : undefined,
          password,
        };
        data = await login(loginInput);
      } else {
        data = await register({ username: identifier, email, password });
      }

      localStorage.setItem('agentroom_token', data.token);
      if (data.user.firstLogin) {
        navigate('/first-login-change');
      } else {
        navigate('/rooms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleInputFocus(field: string) {
    setFieldFocus(field);
  }

  function handleInputBlur(field: string) {
    setFieldFocus(null);
    setTouched((prev) => ({ ...prev, [field]: true }));
    const fieldError = getFieldError(field);
    if (fieldError && !error.startsWith(fieldError.split('.')[0])) {
      setError(fieldError);
    }
  }

  function handleInputChange(setter: React.Dispatch<React.SetStateAction<string>>) {
    return (value: string) => {
      setter(value);
      if (error) {
        const currentField =
          setter === setIdentifier
            ? 'identifier'
            : setter === setEmail
              ? 'email'
              : 'password';
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
      case 'identifier':
        value = identifier;
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
    if (value && fieldError && touched[field]) return 'error';
    return 'default';
  }

  const getModeTitle = () => {
    if (mode === 'login') return 'Bem-vindo de Volta';
    return 'Criar Conta';
  };

  const getModeSubtitle = () => {
    if (mode === 'login')
      return 'Entre com suas credenciais para acessar o agent grid.';
    return 'Registre-se para criar sua primeira agent room.';
  };

  const getIdentifierIcon = () => {
    if (mode === 'login' && isIdentifierEmail()) {
      return <Mail className="input-icon-left" size={16} />;
    }
    return <User className="input-icon-left" size={16} />;
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

          <div
            className="auth-toggle"
            role="tablist"
            aria-label="Authentication mode"
          >
            <button
              role="tab"
              aria-selected={mode === 'login'}
              aria-controls="auth-form-login"
              className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              type="button"
            >
              <LogIn size={16} />
              Entrar
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
              Registrar
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
              <label htmlFor="identifier">
                {mode === 'login' ? 'Username ou Email' : 'Username'}
              </label>
              <div className={`input-wrapper input-wrapper-${getFieldStatus('identifier')}`}>
                {getIdentifierIcon()}
                <input
                  ref={mode === 'login' ? firstInputRef : undefined}
                  id="identifier"
                  type={mode === 'login' ? 'text' : 'text'}
                  className="input"
                  placeholder={mode === 'login' ? 'admin ou admin@example.com' : 'admin'}
                  value={identifier}
                  onChange={(e) => handleInputChange(setIdentifier)(e.target.value)}
                  onFocus={() => handleInputFocus('identifier')}
                  onBlur={() => handleInputBlur('identifier')}
                  autoComplete={mode === 'login' ? 'username' : 'username'}
                  autoFocus={mode === 'login'}
                  required
                  disabled={loading}
                  aria-invalid={getFieldStatus('identifier') === 'error'}
                  aria-describedby={
                    getFieldStatus('identifier') === 'error' ? 'identifier-error' : undefined
                  }
                />
                {getFieldStatus('identifier') === 'valid' && (
                  <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                )}
              </div>
              {getFieldStatus('identifier') === 'error' && (
                <span id="identifier-error" className="field-error">
                  <AlertCircle size={12} />
                  {getFieldError('identifier')}
                </span>
              )}
            </div>

            {mode === 'register' && (
              <>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <div className={`input-wrapper input-wrapper-${getFieldStatus('email')}`}>
                    <Mail className="input-icon-left" size={16} />
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
                      aria-describedby={
                        getFieldStatus('email') === 'error' ? 'email-error' : undefined
                      }
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

                <div className="password-requirements">
                  <p className="requirements-title">Requisitos da senha:</p>
                  <ul className="requirements-list">
                    <li className={passwordStrength.requirements.hasMinLength ? 'met' : ''}>
                      <CheckCircle2 size={14} />
                      Pelo menos 8 caracteres
                    </li>
                    <li className={passwordStrength.requirements.hasUppercase ? 'met' : ''}>
                      <CheckCircle2 size={14} />
                      Letra maiúscula
                    </li>
                    <li className={passwordStrength.requirements.hasLowercase ? 'met' : ''}>
                      <CheckCircle2 size={14} />
                      Letra minúscula
                    </li>
                    <li className={passwordStrength.requirements.hasNumber ? 'met' : ''}>
                      <CheckCircle2 size={14} />
                      Número
                    </li>
                    <li className={passwordStrength.requirements.hasSpecial ? 'met' : ''}>
                      <CheckCircle2 size={14} />
                      Caractere especial
                    </li>
                  </ul>
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="password">Senha</label>
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
                  aria-describedby={
                    getFieldStatus('password') === 'error' ? 'password-error' : undefined
                  }
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {getFieldStatus('password') === 'valid' && !showPassword && (
                  <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                )}
              </div>

              {mode === 'register' && password && (
                <div className="password-strength-indicator">
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{
                        width: `${(passwordStrength.score / 5) * 100}%`,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span
                    className="strength-label"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}

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
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
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