import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { fetchBatches } from '../../api/apiClient';
// Removed RetailerPaymentSection import
import type { Batch } from '../../api/types';

const RetailerListProductPage = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    unit: 'kg',
    category: 'General',
    batchId: ''
  });

  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const data = await fetchBatches();
      setBatches(data);
    } catch {
      setBatches([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      setProductImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProductImage(null);
    setImagePreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.quantity || !form.batchId) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('quantity', form.quantity);
      formData.append('unit', form.unit);
      formData.append('category', form.category);
      formData.append('batchId', form.batchId);
      
      if (productImage) {
        formData.append('image', productImage);
      }

      const token = localStorage.getItem('FARMETRA_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/marketplace/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to list product');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Error submitting product');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '3rem auto', textAlign: 'center', padding: '2rem' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: '#fff' }}>
          <CheckCircle2 size={40} />
        </div>
        <h2 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.5rem' }}>Product Listed Successfully! 🎉</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Your product is now visible on the marketplace.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => { setSuccess(false); setForm({ name: '', description: '', price: '', quantity: '', unit: 'kg', category: 'General', batchId: '' }); }}
            style={{ padding: '0.75rem 1.5rem', border: '2px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >
            List Another
          </button>
          <button
            onClick={() => navigate('/marketplace')}
            style={{ padding: '0.75rem 1.5rem', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            View Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShoppingBag size={24} color="#8b5cf6" /> List Product on Marketplace
      </h1>
      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>
        Add your products to the consumer marketplace. Link them to a batch for supply chain transparency.
      </p>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
        {/* Image Upload Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 8 }}>
            Product Image
          </label>
          {imagePreview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: 12 }} />
              <button type="button" onClick={removeImage} style={{ position: 'absolute', top: 8, right: 8, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: '2rem', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}>
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} id="product-image-upload" />
              <label htmlFor="product-image-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={32} color="#64748b" />
                <span style={{ color: '#64748b' }}>Click to upload product photo</span>
              </label>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Product Name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g., Organic Wheat" required
              style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', background: '#fff' }}>
              <option>General</option>
              <option>Grains</option>
              <option>Vegetables</option>
              <option>Fruits</option>
              <option>Processed</option>
              <option>Dairy</option>
              <option>Spices</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange as any} placeholder="Describe your product..." rows={3}
            style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', resize: 'vertical' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Price (₹) *</label>
            <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="45" required min="1"
              style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Quantity *</label>
            <input name="quantity" type="number" value={form.quantity} onChange={handleChange} placeholder="100" required min="1"
              style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Unit</label>
            <select name="unit" value={form.unit} onChange={handleChange}
              style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', background: '#fff' }}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="ltr">ltr</option>
              <option value="dozen">dozen</option>
              <option value="piece">piece</option>
              <option value="quintal">quintal</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Link to Batch *</label>
          <select name="batchId" value={form.batchId} onChange={handleChange} required
            style={{ padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', background: '#fff' }}>
            <option value="">Select a batch...</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batchId} — {b.product} ({b.weight}{b.weightUnit || 'kg'})</option>
            ))}
          </select>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Link your product to a supply chain batch for transparency</span>
        </div>

        <button type="submit" disabled={submitting || !form.name || !form.price || !form.quantity || !form.batchId}
          style={{
            width: '100%', padding: '0.85rem', border: 'none', borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff',
            fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
            opacity: (submitting || !form.name || !form.price || !form.quantity || !form.batchId) ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>
          <Package size={18} /> {submitting ? 'Listing...' : 'List Product'}
        </button>
      </form>
    </div>
  );
};

export default RetailerListProductPage;
