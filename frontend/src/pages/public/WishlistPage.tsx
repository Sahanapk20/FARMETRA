import { useNavigate, Link } from 'react-router-dom';
// Wishlist page for consumers to view and manage saved products
import { ArrowLeft, Trash2, Heart, Zap } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useTranslation } from '../../hooks/useTranslation';
import './MarketplacePage.css'; // Reuse marketplace styles

const CROP_EMOJIS: Record<string, string> = {
  'wheat': '🌾', 'rice': '🍚', 'corn': '🌽', 'tomato': '🍅', 'potato': '🥔',
  'sugarcane': '🎋', 'carrot': '🥕', 'apple': '🍎', 'mango': '🥭', 'banana': '🍌',
  'default': '🌿'
};

function getCropEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return CROP_EMOJIS.default;
}

const WishlistPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlistItems.length === 0) {
    return (
      <div className="marketplace-modern">
        <div className="marketplace-content-wrapper">
          <Link to="/marketplace" className="back-link" style={{margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-700)', textDecoration: 'none', fontWeight: 600}}>
            <ArrowLeft size={18} /> {t('marketplace', 'title')}
          </Link>
          <div className="empty-state-modern" style={{padding: '5rem 0'}}>
            <div className="empty-illustration" style={{fontSize: '5rem'}}>❤️</div>
            <h3>Your wishlist is empty</h3>
            <p>Save your favorite farm-fresh products here to buy them later.</p>
            <button className="btn-primary-vibrant" style={{marginTop: '1.5rem'}} onClick={() => navigate('/marketplace')}>
              Explore Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-modern">
      <div className="marketplace-content-wrapper" style={{paddingTop: '2rem'}}>
        <Link to="/marketplace" className="back-link" style={{marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-700)', textDecoration: 'none', fontWeight: 600}}>
          <ArrowLeft size={18} /> {t('marketplace', 'title')}
        </Link>
        
        <div className="section-header">
          <h1><Heart size={28} fill="#ef4444" color="#ef4444" /> My Wishlist</h1>
          <p>{wishlistItems.length} items saved</p>
        </div>

        <div className="produce-ecommerce-grid" style={{marginTop: '2rem'}}>
          {wishlistItems.map(item => (
            <div key={item.productId} className="ecommerce-product-card">
              <div className="product-image-container">
                <div className="product-emoji">{getCropEmoji(item.name)}</div>
                <button 
                  className="quick-add-btn" 
                  style={{background: 'white', color: '#ef4444'}}
                  onClick={() => removeFromWishlist(item.productId)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="product-details">
                <span className="product-cat-label">{item.category}</span>
                <h3 className="product-name-title">{item.name}</h3>
                <div className="product-footer">
                  <div className="price-tag">
                    <span className="currency">₹</span>
                    <span className="amount">{item.price}</span>
                    <span className="unit">/{item.unit}</span>
                  </div>
                  <button 
                    className="add-cart-button"
                    onClick={() => addToCart({
                      productId: item.productId,
                      name: item.name,
                      price: item.price,
                      quantity: 1,
                      unit: item.unit,
                      category: item.category
                    })}
                  >
                    <Zap size={16} /> {t('marketplace', 'addToCart')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
