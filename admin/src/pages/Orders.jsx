import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, X, FileText, ChevronLeft, ChevronRight, Calendar, Filter, Plus, Printer } from 'lucide-react';
import { InvoiceModal } from './Invoices';

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
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'collection'

  // Daily collection state
  const [collection, setCollection] = useState([]);
  const [collLoading, setCollLoading] = useState(false);
  const [collFrom, setCollFrom] = useState('');
  const [collTo, setCollTo] = useState('');
  const [collMethodFilter, setCollMethodFilter] = useState(''); // '' | 'cash' | 'upi' | 'account' | 'credit'

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

  // Payment states (split / multiple payment methods)
  const [splitPayments, setSplitPayments] = useState({
    cashAmount: '',
    upiAmount: '',
    upiRef: '',
    accountAmount: '',
    accountRef: ''
  });


  const load = async () => {
    try {
      setLoading(true);
      const params = { page, page_size: 50 };
      if (statusFilter) params.order_status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get('/orders', { params });
      const rawList = Array.isArray(data) ? data : [];
      const totalCount = rawList.length;
      const formattedList = rawList.map((o, index) => ({
        ...o,
        short_invoice_no: `Supp ${totalCount - index}`,
        seq_no: totalCount - index
      }));
      setOrders(formattedList);
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
      
      const rawProd = prodRes.data;
      const prods = Array.isArray(rawProd)
        ? rawProd
        : (rawProd?.products || rawProd?.data || rawProd?.items || rawProd?.list || []);
      
      console.log('Loaded products count:', prods.length, prods);
      setProductsList(prods);
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
        // API returns snake_case: base_price, stock_qty, unit
        const price = prod.base_price ?? prod.basePrice ?? 0;
        newItems[index].unitPrice = (price / 100).toFixed(2);
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
    if (createOrderForm.retailerId === 'unregistered' && !unregName.trim()) {
      return alert('Customer Name is required for unregistered customers.');
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

      const cashPaise = Math.round(Number(splitPayments.cashAmount || 0) * 100);
      const upiPaise = Math.round(Number(splitPayments.upiAmount || 0) * 100);
      const accountPaise = Math.round(Number(splitPayments.accountAmount || 0) * 100);

      const paymentsPayload = [];
      if (cashPaise > 0) paymentsPayload.push({ method: 'cash', amount: cashPaise });
      if (upiPaise > 0) paymentsPayload.push({ method: 'upi', amount: upiPaise, ...(splitPayments.upiRef ? { reference: splitPayments.upiRef } : {}) });
      if (accountPaise > 0) paymentsPayload.push({ method: 'account', amount: accountPaise, ...(splitPayments.accountRef ? { reference: splitPayments.accountRef } : {}) });

      const totalPaidPaise = cashPaise + upiPaise + accountPaise;
      const primaryMethod = paymentsPayload.length === 1 ? paymentsPayload[0].method : paymentsPayload.length > 1 ? 'split' : 'credit';

      const payload = {
        retailerId: createOrderForm.retailerId,
        deliveryAddress: createOrderForm.deliveryAddress,
        items: itemsPayload,
        discountAmount: Math.round(Number(createOrderForm.discountAmount || 0) * 100),
        deliveryCharge: createOrderForm.applyDeliveryCharge ? Math.round(Number(createOrderForm.deliveryChargeAmount || 0) * 100) : 0,
        paymentMethod: primaryMethod,
        paymentAmount: totalPaidPaise,
        ...(paymentsPayload.length > 0 ? { payments: paymentsPayload } : {}),
      };

      if (createOrderForm.retailerId === 'unregistered') {
        payload.unregisteredCustomer = {
          name: unregName,
          ...(unregMobile ? { mobile: unregMobile } : {}),
          ...(unregAddress ? { address: unregAddress } : {})
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
      setSplitPayments({
        cashAmount: '',
        upiAmount: '',
        upiRef: '',
        accountAmount: '',
        accountRef: ''
      });
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

  // Load daily collection
  const loadCollection = async () => {
    try {
      setCollLoading(true);
      const params = {};
      if (collFrom) params.date_from = collFrom;
      if (collTo) params.date_to = collTo;
      const { data } = await api.get('/admin/orders/daily-collection', { params });
      setCollection(data || []);
    } catch (err) {
      console.error('Daily collection error:', err);
    } finally {
      setCollLoading(false);
    }
  };

  useEffect(() => { if (activeTab === 'collection') loadCollection(); }, [activeTab, collFrom, collTo]);

  // Payment method badge helper
  const payBadge = (method, amount) => {
    if (!method) return <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>;
    const cfg = {
      cash:    { label: '💵 Cash',    bg: '#dcfce7', color: '#16a34a' },
      upi:     { label: '📱 UPI',     bg: '#ede9fe', color: '#7c3aed' },
      account: { label: '🏦 Account', bg: '#dbeafe', color: '#2563eb' },
      credit:   { label: '📒 Credit',  bg: '#fee2e2', color: '#dc2626' },
    };
    const c = cfg[method] || { label: method, bg: '#f3f4f6', color: '#6b7280' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700, background: c.bg, color: c.color }}>
          {c.label}
        </span>
        {amount > 0 && method !== 'credit' && <span style={{ fontSize: '0.7rem', color: c.color, fontWeight: 600 }}>{fmt(amount)}</span>}
      </div>
    );
  };

  // Client-side search filter
  const filteredOrders = orders.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/\s+/g, '');
    const invNo = (o.short_invoice_no || '').toLowerCase();
    const invNoClean = invNo.replace(/\s+/g, '');
    return (
      invNo.includes(q) ||
      invNoClean.includes(cleanQ) ||
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
          <button className="btn btn-secondary" onClick={handleExportGeneral}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportTally}>Export Tally CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border-color)', marginBottom: 0 }}>
        {[{ id: 'orders', label: '📋 Orders' }, { id: 'collection', label: '💰 Daily Collection' }].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 24px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              marginBottom: -2,
              background: 'none',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (<>

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
                <th>Payment</th>
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
                  <td>{payBadge(o.payment_method, o.payment_amount)}</td>
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
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                        onClick={() => setInvoiceOrder(o)}
                      >
                        <Printer size={11} /> Invoice
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
                  <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
      </>)}

      {/* ── Daily Collection Tab ─────────────────────────────── */}
      {activeTab === 'collection' && (
        <div style={{ marginTop: 16 }}>
          {/* Date filters */}
          <div className="table-container" style={{ marginBottom: 0, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', borderBottom: 'none' }}>
            <div className="table-toolbar" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                <input type="date" className="form-input" style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                  value={collFrom} onChange={e => setCollFrom(e.target.value)} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                <input type="date" className="form-input" style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                  value={collTo} onChange={e => setCollTo(e.target.value)} />
                {(collFrom || collTo) && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { setCollFrom(''); setCollTo(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <X size={12} /> Clear
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {collection.length} day{collection.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          {!collLoading && collection.length > 0 && (() => {
            const totals = {
              cash:    { amount: collection.reduce((a, d) => a + d.cash_amount,    0), count: collection.reduce((a, d) => a + d.cash_count,    0) },
              upi:     { amount: collection.reduce((a, d) => a + d.upi_amount,     0), count: collection.reduce((a, d) => a + d.upi_count,     0) },
              account: { amount: collection.reduce((a, d) => a + d.account_amount, 0), count: collection.reduce((a, d) => a + d.account_count, 0) },
              credit:  { amount: collection.reduce((a, d) => a + d.credit_amount,  0), count: collection.reduce((a, d) => a + d.credit_count,  0) },
            };
            const cards = [
              { key: 'cash',    emoji: '💵', label: 'Cash',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', darkColor: '#15803d' },
              { key: 'upi',     emoji: '📱', label: 'UPI',     color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', darkColor: '#6d28d9' },
              { key: 'account', emoji: '🏦', label: 'Account', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', darkColor: '#1d4ed8' },
              { key: 'credit',  emoji: '📒', label: 'Credit',  color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', darkColor: '#b91c1c' },
            ];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 16 }}>
                {cards.map(card => {
                  const t = totals[card.key];
                  const active = collMethodFilter === card.key;
                  return (
                    <div
                      key={card.key}
                      onClick={() => setCollMethodFilter(active ? '' : card.key)}
                      style={{
                        background: active ? card.bg : 'var(--bg-primary)',
                        border: `2px solid ${active ? card.color : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        boxShadow: active ? `0 4px 16px ${card.color}25` : '0 1px 4px rgba(0,0,0,0.06)',
                        transform: active ? 'translateY(-2px)' : 'none',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{card.emoji}</span>
                        {active && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: card.color, background: `${card.color}15`, padding: '2px 7px', borderRadius: 10, letterSpacing: '0.04em' }}>FILTERED</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: active ? card.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: active ? card.darkColor : 'var(--text-primary)', lineHeight: 1.1 }}>
                        {fmt(t.amount)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {t.count} order{t.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Collection Table */}
          <div className="table-container" style={{ borderRadius: 'var(--radius-lg)' }}>
            {collLoading ? (
              <div className="loading-center" style={{ padding: '3rem 0' }}><div className="spinner" /></div>
            ) : (
              <>
              {/* Method filter active banner */}
              {collMethodFilter && (() => {
                const cfg = {
                  cash:    { emoji: '💵', label: 'Cash',    color: '#16a34a' },
                  upi:     { emoji: '📱', label: 'UPI',     color: '#7c3aed' },
                  account: { emoji: '🏦', label: 'Account', color: '#2563eb' },
                  credit:  { emoji: '📒', label: 'Credit',  color: '#dc2626' },
                };
                const c = cfg[collMethodFilter];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: `${c.color}10`, borderBottom: `2px solid ${c.color}30` }}>
                    <span style={{ fontSize: '1rem' }}>{c.emoji}</span>
                    <span style={{ fontWeight: 700, color: c.color, fontSize: '0.85rem' }}>Showing {c.label} orders only</span>
                    <button onClick={() => setCollMethodFilter('')} style={{ marginLeft: 'auto', background: 'none', border: `1px solid ${c.color}50`, borderRadius: 6, padding: '2px 10px', color: c.color, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✕ Clear Filter
                    </button>
                  </div>
                );
              })()}
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Grand Total</th>
                      <th style={{ textAlign: 'right', color: '#16a34a', background: collMethodFilter === 'cash'    ? '#f0fdf4' : undefined }}>💵 Cash</th>
                      <th style={{ textAlign: 'right', color: '#7c3aed', background: collMethodFilter === 'upi'     ? '#faf5ff' : undefined }}>📱 UPI</th>
                      <th style={{ textAlign: 'right', color: '#2563eb', background: collMethodFilter === 'account' ? '#eff6ff' : undefined }}>🏦 Account</th>
                      <th style={{ textAlign: 'right', color: '#dc2626', background: collMethodFilter === 'credit'  ? '#fff1f2' : undefined }}>📒 Credit</th>
                      <th style={{ textAlign: 'right', color: '#6b7280' }}>Unpaid</th>
                      <th style={{ textAlign: 'right', color: '#0ea5e9' }}>Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Filter rows: keep a day only if it has activity in the selected method
                      const visibleDays = collMethodFilter
                        ? collection.filter(d => {
                            if (collMethodFilter === 'cash')    return d.cash_count > 0;
                            if (collMethodFilter === 'upi')     return d.upi_count > 0;
                            if (collMethodFilter === 'account') return d.account_count > 0;
                            if (collMethodFilter === 'credit')  return d.credit_count > 0;
                            return true;
                          })
                        : collection;

                      if (visibleDays.length === 0) return (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <Filter size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                            No {collMethodFilter || ''} orders found for the selected date range
                          </td>
                        </tr>
                      );

                      const colBg = (key) => collMethodFilter === key ? { background: { cash: '#f0fdf420', upi: '#faf5ff20', account: '#eff6ff20', credit: '#fff1f220' }[key] } : {};

                      return (<>
                        {visibleDays.map(day => {
                          const collected = day.cash_amount + day.upi_amount + day.account_amount;
                          return (
                            <tr key={day.date} style={collMethodFilter ? { opacity: 1 } : {}}>
                              <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{day.total_orders}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(day.grand_total)}</td>
                              <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: collMethodFilter === 'cash' ? 800 : 600, ...colBg('cash') }}>
                                {day.cash_count > 0 ? <>{fmt(day.cash_amount)}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.cash_count} orders</span></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: '#7c3aed', fontWeight: collMethodFilter === 'upi' ? 800 : 600, ...colBg('upi') }}>
                                {day.upi_count > 0 ? <>{fmt(day.upi_amount)}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.upi_count} orders</span></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: collMethodFilter === 'account' ? 800 : 600, ...colBg('account') }}>
                                {day.account_count > 0 ? <>{fmt(day.account_amount)}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.account_count} orders</span></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: collMethodFilter === 'credit' ? 800 : 600, ...colBg('credit') }}>
                                {day.credit_count > 0 ? <>{fmt(day.credit_amount)}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.credit_count} orders</span></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>
                                {day.unpaid_count > 0 ? <>{fmt(day.unpaid_amount)}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day.unpaid_count} orders</span></> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 800, color: '#0ea5e9', fontSize: '0.95rem' }}>
                                {fmt(collected)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                          <td>TOTAL ({visibleDays.length} days)</td>
                          <td style={{ textAlign: 'right' }}>{visibleDays.reduce((a, d) => a + d.total_orders, 0)}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(visibleDays.reduce((a, d) => a + d.grand_total, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmt(visibleDays.reduce((a, d) => a + d.cash_amount, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#7c3aed' }}>{fmt(visibleDays.reduce((a, d) => a + d.upi_amount, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#2563eb' }}>{fmt(visibleDays.reduce((a, d) => a + d.account_amount, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(visibleDays.reduce((a, d) => a + d.credit_amount, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#6b7280' }}>{fmt(visibleDays.reduce((a, d) => a + d.unpaid_amount, 0))}</td>
                          <td style={{ textAlign: 'right', color: '#0ea5e9' }}>{fmt(visibleDays.reduce((a, d) => a + d.cash_amount + d.upi_amount + d.account_amount, 0))}</td>
                        </tr>
                      </>);
                    })()}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}

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
                      <label className="form-label">Customer Name <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                      <label className="form-label">Mobile Number <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="Enter mobile..."
                        value={unregMobile}
                        onChange={e => setUnregMobile(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                      <label className="form-label">Customer Address <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        type="text"
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
                  <label className="form-label">
                    Delivery Address
                    {createOrderForm.retailerId !== 'unregistered' && <span style={{ color: 'var(--danger)' }}> *</span>}
                    {createOrderForm.retailerId === 'unregistered' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}> (optional)</span>}
                  </label>
                  <textarea
                    className="form-input"
                    required={createOrderForm.retailerId !== 'unregistered'}
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
                              {productsList.map(p => {
                                const name = p.name || p.title || p.product_name || `Product ${p.id}`;
                                const stock = p.stock_qty ?? p.stockQty ?? p.stock ?? 0;
                                const unit = p.unit || 'pcs';
                                return (
                                  <option key={p.id || name} value={p.id}>
                                    {name} (Stock: {stock} {unit})
                                  </option>
                                );
                              })}
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
                    <label className="form-label" style={{ fontWeight: 600 }}>Custom Discount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter discount in ₹ (e.g. 50)"
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

                {/* ── Multiple Payment Methods (Split Payment) Section ───────────────────────── */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Payment Collection (Split / Multiple Methods)
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Grand Total: <span style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>₹{((createOrderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) + (createOrderForm.applyDeliveryCharge ? Number(createOrderForm.deliveryChargeAmount || 0) : 0) - Number(createOrderForm.discountAmount || 0))).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => {
                        const total = (createOrderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) + (createOrderForm.applyDeliveryCharge ? Number(createOrderForm.deliveryChargeAmount || 0) : 0) - Number(createOrderForm.discountAmount || 0)).toFixed(2);
                        setSplitPayments({ cashAmount: total, upiAmount: '', upiRef: '', accountAmount: '', accountRef: '' });
                      }}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '1px solid #16a34a', background: '#16a34a15', color: '#16a34a', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      💵 Full Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const total = (createOrderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) + (createOrderForm.applyDeliveryCharge ? Number(createOrderForm.deliveryChargeAmount || 0) : 0) - Number(createOrderForm.discountAmount || 0)).toFixed(2);
                        setSplitPayments({ cashAmount: '', upiAmount: total, upiRef: splitPayments.upiRef, accountAmount: '', accountRef: '' });
                      }}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '1px solid #7c3aed', background: '#7c3aed15', color: '#7c3aed', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      📱 Full UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const total = (createOrderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) + (createOrderForm.applyDeliveryCharge ? Number(createOrderForm.deliveryChargeAmount || 0) : 0) - Number(createOrderForm.discountAmount || 0)).toFixed(2);
                        setSplitPayments({ cashAmount: '', upiAmount: '', upiRef: '', accountAmount: total, accountRef: splitPayments.accountRef });
                      }}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '1px solid #2563eb', background: '#2563eb15', color: '#2563eb', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      🏦 Full Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitPayments({ cashAmount: '', upiAmount: '', upiRef: '', accountAmount: '', accountRef: '' })}
                      style={{ padding: '6px 14px', borderRadius: 16, border: '1px solid #dc2626', background: '#dc262615', color: '#dc2626', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      📒 Full Udhar / Credit
                    </button>
                  </div>

                  {/* Inputs for split amounts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {/* Cash */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">💵 Cash Received (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        value={splitPayments.cashAmount}
                        onChange={e => setSplitPayments(prev => ({ ...prev, cashAmount: e.target.value }))}
                      />
                    </div>
                    <div></div>

                    {/* UPI */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">📱 UPI Received (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        value={splitPayments.upiAmount}
                        onChange={e => setSplitPayments(prev => ({ ...prev, upiAmount: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">UPI Txn ID <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. UPI987654321"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        value={splitPayments.upiRef}
                        onChange={e => setSplitPayments(prev => ({ ...prev, upiRef: e.target.value }))}
                      />
                    </div>

                    {/* Account */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">🏦 Bank / Account (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        value={splitPayments.accountAmount}
                        onChange={e => setSplitPayments(prev => ({ ...prev, accountAmount: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Account / Txn Ref <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>(optional)</span></label>
                      <input
                        type="text"
                        placeholder="e.g. A/C 0012345678"
                        className="form-input"
                        style={{ marginBottom: 0 }}
                        value={splitPayments.accountRef}
                        onChange={e => setSplitPayments(prev => ({ ...prev, accountRef: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Live Payment Summary Card */}
                  {(() => {
                    const gt = (createOrderForm.items.reduce((acc, item) => acc + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0) + (createOrderForm.applyDeliveryCharge ? Number(createOrderForm.deliveryChargeAmount || 0) : 0) - Number(createOrderForm.discountAmount || 0));
                    const totalPaid = Number(splitPayments.cashAmount || 0) + Number(splitPayments.upiAmount || 0) + Number(splitPayments.accountAmount || 0);
                    const remaining = Math.max(0, gt - totalPaid);
                    return (
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.83rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>Total Amount Paid:</span>
                          <span style={{ color: '#16a34a' }}>₹{totalPaid.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>Remaining Balance (Udhar / Credit):</span>
                          <span style={{ color: remaining > 0 ? '#dc2626' : '#16a34a' }}>
                            ₹{remaining.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
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

      {/* Invoice Modal */}
      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  );
};

export default Orders;
