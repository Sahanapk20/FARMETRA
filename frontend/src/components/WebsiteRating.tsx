import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../locales/translations';
import './WebsiteRating.css';

export default function WebsiteRating() {
  const { currentLanguage } = useLanguage();
  const t = (key: string) => getTranslation('landingExtended', key, currentLanguage);
  
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [review, setReview] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleStarClick = (star: number) => {
    setRating(star);
    setError('');
  };

  const handleSubmit = () => {
    if (rating === 0) {
      setError(t('selectRatingError'));
      return;
    }

    // Log the review data
    console.log({
      rating: rating,
      review: review,
      timestamp: new Date().toISOString()
    });

    setSubmitted(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setRating(0);
      setReview('');
      setSubmitted(false);
      setError('');
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="website-rating-card">
        <div className="success-message">
          <CheckCircle size={48} className="success-icon" />
          <h3>{t('feedbackThanks')}</h3>
          <p>{t('feedbackSuccess')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="website-rating-card">
      <h2 className="rating-title">{t('rateYourExperience')}</h2>
      <p className="rating-subtitle">{t('howWouldYouRate')}</p>

      {/* Star Rating */}
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className="star-button"
            onClick={() => handleStarClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            type="button"
          >
            <Star
              size={36}
              className={`star-icon ${
                star <= (hoverRating || rating) ? 'star-filled' : 'star-empty'
              }`}
              fill={star <= (hoverRating || rating) ? '#fbbf24' : 'none'}
              stroke={star <= (hoverRating || rating) ? '#fbbf24' : '#94a3b8'}
            />
          </button>
        ))}
      </div>

      <div className="rating-text">
        {rating === 1 && t('poor')}
        {rating === 2 && t('fair')}
        {rating === 3 && t('good')}
        {rating === 4 && t('veryGood')}
        {rating === 5 && t('excellent')}
        {rating === 0 && t('clickStarToRate')}
      </div>

      {/* Review Textarea */}
      <div className="review-section">
        <label htmlFor="review-text" className="review-label">
          {t('yourReviewOptional')}
        </label>
        <textarea
          id="review-text"
          className="review-textarea"
          placeholder={t('reviewPlaceholder')}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
        />
        {review.length > 0 && review.length < 10 && (
          <span className="char-hint">{t('reviewMinChars')}</span>
        )}
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Submit Button */}
      <button 
        className="submit-review-btn"
        onClick={handleSubmit}
        disabled={rating === 0}
      >
        <Send size={18} />
        {t('submitReview')}
      </button>

      {/* Average Rating Display (Static for now) */}
      <div className="average-rating">
        <span className="avg-label">{t('averageRating')}</span>
        <div className="avg-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              fill={star <= 4 ? '#fbbf24' : '#e5e7eb'}
              stroke={star <= 4 ? '#fbbf24' : '#e5e7eb'}
            />
          ))}
        </div>
        <span className="avg-value">4.2</span>
        <span className="avg-count">{t('reviewsCount')}</span>
      </div>
    </div>
  );
}
