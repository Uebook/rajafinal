import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, X, FileText, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';

const statusOptions = ['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled', 'returned'];

const statusColor = {
  pending: '#f59e0b', confirmed: '#3b82f6', dispatched: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280'
};

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// ── Order Detail Modal ──────────────────────────────────────────
const OrderDetailModal = ({ order, onClose, onStatusUpdate }) => {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px solid var(--border-color)', paddingTop: 4, marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>Grand Total</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{fmt(order.grand_total)}</span>
                </div>
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
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
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
        <div style={{ display: 'flex', gap: 10 }}>
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
        />
      )}
    </div>
  );
};

export default Orders;
