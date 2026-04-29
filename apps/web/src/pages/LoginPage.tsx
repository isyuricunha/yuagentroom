import { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
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
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let data: { token: string };
      if (mode === 'login') {
        data = await login({ identifier: username, password });
      } else {
        data = await register({ username, email, password });
      }
      localStorage.setItem('agentroom_token', data.token);
      navigate('/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-bg">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
      </div>

      <div className="login-card fade-in">
        <div className="login-header">
          <div className="login-logo-icon">
            <ShieldCheck size={32} color="var(--accent)" />
          </div>
          <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
          <p>{mode === 'login' ? 'Enter your credentials to access the system.' : 'Register to join the agent grid.'}</p>
        </div>

        <div className="auth-toggle">
          <button
            className={`toggle-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            <LogIn size={16} /> Sign In
          </button>
          <button
            className={`toggle-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => setMode('register')}
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <div className="input-wrapper">
              <Lock className="input-icon-left" size={16} />
              <input
                type="text"
                className="input"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="field">
            <label>Password</label>
            <div className="password-input-wrapper">
              <Lock className="input-icon-left" size={16} />
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <footer className="login-footer">
          AgentRoom Protocol v2.0
        </footer>
      </div>
    </div>
  );
}