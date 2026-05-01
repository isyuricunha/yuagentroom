import { useState, useRef, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Loader2, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router';
import { firstLoginChangePassword } from '../lib/api';
import { validatePassword } from '../lib/validation';

export function FirstLoginChangePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [fieldFocus, setFieldFocus] = useState<string | null>(null);
    const navigate = useNavigate();
    const formRef = useRef<HTMLFormElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Focus first input on mount
        setTimeout(() => {
            firstInputRef.current?.focus();
        }, 150);
    }, []);

    function validateField(field: string, value: string): string | null {
        switch (field) {
            case 'newPassword':
                return validatePassword(value);
            case 'confirmPassword':
                if (!value) return 'Please confirm your password';
                if (value !== newPassword) return 'Passwords do not match';
                return null;
            default:
                return null;
        }
    }

    function getFieldError(field: string): string | null {
        let value: string;
        switch (field) {
            case 'newPassword':
                value = newPassword;
                break;
            case 'confirmPassword':
                value = confirmPassword;
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
        const newPasswordError = validateField('newPassword', newPassword);
        if (newPasswordError) errors.push(newPasswordError);
        const confirmPasswordError = validateField('confirmPassword', confirmPassword);
        if (confirmPasswordError) errors.push(confirmPasswordError);

        if (errors.length > 0) {
            setError(errors[0]);
            return;
        }

        setLoading(true);

        try {
            await firstLoginChangePassword(newPassword);
            setSuccess(true);

            // After successful password change, redirect to rooms after a short delay
            setTimeout(() => {
                navigate('/rooms');
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to change password. Please try again.');
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
                setError('');
            }
        };
    }

    function getFieldStatus(field: string): 'default' | 'focus' | 'valid' | 'error' {
        if (fieldFocus === field) return 'focus';
        let value: string;
        switch (field) {
            case 'newPassword':
                value = newPassword;
                break;
            case 'confirmPassword':
                value = confirmPassword;
                break;
            default:
                value = '';
        }
        const fieldError = getFieldError(field);
        if (value && !fieldError) {
            return 'valid';
        }
        if (value && fieldError) return 'error';
        return 'default';
    }

    if (success) {
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
                            <h1>Password Changed!</h1>
                            <p>Your password has been updated successfully.</p>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                            <CheckCircle2 size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Redirecting to rooms...</p>
                        </div>

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
                        <h1>Create New Password</h1>
                        <p>For security, you must change your password on first login.</p>
                    </div>

                    <form
                        ref={formRef}
                        id="first-login-form"
                        role="tabpanel"
                        onSubmit={handleSubmit}
                        aria-labelledby="first-login-tab"
                    >
                        <div className="field">
                            <label htmlFor="newPassword">New Password</label>
                            <div className={`input-wrapper input-wrapper-${getFieldStatus('newPassword')}`}>
                                <Lock className="input-icon-left" size={16} />
                                <input
                                    ref={firstInputRef}
                                    id="newPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => handleInputChange(setNewPassword)(e.target.value)}
                                    onFocus={() => handleInputFocus('newPassword')}
                                    onBlur={() => handleInputBlur('newPassword')}
                                    autoComplete="new-password"
                                    autoFocus
                                    required
                                    disabled={loading}
                                    aria-invalid={getFieldStatus('newPassword') === 'error'}
                                    aria-describedby={getFieldStatus('newPassword') === 'error' ? 'newPassword-error' : undefined}
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
                                {getFieldStatus('newPassword') === 'valid' && !showPassword && (
                                    <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                                )}
                            </div>
                            {getFieldStatus('newPassword') === 'error' && (
                                <span id="newPassword-error" className="field-error">
                                    <AlertCircle size={12} />
                                    {getFieldError('newPassword')}
                                </span>
                            )}
                        </div>

                        <div className="field">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className={`input-wrapper input-wrapper-${getFieldStatus('confirmPassword')}`}>
                                <Lock className="input-icon-left" size={16} />
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => handleInputChange(setConfirmPassword)(e.target.value)}
                                    onFocus={() => handleInputFocus('confirmPassword')}
                                    onBlur={() => handleInputBlur('confirmPassword')}
                                    autoComplete="new-password"
                                    required
                                    disabled={loading}
                                    aria-invalid={getFieldStatus('confirmPassword') === 'error'}
                                    aria-describedby={getFieldStatus('confirmPassword') === 'error' ? 'confirmPassword-error' : undefined}
                                />
                                {getFieldStatus('confirmPassword') === 'valid' && !showPassword && (
                                    <CheckCircle2 className="input-icon-right input-status-valid" size={16} />
                                )}
                            </div>
                            {getFieldStatus('confirmPassword') === 'error' && (
                                <span id="confirmPassword-error" className="field-error">
                                    <AlertCircle size={12} />
                                    {getFieldError('confirmPassword')}
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
                            <LogIn size={16} />
                            Change Password & Continue
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