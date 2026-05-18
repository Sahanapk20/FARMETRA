import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Mail, ArrowLeft, CheckCircle, AlertCircle, Shield, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import './AuthPages.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ForgotPasswordPage = () => {
    const { currentLanguage } = useLanguage();
    const t = (key: string) => getTranslation('authExtended', key, currentLanguage);
    const te = (key: string) => getTranslation('errors', key, currentLanguage);

    // Flow step: 1 = enter email, 2 = enter OTP, 3 = new password, 4 = success
    const [flowStep, setFlowStep] = useState(1);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // OTP state
    const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(600);
    const [canResend, setCanResend] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Password state
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordErrors, setPasswordErrors] = useState({ password: '', confirmPassword: '' });

    // Countdown timer
    useEffect(() => {
        if (flowStep !== 2) return;
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
    }, [flowStep, countdown]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Step 1: Send OTP
    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                setFlowStep(2);
                setCountdown(600);
                setCanResend(false);
                setTimeout(() => otpRefs.current[0]?.focus(), 100);
            } else {
                setError(data.error || 'Something went wrong');
            }
        } catch (err) {
            setError(te('networkError'));
        } finally {
            setIsLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otpValues];
        newOtp[index] = value.slice(-1);
        setOtpValues(newOtp);
        setError(null);

        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }

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
            setOtpValues(pasted.split(''));
            otpRefs.current[5]?.focus();
            verifyOTP(pasted);
        }
    };

    // Step 2: Verify OTP
    const verifyOTP = async (otp: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });

            const data = await response.json();

            if (data.success && data.resetToken) {
                setResetToken(data.resetToken);
                setFlowStep(3);
            } else {
                setError(data.error || 'Invalid OTP');
                setOtpValues(['', '', '', '', '', '']);
                otpRefs.current[0]?.focus();
            }
        } catch (err) {
            setError(te('networkError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyClick = () => {
        const otp = otpValues.join('');
        if (otp.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }
        verifyOTP(otp);
    };

    // Resend OTP
    const handleResend = async () => {
        setResendLoading(true);
        try {
            const response = await fetch(`${API_URL}/auth/resend-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (data.success) {
                setCountdown(600);
                setCanResend(false);
                setOtpValues(['', '', '', '', '', '']);
                setError(null);
                otpRefs.current[0]?.focus();
            }
        } catch {
            setError('Failed to resend OTP');
        } finally {
            setResendLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setPasswordErrors({ password: '', confirmPassword: '' });

        const newErrors = { password: '', confirmPassword: '' };
        if (password.length < 8) {
            newErrors.password = te('passwordMinLength8');
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = te('passwordsDoNotMatch');
        }
        if (newErrors.password || newErrors.confirmPassword) {
            setPasswordErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: resetToken, newPassword: password })
            });

            const data = await response.json();

            if (data.success) {
                setFlowStep(4);
            } else {
                setError(data.error || 'Failed to reset password');
            }
        } catch (err) {
            setError(te('networkError'));
        } finally {
            setIsLoading(false);
        }
    };

    // Visual side content based on step
    const getVisualContent = () => {
        switch (flowStep) {
            case 2: return { icon: '🔢', title: 'Enter Verification Code', desc: 'Check your email for the 6-digit OTP we just sent.' };
            case 3: return { icon: '🔐', title: 'Create New Password', desc: 'Choose a strong password to secure your account.' };
            case 4: return { icon: '✅', title: 'Password Updated!', desc: 'Your password has been reset successfully.' };
            default: return { icon: '🔒', title: t('securePasswordRecovery'), desc: t('passwordRecoveryDesc') };
        }
    };

    const visual = getVisualContent();

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
                        <h1>{visual.title}</h1>
                        <p>{visual.desc}</p>

                        <div className="auth-visual-features">
                            <div className="auth-feature">
                                <div className={`auth-feature-icon`} style={{ opacity: flowStep >= 1 ? 1 : 0.4 }}>📧</div>
                                <span style={{ fontWeight: flowStep === 1 ? '600' : '400' }}>Enter Email</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon" style={{ opacity: flowStep >= 2 ? 1 : 0.4 }}>🔢</div>
                                <span style={{ fontWeight: flowStep === 2 ? '600' : '400' }}>Verify OTP</span>
                            </div>
                            <div className="auth-feature">
                                <div className="auth-feature-icon" style={{ opacity: flowStep >= 3 ? 1 : 0.4 }}>🔐</div>
                                <span style={{ fontWeight: flowStep === 3 ? '600' : '400' }}>New Password</span>
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
                        {/* Step 1: Enter Email */}
                        {flowStep === 1 && (
                            <>
                                <div className="auth-form-header">
                                    <Link to="/login" className="back-link">
                                        <ArrowLeft size={18} />
                                        {t('backToLogin')}
                                    </Link>
                                    <h2>{t('forgotPasswordTitle')}</h2>
                                    <p>Enter your email and we'll send you an OTP to reset your password.</p>
                                </div>

                                <form onSubmit={handleSendOTP} className="auth-form">
                                    {error && (
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid #ef4444',
                                            borderRadius: '8px', padding: '12px', marginBottom: '16px',
                                            color: '#ef4444', fontSize: '14px',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <AlertCircle size={18} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="email">{t('emailAddress')}</label>
                                        <div className="input-with-icon">
                                            <Mail size={20} className="input-icon" />
                                            <input
                                                type="email"
                                                id="email"
                                                className="input input-icon-left"
                                                placeholder={t('emailPlaceholder') || 'you@example.com'}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
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
                                                Send OTP
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <p className="auth-footer-text">
                                    {t('rememberPassword')}{' '}
                                    <Link to="/login" className="auth-link-bold">
                                        {t('signInLink')}
                                    </Link>
                                </p>
                            </>
                        )}

                        {/* Step 2: Enter OTP */}
                        {flowStep === 2 && (
                            <>
                                <div className="auth-form-header">
                                    <button type="button" className="back-link" onClick={() => { setFlowStep(1); setError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                                        <ArrowLeft size={18} />
                                        Back
                                    </button>
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px'
                                    }}>
                                        <Shield size={30} color="#16a34a" />
                                    </div>
                                    <h2>Enter Verification Code</h2>
                                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                        We've sent a 6-digit code to<br />
                                        <strong style={{ color: '#1f2937' }}>{email}</strong>
                                    </p>
                                </div>

                                {error && (
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid #fca5a5',
                                        borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
                                        color: '#dc2626', fontSize: '14px', textAlign: 'center'
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {/* OTP Input */}
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '24px 0' }}>
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

                                <button
                                    type="button"
                                    className={`btn btn-primary btn-lg w-full ${isLoading ? 'btn-loading' : ''}`}
                                    disabled={isLoading || otpValues.some(v => !v)}
                                    onClick={handleVerifyClick}
                                >
                                    {isLoading ? (
                                        <span className="btn-spinner"></span>
                                    ) : (
                                        <>Verify OTP<CheckCircle size={18} /></>
                                    )}
                                </button>

                                {/* Resend */}
                                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                    <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>Didn't receive the code?</p>
                                    <button
                                        type="button"
                                        disabled={(!canResend && countdown > 0) || resendLoading}
                                        onClick={handleResend}
                                        style={{
                                            background: 'none', border: 'none',
                                            cursor: canResend ? 'pointer' : 'not-allowed',
                                            color: canResend ? '#16a34a' : '#d1d5db',
                                            fontWeight: '600', fontSize: '14px',
                                            textDecoration: canResend ? 'underline' : 'none',
                                            opacity: resendLoading ? 0.5 : 1
                                        }}
                                    >
                                        {resendLoading ? 'Sending...' : 'Resend OTP'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Step 3: New Password */}
                        {flowStep === 3 && (
                            <>
                                <div className="auth-form-header">
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 16px'
                                    }}>
                                        <Lock size={30} color="#2563eb" />
                                    </div>
                                    <h2>Create New Password</h2>
                                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                                        Choose a strong password for your account.
                                    </p>
                                </div>

                                <form onSubmit={handleResetPassword} className="auth-form">
                                    {error && (
                                        <div style={{
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid #fca5a5',
                                            borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
                                            color: '#dc2626', fontSize: '14px',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <AlertCircle size={16} />
                                            {error}
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="newPassword">New Password</label>
                                        <div className="input-with-icon">
                                            <Lock size={20} className="input-icon" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="newPassword"
                                                className={`input input-icon-left input-icon-right ${passwordErrors.password ? 'input-error' : ''}`}
                                                placeholder="Min. 8 characters"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
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
                                        {passwordErrors.password && <span className="input-error-text">{passwordErrors.password}</span>}
                                    </div>

                                    <div className="input-group">
                                        <label className="input-label" htmlFor="confirmNewPassword">Confirm New Password</label>
                                        <div className="input-with-icon">
                                            <Lock size={20} className="input-icon" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                id="confirmNewPassword"
                                                className={`input input-icon-left ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                                                placeholder="Re-enter your password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                            />
                                        </div>
                                        {passwordErrors.confirmPassword && <span className="input-error-text">{passwordErrors.confirmPassword}</span>}
                                    </div>

                                    <button
                                        type="submit"
                                        className={`btn btn-primary btn-lg w-full ${isLoading ? 'btn-loading' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <span className="btn-spinner"></span>
                                        ) : (
                                            <>Reset Password<ArrowRight size={18} /></>
                                        )}
                                    </button>
                                </form>
                            </>
                        )}

                        {/* Step 4: Success */}
                        {flowStep === 4 && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{
                                    width: '88px', height: '88px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 24px'
                                }}>
                                    <CheckCircle size={44} color="#16a34a" />
                                </div>
                                <h2 style={{ color: '#1f2937', fontSize: '24px', marginBottom: '8px' }}>Password Reset Complete! 🎉</h2>
                                <p style={{ color: '#6b7280', fontSize: '15px', marginBottom: '32px' }}>
                                    Your password has been updated successfully.<br />
                                    You can now login with your new password.
                                </p>
                                <Link to="/login" className="btn btn-primary btn-lg w-full">
                                    Go to Login
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
