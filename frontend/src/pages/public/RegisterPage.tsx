import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Building2, ArrowRight, Eye, EyeOff, ChevronDown, MapPin, CheckCircle, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import './AuthPages.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const roles = [
    { value: 'admin', labelKey: 'admin', descKey: 'adminDesc', icon: '🛡️' },
    { value: 'farmer', labelKey: 'farmer', descKey: 'farmerDesc', icon: '🌾' },
    { value: 'processor', labelKey: 'processor', descKey: 'processorDesc', icon: '🏭' },
    { value: 'distributor', labelKey: 'distributor', descKey: 'distributorDesc', icon: '🚚' },
    { value: 'retailer', labelKey: 'retailer', descKey: 'retailerDesc', icon: '🏪' },
    { value: 'consumer', labelKey: 'Consumer', descKey: 'Purchase products & verify supply chain', icon: '🛍️' },
];

const RegisterPage = () => {
    const { currentLanguage } = useLanguage();
    const t = (key: string) => getTranslation('authExtended', key, currentLanguage);
    const tr = (key: string) => getTranslation('roles', key, currentLanguage);
    const te = (key: string) => getTranslation('errors', key, currentLanguage);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: role, 2: details, 3: OTP verification
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        role: '',
        name: '',
        email: '',
        organization: '',
        location: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    // OTP state
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpSuccess, setOtpSuccess] = useState(false);
    const [countdown, setCountdown] = useState(600); // 10 minutes in seconds
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer
    useEffect(() => {
        if (step !== 3 || otpSuccess) return;
        if (countdown <= 0) {
            setCanResend(true);
            return;
        }
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [step, countdown, otpSuccess]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const selectRole = (role: string) => {
        setFormData(prev => ({ ...prev, role }));
        setErrors(prev => ({ ...prev, role: '' }));
    };

    const validateStep1 = () => {
        if (!formData.role) {
            setErrors({ role: te('roleRequired') });
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = te('nameRequired');
        }

        if (!formData.email) {
            newErrors.email = te('emailRequired');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = te('emailInvalid');
        }

        if (formData.role !== 'admin') {
            if (!formData.organization.trim()) {
                newErrors.organization = te('organizationRequired');
            }
            if (!formData.location.trim()) {
                newErrors.location = te('locationRequired');
            }
        }

        if (!formData.password) {
            newErrors.password = te('passwordRequired');
        } else if (formData.password.length < 8) {
            newErrors.password = te('passwordMinLength8');
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = te('passwordsDoNotMatch');
        }

        if (!formData.agreeTerms) {
            newErrors.agreeTerms = te('agreeTermsRequired');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 3) {
            setStep(2);
            setOtpValues(['', '', '', '', '', '']);
            setOtpError(null);
        } else {
            setStep(1);
        }
    };

    // Submit form and send OTP
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep2()) return;

        setIsLoading(true);
        setRegisterError(null);

        try {
            const response = await fetch(`${API_BASE}/auth/send-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    organization: formData.organization,
                    role: formData.role,
                    location: formData.location
                })
            });

            const data = await response.json();

            if (data.success) {
                setStep(3);
                setCountdown(600);
                setCanResend(false);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else {
                setRegisterError(data.error || 'Failed to send OTP');
            }
        } catch (err) {
            setRegisterError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle OTP input
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only digits

        const newOtp = [...otpValues];
        newOtp[index] = value.slice(-1); // Only last char
        setOtpValues(newOtp);
        setOtpError(null);

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits entered
        if (value && index === 5 && newOtp.every(v => v !== '')) {
            verifyOTP(newOtp.join(''));
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            const newOtp = pasted.split('');
            setOtpValues(newOtp);
            otpRefs.current[5]?.focus();
            verifyOTP(pasted);
        }
    };

    // Verify OTP
    const verifyOTP = async (otp: string) => {
        setIsLoading(true);
        setOtpError(null);

        try {
            const response = await fetch(`${API_BASE}/auth/verify-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, otp })
            });

            const data = await response.json();

            if (data.success && data.token && data.user) {
                setOtpSuccess(true);
                // Store token and user
                try {
                    localStorage.setItem('FARMETRA_token', data.token);
                    localStorage.setItem('FARMETRA_user', JSON.stringify(data.user));
                } catch (e) { /* ignore */ }

                // Short delay for success animation, then navigate
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                setOtpError(data.error || 'Invalid OTP');
                setOtpValues(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
            }
        } catch (err) {
            setOtpError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend OTP
    const handleResend = async () => {
        setResendLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/resend-registration-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email })
            });
            const data = await response.json();
            if (data.success) {
                setCountdown(600);
                setCanResend(false);
                setOtpValues(['', '', '', '', '', '']);
                setOtpError(null);
                otpRefs.current[0]?.focus();
            } else {
                setOtpError(data.error || 'Failed to resend OTP');
            }
        } catch {
            setOtpError('Network error. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    const handleVerifyClick = () => {
        const otp = otpValues.join('');
        if (otp.length !== 6) {
            setOtpError('Please enter the complete 6-digit OTP');
            return;
        }
        verifyOTP(otp);
    };

    const getRoleLabel = () => {
        const role = roles.find(r => r.value === formData.role);
        return role ? tr(role.labelKey) : '';
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
                            <span>{t('joinFARMETRA')}</span>
                        </div>
                        <h1>{t('startTransparencyJourney')}</h1>
                        <p>{t('createAccountDesc')}</p>

                        <div className="auth-steps-indicator">
                            <div className={`auth-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'complete' : ''}`}>
                                <span className="step-num">{t('step1')}</span>
                                <span className="step-label">{t('selectRole')}</span>
                            </div>
                            <div className="step-line"></div>
                            <div className={`auth-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'complete' : ''}`}>
                                <span className="step-num">{t('step2')}</span>
                                <span className="step-label">{t('accountDetails')}</span>
                            </div>
                            <div className="step-line"></div>
                            <div className={`auth-step ${step >= 3 ? 'active' : ''} ${otpSuccess ? 'complete' : ''}`}>
                                <span className="step-num">03</span>
                                <span className="step-label">Verify Email</span>
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
                        {step === 1 ? (
                            <>
                                <div className="auth-form-header">
                                    <h2>{t('whatsYourRole')}</h2>
                                    <p>{tr('selectRole')}</p>
                                </div>

                                <div className="role-selector">
                                    {roles.map((role) => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            className={`role-card ${formData.role === role.value ? 'selected' : ''}`}
                                            onClick={() => selectRole(role.value)}
                                        >
                                            <span className="role-icon">{role.icon}</span>
                                            <span className="role-label">{tr(role.labelKey)}</span>
                                            <span className="role-desc">{tr(role.descKey)}</span>
                                            <div className="role-check">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {errors.role && <span className="input-error-text text-center">{errors.role}</span>}

                                <button
                                    type="button"
                                    className="btn btn-primary btn-lg w-full mt-6"
                                    onClick={handleNext}
                                >
                                    {tr('continueAs')} {formData.role ? getRoleLabel() : '...'}
                                    <ArrowRight size={18} />
                                </button>
                            </>
                        ) : step === 2 ? (
                            <>
                                <div className="auth-form-header">
                                    <button type="button" className="back-btn" onClick={handleBack}>
                                        <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
                                        {t('back')}
                                    </button>
                                    <h2>{t('createYourAccount')}</h2>
                                    <p>{t('fillDetails')}</p>
                                </div>

                                {registerError && (
                                    <div className="auth-error-message" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                        {registerError}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="auth-form">
                                    <div className="input-group">
                                        <label className="input-label" htmlFor="name">{t('fullName')}</label>
                                        <div className="input-with-icon">
                                            <User size={20} className="input-icon" />
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                className={`input input-icon-left ${errors.name ? 'input-error' : ''}`}
                                                placeholder={t('namePlaceholder')}
                                                value={formData.name}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        {errors.name && <span className="input-error-text">{errors.name}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="email">{t('emailAddress')}</label>
                                        <div className="input-with-icon">
                                            <Mail size={20} className="input-icon" />
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                className={`input input-icon-left ${errors.email ? 'input-error' : ''}`}
                                                placeholder="you@example.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        {errors.email && <span className="input-error-text">{errors.email}</span>}
                                    </div>

                                    {formData.role !== 'admin' && (
                                        <>
                                            <div className="input-group">
                                                <label className="input-label" htmlFor="organization">{t('organizationName')}</label>
                                                <div className="input-with-icon">
                                                    <Building2 size={20} className="input-icon" />
                                                    <input
                                                        type="text"
                                                        id="organization"
                                                        name="organization"
                                                        className={`input input-icon-left ${errors.organization ? 'input-error' : ''}`}
                                                        placeholder={t('organizationPlaceholder')}
                                                        value={formData.organization}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                {errors.organization && <span className="input-error-text">{errors.organization}</span>}
                                            </div>

                                            <div className="input-group">
                                                <label className="input-label" htmlFor="location">{t('locationLabel')}</label>
                                                <div className="input-with-icon">
                                                    <MapPin size={20} className="input-icon" />
                                                    <input
                                                        type="text"
                                                        id="location"
                                                        name="location"
                                                        className={`input input-icon-left ${errors.location ? 'input-error' : ''}`}
                                                        placeholder={t('locationPlaceholder')}
                                                        value={formData.location}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                {errors.location && <span className="input-error-text">{errors.location}</span>}
                                            </div>
                                        </>
                                    )}

                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label" htmlFor="password">{t('passwordLabel')}</label>
                                            <div className="input-with-icon">
                                                <Lock size={20} className="input-icon" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    id="password"
                                                    name="password"
                                                    className={`input input-icon-left input-icon-right ${errors.password ? 'input-error' : ''}`}
                                                    placeholder={t('min8Characters')}
                                                    value={formData.password}
                                                    onChange={handleChange}
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

                                        <div className="input-group">
                                            <label className="input-label" htmlFor="confirmPassword">{t('confirmPasswordLabel')}</label>
                                            <div className="input-with-icon">
                                                <Lock size={20} className="input-icon" />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    id="confirmPassword"
                                                    name="confirmPassword"
                                                    className={`input input-icon-left ${errors.confirmPassword ? 'input-error' : ''}`}
                                                    placeholder={t('confirmPasswordPlaceholder')}
                                                    value={formData.confirmPassword}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            {errors.confirmPassword && <span className="input-error-text">{errors.confirmPassword}</span>}
                                        </div>
                                    </div>

                                    <label className={`checkbox-label ${errors.agreeTerms ? 'checkbox-error' : ''}`}>
                                        <input
                                            type="checkbox"
                                            name="agreeTerms"
                                            checked={formData.agreeTerms}
                                            onChange={handleChange}
                                        />
                                        <span className="checkbox-custom"></span>
                                        <span>
                                            {t('agreeTo')}{' '}
                                            <a href="#terms" className="auth-link">{t('termsOfService')}</a>
                                            {' '}{t('and')}{' '}
                                            <a href="#privacy" className="auth-link">{t('privacyPolicy')}</a>
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        className={`btn btn-primary btn-lg w-full mt-4 ${isLoading ? 'btn-loading' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="btn-spinner"></span>
                                        ) : (
                                            <>
                                                Send Verification Code
                                                <Mail size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </>
                        ) : (
                            /* Step 3: OTP Verification */
                            <>
                                {otpSuccess ? (
                                    <div className="otp-success-state" style={{ textAlign: 'center', padding: '40px 0' }}>
                                        <div style={{
                                            width: '88px', height: '88px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 24px', animation: 'pulse 1s ease-in-out'
                                        }}>
                                            <CheckCircle size={44} color="#16a34a" />
                                        </div>
                                        <h2 style={{ color: '#1f2937', fontSize: '24px', marginBottom: '8px' }}>Email Verified! 🎉</h2>
                                        <p style={{ color: '#6b7280', fontSize: '15px' }}>Your account has been created successfully.</p>
                                        <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '16px' }}>Redirecting to dashboard...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="auth-form-header">
                                            <button type="button" className="back-btn" onClick={handleBack}>
                                                <ChevronDown size={20} style={{ transform: 'rotate(90deg)' }} />
                                                {t('back')}
                                            </button>
                                            <div style={{
                                                width: '64px', height: '64px', borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '0 auto 16px'
                                            }}>
                                                <Shield size={30} color="#16a34a" />
                                            </div>
                                            <h2>Verify Your Email</h2>
                                            <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                                We've sent a 6-digit code to<br />
                                                <strong style={{ color: '#1f2937' }}>{formData.email}</strong>
                                            </p>
                                        </div>

                                        {otpError && (
                                            <div style={{
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid #fca5a5',
                                                borderRadius: '10px',
                                                padding: '12px 16px',
                                                marginBottom: '20px',
                                                color: '#dc2626',
                                                fontSize: '14px',
                                                textAlign: 'center'
                                            }}>
                                                {otpError}
                                            </div>
                                        )}

                                        {/* OTP Input Boxes */}
                                        <div style={{
                                            display: 'flex', gap: '10px', justifyContent: 'center',
                                            margin: '24px 0'
                                        }}>
                                            {otpValues.map((val, i) => (
                                                <input
                                                    key={i}
                                                    ref={el => { otpRefs.current[i] = el; }}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={val}
                                                    onChange={e => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                                    onPaste={i === 0 ? handleOtpPaste : undefined}
                                                    style={{
                                                        width: '52px', height: '60px',
                                                        textAlign: 'center', fontSize: '24px', fontWeight: '700',
                                                        border: val ? '2px solid #16a34a' : '2px solid #e5e7eb',
                                                        borderRadius: '12px',
                                                        background: val ? '#f0fdf4' : '#f9fafb',
                                                        color: '#1f2937',
                                                        outline: 'none',
                                                        transition: 'all 0.2s ease',
                                                        fontFamily: "'Courier New', monospace"
                                                    }}
                                                    onFocus={e => { e.target.style.borderColor = '#16a34a'; e.target.style.boxShadow = '0 0 0 3px rgba(22,163,74,0.15)'; }}
                                                    onBlur={e => { e.target.style.borderColor = val ? '#16a34a' : '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                                                />
                                            ))}
                                        </div>

                                        {/* Timer */}
                                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                            {countdown > 0 ? (
                                                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                                                    Code expires in <span style={{ color: countdown < 60 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>{formatTime(countdown)}</span>
                                                </p>
                                            ) : (
                                                <p style={{ color: '#dc2626', fontSize: '14px' }}>Code expired</p>
                                            )}
                                        </div>

                                        {/* Verify Button */}
                                        <button
                                            type="button"
                                            className={`btn btn-primary btn-lg w-full ${isLoading ? 'btn-loading' : ''}`}
                                            disabled={isLoading || otpValues.some(v => !v)}
                                            onClick={handleVerifyClick}
                                        >
                                            {isLoading ? (
                                                <span className="btn-spinner"></span>
                                            ) : (
                                                <>
                                                    {t('verifyCreateAccount')}
                                                    <CheckCircle size={18} />
                                                </>
                                            )}
                                        </button>

                                        {/* Resend */}
                                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Didn't receive the code?</p>
                                            <button
                                                type="button"
                                                disabled={!canResend && countdown > 0 || resendLoading}
                                                onClick={handleResend}
                                                style={{
                                                    background: 'none', border: 'none', cursor: canResend ? 'pointer' : 'not-allowed',
                                                    color: canResend ? '#16a34a' : '#d1d5db', fontWeight: '600', fontSize: '14px',
                                                    textDecoration: canResend ? 'underline' : 'none',
                                                    opacity: resendLoading ? 0.5 : 1
                                                }}
                                            >
                                                {resendLoading ? 'Sending...' : 'Resend OTP'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <p className="auth-footer-text">
                            {t('alreadyHaveAccount')}{' '}
                            <Link to="/login" className="auth-link-bold">
                                {t('signInLink')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
