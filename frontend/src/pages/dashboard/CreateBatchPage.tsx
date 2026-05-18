import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useLanguage } from '../../context/LanguageContext';
import { getTranslation } from '../../locales/translations';

import {

    Package,

    ArrowLeft,

    Save,

    MapPin,

    Info,

    CheckCircle,

    AlertCircle,

    ShieldAlert,

    Truck,

    Upload,

    FileText,

    HelpCircle,

    X

} from 'lucide-react';

import { createBatch, fetchAvailableRecipients, initiateHandoff } from '../../api/apiClient';

import { useAuth } from '../../context/AuthContext';

import ProcessorPaymentSection from '../../components/payment/ProcessorPaymentSection';

import './CreateBatchPage.css';



const productTypes = [

    'Grain', 'Fruit', 'Vegetable', 'Spice', 'Fiber', 'Dairy', 'Beverage', 'Other'

];



const weightUnits = ['kg', 'g', 'lb', 'ton', 'quintal'];



// Roles allowed to create batches

const ALLOWED_ROLES = ['FARMER', 'ADMIN'];



const CreateBatchPage = () => {

    const navigate = useNavigate();

    const { currentLanguage } = useLanguage();

    const t = (section: 'dashboard' | 'common' | 'errors' | 'navigation' | 'marketplace' | 'crops' | 'chatbot' | 'activity' | 'smartCropGrowth', key: string) => getTranslation(section, key, currentLanguage);

    const { user } = useAuth();

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [submitError, setSubmitError] = useState<string | null>(null);

    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({

        productName: '',

        productType: '',

        quantity: '',

        unit: 'units',

        weight: '',

        weightUnit: 'kg',

        farmName: '',

        location: '',

        giTag: '',

        harvestDate: '',

        description: '',

        certifications: [] as string[],

        certificationId: '',

        generateQR: true

    });

    const [errors, setErrors] = useState<Record<string, string>>({});



    // Role-based access control - redirect non-farmers/non-admins

    const userRole = user?.role?.toUpperCase() || '';

    const canCreateBatch = ALLOWED_ROLES.includes(userRole);

    const isFarmer = userRole === 'FARMER';



    // State for processor transfer option (only for farmers)

    const [transferToProcessor, setTransferToProcessor] = useState(false);

    const [selectedProcessor, setSelectedProcessor] = useState<number | null>(null);

    const [availableProcessors, setAvailableProcessors] = useState<Array<{ id: number; name: string; organization: string | null }>>([]);



    // State for certification yes/no and info modal

    const [hasCertificates, setHasCertificates] = useState<boolean | null>(null);

    const [showCertInfo, setShowCertInfo] = useState<string | null>(null);

    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});



    // Fetch available processors when farmer enters review step

    useEffect(() => {

        if (isFarmer && step === 3) {

            fetchAvailableRecipients().then(recipients => {

                const processors = recipients.filter(r => r.role === 'PROCESSOR');

                setAvailableProcessors(processors);

            });

        }

    }, [step, isFarmer]);



    useEffect(() => {

        if (user && !canCreateBatch) {

            // Redirect after a short delay to show the access denied message

            const timer = setTimeout(() => {

                navigate('/dashboard/batches');

            }, 3000);

            return () => clearTimeout(timer);

        }

    }, [user, canCreateBatch, navigate]);



    // Show access denied message for unauthorized users

    if (user && !canCreateBatch) {

        return (

            <div className="create-batch-page">

                <div className="access-denied">

                    <div className="access-denied-icon">

                        <ShieldAlert size={64} />

                    </div>

                    <h2>{t('dashboard', 'accessDenied')}</h2>

                    <p>{t('dashboard', 'onlyFarmersAdmins')}</p>

                    <p className="role-info">{t('dashboard', 'yourRole')} <strong>{user.role}</strong></p>

                    <p className="redirect-info">Redirecting to batches page...</p>

                    <button className="btn btn-primary" onClick={() => navigate('/dashboard/batches')}>

                        Go to Batches

                    </button>

                </div>

            </div>

        );

    }



    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {

        const { name, value, type } = e.target;



        if (type === 'checkbox') {

            const checked = (e.target as HTMLInputElement).checked;

            setFormData(prev => ({ ...prev, [name]: checked }));

        } else {

            setFormData(prev => ({ ...prev, [name]: value }));

        }



        if (errors[name]) {

            setErrors(prev => ({ ...prev, [name]: '' }));

        }

    };



    const toggleCertification = (cert: string) => {

        setFormData(prev => ({

            ...prev,

            certifications: prev.certifications.includes(cert)

                ? prev.certifications.filter(c => c !== cert)

                : [...prev.certifications, cert]

        }));

    };



    const handleFileUpload = (certName: string, file: File | null) => {

        if (file) {

            setUploadedFiles(prev => ({ ...prev, [certName]: file }));

        } else {

            setUploadedFiles(prev => {

                const newFiles = { ...prev };

                delete newFiles[certName];

                return newFiles;

            });

        }

    };



    const validateStep1 = () => {

        const newErrors: Record<string, string> = {};



        if (!formData.productName.trim()) {

            newErrors.productName = 'Product name is required';

        }

        if (!formData.productType) {

            newErrors.productType = 'Select a product type';

        }

        if (!formData.weight || parseFloat(formData.weight) <= 0) {

            newErrors.weight = 'Enter a valid weight';

        }



        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;

    };



    const validateStep2 = () => {

        const newErrors: Record<string, string> = {};



        if (!formData.farmName.trim()) {

            newErrors.farmName = 'Farm name is required';

        }

        if (!formData.location.trim()) {

            newErrors.location = 'Location is required';

        }



        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;

    };



    const handleNext = () => {

        if (step === 1 && validateStep1()) {

            setStep(2);

        } else if (step === 2 && validateStep2()) {

            setStep(3);

        }

    };



    const handleBack = () => {

        setStep(step - 1);

    };



    const handleSubmit = async () => {

        setIsSubmitting(true);

        setSubmitError(null);



        try {

            const result = await createBatch({

                productName: formData.productName,

                productType: formData.productType,

                weight: formData.weight,

                weightUnit: formData.weightUnit,

                farmName: formData.farmName,

                location: formData.location,

                harvestDate: formData.harvestDate,

                description: formData.description,

                certifications: formData.certifications,

                certificationId: formData.certificationId,

                certificationFiles: uploadedFiles

            });



            if (result.success && result.batch) {

                // If farmer selected to transfer to processor, initiate handoff

                if (transferToProcessor && selectedProcessor) {

                    try {

                        await initiateHandoff(

                            result.batch.id,

                            selectedProcessor,

                            'pickup',

                            `Batch transferred from farmer to processor after creation`

                        );

                    } catch (handoffError) {

                        console.error('Handoff failed:', handoffError);

                        // Continue to navigate even if handoff fails - batch was created

                    }

                }

                // Navigate to batch detail page

                navigate(`/dashboard/batches/${result.batch.id}`);

            } else {

                setSubmitError('Failed to create batch. The server did not return a success response.');

            }

        } catch (error) {

            console.error('Batch creation error:', error);

            if (error instanceof Error) {

                if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {

                    setSubmitError('Cannot connect to server. Please check if the backend is running.');

                } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {

                    setSubmitError('Session expired. Please login again.');

                } else {

                    setSubmitError(error.message);

                }

            } else {

                setSubmitError('An unexpected error occurred. Please try again.');

            }

        } finally {

            setIsSubmitting(false);

        }

    };



    const certificationOptions = [

    { name: 'Organic Certified', description: 'Certified organic farming practices without synthetic chemicals', icon: '🌿' },

    { name: 'Fair Trade', description: 'Ensures fair wages and ethical working conditions for farmers', icon: '🤝' },

    { name: 'Non-GMO', description: 'Product contains no genetically modified organisms', icon: '🧬' },

    { name: 'FSSAI Approved', description: 'Food Safety and Standards Authority of India certification', icon: '🛡️' },

    { name: 'ISO 22000', description: 'International food safety management system standard', icon: '📋' },

    { name: 'HACCP', description: 'Hazard Analysis Critical Control Points for food safety', icon: '✅' },

    { name: 'GI Tag', description: 'Geographical Indication - authentic regional specialty', icon: '📍' },

    { name: 'APEDA Certified', description: 'Export promotion council for agricultural products', icon: '🚢' }

];



    return (

        <div className="create-batch-page">

            {/* Page Header */}

            <div className="page-header">

                <button className="back-btn" onClick={() => navigate(-1)}>

                    <ArrowLeft size={20} />

                    {t('common', 'back')}

                </button>

                <div>

                    <h1 className="page-title">{t('dashboard', 'createNewBatch')}</h1>

                    <p className="page-subtitle">{t('dashboard', 'batchSubtitle')}</p>

                </div>

            </div>



            {/* Progress Steps */}

            <div className="create-steps">

                <div className={`create-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'complete' : ''}`}>

                    <div className="step-circle">

                        {step > 1 ? <CheckCircle size={20} /> : '1'}

                    </div>

                    <span className="step-label">{t('common', 'productDetails')}</span>

                </div>

                <div className="step-connector"></div>

                <div className={`create-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'complete' : ''}`}>

                    <div className="step-circle">

                        {step > 2 ? <CheckCircle size={20} /> : '2'}

                    </div>

                    <span className="step-label">{t('common', 'originInfo')}</span>

                </div>

                <div className="step-connector"></div>

                <div className={`create-step ${step >= 3 ? 'active' : ''}`}>

                    <div className="step-circle">3</div>

                    <span className="step-label">{t('common', 'reviewAndSubmit')}</span>

                </div>

            </div>



            {/* Form Content */}

            <div className="create-form-container">

                {step === 1 && (

                    <div className="form-section animate-fadeIn">

                        <div className="section-header">

                            <Package size={24} />

                            <div>

                                <h2>{t('common', 'productDetails')}</h2>

                                <p>{t('common', 'enterInformationAboutTheProduct')}</p>

                            </div>

                        </div>



                        <div className="form-grid">

                            <div className="input-group">

                                <label className="input-label">{t('common', 'productName')} *</label>

                                <input

                                    type="text"

                                    name="productName"

                                    className={`input ${errors.productName ? 'input-error' : ''}`}

                                    placeholder={t('common', 'eGOrganicWheat')}

                                    value={formData.productName}

                                    onChange={handleChange}

                                />

                                {errors.productName && <span className="input-error-text">{errors.productName}</span>}

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'productType')} *</label>

                                <select

                                    name="productType"

                                    className={`input select ${errors.productType ? 'input-error' : ''}`}

                                    value={formData.productType}

                                    onChange={handleChange}

                                >

                                    <option value="">{t('common', 'selectType')}</option>

                                    {productTypes.map(type => (

                                        <option key={type} value={type.toLowerCase()}>{type}</option>

                                    ))}

                                </select>

                                {errors.productType && <span className="input-error-text">{errors.productType}</span>}

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'quantity')}</label>

                                <div className="input-addon-group">

                                    <input

                                        type="number"

                                        name="quantity"

                                        className="input"

                                        placeholder={t('common', 'enterQuantity')}

                                        value={formData.quantity}

                                        onChange={handleChange}

                                    />

                                    <select

                                        name="unit"

                                        className="input-addon"

                                        value={formData.unit}

                                        onChange={handleChange}

                                    >

                                        <option value="units">{t('common', 'units')}</option>

                                        <option value="boxes">Boxes</option>

                                        <option value="bags">Bags</option>

                                        <option value="crates">Crates</option>

                                    </select>

                                </div>

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'weightTotalWeight')}*</label>

                                <div className="input-addon-group">

                                    <input

                                        type="number"

                                        name="weight"

                                        className={`input ${errors.weight ? 'input-error' : ''}`}

                                        placeholder={t('common', 'enterWeight')}

                                        value={formData.weight}

                                        onChange={handleChange}

                                    />

                                    <select

                                        name="weightUnit"

                                        className="input-addon"

                                        value={formData.weightUnit}

                                        onChange={handleChange}

                                    >

                                        {weightUnits.map(unit => (

                                            <option key={unit} value={unit}>{unit}</option>

                                        ))}

                                    </select>

                                </div>

                                {errors.weight && <span className="input-error-text">{errors.weight}</span>}

                            </div>



                            <div className="input-group full-width">

                                <label className="input-label">{t('common', 'description')}</label>

                                <textarea

                                    name="description"

                                    className="input textarea"

                                    placeholder={t('common', 'addAnyAdditionalDetailsAboutTheProduct')}

                                    rows={3}

                                    value={formData.description}

                                    onChange={handleChange}

                                />

                            </div>

                        </div>



                        <div className="form-actions">

                            <button type="button" className="btn btn-primary btn-lg" onClick={handleNext}>

                                {t('common', 'continueToOriginInfo')}

                            </button>

                        </div>

                    </div>

                )}



                {step === 2 && (

                    <div className="form-section animate-fadeIn">

                        <div className="section-header">

                            <MapPin size={24} />

                            <div>

                                <h2>{t('common', 'originInformation')}</h2>

                                <p>{t('common', 'whereWasThisProductSourcedFrom')}</p>

                            </div>

                        </div>



                        <div className="form-grid">

                            <div className="input-group">

                                <label className="input-label">{t('common', 'farmSourceName')} *</label>

                                <input

                                    type="text"

                                    name="farmName"

                                    className={`input ${errors.farmName ? 'input-error' : ''}`}

                                    placeholder={t('common', 'eGGoldenValleyFarms')}

                                    value={formData.farmName}

                                    onChange={handleChange}

                                />

                                {errors.farmName && <span className="input-error-text">{errors.farmName}</span>}

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'location')} *</label>

                                <input

                                    type="text"

                                    name="location"

                                    className={`input ${errors.location ? 'input-error' : ''}`}

                                    placeholder={t('common', 'eGPunjabIndia')}

                                    value={formData.location}

                                    onChange={handleChange}

                                />

                                {errors.location && <span className="input-error-text">{errors.location}</span>}

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'giTagGeographicalIndication')}</label>

                                <input

                                    type="text"

                                    name="giTag"

                                    className="input"

                                    placeholder={t('common', 'eGDarjeelingTeaBasmatiRice')}

                                    value={formData.giTag}

                                    onChange={handleChange}

                                />

                                <span className="input-hint">Official geographic product tag (if applicable)</span>

                            </div>



                            <div className="input-group">

                                <label className="input-label">{t('common', 'harvestDate')}</label>

                                <input

                                    type="date"

                                    name="harvestDate"

                                    className="input"

                                    value={formData.harvestDate}

                                    onChange={handleChange}

                                />

                            </div>



                            {/* Certificate Yes/No Question */}

                            <div className="input-group full-width">

                                <label className="input-label">{t('common', 'doYouHaveAnyCertificationsForThisProduct')}</label>

                                <div className="cert-toggle-group">

                                    <button

                                        type="button"

                                        className={`cert-toggle-btn ${hasCertificates === true ? 'selected' : ''}`}

                                        onClick={() => {

                                            setHasCertificates(true);

                                            setShowCertInfo('all');

                                        }}

                                    >

                                        <CheckCircle size={18} />

                                        {t('common', 'yesIHaveCertificates')}

                                    </button>

                                    <button

                                        type="button"

                                        className={`cert-toggle-btn ${hasCertificates === false ? 'selected' : ''}`}

                                        onClick={() => {

                                            setHasCertificates(false);

                                            setFormData(prev => ({ ...prev, certifications: [], certificationId: '' }));

                                            setUploadedFiles({});

                                        }}

                                    >

                                        <X size={18} />

                                        {t('common', 'noIDontHaveAny')}

                                    </button>

                                </div>

                                <span className="input-hint">

                                    {hasCertificates === null && t('common', 'selectYesIfYouHaveOrganicFSSAIOrOtherCertifications')}

                                    {hasCertificates === true && t('common', 'greatSelectYourCertificationsBelowAndUploadTheDocuments')}

                                    {hasCertificates === false && t('common', 'youCanProceedWithoutCertificationsTheyCanBeAddedLater')}

                                </span>

                            </div>



                            {/* Certificate Selection - Only shown if Yes */}

                            {hasCertificates === true && (

                                <>

                                    <div className="input-group full-width">

                                        <label className="input-label">

                                            {t('common', 'selectYourCertifications')}

                                            <button 

                                                type="button"

                                                className="cert-help-btn"

                                                onClick={() => setShowCertInfo('all')}

                                                title="Learn about certifications"

                                            >

                                                <HelpCircle size={16} />

                                            </button>

                                        </label>

                                        <div className="certification-grid">

                                            {certificationOptions.map(cert => (

                                                <button

                                                    key={cert.name}

                                                    type="button"

                                                    className={`cert-tag ${formData.certifications.includes(cert.name) ? 'selected' : ''}`}

                                                    onClick={() => toggleCertification(cert.name)}

                                                    title={cert.description}

                                                >

                                                    {formData.certifications.includes(cert.name) && <CheckCircle size={14} />}

                                                    {cert.name}

                                                </button>

                                            ))}

                                        </div>

                                        <span className="input-hint">Click any certification to select it. Click the ? button to learn what each certificate means.</span>

                                    </div>



                                    {/* Certificate Upload Section - Only if certifications selected */}

                                    {formData.certifications.length > 0 && (

                                        <div className="input-group full-width cert-upload-section">

                                            <label className="input-label">

                                                <Upload size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />

                                                {t('common', 'uploadYourCertificateDocuments')}

                                            </label>

                                            <p className="cert-upload-intro">

                                                {t('common', 'pleaseUploadTheAuthenticCertificateDocumentsForVerification')} 

                                                {t('common', 'acceptedFormatsPDFJPGPNGMax5MBEach')}

                                            </p>

                                            <div className="cert-upload-grid">

                                                {formData.certifications.map(certName => {

                                                    const certInfo = certificationOptions.find(c => c.name === certName);

                                                    return (

                                                        <div key={certName} className="cert-upload-item">

                                                            <div className="cert-upload-header">

                                                                <span className="cert-icon">{certInfo?.icon}</span>

                                                                <span className="cert-name">{certName}</span>

                                                            </div>

                                                            <div className="cert-upload-input">

                                                                <input

                                                                    type="file"

                                                                    id={`cert-file-${certName}`}

                                                                    accept=".pdf,.jpg,.jpeg,.png"

                                                                    onChange={(e) => handleFileUpload(certName, e.target.files?.[0] || null)}

                                                                    className="file-input-hidden"

                                                                />

                                                                <label htmlFor={`cert-file-${certName}`} className="file-upload-label">

                                                                    {uploadedFiles[certName] ? (

                                                                        <span className="file-selected">

                                                                            <FileText size={16} />

                                                                            {uploadedFiles[certName].name.length > 25 

                                                                                ? uploadedFiles[certName].name.substring(0, 25) + '...' 

                                                                                : uploadedFiles[certName].name}

                                                                            <button 

                                                                                type="button"

                                                                                className="file-remove-btn"

                                                                                onClick={(e) => {

                                                                                    e.preventDefault();

                                                                                    handleFileUpload(certName, null);

                                                                                }}

                                                                            >

                                                                                <X size={14} />

                                                                            </button>

                                                                        </span>

                                                                    ) : (

                                                                        <span className="file-placeholder">

                                                                            <Upload size={16} />

                                                                            Upload Certificate

                                                                        </span>

                                                                    )}

                                                                </label>

                                                            </div>

                                                            <span className="cert-upload-hint">

                                                                Upload your {certName} certificate

                                                            </span>

                                                        </div>

                                                    );

                                                })}

                                            </div>

                                        </div>

                                    )}



                                    {formData.certifications.length === 0 && hasCertificates === true && (

                                        <div className="cert-warning">

                                            <AlertCircle size={16} />

                                            <span>Please select at least one certification from the list above</span>

                                        </div>

                                    )}



                                    <div className="input-group full-width">

                                        <label className="input-label">Certification ID / License Number</label>

                                        <input

                                            type="text"

                                            name="certificationId"

                                            className="input"

                                            placeholder="e.g., FSSAI-12345678, ORGANIC-IN-001"

                                            value={formData.certificationId || ''}

                                            onChange={handleChange}

                                        />

                                        <span className="input-hint">Enter your official certification registration number for verification</span>

                                    </div>

                                </>

                            )}

                        </div>



                        <div className="form-actions">

                            <button type="button" className="btn btn-outline btn-lg" onClick={handleBack}>

                                Back

                            </button>

                            <button type="button" className="btn btn-primary btn-lg" onClick={handleNext}>

                                Review Batch

                            </button>

                        </div>

                    </div>

                )}



                {step === 3 && (

                    <div className="form-section animate-fadeIn">

                        <div className="section-header">

                            <Info size={24} />

                            <div>

                                <h2>Review & Submit</h2>

                                <p>Verify the batch information before submitting</p>

                            </div>

                        </div>



                        <div className="review-card">

                            <div className="review-section">

                                <h4>Product Details</h4>

                                <div className="review-grid">

                                    <div className="review-item">

                                        <span className="review-label">Product Name</span>

                                        <span className="review-value">{formData.productName}</span>

                                    </div>

                                    <div className="review-item">

                                        <span className="review-label">Product Type</span>

                                        <span className="review-value">{formData.productType}</span>

                                    </div>

                                    <div className="review-item">

                                        <span className="review-label">Weight</span>

                                        <span className="review-value">{formData.weight} {formData.weightUnit}</span>

                                    </div>

                                    {formData.quantity && (

                                        <div className="review-item">

                                            <span className="review-label">Quantity</span>

                                            <span className="review-value">{formData.quantity} {formData.unit}</span>

                                        </div>

                                    )}

                                </div>

                            </div>



                            <div className="review-section">

                                <h4>Origin Information</h4>

                                <div className="review-grid">

                                    <div className="review-item">

                                        <span className="review-label">Farm Name</span>

                                        <span className="review-value">{formData.farmName}</span>

                                    </div>

                                    <div className="review-item">

                                        <span className="review-label">Location</span>

                                        <span className="review-value">{formData.location}</span>

                                    </div>

                                    {formData.harvestDate && (

                                        <div className="review-item">

                                            <span className="review-label">Harvest Date</span>

                                            <span className="review-value">{new Date(formData.harvestDate).toLocaleDateString()}</span>

                                        </div>

                                    )}

                                </div>

                                {formData.certifications.length > 0 && (

                                    <div className="review-certs">

                                        <span className="review-label">Certifications</span>

                                        <div className="cert-badges">

                                            {formData.certifications.map(cert => (

                                                <span key={cert} className="badge badge-success">{cert}</span>

                                            ))}

                                        </div>

                                    </div>

                                )}

                            </div>



                            <div className="review-options">

                                <label className="checkbox-label">

                                    <input

                                        type="checkbox"

                                        name="generateQR"

                                        checked={formData.generateQR}

                                        onChange={handleChange}

                                    />

                                    <span className="checkbox-custom"></span>

                                    <span>Generate QR code for this batch</span>

                                </label>



                                {/* Transfer to Processor option - Only for Farmers */}

                                {isFarmer && (

                                    <div className="transfer-option">

                                        <label className="checkbox-label">

                                            <input

                                                type="checkbox"

                                                checked={transferToProcessor}

                                                onChange={(e) => {

                                                    setTransferToProcessor(e.target.checked);

                                                    if (!e.target.checked) setSelectedProcessor(null);

                                                }}

                                            />

                                            <span className="checkbox-custom"></span>

                                            <span><Truck size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Transfer batch to a Processor after creation</span>

                                        </label>



                                        {transferToProcessor && (

                                            <div className="processor-select" style={{ marginTop: 12, marginLeft: 28 }}>

                                                <select

                                                    className="input"

                                                    value={selectedProcessor || ''}

                                                    onChange={(e) => setSelectedProcessor(Number(e.target.value) || null)}

                                                >

                                                    <option value="">-- Select a Processor --</option>

                                                    {availableProcessors.map(p => (

                                                        <option key={p.id} value={p.id}>

                                                            {p.name} {p.organization ? `(${p.organization})` : ''}

                                                        </option>

                                                    ))}

                                                </select>

                                                {availableProcessors.length === 0 && (

                                                    <span className="input-hint" style={{ color: 'var(--warning)' }}>

                                                        No processors available. Register a processor first.

                                                    </span>

                                                )}

                                            </div>

                                        )}

                                    </div>

                                )}

                            </div>

                        </div>



                        {submitError && (

                            <div className="info-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>

                                <AlertCircle size={20} style={{ color: '#ef4444' }} />

                                <p style={{ color: '#ef4444' }}>{submitError}</p>

                            </div>

                        )}



                        <div className="info-banner">

                            <Info size={20} />

                            <p>

                                Once submitted, this batch will be registered on the blockchain and cannot be modified.

                                A unique Batch ID will be generated automatically.

                            </p>

                        </div>



                        <div className="form-actions">

                            <button type="button" className="btn btn-outline btn-lg" onClick={handleBack}>

                                Back

                            </button>

                            <button

                                type="button"

                                className={`btn btn-primary btn-lg ${isSubmitting ? 'btn-loading' : ''}`}

                                onClick={handleSubmit}

                                disabled={isSubmitting}

                            >

                                {isSubmitting ? (

                                    <span className="btn-spinner"></span>

                                ) : (

                                    <>

                                        <Save size={20} />

                                        Create Batch

                                    </>

                                )}

                            </button>

                        </div>

                    </div>

                )}



                {/* Certification Info Modal */}

                {showCertInfo && (

                    <div className="cert-info-modal-overlay" onClick={() => setShowCertInfo(null)}>

                        <div className="cert-info-modal" onClick={e => e.stopPropagation()}>

                            <div className="cert-info-header">

                                <h3>

                                    {showCertInfo === 'all' ? (

                                        <>📜 All Certifications Guide</>

                                    ) : (

                                        <>

                                            {certificationOptions.find(c => c.name === showCertInfo)?.icon} {showCertInfo}

                                        </>

                                    )}

                                </h3>

                                <button 

                                    type="button" 

                                    className="cert-info-close"

                                    onClick={() => setShowCertInfo(null)}

                                >

                                    <X size={24} />

                                </button>

                            </div>

                            <div className="cert-info-content">

                                {showCertInfo === 'all' ? (

                                    <div className="cert-guide-list">

                                        <p className="cert-guide-intro">

                                            Select certifications that apply to your product. Each certification adds credibility 

                                            and may increase your product's market value. Click on any certification above to learn more.

                                        </p>

                                        {certificationOptions.map(cert => (

                                            <div key={cert.name} className="cert-guide-item">

                                                <div className="cert-guide-icon">{cert.icon}</div>

                                                <div className="cert-guide-details">

                                                    <h4>{cert.name}</h4>

                                                    <p>{cert.description}</p>

                                                </div>

                                            </div>

                                        ))}

                                    </div>

                                ) : (

                                    <div className="cert-detail">

                                        {certificationOptions.find(c => c.name === showCertInfo)?.description}

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>

                )}

            </div>



            {/* Processor Payment Section - Show for processor role */}

            {user?.role === 'processor' && (

                <ProcessorPaymentSection 

                    batchData={{ batchId: 'processing-batch' }}

                    onPaymentComplete={(transactionId) => {

                        console.log('Processor payment completed:', transactionId);

                        // Handle post-payment logic

                    }}

                />

            )}

        </div>

    );

};



export default CreateBatchPage;

