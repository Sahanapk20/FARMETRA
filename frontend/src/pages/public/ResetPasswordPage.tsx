import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Leaf, Lock, ArrowLeft, ArrowRight, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import './AuthPages.css';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentLanguage } = useLanguage();
    const t = (key: string) => getTranslation('authExtended', key, currentLanguage);
    const te = (key: string) => getTranslation('errors', key, currentLanguage);
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errors, setErrors] = useState({ password: '', confirmPassword: '' });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        if (!token) {
            setError(t('invalidResetLink'));
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setErrors({ password: '', confirmPassword: '' });

        const newErrors = { password: '', confirmPassword: '' };

        if (password.length < 8) {
            newErrors.password = te('passwordMinLength8');
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = te('passwordsDoNotMatch');
        }

        if (newErrors.password || newErrors.confirmPassword) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.error || t('somethingWentWrong'));
            }
        } catch (err) {
            setError(te('networkError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-visual">
                <div className="auth-visual-content">
                    <div className="auth-visual-bg"></div>
                    <div className="auth-visual-pattern"></div>

                    <div className="auth-visual-text">
                        <div className="auth-visual-badge">
                            <Leaf size={20} />
                            <span>FARMETRA Platform</span>
                        </div>
                        <h1>{t('createNewPassword')}</h1>
                        <p>{t('newPasswordDesc')}</p>

                        <div className="auth-visual-features">
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🔒</div>
                                <span>{t('strongEncryption')}</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🏦</div>
                                <span>{t('secureStorage')}</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">✅</div>
                                <span>{t('instantUpdate')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-form-container">
                <div className="auth-form-wrapper">
                    <div className="auth-header">
                        <Link to="/" className="auth-logo">
                            <div className="logo-icon">
                                <Leaf size={24} />
                            </div>
                            <span>FARMETRA</span>
                        </Link>
                    </div>

                    <div className="auth-form-content">
                        {success ? (
                            <div className="auth-success-state">
                                <div className="success-icon-wrapper">
                                    <CheckCircle size={64} className="success-icon" />
                                </div>
                                <h2>{t('passwordResetComplete')}</h2>
                                <p>{t('passwordUpdated')}</p>
                                <p className="redirect-text">{t('redirectingToLogin')}</p>
                                <Link to="/login" className="btn btn-primary btn-lg w-full">
                                    {t('goToLogin')}
                                </Link>
                            </div>
                        ) : !token ? (
                            <div className="auth-error-state">
                                <div className="error-icon-wrapper">
                                    <AlertCircle size={64} />
                                </div>
                                <h2>{t('invalidResetLink')}</h2>
                                <p>{t('linkExpired')}</p>
                                <Link to="/forgot-password" className="btn btn-primary btn-lg w-full mt-6">
                                    {t('requestNewLink')}
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="auth-form-header">
                                    <Link to="/login" className="back-link">
                                        <ArrowLeft size={18} />
                                        {t('backToLogin')}
                                    </Link>
                                    <h2>{t('resetPasswordTitle')}</h2>
                                    <p>{t('enterNewPassword')}</p>
                                </div>

                                <form onSubmit={handleSubmit} className="auth-form">
                                    {error && (
                                        <div className="error-message" style={{ color: '#ef4444', fontSize: '14px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="password">{t('newPassword')}</label>
                                        <div className="input-with-icon">
                                            <Lock size={20} className="input-icon" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="password"
                                                className={`input input-icon-left ${errors.password ? 'input-error' : ''}`}
                                                placeholder={t('newPasswordPlaceholder')}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                        {errors.password && <span className="input-error-text">{errors.password}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="confirmPassword">{t('confirmNewPassword')}</label>
                                        <div className="input-with-icon">
                                            <Lock size={20} className="input-icon" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="confirmPassword"
                                                className={`input input-icon-left ${errors.confirmPassword ? 'input-error' : ''}`}
                                                placeholder={t('confirmNewPasswordPlaceholder')}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                        {errors.confirmPassword && <span className="input-error-text">{errors.confirmPassword}</span>}
                                    </div>

                                    <button
                                        type="submit"
                                        className={`btn btn-primary btn-lg w-full ${isLoading ? 'btn-loading' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="btn-spinner"></span>
                                        ) : (
                                            t('resetPassword')
                                        )}
                                    </button>
                                </form>

                                <p className="auth-footer-text">
                                    <Link to="/login" className="auth-link-bold">
                                        <ArrowLeft size={16} />
                                        {t('backToLogin')}
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
