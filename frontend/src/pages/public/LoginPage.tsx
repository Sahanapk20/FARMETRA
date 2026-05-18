import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import './AuthPages.css';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { currentLanguage } = useLanguage();
    const t = (key: string) => getTranslation('authExtended', key, currentLanguage);
    const te = (key: string) => getTranslation('errors', key, currentLanguage);
    const tc = (key: string) => getTranslation('common', key, currentLanguage);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loginError, setLoginError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.email) {
            newErrors.email = te('emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = te('emailInvalid');
        }

        if (!formData.password) {
            newErrors.password = te('passwordRequired');
        } else if (formData.password.length < 6) {
            newErrors.password = te('passwordMinLength');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setLoginError(null);

        const result = await login(formData.email, formData.password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setLoginError(result.error || te('loginFailed'));
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
                        <h1>{t('transparencyTrust')}</h1>
                        <p>
                            {t('joinAgriBusinessesDesc')}
                        </p>

                        <div className="auth-visual-features">
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🌱</div>
                                <span>{t('farmToFork')}</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">🔗</div>
                                <span>{t('blockchainVerified')}</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon">📱</div>
                                <span>{t('qrIntegration')}</span>
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
                        <div className="auth-form-header">
                            <h2>{t('welcomeBack')}</h2>
                            <p>{t('enterCredentials')}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="auth-form">
                            {loginError && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid #ef4444',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    color: '#ef4444',
                                    fontSize: '14px'
                                }}>
                                    {loginError}
                                </div>
                            )}
                            <div className="input-group">
                                <label className="input-label" htmlFor="email">{t('emailAddress')}</label>
                                <div className="input-with-icon">
                                    <Mail size={20} className="input-icon" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className={`input input-icon-left ${errors.email ? 'input-error' : ''}`}
                                        placeholder={t('emailPlaceholder')}
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="email"
                                    />
                                </div>
                                {errors.email && <span className="input-error-text">{errors.email}</span>}
                            </div>

                            <div className="input-group">
                                <label className="input-label" htmlFor="password">{t('passwordLabel')}</label>
                                <div className="input-with-icon">
                                    <Lock size={20} className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        name="password"
                                        className={`input input-icon-left input-icon-right ${errors.password ? 'input-error' : ''}`}
                                        placeholder={t('passwordPlaceholder')}
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="input-icon-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && <span className="input-error-text">{errors.password}</span>}
                            </div>

                            <div className="auth-form-options">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                    />
                                    <span className="checkbox-custom"></span>
                                    <span>{t('rememberMe')}</span>
                                </label>

                                <Link to="/forgot-password" className="auth-link">
                                    {t('forgotPassword')}
                                </Link>
                            </div>

                            <button
                                type="submit"
                                className={`btn btn-primary btn-lg w-full ${isLoading ? 'btn-loading' : ''}`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="btn-spinner"></span>
                                ) : (
                                    <>
                                        {t('signIn')}
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="auth-footer-text">
                            {t('dontHaveAccount')}{' '}
                            <Link to="/register" className="auth-link-bold">
                                {t('createAccount')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
