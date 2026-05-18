import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Store, Filter, ChevronDown, Clock, Zap, Heart } from 'lucide-react';
import { fetchProducts } from '../../api/apiClient';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useTranslation } from '../../hooks/useTranslation';
import './MarketplacePage.css';

const CROP_EMOJIS: Record<string, string> = {
  'wheat': '🌾', 'rice': '🍚', 'corn': '🌽', 'tomato': '🍅', 'potato': '🥔',
  'sugarcane': '🎋', 'carrot': '🥕', 'apple': '🍎', 'mango': '🥭', 'banana': '🍌',
  'grapes': '🍇', 'orange': '🍊', 'onion': '🧅', 'garlic': '🧄', 'ginger': '🫚',
  'spinach': '🥬', 'broccoli': '🥦', 'pea': '🫛', 'default': '🌿'
};

function getCropEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(CROP_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return CROP_EMOJIS.default;
}

const CATEGORY_MAP: Record<string, string> = {
  'All': 'allCategories',
  'Fruits': 'fruits',
  'Vegetables': 'vegetables',
  'Leafy Greens': 'leafyGreens',
  'Grains & Cereals': 'grainsCereals',
  'Pulses & Lentils': 'pulsesLentils',
  'Spices': 'spices',
  'Seasonal Crops': 'seasonalCrops',
  'Organic Produce': 'organicProduce'
};

const PRODUCE_CATEGORIES = Object.keys(CATEGORY_MAP).filter(c => c !== 'All');

interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  image?: string;
  retailer: { name: string; organization: string; location: string } | null;
  batch: { batchId: string; productName: string; status: string } | null;
  createdAt: string;
  isOrganic?: boolean;
  isSeasonal?: boolean;
  isBestSeller?: boolean;
  freshnessTag?: string;
}

const translateProductName = (name: string, t: any): string => {
  const lowerName = name.toLowerCase();
  const cropKeys = ['tomato', 'potato', 'onion', 'wheat', 'rice', 'corn', 'apple', 'orange', 'banana', 'grapes', 'spinach', 'carrot'];
  
  for (const key of cropKeys) {
    if (lowerName.includes(key)) {
      return t('crops', key);
    }
  }
  return name;
};

const translateTag = (tag: string | undefined, t: any): string => {
  if (!tag) return '';
  const tagMap: Record<string, string> = {
    'fresh today': 'freshToday',
    'fresh today!': 'freshToday',
    'rich harvest': 'seasonal',
    'low pesticide': 'organic',
    'freshness': 'freshness'
  };
  const key = tagMap[tag.toLowerCase()] || tag;
  return t('marketplace', key);
};

const MarketplacePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { cartItems, addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterSeasonal, setFilterSeasonal] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProducts();
      const enhancedData = data.map((p: any) => ({
        ...p,
        isOrganic: p.isOrganic !== undefined ? p.isOrganic : Math.random() > 0.7,
        isSeasonal: p.isSeasonal !== undefined ? p.isSeasonal : Math.random() > 0.8,
        isBestSeller: p.isBestSeller !== undefined ? p.isBestSeller : Math.random() > 0.85,
        freshnessTag: p.freshnessTag || (Math.random() > 0.5 ? 'Fresh Today' : 'Rich Harvest')
      }));
      setProducts(enhancedData);
    } catch {
      setProducts([
        { id: '1', name: 'Organic Wheat', description: 'Fresh organic wheat from Punjab farms', price: 45, quantity: 100, unit: 'kg', category: 'Grains & Cereals', isOrganic: true, freshnessTag: 'Low Pesticide', retailer: { name: 'Green Store', organization: 'Green Retail Co', location: 'Delhi' }, batch: { batchId: 'BATCH-001', productName: 'Wheat', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '2', name: 'Vine-Ripened Tomatoes', description: 'Deep red, juicy tomatoes', price: 60, quantity: 50, unit: 'kg', category: 'Vegetables', freshnessTag: 'Fresh Today', isBestSeller: true, retailer: { name: 'Farm Fresh', organization: 'Fresh Mart', location: 'Mumbai' }, batch: { batchId: 'BATCH-002', productName: 'Tomatoes', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '3', name: 'Premium Basmati Rice', description: 'Long-grain aged basmati', price: 120, quantity: 200, unit: 'kg', category: 'Grains & Cereals', isOrganic: true, retailer: { name: 'Rice World', organization: 'Rice World Ltd', location: 'Lucknow' }, batch: { batchId: 'BATCH-003', productName: 'Basmati Rice', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '4', name: 'Alphonso Mangoes', description: 'Sweet king of mangoes', price: 500, quantity: 30, unit: 'dozen', category: 'Fruits', isSeasonal: true, freshnessTag: 'Seasonal Pick', isBestSeller: true, retailer: { name: 'Fruit Basket', organization: 'Fruit Basket Pvt Ltd', location: 'Ratnagiri' }, batch: { batchId: 'BATCH-004', productName: 'Mango', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '5', name: 'Agra Farm Potatoes', description: 'Versatile farm potatoes', price: 30, quantity: 150, unit: 'kg', category: 'Vegetables', freshnessTag: 'Farm Fresh', retailer: { name: 'Veggie Hub', organization: 'Veggie Hub', location: 'Agra' }, batch: { batchId: 'BATCH-005', productName: 'Potato', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '6', name: 'Organic Spinach', description: 'Lush green spinach', price: 40, quantity: 50, unit: 'kg', category: 'Leafy Greens', isOrganic: true, freshnessTag: 'Native Variety', retailer: { name: 'Green Life', organization: 'Green Life Org', location: 'Pune' }, batch: { batchId: 'BATCH-006', productName: 'Spinach', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '7', name: 'Kashmiri Red Apples', description: 'Crisp apples from the valley', price: 180, quantity: 80, unit: 'kg', category: 'Fruits', isSeasonal: true, freshnessTag: 'Premium Quality', retailer: { name: 'Himalayan Finds', organization: 'HimFinds', location: 'Srinagar' }, batch: { batchId: 'BATCH-007', productName: 'Apple', status: 'completed' }, createdAt: new Date().toISOString() },
        { id: '8', name: 'Organic Turmeric Root', description: 'Raw high-curcumin turmeric', price: 250, quantity: 40, unit: 'kg', category: 'Spices', isOrganic: true, retailer: { name: 'Spice Route', organization: 'Spice Co', location: 'Kochi' }, batch: { batchId: 'BATCH-008', productName: 'Turmeric', status: 'completed' }, createdAt: new Date().toISOString() }
      ]);
    }
    setLoading(false);
  };

  const filteredProducts = products
    .filter(p => {
      if (category !== 'All' && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterOrganic && !p.isOrganic) return false;
      if (filterSeasonal && !p.isSeasonal) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });


  const seasonalPicks = products.filter(p => p.isSeasonal).slice(0, 4);
  const organicSpecials = products.filter(p => p.isOrganic).slice(0, 3);

  const ProductCard = ({ product }: { product: ProductItem }) => {
    const isLoved = isInWishlist(product.id);
    return (
      <div className="ecommerce-product-card" onClick={() => navigate(`/marketplace/${product.id}`)}>
        <div className="product-image-container">
          {product.image ? (
            <img 
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${product.image}`} 
              alt={product.name}
              className="product-image"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                e.currentTarget.style.display = 'none';
                const emojiDiv = e.currentTarget.nextElementSibling;
                if (emojiDiv) emojiDiv.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`product-emoji ${product.image ? 'hidden' : ''}`}>{getCropEmoji(product.name)}</div>
          {product.isOrganic && <div className="tag organic-tag">{t('marketplace', 'organic')}</div>}
          {product.freshnessTag && <div className="tag freshness-tag">{translateTag(product.freshnessTag, t)}</div>}
          
          <button 
            className={`wishlist-heart-btn ${isLoved ? 'loved' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
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
            <Heart size={18} fill={isLoved ? '#ef4444' : 'transparent'} color={isLoved ? '#ef4444' : 'currentColor'} />
          </button>

          <button 
            className="quick-add-btn" 
          onClick={(e) => {
            e.stopPropagation();
            addToCart({
              productId: product.id,
              name: product.name,
              price: product.price,
              quantity: 1,
              unit: product.unit,
              category: product.category
            });
          }}
        >
          <Zap size={14} />
        </button>
      </div>
      <div className="product-details">
        <span className="product-cat-label">{t('marketplace', CATEGORY_MAP[product.category] || product.category)}</span>
        <h3 className="product-name-title">{translateProductName(product.name, t)}</h3>
        <p className="product-retailer-info">
          <Store size={12} /> {product.retailer?.organization || 'Local Farm'}
        </p>
        <div className="product-footer">
          <div className="price-tag">
            <span className="currency">₹</span>
            <span className="amount">{product.price}</span>
            <span className="unit">/{product.unit}</span>
          </div>
          <button className="add-cart-button">
            {t('marketplace', 'addToCart')}
          </button>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="marketplace-modern">
      {/* Hero Section */}
      <section className="marketplace-hero-banner">
        <div className="hero-content">
          <div className="hero-badge">{t('marketplace', 'freshToday')}</div>
          <h1>{t('marketplace', 'farmFreshBanner')}</h1>
          <p>{t('marketplace', 'organicBannerDesc')}</p>
          <div className="hero-actions">
            <button className="btn-primary-vibrant" onClick={() => setCategory('Vegetables')}>{t('marketplace', 'browseVeggies')}</button>
            <button className="btn-secondary-glass" onClick={() => setFilterOrganic(true)}>{t('marketplace', 'organicRange')}</button>
          </div>
        </div>
        <div className="hero-image-overlay">
          <div className="floating-produce produce-1">🍊</div>
          <div className="floating-produce produce-2">🥬</div>
          <div className="floating-produce produce-3">🥔</div>
        </div>
      </section>

      {/* Navigation */}
      <div className="marketplace-sticky-nav">
        <div className="nav-container">
          <div className="category-dropdown">
            <button className="dropdown-trigger">
              <Filter size={18} />
              {t('marketplace', CATEGORY_MAP[category] || category)}
              <ChevronDown size={14} />
            </button>
            <div className="dropdown-menu">
              {PRODUCE_CATEGORIES.map(c => (
                <div key={c} className={`menu-item ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                  {t('marketplace', CATEGORY_MAP[c] || c)}
                </div>
              ))}
            </div>
          </div>

          <div className="search-bar-vibrant">
            <Search size={18} />
            <input
              type="text"
              placeholder={t('marketplace', 'searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-chips">
            <button className={`chip ${filterOrganic ? 'active' : ''}`} onClick={() => setFilterOrganic(!filterOrganic)}>
              {t('marketplace', 'organic')}
            </button>
            <button className={`chip ${filterSeasonal ? 'active' : ''}`} onClick={() => setFilterSeasonal(!filterSeasonal)}>
              {t('marketplace', 'seasonal')}
            </button>
            <select className="sort-select-premium" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">{t('marketplace', 'freshness')}</option>
              <option value="price_asc">{t('marketplace', 'priceLowHigh')}</option>
              <option value="price_desc">{t('marketplace', 'priceHighLow')}</option>
              <option value="popularity">{t('marketplace', 'popularity')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="marketplace-content-wrapper">
        {/* Seasonal Picks */}
        {seasonalPicks.length > 0 && category === 'All' && !search && (
          <section className="market-section">
            <div className="section-header">
              <h2><Clock size={22} className="text-orange" /> {t('marketplace', 'seasonalPicks')}</h2>
              <Link to="#" className="view-more">{t('dashboard', 'viewAll')} →</Link>
            </div>
            <div className="horizontal-scroll-grid">
              {seasonalPicks.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        {/* Categories Strip */}
        <section className="market-section categories-strip">
          <div className="category-scroll">
            {PRODUCE_CATEGORIES.filter(c => c !== 'All').map(c => (
              <div key={c} className={`cat-icon-card ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                <div className="cat-icon-circle">{getCropEmoji(c)}</div>
                <span>{t('marketplace', CATEGORY_MAP[c] || c)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Main Grid */}
        <section className="market-section main-grid-section">
          <div className="section-header">
            <h2>{category === 'All' ? t('marketplace', 'bestSellers') : t('marketplace', CATEGORY_MAP[category] || category)}</h2>
            <div className="results-count">{filteredProducts.length} {t('marketplace', 'results')}</div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner-lush"></div>
              <p>{t('marketplace', 'gatheringProduce')}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-illustration">🧺</div>
              <h3>{t('marketplace', 'nothingFound')}</h3>
              <p>{t('marketplace', 'tryAdjustingSearch')}</p>
              <button className="btn-text" onClick={() => {setCategory('All'); setSearch(''); setFilterOrganic(false); setFilterSeasonal(false);}}>
                {t('marketplace', 'resetFilters')}
              </button>
            </div>
          ) : (
            <div className="produce-ecommerce-grid">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        {/* Organic Specials */}
        {organicSpecials.length > 0 && category === 'All' && !search && (
          <section className="market-section highlights-banner">
            <div className="banner-green-glow">
              <div className="banner-text">
                <span className="badge-white">100% {t('marketplace', 'organic')}</span>
                <h3>{t('marketplace', 'organicSpecials')}</h3>
                <p>{t('marketplace', 'organicDescription')}</p>
                <button className="btn-light" onClick={() => setFilterOrganic(true)}>{t('marketplace', 'exploreNow')}</button>
              </div>
              <div className="banner-products">
                {organicSpecials.map(p => (
                  <div key={p.id} className="mini-product-item" onClick={() => navigate(`/marketplace/${p.id}`)}>
                    <div className="mini-emoji">{getCropEmoji(p.name)}</div>
                    <div className="mini-info">
                      <span className="mini-name">{p.name}</span>
                      <span className="mini-price">₹{p.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Floating Cart (Mobile-friendly) */}
      {cartItems.length > 0 && (
        <button className="floating-cart-action" onClick={() => navigate('/checkout')}>
          <ShoppingCart size={24} />
          <span className="cart-count-badge">{cartItems.length}</span>
          <span className="cart-total-preview">₹{cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)}</span>
        </button>
      )}
    </div>
  );
};

export default MarketplacePage;
