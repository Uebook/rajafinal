import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, X, FileText, ChevronLeft, ChevronRight, Calendar, Filter, Plus } from 'lucide-react';

const statusOptions = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'returned'];

const statusColor = {
  pending: '#f59e0b', confirmed: '#3b82f6', dispatched: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280'
};

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const formatWeight = (qty, unit) => {
  const num = Number(qty);
  if (!num || isNaN(num)) return '';
  if (unit === 'kg' || unit === 'kg / gm') {
    const totalGrams = Math.round(num * 1000);
    const kgs = Math.floor(totalGrams / 1000);
    const gms = totalGrams % 1000;
    if (kgs > 0 && gms > 0) return `${kgs} kg ${gms} g`;
    if (kgs > 0) return `${kgs} kg`;
    if (gms > 0) return `${gms} g`;
  }
  if (unit === 'gm') {
    const totalGrams = Math.round(num);
    const kgs = Math.floor(totalGrams / 1000);
    const gms = totalGrams % 1000;
    if (kgs > 0 && gms > 0) return `${kgs} kg ${gms} g`;
    if (kgs > 0) return `${kgs} kg`;
    if (gms > 0) return `${gms} g`;
  }
  return '';
};

// ── Order Detail Modal ──────────────────────────────────────────
const OrderDetailModal = ({ order, onClose, onStatusUpdate, onEditDiscount }) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    setUpdatingStatus(true);
    await onStatusUpdate(order.id, selectedStatus);
    setUpdatingStatus(false);
    setSelectedStatus('');
  };

  const statusBadge = (s) => (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 12,
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      background: `${statusColor[s] || '#6b7280'}20`,
      color: statusColor[s] || '#6b7280',
      border: `1px solid ${statusColor[s] || '#6b7280'}40`
    }}>
      {s}
    </span>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 720, width: '95vw' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Order #{order.order_number}</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
              {statusBadge(order.status)}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Placed: {new Date(order.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.4rem', lineHeight: 1 }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Buyer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Buyer Information
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.buyer_name || '—'}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{order.buyer_mobile || '—'}</div>
              {order.buyer_business && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{order.buyer_business}</div>}
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Order Summary
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{fmt(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>GST</span>
                  <span style={{ fontWeight: 600 }}>{fmt(order.gst_amount)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--danger)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                    <span style={{ fontWeight: 600 }}>-{fmt(order.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px solid var(--border-color)', paddingTop: 4, marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>Grand Total</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{fmt(order.grand_total)}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8, padding: '4px 8px', fontSize: '0.72rem', width: 'fit-content' }}
                  onClick={() => onEditDiscount(order)}
                >
                  Edit Discount
                </button>
              </div>
            </div>
          </div>

          {/* Return Info */}
          {order.return_image_url && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>Return Request</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 8 }}>{order.return_reason || 'No reason provided'}</div>
              <a href={order.return_image_url} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, textDecoration: 'underline' }}>
                View Verification Image →
              </a>
            </div>
          )}

          {/* Line Items Table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Line Items ({order.items?.length || 0})
            </div>
            {order.items && order.items.length > 0 ? (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>GST %</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name || item.name || `Item ${idx + 1}`}</div>
                        {item.sku && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.unit_price || item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.quantity} {item.unit || 'pcs'}</td>
                      <td style={{ textAlign: 'right' }}>{item.gst_rate || 0}%</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        {fmt((item.unit_price || item.price || 0) * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No line item details available
              </div>
            )}
          </div>

          {/* Status Update (only if not terminal) */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Update Order Status
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select
                  className="select-filter"
                  style={{ flex: 1, marginBottom: 0 }}
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                >
                  <option value="">Select new status...</option>
                  {statusOptions.filter(s => s !== order.status).map(s => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button
                  className="btn btn-primary"
                  disabled={!selectedStatus || updatingStatus}
                  onClick={handleUpdate}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Orders Page ────────────────────────────────────────────
const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // New states for creating order on behalf
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [retailersList, setRetailersList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [createOrderForm, setCreateOrderForm] = useState({
    retailerId: '',
    deliveryAddress: '',
    items: [{ productId: '', quantity: 1, unitPrice: '', unit: 'pcs' }],
    discountAmount: 0, // in rupees
    applyDeliveryCharge: true,
    deliveryChargeAmount: 39 // default 39 INR
  });

  // New states for custom discount updates
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [orderForDiscount, setOrderForDiscount] = useState(null);
  const [discountValue, setDiscountValue] = useState('');

  // Unregistered customer states
  const [unregName, setUnregName] = useState('');
  const [unregMobile, setUnregMobile] = useState('');
  const [unregAddress, setUnregAddress] = useState('');



  const load = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: 20 };
      if (statusFilter) params.order_status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get('/orders', { params });
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, page, dateFrom, dateTo]);

  const loadMetadata = async () => {
    try {
      const [retRes, prodRes] = await Promise.all([
        api.get('/admin/retailers'),
        api.get('/products', { params: { page_size: 1000 } })
      ]);
      setRetailersList(retRes.data || []);
      setProductsList(prodRes.data || []);
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  const handleRetailerChange = (retailerId) => {
    if (retailerId === 'unregistered') {
      setCreateOrderForm(prev => ({
        ...prev,
        retailerId: retailerId,
        deliveryAddress: unregAddress
      }));
      return;
    }
    const retailer = retailersList.find(r => r.id === retailerId || r.retailer_profile?.id === retailerId || r.user_id === retailerId);
    const profile = retailer?.retailer_profile;
    const address = profile ? `${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}` : '';
    setCreateOrderForm(prev => ({
      ...prev,
      retailerId: retailerId,
      deliveryAddress: address
    }));
  };

  const handleCreateOrderItemChange = (index, field, value) => {
    const newItems = [...createOrderForm.items];

    if (field === 'kg' || field === 'gm') {
      if (field === 'kg') newItems[index].kgVal = value;
      if (field === 'gm') newItems[index].gmVal = value;

      const kgs = Number(field === 'kg' ? value : newItems[index].kgVal ?? Math.floor(newItems[index].quantity || 0));
      const gms = Number(field === 'gm' ? value : newItems[index].gmVal ?? Math.round(((newItems[index].quantity || 0) % 1) * 1000));
      newItems[index].quantity = Number((kgs + gms / 1000).toFixed(3));
    } else {
      newItems[index][field] = field === 'quantity' ? Number(value) : value;

      if (field === 'unit' && value === 'kg / gm') {
        const q = Number(newItems[index].quantity || 0);
        newItems[index].kgVal = Math.floor(q);
        newItems[index].gmVal = Math.round((q % 1) * 1000);
      }
    }

    if (field === 'productId') {
      const prod = productsList.find(p => p.id === value);
      if (prod) {
        newItems[index].unitPrice = (prod.basePrice / 100).toFixed(2);
        newItems[index].unit = prod.unit || 'pcs';
        if (prod.unit === 'kg / gm') {
          const q = Number(newItems[index].quantity || 1);
          newItems[index].kgVal = Math.floor(q);
          newItems[index].gmVal = Math.round((q % 1) * 1000);
        }
      }
    }
    setCreateOrderForm(prev => ({ ...prev, items: newItems }));
  };

  const addCreateOrderItem = () => {
    setCreateOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: '', unit: 'pcs' }]
    }));
  };

  const removeCreateOrderItem = (index) => {
    if (createOrderForm.items.length === 1) return;
    setCreateOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreateOrderBehalfSubmit = async (e) => {
    e.preventDefault();
    if (!createOrderForm.retailerId) return alert('Please select a customer (retailer)');
    if (createOrderForm.retailerId === 'unregistered' && (!unregName || !unregMobile || !unregAddress)) {
      return alert('Please fill in unregistered customer details');
    }
    if (createOrderForm.items.some(i => !i.productId || i.quantity <= 0)) {
      return alert('Please select valid products and quantities');
    }

    try {
      const itemsPayload = createOrderForm.items.map(item => {
        const payloadItem = {
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit || 'pcs'
        };
        if (item.unitPrice !== '') {
          payloadItem.unitPrice = Math.round(Number(item.unitPrice) * 100);
        }
        return payloadItem;
      });

      const payload = {
        retailerId: createOrderForm.retailerId,
        deliveryAddress: createOrderForm.deliveryAddress,
        items: itemsPayload,
        discountAmount: Math.round(Number(createOrderForm.discountAmount || 0) * 100),
        deliveryCharge: createOrderForm.applyDeliveryCharge ? Math.round(Number(createOrderForm.deliveryChargeAmount || 0) * 100) : 0
      };

      if (createOrderForm.retailerId === 'unregistered') {
        payload.unregisteredCustomer = {
          name: unregName,
          mobile: unregMobile,
          address: unregAddress
        };
      }

      await api.post('/admin/orders', payload);
      alert('Order created successfully on behalf of customer!');
      setShowCreateOrderModal(false);
      setCreateOrderForm({
        retailerId: '',
        deliveryAddress: '',
        items: [{ productId: '', quantity: 1, unitPrice: '', unit: 'pcs' }],
        discountAmount: 0,
        applyDeliveryCharge: true,
        deliveryChargeAmount: 39
      });
      setUnregName('');
      setUnregMobile('');
      setUnregAddress('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Failed to create order');
    }
  };

  const openDiscountModal = (order) => {
    setOrderForDiscount(order);
    setDiscountValue((order.discount_amount / 100).toFixed(2));
    setShowDiscountModal(true);
  };

  const handleApplyDiscountSubmit = async (e) => {
    e.preventDefault();
    if (!orderForDiscount) return;

    try {
      const discountPaise = Math.round(Number(discountValue || 0) * 100);
      await api.patch(`/admin/orders/${orderForDiscount.id}/discount`, { discountAmount: discountPaise });
      alert('Discount updated successfully!');
      setShowDiscountModal(false);
      setOrderForDiscount(null);
      setDiscountValue('');
      load();
      if (selectedOrder?.id === orderForDiscount.id) {
        setSelectedOrder(prev => ({ ...prev, discount_amount: discountPaise, grand_total: Math.max(0, prev.subtotal + prev.gst_amount - discountPaise) }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Failed to update discount');
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status: newStatus });
      // Update local state so modal stays open with new status
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Error updating status');
    }
  };

  const handleExportTally = async () => {
    try {
      const params = {};
      if (dateFrom) params.start_date = dateFrom;
      if (dateTo) params.end_date = dateTo;
      const response = await api.get('/admin/orders/export/tally', { responseType: 'blob', params });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tally_Sales_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error exporting Tally CSV');
    }
  };

  const handleExportGeneral = () => {
    const headers = ['Order #', 'Buyer Name', 'Business', 'Status', 'Items Qty', 'Subtotal (INR)', 'GST (INR)', 'Total (INR)', 'Date'];
    const rows = filteredOrders.map(o => [
      o.order_number,
      o.buyer_name || '—',
      o.buyer_business || '—',
      o.status,
      o.items?.length || 0,
      ((o.subtotal || 0) / 100).toFixed(2),
      ((o.gst_amount || 0) / 100).toFixed(2),
      ((o.grand_total || 0) / 100).toFixed(2),
      new Date(o.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Orders_History_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setPage(1);
  };

  const hasFilters = statusFilter || dateFrom || dateTo || searchQuery;

  // Client-side search filter
  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number?.toLowerCase().includes(q) ||
      o.buyer_name?.toLowerCase().includes(q) ||
      o.buyer_mobile?.includes(q) ||
      o.buyer_business?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-wrap"><h1>Orders</h1><p>Track and manage all platform orders</p></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowCreateOrderModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Create Order (Behalf)
          </button>
          <button className="btn btn-secondary" onClick={handleExportGeneral}>
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportTally}>
            Export Tally CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="table-container" style={{ marginBottom: 0, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', borderBottom: 'none' }}>
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="table-filters" style={{ flexWrap: 'wrap', gap: 10, flex: 1 }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search order, buyer..."
                className="form-input"
                style={{ paddingLeft: '2rem', marginBottom: 0, fontSize: '0.85rem', height: 36 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select className="select-filter" style={{ marginBottom: 0 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                className="form-input"
                style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>

            {/* Clear */}
            {hasFilters && (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          {/* Row Count */}
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
        {loading ? (
          <div className="loading-center" style={{ padding: '3rem 0' }}><div className="spinner" /></div>
        ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Buyer</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Items</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>GST</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr
                  key={o.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(o)}
                >
                  <td>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>{o.order_number}</span>
                    {o.return_image_url && (
                      <span style={{ display: 'block', fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, marginTop: 2 }}>⚠ Return Request</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {o.buyer_business || o.buyer_name || '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.buyer_business ? (o.buyer_name || '') : ''}{o.buyer_mobile ? ` · ${o.buyer_mobile}` : ''}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      background: `${statusColor[o.status] || '#6b7280'}20`,
                      color: statusColor[o.status] || '#6b7280',
                      border: `1px solid ${statusColor[o.status] || '#6b7280'}40`
                    }}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{o.items?.length || 0}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(o.subtotal)}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(o.gst_amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(o.grand_total)}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                        onClick={() => setSelectedOrder(o)}
                      >
                        <FileText size={11} /> Details
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                        onClick={() => openDiscountModal(o)}
                      >
                        ₹ Discount
                      </button>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <select
                          className="select-filter"
                          value=""
                          onChange={e => e.target.value && updateStatus(o.id, e.target.value)}
                          style={{ fontSize: '0.72rem', padding: '3px 6px', height: 'auto', marginBottom: 0 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="">Update...</option>
                          {statusOptions.filter(s => s !== o.status).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Filter size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                    No orders found for the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={14} /> Previous
        </button>
        <span style={{ padding: '6px 14px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>
          Page {page}
        </span>
        <button className="btn btn-secondary btn-sm" disabled={filteredOrders.length < 20} onClick={() => setPage(p => p + 1)}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={updateStatus}
          onEditDiscount={openDiscountModal}
        />
      )}

      {/* Create Order Modal (Behalf of Customer) */}
      {showCreateOrderModal && (
        <div className="modal-overlay" onClick={() => setShowCreateOrderModal(false)}>
          <div className="modal-content" style={{ maxWidth: 760, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Create Order on Behalf of Customer</h2>
              <button onClick={() => setShowCreateOrderModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateOrderBehalfSubmit}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Select Customer */}
                <div className="form-group">
                  <label className="form-label">Select Customer (Retailer) *</label>
                  <select
                    className="form-select"
                    required
                    value={createOrderForm.retailerId}
                    onChange={e => handleRetailerChange(e.target.value)}
                  >
                    <option value="">-- Choose Retailer --</option>
                    <option value="unregistered">-- Other (Unregistered Customer) --</option>
                    {retailersList.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.retailer_profile?.business_name || r.fullName} ({r.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unregistered Customer Fields */}
                {createOrderForm.retailerId === 'unregistered' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    padding: 14,
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    marginTop: -4
                  }}>
                    <div className="form-group">
                      <label className="form-label">Customer Name *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Enter full name..."
                        value={unregName}
                        onChange={e => setUnregName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        className="form-input"
                        placeholder="Enter mobile..."
                        value={unregMobile}
                        onChange={e => setUnregMobile(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                      <label className="form-label">Customer Address *</label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="Enter full address..."
                        value={unregAddress}
                        onChange={e => {
                          setUnregAddress(e.target.value);
                          setCreateOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }));
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Delivery Address */}
                <div className="form-group">
                  <label className="form-label">Delivery Address *</label>
                  <textarea
                    className="form-input"
                    required
                    rows={2}
                    placeholder="Enter full shipping address..."
                    value={createOrderForm.deliveryAddress}
                    onChange={e => setCreateOrderForm({ ...createOrderForm, deliveryAddress: e.target.value })}
                  />
                </div>

                {/* Line Items */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span className="form-label" style={{ marginBottom: 0 }}>Order Items *</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addCreateOrderItem}>
                      + Add Item
                    </button>
                  </div>

                  <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ width: 80 }}>Qty</th>
                        <th style={{ width: 90 }}>Unit</th>
                        <th style={{ width: 120 }}>Unit Price (₹)</th>
                        <th style={{ width: 100, textAlign: 'right' }}>Total</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {createOrderForm.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <select
                              required
                              className="form-select"
                              style={{ padding: '6px 8px', fontSize: '0.8rem', width: '100%' }}
                              value={item.productId}
                              onChange={e => handleCreateOrderItemChange(idx, 'productId', e.target.value)}
                            >
                              <option value="">-- Select Product --</option>
                              {productsList.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Stock: {p.stockQty} {p.unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {item.unit === 'kg / gm' ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Kg"
                                  value={item.kgVal !== undefined ? item.kgVal : Math.floor(item.quantity || 0)}
                                  onChange={(e) => handleCreateOrderItemChange(idx, 'kg', e.target.value)}
                                  className="form-input"
                                  style={{ padding: '6px 6px', fontSize: '0.8rem', width: 50, marginBottom: 0 }}
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  placeholder="Gm"
                                  value={item.gmVal !== undefined ? item.gmVal : Math.round(((item.quantity || 0) % 1) * 1000)}
                                  onChange={(e) => handleCreateOrderItemChange(idx, 'gm', e.target.value)}
                                  className="form-input"
                                  style={{ padding: '6px 6px', fontSize: '0.8rem', width: 55, marginBottom: 0 }}
                                />
                              </div>
                            ) : (
                              <input
                                type="number"
                                required
                                min="0.001"
                                step="any"
                                className="form-input"
                                style={{ padding: '6px 8px', fontSize: '0.8rem', marginBottom: 0 }}
                                value={item.quantity}
                                onChange={e => handleCreateOrderItemChange(idx, 'quantity', e.target.value)}
                              />
                            )}
                            {formatWeight(item.quantity, item.unit) && (
                              <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                                = {formatWeight(item.quantity, item.unit)} ({item.quantity} kg)
                              </div>
                            )}
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{ padding: '6px 8px', fontSize: '0.8rem', marginBottom: 0 }}
                              value={item.unit || 'pcs'}
                              onChange={e => handleCreateOrderItemChange(idx, 'unit', e.target.value)}
                            >
                              <option value="pcs">pcs</option>
                              <option value="kg">kg</option>
                              <option value="gm">gm</option>
                              <option value="kg / gm">kg / gm</option>
                              <option value="box">box</option>
                              <option value="packet">packet</option>
                              <option value="liter">liter</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price"
                              required
                              className="form-input"
                              style={{ padding: '6px 8px', fontSize: '0.8rem', marginBottom: 0 }}
                              value={item.unitPrice}
                              onChange={e => handleCreateOrderItemChange(idx, 'unitPrice', e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            ₹{((item.quantity * Number(item.unitPrice || 0))).toFixed(2)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--danger)', padding: '4px 8px' }}
                              disabled={createOrderForm.items.length === 1}
                              onClick={() => removeCreateOrderItem(idx)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Custom Discount & Delivery Charges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Custom Discount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="form-input"
                      value={createOrderForm.discountAmount || ''}
                      onChange={e => setCreateOrderForm({ ...createOrderForm, discountAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label className="form-label" style={{ margin: 0 }}>Delivery Charge (₹)</label>
                      <label style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--primary)' }}>
                        <input
                          type="checkbox"
                          checked={createOrderForm.applyDeliveryCharge}
                          onChange={e => setCreateOrderForm({ ...createOrderForm, applyDeliveryCharge: e.target.checked })}
                        />
                        Apply Charge
                      </label>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="39.00"
                      disabled={!createOrderForm.applyDeliveryCharge}
                      className="form-input"
                      value={createOrderForm.applyDeliveryCharge ? createOrderForm.deliveryChargeAmount : ''}
                      onChange={e => setCreateOrderForm({ ...createOrderForm, deliveryChargeAmount: e.target.value })}
                    />
                  </div>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateOrderModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Discount Modal */}
      {showDiscountModal && orderForDiscount && (
        <div className="modal-overlay" onClick={() => { setShowDiscountModal(false); setOrderForDiscount(null); }}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Apply Custom Discount</h2>
              <button onClick={() => { setShowDiscountModal(false); setOrderForDiscount(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleApplyDiscountSubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                  Order: <strong>{orderForDiscount.order_number}</strong><br />
                  Current Subtotal + GST: <strong>{fmt(orderForDiscount.subtotal + orderForDiscount.gst_amount)}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Discount Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter discount in Rupees..."
                    required
                    className="form-input"
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowDiscountModal(false); setOrderForDiscount(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Apply Discount</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
