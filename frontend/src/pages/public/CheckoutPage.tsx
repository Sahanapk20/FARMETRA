import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, CreditCard, MapPin, CheckCircle2, Trash2, Plus, Minus
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { placeOrder } from '../../api/apiClient';
import Payment from '../../components/Payment';
import './CheckoutPage.css';
import { useEffect } from 'react';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, clearCart, totalAmount } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('FARMETRA_addresses');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSavedAddresses(parsed);
      if (parsed.length > 0) {
        setSelectedAddressId(parsed[0].id);
        setForm(prev => ({
          ...prev,
          street: parsed[0].street,
          city: parsed[0].city,
          state: parsed[0].state,
          pincode: parsed[0].pincode
        }));
      }
    }
  }, []);

  const handleAddressSelect = (addr: any) => {
    setSelectedAddressId(addr.id);
    setForm(prev => ({
      ...prev,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode
    }));
  };

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (!form.customerName || !form.customerEmail) return;

    try {
      const result = await placeOrder({
        items: cartItems.map(i => ({
          productId: i.productId,
          quantity: i.quantity
        })),
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        shippingAddress: {
          street: form.street,
          city: form.city,
          state: form.state,
          pincode: form.pincode
        }
      });
      setOrderId(result.orderId || 'ORD-' + Date.now().toString(36).toUpperCase());
      setOrderPlaced(true);
      clearCart();
    } catch {
      // Mock success
      setOrderId('ORD-' + Date.now().toString(36).toUpperCase());
      setOrderPlaced(true);
      clearCart();
    }
  };

  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <div className="order-success">
          <div className="success-check"><CheckCircle2 size={40} /></div>
          <h2>Order Placed Successfully! 🎉</h2>
          <div className="order-id">Order ID: {orderId}</div>
          <p>Thank you for your purchase. Your farm-fresh products are on their way!</p>
          <button className="btn-back-home" onClick={() => navigate('/marketplace')}>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <Link to="/marketplace" className="back-link">
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some farm-fresh products to get started!</p>
          <Link to="/marketplace"><ShoppingCart size={16} /> Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Link to="/marketplace" className="back-link">
        <ArrowLeft size={16} /> Back to Marketplace
      </Link>

      <h1><ShoppingCart size={24} /> Checkout</h1>

      {/* Cart Items */}
      <div className="cart-items">
        {cartItems.map(item => (
          <div key={item.productId} className="cart-item">
            <div className="cart-item-emoji">🌿</div>
            <div className="cart-item-info">
              <h4>{item.name}</h4>
              <span className="cart-item-price">₹{item.price}/{item.unit}</span>
            </div>
            <div className="cart-item-qty">
              <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
                <Minus size={14} />
              </button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                <Plus size={14} />
              </button>
            </div>
            <div className="cart-item-total">₹{item.price * item.quantity}</div>
            <button className="btn-remove-item" onClick={() => removeFromCart(item.productId)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="cart-total-bar">
        <span className="total-label">Total Amount</span>
        <span className="total-value">₹{totalAmount}</span>
      </div>

      {/* Shipping Form */}
      <div className="shipping-form">
        <h2><MapPin size={18} /> Shipping Details</h2>
        
        {savedAddresses.length > 0 && (
          <div className="saved-addresses-selector mb-6">
            <label className="input-label mb-2 block text-sm font-medium">Select Saved Address</label>
            <div className="address-options-grid">
              {savedAddresses.map(addr => (
                <div 
                  key={addr.id} 
                  className={`address-option-card ${selectedAddressId === addr.id ? 'active' : ''}`}
                  onClick={() => handleAddressSelect(addr)}
                >
                  <span className="addr-label">{addr.label}</span>
                  <p>{addr.street}, {addr.city}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input name="customerName" value={form.customerName} onChange={handleChange} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input name="customerEmail" type="email" value={form.customerEmail} onChange={handleChange} placeholder="your@email.com" />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input name="customerPhone" value={form.customerPhone} onChange={handleChange} placeholder="+91 98765 43210" />
          </div>
          <div className="form-group">
            <label>Pincode</label>
            <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="110001" />
          </div>
          <div className="form-group full-width">
            <label>Street Address</label>
            <input name="street" value={form.street} onChange={handleChange} placeholder="House no, Street name" />
          </div>
          <div className="form-group">
            <label>City</label>
            <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai" />
          </div>
          <div className="form-group">
            <label>State</label>
            <input name="state" value={form.state} onChange={handleChange} placeholder="Maharashtra" />
          </div>
        </div>
      </div>

      {showPayment ? (
        <div className="payment-module-container mt-8">
          <div className="section-header mb-4">
            <h2 className="text-xl font-bold">Secure Payment</h2>
            <button className="btn-text text-primary" onClick={() => setShowPayment(false)}>Change Options</button>
          </div>
          <Payment 
            amount={totalAmount} 
            items={cartItems.map(item => ({
              id: item.productId,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            }))}
            onSuccess={() => handlePlaceOrder()} 
            onCancel={() => setShowPayment(false)} 
          />
        </div>
      ) : (
        <button
          className="btn-place-order"
          onClick={() => setShowPayment(true)}
          disabled={!form.customerName || !form.customerEmail}
        >
          <CreditCard size={20} />
          Proceed to Payment • ₹{totalAmount}
        </button>
      )}
    </div>
  );
};

export default CheckoutPage;
