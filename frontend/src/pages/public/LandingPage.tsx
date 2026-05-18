import { Link } from 'react-router-dom';
import {
    Leaf,
    Shield,
    QrCode,
    TrendingUp,
    Users,
    ChevronRight,
    Cpu,
    Globe,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Truck,
    Factory,
    Store,
    Wheat
} from 'lucide-react';
import LanguageSelector from '../../components/LanguageSelector';
import WebsiteRating from '../../components/WebsiteRating';
import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';
import './LandingPage.css';

const LandingPage = () => {
    const { currentLanguage } = useLanguage();
    const t = (key: string) => getTranslation('landingExtended', key, currentLanguage);
    const features = [
        {
            icon: <QrCode size={28} />,
            title: t('instantQRTitle'),
            description: t('instantQRDesc'),
            color: 'primary'
        },
        {
            icon: <Shield size={28} />,
            title: t('blockchainSecurityTitle'),
            description: t('blockchainSecurityDesc'),
            color: 'blockchain'
        },
        {
            icon: <TrendingUp size={28} />,
            title: t('realTimeTrackingTitle'),
            description: t('realTimeTrackingDesc'),
            color: 'accent'
        },
        {
            icon: <Users size={28} />,
            title: t('multiStakeholderTitle'),
            description: t('multiStakeholderDesc'),
            color: 'info'
        }
    ];

    const stats = [
        { value: '50K+', label: t('productsTracked') },
        { value: '2.5M', label: t('qrScans') },
        { value: '500+', label: t('businesses') },
        { value: '99.9%', label: t('accuracy') }
    ];

    const stakeholders = [
        { icon: <Wheat size={32} />, label: t('farmers'), desc: t('farmersDesc') },
        { icon: <Factory size={32} />, label: t('processors'), desc: t('processorsDesc') },
        { icon: <Truck size={32} />, label: t('distributors'), desc: t('distributorsDesc') },
        { icon: <Store size={32} />, label: t('retailers'), desc: t('retailersDesc') }
    ];

    const benefits = [
        t('benefit1'),
        t('benefit2'),
        t('benefit3'),
        t('benefit4'),
        t('benefit5'),
        t('benefit6')
    ];

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="container">
                    <div className="navbar-content">
                        <Link to="/" className="nav-logo">
                            <div className="logo-icon">
                                <Leaf size={28} />
                            </div>
                            <span>FARMETRA</span>
                        </Link>

                        <div className="nav-links">
                            <LanguageSelector />
                            <a href="#features" className="nav-link">{t('features')}</a>
                            <a href="#how-it-works" className="nav-link">{t('howItWorks')}</a>
                            <a href="#benefits" className="nav-link">{t('benefits')}</a>
                            <Link to="/login" className="btn btn-ghost">{t('logIn')}</Link>
                            <Link to="/register" className="btn btn-primary">
                                {t('getStarted')}
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-bg">
                    <div className="hero-gradient"></div>
                    <div className="hero-pattern"></div>
                    <div className="hero-glow hero-glow-1"></div>
                    <div className="hero-glow hero-glow-2"></div>
                </div>

                <div className="container">
                    <div className="hero-content">
                        <div className="hero-badge animate-fadeInUp">
                            <Sparkles size={16} />
                            <span>{t('heroBadge')}</span>
                        </div>

                        <h1 className="hero-title animate-fadeInUp stagger-1">
                            {t('heroTitleLine1')}
                            <br />
                            <span className="text-gradient-hero">{t('heroTitleLine2')}</span>
                        </h1>

                        <p className="hero-description animate-fadeInUp stagger-2">
                            {t('heroDescription')}
                        </p>

                        <div className="hero-cta animate-fadeInUp stagger-3">
                            <Link to="/register" className="btn btn-accent btn-lg">
                                {t('startFreeTrial')}
                                <ChevronRight size={20} />
                            </Link>
                            <Link to="/verify" className="btn btn-outline-light btn-lg">
                                <QrCode size={20} />
                                {t('verifyProduct')}
                            </Link>
                        </div>

                        <div className="hero-stats animate-fadeInUp stagger-4">
                            {stats.map((stat, index) => (
                                <div key={index} className="hero-stat">
                                    <span className="hero-stat-value">{stat.value}</span>
                                    <span className="hero-stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hero-visual animate-fadeInUp stagger-3">
                        <div className="hero-card hero-card-main">
                            <div className="hero-card-header">
                                <div className="hero-card-dot"></div>
                                <div className="hero-card-dot"></div>
                                <div className="hero-card-dot"></div>
                            </div>
                            <div className="hero-card-body">
                                <div className="hero-batch-info">
                                    <div className="hero-batch-id">
                                        <span className="label">{t('batchId')}</span>
                                        <span className="value font-mono">ORG-2024-0847</span>
                                    </div>
                                    <div className="badge badge-success">✓ {t('verified')}</div>
                                </div>
                                <div className="hero-product">
                                    <div className="hero-product-img">🌾</div>
                                    <div className="hero-product-info">
                                        <h4>{t('organicWheat')}</h4>
                                        <p>{t('goldenValleyFarm')}</p>
                                    </div>
                                </div>
                                <div className="hero-timeline-preview">
                                    <div className="hero-timeline-item">
                                        <div className="hero-timeline-dot success"></div>
                                        <span>{t('harvested')}</span>
                                        <span className="time">Dec 5, 2024</span>
                                    </div>
                                    <div className="hero-timeline-item">
                                        <div className="hero-timeline-dot warning"></div>
                                        <span>{t('processing')}</span>
                                        <span className="time">Dec 7, 2024</span>
                                    </div>
                                    <div className="hero-timeline-item active">
                                        <div className="hero-timeline-dot info"></div>
                                        <span>{t('inTransit')}</span>
                                        <span className="time">Dec 9, 2024</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hero-card-floating hero-card-qr animate-float">
                            <QrCode size={64} strokeWidth={1.5} />
                            <span>{t('scanToVerify')}</span>
                        </div>

                        <div className="hero-card-floating hero-card-blockchain animate-float" style={{ animationDelay: '1s' }}>
                            <Cpu size={24} />
                            <span>{t('blockchainVerified')}</span>
                            <div className="hash font-mono">0x8f4a...2e9d</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stakeholders Flow */}
            <section className="stakeholders-section">
                <div className="container">
                    <div className="section-header text-center">
                        <h2>{t('supplyChainCoverage')}</h2>
                        <p>{t('everyStakeholder')}</p>
                    </div>

                    <div className="stakeholders-flow">
                        {stakeholders.map((item, index) => (
                            <div key={index} className="stakeholder-item">
                                <div className="stakeholder-icon">{item.icon}</div>
                                <h4>{item.label}</h4>
                                <p>{item.desc}</p>
                                {index < stakeholders.length - 1 && (
                                    <div className="stakeholder-arrow">
                                        <ArrowRight size={24} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">
                            <Globe size={16} />
                            <span>{t('platformFeatures')}</span>
                        </div>
                        <h2>{t('everythingYouNeed')}<br /><span className="text-gradient">{t('supplyChainTransparency')}</span></h2>
                        <p>{t('powerfulTools')}</p>
                    </div>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className={`feature-card feature-card-${feature.color}`}
                            >
                                <div className="feature-icon">{feature.icon}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                                <div className="feature-link">
                                    {t('learnMore')} <ArrowRight size={16} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="how-it-works-section">
                <div className="container">
                    <div className="section-header text-center">
                        <div className="section-badge">
                            <Cpu size={16} />
                            <span>{t('simpleProcess')}</span>
                        </div>
                        <h2>{t('howFARMETRAWorks')}</h2>
                        <p>{t('getStartedMinutes')}</p>
                    </div>

                    <div className="steps-container">
                        <div className="step-card">
                            <div className="step-number">{t('step01')}</div>
                            <div className="step-content">
                                <h3>{t('createBatch')}</h3>
                                <p>{t('createBatchDesc')}</p>
                            </div>
                            <div className="step-visual">
                                <div className="step-icon-wrap">
                                    <Wheat size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        <div className="step-card">
                            <div className="step-number">{t('step02')}</div>
                            <div className="step-content">
                                <h3>{t('trackEvents')}</h3>
                                <p>{t('trackEventsDesc')}</p>
                            </div>
                            <div className="step-visual">
                                <div className="step-icon-wrap">
                                    <TrendingUp size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        <div className="step-card">
                            <div className="step-number">{t('step03')}</div>
                            <div className="step-content">
                                <h3>{t('generateQR')}</h3>
                                <p>{t('generateQRDesc')}</p>
                            </div>
                            <div className="step-visual">
                                <div className="step-icon-wrap">
                                    <QrCode size={32} />
                                </div>
                            </div>
                        </div>

                        <div className="step-connector"></div>

                        <div className="step-card">
                            <div className="step-number">{t('step04')}</div>
                            <div className="step-content">
                                <h3>{t('consumerVerifies')}</h3>
                                <p>{t('consumerVerifiesDesc')}</p>
                            </div>
                            <div className="step-visual">
                                <div className="step-icon-wrap">
                                    <Shield size={32} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section id="benefits" className="benefits-section">
                <div className="container">
                    <div className="benefits-wrapper">
                        <div className="benefits-content">
                            <div className="section-badge">
                                <CheckCircle2 size={16} />
                                <span>{t('whyChooseUs')}</span>
                            </div>
                            <h2>{t('buildTrust')}<br /><span className="text-gradient">{t('transparency')}</span></h2>
                            <p className="benefits-intro">
                                {t('benefitsIntro')}
                            </p>

                            <ul className="benefits-list">
                                {benefits.map((benefit, index) => (
                                    <li key={index} className="benefit-item">
                                        <CheckCircle2 size={20} />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link to="/register" className="btn btn-primary btn-lg">
                                {t('startBuildingTrust')}
                                <ArrowRight size={18} />
                            </Link>
                        </div>

                        <div className="benefits-visual">
                            <div className="benefits-card">
                                <div className="benefits-card-glow"></div>
                                <div className="benefits-metric">
                                    <span className="metric-value">40%</span>
                                    <span className="metric-label">{t('reductionCounterfeits')}</span>
                                </div>
                                <div className="benefits-metric">
                                    <span className="metric-value">3x</span>
                                    <span className="metric-label">{t('fasterRecall')}</span>
                                </div>
                                <div className="benefits-metric">
                                    <span className="metric-value">92%</span>
                                    <span className="metric-label">{t('trustIncrease')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-bg"></div>
                        <div className="cta-content">
                            <h2>{t('readyToTransform')}</h2>
                            <p>{t('joinAgriBusinesses')}</p>
                            <div className="cta-buttons">
                                <Link to="/register" className="btn btn-accent btn-lg">
                                    {t('getStartedFree')}
                                    <ArrowRight size={18} />
                                </Link>
                                <a href="#contact" className="btn btn-outline-light btn-lg">
                                    {t('scheduleDemo')}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rating Section */}
            <section className="rating-section">
                <div className="container">
                    <WebsiteRating />
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="footer-brand">
                            <Link to="/" className="nav-logo">
                                <div className="logo-icon">
                                    <Leaf size={24} />
                                </div>
                                <span>FARMETRA</span>
                            </Link>
                            <p>{t('buildingTrust')}</p>
                        </div>

                        <div className="footer-links">
                            <div className="footer-column">
                                <h4>{t('platform')}</h4>
                                <a href="#features">{t('features')}</a>
                                <a href="#how-it-works">{t('howItWorks')}</a>
                                <a href="#pricing">{t('pricing')}</a>
                            </div>
                            <div className="footer-column">
                                <h4>{t('resources')}</h4>
                                <a href="#docs">{t('documentation')}</a>
                                <a href="#api">{t('apiReference')}</a>
                                <a href="#support">{t('support')}</a>
                            </div>
                            <div className="footer-column">
                                <h4>{t('company')}</h4>
                                <a href="#about">{t('about')}</a>
                                <a href="#contact">{t('contact')}</a>
                                <a href="#careers">{t('careers')}</a>
                            </div>
                        </div>
                    </div>

                    <div className="footer-bottom">
                        <p>&copy; 2024 FARMETRA. {t('allRightsReserved')}</p>
                        <div className="footer-legal">
                            <a href="#privacy">{t('privacyPolicy')}</a>
                            <a href="#terms">{t('termsOfService')}</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
