import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Store, MapPin, Leaf, Factory,
  Truck, Sprout, CheckCircle2, Shield, Calendar, Info, Heart, Zap
} from 'lucide-react';
import { fetchProductById } from '../../api/apiClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTranslation } from '../../hooks/useTranslation';
import './ProductDetailPage.css';

const CROP_EMOJIS: Record<string, string> = {
  'wheat': '🌾', 'rice': '🍚', 'corn': '🌽', 'tomato': '🍅', 'potato': '🥔',
  'sugarcane': '🎋', 'carrot': '🥕', 'apple': '🍎', 'mango': '🥭', 'banana': '🍌',
  'spinach': '🥬', 'broccoli': '🥦', 'pea': '🫛', 'default': '🌿'
};

function getCropEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return CROP_EMOJIS.default;
}

const TIMELINE_ICONS: Record<string, React.ReactNode> = {
  sprout: <Sprout size={16} />,
  leaf: <Leaf size={16} />,
  factory: <Factory size={16} />,
  truck: <Truck size={16} />,
  store: <Store size={16} />,
  'shopping-cart': <ShoppingCart size={16} />,
};

interface ProductDetail {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  retailer: { name: string; organization: string; location: string } | null;
  batch: any;
  cropAnalysis: any;
  timeline: any[];
  createdAt: string;
  harvestDate?: string;
  nutritionalInfo?: string;
  isOrganic?: boolean;
}

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  
  const isLoved = product ? isInWishlist(product.id) : false;

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const data = await fetchProductById(id!);
      setProduct({
        ...data,
        harvestDate: data.harvestDate || new Date(Date.now() - 3 * 86400000).toISOString(),
        nutritionalInfo: data.nutritionalInfo || 'Rich in fiber and essential minerals. 100% natural and pesticide-free.',
        isOrganic: data.isOrganic || true
      });
    } catch {
      // Mock product
      setProduct({
        id: id || '1',
        name: 'Organic Wheat',
        description: 'Fresh organic wheat from Punjab farms. Grown using sustainable farming practices with no chemical pesticides or fertilizers.',
        price: 45,
        quantity: 100,
        unit: 'kg',
        category: 'Grains & Cereals',
        retailer: { name: 'Green Store', organization: 'Green Valley Exports', location: 'Punjab, India' },
        harvestDate: new Date(Date.now() - 5 * 86400000).toISOString(),
        nutritionalInfo: 'Calories: 340 kcal/100g, Protein: 13g, Fiber: 11g. Excellent source of complex carbohydrates.',
        isOrganic: true,
        batch: {
          batchId: 'BATCH-FARM-99',
          productName: 'Wheat',
          farmName: 'Green Valley Farms',
          location: 'Amritsar, Punjab',
          farmer: { name: 'Sardar Singh', organization: 'GV Farms' }
        },
        cropAnalysis: {
          soilType: 'Alluvial',
          weather: { temperature: 24, humidity: 55, condition: 'Sunny' },
          disease: 'Healthy'
        },
        timeline: [
          { step: 'Planting', role: 'FARMER', actor: 'Sardar Singh', organization: 'GV Farms', location: 'Amritsar', icon: 'sprout', timestamp: new Date(Date.now() - 120 * 86400000).toISOString() },
          { step: 'Harvesting', role: 'FARMER', actor: 'Sardar Singh', organization: 'GV Farms', location: 'Amritsar', icon: 'leaf', timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
          { step: 'Quality Check', role: 'PROCESSOR', actor: 'AgriSafe', organization: 'AgriSafe Labs', location: 'Ludhiana', icon: 'factory', timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
          { step: 'In Transit', role: 'DISTRIBUTOR', actor: 'FarmToFork', organization: 'F2F Logistics', location: 'Delhi', icon: 'truck', timestamp: new Date(Date.now() - 1 * 86400000).toISOString() }
        ],
        createdAt: new Date().toISOString()
      });
    }
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      unit: product.unit,
      category: product.category
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading-lush">
          <div className="spinner-lush"></div>
          <p>Unveiling product secrets...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="product-detail-page"><p>Produce not found</p></div>;
  }

  return (
    <div className="product-detail-page">
      <Link to="/marketplace" className="back-link">
        <ArrowLeft size={18} /> {t('marketplace', 'title')}
      </Link>

      <div className="product-detail-top">
        <div className="product-detail-image">
          {getCropEmoji(product.name)}
          <button 
            className={`fav-btn ${isLoved ? 'active' : ''}`} 
            onClick={() => {
              if (isLoved) {
                removeFromWishlist(product.id);
              } else {
                addToWishlist({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  unit: product.unit,
                  category: product.category
                });
              }
            }}
          >
            <Heart size={24} fill={isLoved ? '#ef4444' : 'transparent'} color={isLoved ? '#ef4444' : 'currentColor'} />
          </button>
        </div>
        
        <div className="product-detail-info">
          <div className="info-header">
            <span className="detail-category">{product.category}</span>
            {product.isOrganic && <span className="organic-badge">🌿 {t('marketplace', 'organic')}</span>}
          </div>
          
          <h1>{product.name}</h1>
          
          <div className="origin-harvest-info">
            <div className="origin-pill">
              <MapPin size={14} /> {product.retailer?.location || 'Direct from Farm'}
            </div>
            <div className="harvest-pill">
              <Calendar size={14} /> {t('marketplace', 'harvestDate')}: {new Date(product.harvestDate!).toLocaleDateString()}
            </div>
          </div>

          <p className="detail-description">{product.description}</p>
          
          <div className="detail-price-row">
            <div className="detail-price">
              <span className="curr">₹</span>
              {product.price}
              <span className="unit-label">/{product.unit}</span>
            </div>
            <div className="detail-stock">
              <div className="stock-dot"></div>
              {product.quantity} {product.unit} available
            </div>
          </div>

          <div className="nutritional-box">
            <h4><Info size={16} /> {t('marketplace', 'nutritionalInfo')}</h4>
            <p>{product.nutritionalInfo}</p>
          </div>

          <div className="detail-actions">
            <button className="btn-add-cart" onClick={handleAddToCart}>
              <ShoppingCart size={20} /> {t('marketplace', 'addToCart')}
            </button>
            <button className="btn-buy-now" onClick={handleBuyNow}>
              <Zap size={20} /> {t('marketplace', 'buyNow')}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid-sections">
        {/* Agriculture Data */}
        {product.cropAnalysis && (
          <section className="crop-analysis-card">
            <h2><Sprout size={24} /> {t('navigation', 'cropGrowth')}</h2>
            <div className="analysis-data-grid">
              <div className="analysis-data-item">
                <div className="analysis-value">{product.cropAnalysis.soilType}</div>
                <div className="analysis-label">Soil Type</div>
              </div>
              <div className="analysis-data-item">
                <div className="analysis-value text-lush">{product.cropAnalysis.weather?.temperature}°C</div>
                <div className="analysis-label">Temperature</div>
              </div>
              <div className="analysis-data-item">
                <div className="analysis-value">{product.cropAnalysis.weather?.condition}</div>
                <div className="analysis-label">Weather</div>
              </div>
              <div className="analysis-data-item">
                <div className="analysis-value">{product.cropAnalysis.disease === 'Healthy' ? '✅ Healthy' : product.cropAnalysis.disease}</div>
                <div className="analysis-label">Quality Status</div>
              </div>
            </div>
          </section>
        )}

        {/* Journey Timeline */}
        <section className="supply-chain-section">
          <h2><Shield size={24} className="text-lush" /> {t('marketplace', 'title')} Traceability</h2>
          <div className="timeline">
            {(product.timeline || []).map((item: any, i: number) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot">
                  {TIMELINE_ICONS[item.icon] || <Leaf size={16} />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-header">
                    <h4>{item.step}</h4>
                    <span className="time-stamp">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="timeline-actor">
                    <Store size={14} /> {item.actor} {item.organization ? `(${item.organization})` : ''}
                  </div>
                  {item.location && <div className="timeline-location"><MapPin size={12} /> {item.location}</div>}
                </div>
              </div>
            ))}
            <div className="timeline-item">
              <div className="timeline-dot active">
                <CheckCircle2 size={16} />
              </div>
              <div className="timeline-content active">
                <h4>{t('marketplace', 'title')} Verified</h4>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '4px'}}>Securely tracked on FARMETRA blockchain</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showToast && (
        <div className="added-toast">
          <CheckCircle2 size={20} /> Item moved to your green cart!
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
