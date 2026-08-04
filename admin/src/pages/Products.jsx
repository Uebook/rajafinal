import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Edit, Trash2, X, Download } from 'lucide-react';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, catFilter]);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    return_policy: 'No returns allowed',
    return_window_days: '7',
    base_price: '',
    vendor_price: '',
    retailer_price: '',
    gst_rate: '18',
    stock_qty: '0',
    low_stock_threshold: '10',
    category_id: '',
    sub_category_id: '',
    unit: 'piece',
    image_url: ''
  });

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get('/products', { params: { keyword: search || undefined, category_id: catFilter || undefined, page_size: 100 } }),
        api.get('/categories'),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, catFilter]);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      name: '',
      sku: '',
      description: '',
      return_policy: 'No returns allowed',
      return_window_days: '7',
      base_price: '',
      vendor_price: '',
      retailer_price: '',
      gst_rate: '18',
      stock_qty: '0',
      low_stock_threshold: '10',
      category_id: categories.filter(c => !c.parent_id)[0]?.id || '',
      sub_category_id: '',
      unit: 'piece',
      image_url: ''
    });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditItem(p);
    let catId = p.category_id || '';
    let subCatId = p.sub_category_id || '';

    const catObj = categories.find(c => String(c.id) === String(catId));
    if (catObj && catObj.parent_id) {
      subCatId = catObj.id;
      catId = catObj.parent_id;
    }

    setForm({
      name: p.name,
      sku: p.sku,
      description: p.description || '',
      return_policy: p.return_policy || 'No returns allowed',
      return_window_days: String(p.return_window_days || '7'),
      base_price: String(p.base_price),
      vendor_price: p.vendor_price ? String(p.vendor_price) : '',
      retailer_price: p.retailer_price ? String(p.retailer_price) : '',
      gst_rate: String(p.gst_rate),
      stock_qty: String(p.stock_qty),
      low_stock_threshold: String(p.low_stock_threshold),
      category_id: catId,
      sub_category_id: subCatId,
      unit: p.unit,
      image_url: p.images && p.images.length > 0 ? p.images[0].image_url : ''
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': undefined }
      });
      setForm(prev => ({ ...prev, image_url: data.image_url }));
    } catch (err) {
      alert('Failed to upload image: ' + (err.response?.data?.message || err.response?.data?.detail || err.message));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      sku: form.sku,
      description: form.description || undefined,
      return_policy: form.return_policy || undefined,
      return_window_days: Number(form.return_window_days),
      base_price: Number(form.base_price),
      vendor_price: form.vendor_price ? Number(form.vendor_price) : null,
      retailer_price: form.retailer_price ? Number(form.retailer_price) : null,
      gst_rate: Number(form.gst_rate),
      stock_qty: Number(form.stock_qty),
      low_stock_threshold: Number(form.low_stock_threshold),
      category_id: form.category_id,
      sub_category_id: form.sub_category_id ? form.sub_category_id : null,
      unit: form.unit,
      image_urls: form.image_url.trim() ? [form.image_url.trim()] : []
    };
    try {
      if (editItem) {
        await api.patch(`/products/${editItem.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error saving product');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.patch(`/products/${id}`, { status: 'hidden' });
      load();
    } catch (err) {
      alert('Error deleting product');
    }
  };

  const fmt = (paise) => `INR ${(paise / 100).toFixed(2)}`;

  const rootCategories = categories.filter(c => !c.parent_id || c.parent_id === null || c.parent_id === '');
  const subCategories = categories.filter(c => c.parent_id && String(c.parent_id) === String(form.category_id));

  const totalPages = Math.ceil(products.length / itemsPerPage);
  const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    const headers = ['Product Name', 'SKU', 'Category', 'Base Price (₹)', 'Vendor Price (₹)', 'Retailer Price (₹)', 'GST Rate (%)', 'Stock Qty'];
    const rows = products.map(p => [
      p.name,
      p.sku,
      categories.find(c => c.id === p.category_id)?.name || '—',
      (p.base_price / 100).toFixed(2),
      p.vendor_price ? (p.vendor_price / 100).toFixed(2) : '—',
      p.retailer_price ? (p.retailer_price / 100).toFixed(2) : '—',
      p.gst_rate,
      p.stock_qty
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Products_Catalog_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Products</h1>
          <p>Manage product catalog and pricing</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button id="add-product-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <select className="select-filter" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {rootCategories.map(root => (
                <React.Fragment key={root.id}>
                  <option value={root.id}>{root.name}</option>
                  {categories.filter(c => String(c.parent_id) === String(root.id)).map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {"\u00A0\u00A0└─ "}{sub.name}
                    </option>
                  ))}
                </React.Fragment>
              ))}
            </select>
          </div>
          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Vendor Price</th>
                <th>Retailer Price</th>
                <th>GST</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {p.images && p.images.length > 0 ? (
                      <img
                        src={p.images[0].image_url}
                        alt={p.name}
                        style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 4,
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: 'var(--text-muted)',
                        fontWeight: 'bold'
                      }}>
                        N/A
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {p.return_policy} ({p.return_window_days || 0}d window)
                      </div>
                    </div>
                  </td>
                  <td>{p.sku}</td>
                  <td>
                    {(() => {
                      const mainCat = categories.find(c => String(c.id) === String(p.category_id));
                      const subCat = categories.find(c => String(c.id) === String(p.sub_category_id));
                      if (mainCat && mainCat.parent_id) {
                        const parentCat = categories.find(c => String(c.id) === String(mainCat.parent_id));
                        return `${parentCat?.name || ''} └─ ${mainCat.name}`;
                      }
                      return `${mainCat?.name || '—'}${subCat ? ` └─ ${subCat.name}` : ''}`;
                    })()}
                  </td>
                  <td>{fmt(p.base_price)}</td>
                  <td>{p.vendor_price ? fmt(p.vendor_price) : '—'}</td>
                  <td>{p.retailer_price ? fmt(p.retailer_price) : '—'}</td>
                  <td>{p.gst_rate}%</td>
                  <td>
                    <span className={`badge ${p.stock_qty <= 0 ? 'danger' : p.stock_qty <= p.low_stock_threshold ? 'warning' : 'active'}`}>
                      {p.stock_qty}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon edit-btn" onClick={() => openEdit(p)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn-icon delete-btn" onClick={() => handleDelete(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, products.length)} of {products.length} entries
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editItem ? 'Edit Product' : 'Add Product'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">SKU</label>
                  <input
                    className="form-input"
                    value={form.sku}
                    onChange={e => setForm({ ...form, sku: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={form.category_id}
                      onChange={e => setForm({ ...form, category_id: e.target.value, sub_category_id: '' })}
                      required
                    >
                      <option value="">Select category</option>
                      {rootCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sub-Category</label>
                    <select
                      className="form-select"
                      value={form.sub_category_id}
                      onChange={e => setForm({ ...form, sub_category_id: e.target.value })}
                      disabled={!form.category_id || subCategories.length === 0}
                    >
                      <option value="">
                        {!form.category_id
                          ? 'Select Category first'
                          : subCategories.length === 0
                            ? 'No sub-categories'
                            : 'Select sub-category'}
                      </option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      className="form-select"
                      value={form.unit}
                      onChange={e => setForm({ ...form, unit: e.target.value })}
                      required
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="gm">gm</option>
                      <option value="kg / gm">kg / gm</option>
                      <option value="box">box</option>
                      <option value="packet">packet</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Product Image</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
                    {form.image_url ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={form.image_url}
                          alt="Preview"
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            backgroundColor: '#FF3B30',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: 18,
                            height: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 10,
                            padding: 0
                          }}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: '600',
                        border: '1px dashed var(--border)'
                      }}>
                        No Image
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          padding: '6px 12px',
                          fontSize: 13,
                          fontWeight: '600'
                        }}
                      >
                        Upload Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <p style={{ margin: '4px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        PNG, JPG or WEBP. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Base Price (paise)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.base_price}
                      onChange={e => setForm({ ...form, base_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Rate (%)</label>
                    <select
                      className="form-select"
                      value={form.gst_rate}
                      onChange={e => setForm({ ...form, gst_rate: e.target.value })}
                    >
                      {[0, 5, 12, 18, 28].map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Vendor Price (paise)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.vendor_price}
                      onChange={e => setForm({ ...form, vendor_price: e.target.value })}
                      placeholder="Fallback to Base Price"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Retailer Price (paise)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.retailer_price}
                      onChange={e => setForm({ ...form, retailer_price: e.target.value })}
                      placeholder="Fallback to Base Price"
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Stock Qty</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.stock_qty}
                      onChange={e => setForm({ ...form, stock_qty: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Threshold</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.low_stock_threshold}
                      onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Return Policy</label>
                    <select
                      className="form-select"
                      value={form.return_policy}
                      onChange={e => setForm({ ...form, return_policy: e.target.value })}
                    >
                      <option value="No returns allowed">No returns allowed</option>
                      <option value="7 Days Replacement">7 Days Replacement</option>
                      <option value="10 Days Returnable">10 Days Returnable</option>
                      <option value="30 Days Returnable">30 Days Returnable</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Return Window (Days)</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.return_window_days}
                      onChange={e => setForm({ ...form, return_window_days: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
