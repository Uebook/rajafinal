import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Download, Search, X, Calendar, ExternalLink, Printer } from 'lucide-react';

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const statusColor = {
  pending: '#f59e0b', confirmed: '#3b82f6', dispatched: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280'
};

// ── Invoice Preview Modal ───────────────────────────────────────
export const InvoiceModal = ({ order, onClose }) => {
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const invoiceNumber = `INV-${order.order_number}`;

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-area');
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>${invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e3a8a; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .brand { font-size: 22px; font-weight: 800; color: #1e3a8a; }
        .total-row td { font-weight: 700; background: #f0f4ff; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const downloadInvoiceCSV = () => {
    const rows = [
      ['Invoice Number', invoiceNumber],
      ['Order Number', order.order_number],
      ['Invoice Date', invoiceDate],
      ['Buyer Name', order.buyer_name || ''],
      ['Buyer Mobile', order.buyer_mobile || ''],
      ['Business', order.buyer_business || ''],
      [''],
      ['Product', 'Qty', 'Unit Price (₹)', 'GST %', 'Line Total (₹)'],
      ...(order.items || []).map(item => [
        item.product_name || item.name || '',
        item.quantity,
        ((item.unit_price || item.price || 0) / 100).toFixed(2),
        item.gst_rate || 0,
        (((item.unit_price || item.price || 0) * item.quantity) / 100).toFixed(2)
      ]),
      [''],
      ['Subtotal', '', '', '', ((order.subtotal || 0) / 100).toFixed(2)],
      ['GST Amount', '', '', '', ((order.gst_amount || 0) / 100).toFixed(2)],
      ['Grand Total', '', '', '', ((order.grand_total || 0) / 100).toFixed(2)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.csv`;
    a.click();
    a.remove();
  };

  const subtotal = order.subtotal || 0;
  const gstAmount = order.gst_amount || 0;
  const grandTotal = order.grand_total || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 780, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Tax Invoice — {invoiceNumber}</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              {invoiceDate} · {order.buyer_business || order.buyer_name || 'N/A'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Printer size={13} /> Print
            </button>
            <button className="btn btn-primary btn-sm" onClick={downloadInvoiceCSV} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Download CSV
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.4rem', lineHeight: 1 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div id="invoice-print-area" style={{ padding: '0 4px' }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.03em' }}>Supply Setu</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>B2B Distribution Platform</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>GSTIN: Applied For</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tax Invoice</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Invoice No: </span>
                  <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{invoiceNumber}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Date: </span><strong style={{ color: 'var(--text-primary)' }}>{invoiceDate}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Order: </span><strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{order.order_number}</strong>
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    background: `${statusColor[order.status] || '#6b7280'}20`,
                    color: statusColor[order.status] || '#6b7280',
                    border: `1px solid ${statusColor[order.status] || '#6b7280'}40`
                  }}>{order.status}</span>
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Bill To</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.buyer_business || order.buyer_name || '—'}</div>
                {order.buyer_business && <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{order.buyer_name}</div>}
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{order.buyer_mobile || ''}</div>
                {order.delivery_address && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{order.delivery_address}</div>
                )}
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Payment Info</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payment Mode</span>
                    <span style={{ fontWeight: 600 }}>Credit / Ledger</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Order Status</span>
                    <span style={{ fontWeight: 700, color: statusColor[order.status] || '#6b7280', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Items</span>
                    <span style={{ fontWeight: 600 }}>{order.items?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="custom-table" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Product / Description</th>
                  <th style={{ textAlign: 'right' }}>Unit Price</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>GST %</th>
                  <th style={{ textAlign: 'right' }}>GST Amt</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => {
                  const lineBase = (item.unit_price || item.price || 0) * item.quantity;
                  const gstRate = item.gst_rate || 0;
                  const lineGst = Math.round(lineBase * gstRate / 100);
                  return (
                    <tr key={idx}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name || item.name || `Item ${idx + 1}`}</div>
                        {item.sku && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>HSN: {item.hsn || item.sku}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmt(item.unit_price || item.price)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{gstRate}%</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmt(lineGst)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(lineBase)}</td>
                    </tr>
                  );
                })}
                {(!order.items || order.items.length === 0) && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No items available</td></tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
              <div style={{ width: 300 }}>
                {[
                  { label: 'Subtotal (excl. GST)', value: subtotal },
                  { label: 'GST Amount (CGST + SGST)', value: gstAmount },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(row.value)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 6px', borderTop: '2px solid var(--primary)' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>GRAND TOTAL</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>{fmt(grandTotal)}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>All amounts in Indian Rupees (INR)</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>
                This is a computer-generated invoice. No physical signature required.
                Goods once sold will not be taken back unless under return policy.
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 28 }}>For Supply Setu</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Invoices Page ──────────────────────────────────────────
const Invoices = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      // Fetch all orders — filter client-side by invoiceable statuses
      const params = { page, page_size: 50 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.order_status = statusFilter;
      const { data } = await api.get('/orders', { params });
      // Show all non-cancelled orders as invoiceable
      setOrders(Array.isArray(data) ? data.filter(o => o.status !== 'cancelled') : []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, dateFrom, dateTo, statusFilter]);

  const bulkDownloadCSV = () => {
    const rows = [
      ['Invoice #', 'Order #', 'Buyer Name', 'Business', 'Buyer Mobile', 'Status', 'Subtotal (₹)', 'GST (₹)', 'Grand Total (₹)', 'Date'],
      ...filteredOrders.map(o => [
        `INV-${o.order_number}`,
        o.order_number,
        o.buyer_name || '',
        o.buyer_business || '',
        o.buyer_mobile || '',
        o.status,
        ((o.subtotal || 0) / 100).toFixed(2),
        ((o.gst_amount || 0) / 100).toFixed(2),
        ((o.grand_total || 0) / 100).toFixed(2),
        new Date(o.created_at).toLocaleDateString('en-IN'),
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    a.remove();
  };

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

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.grand_total || 0), 0);
  const totalGST = filteredOrders.reduce((acc, o) => acc + (o.gst_amount || 0), 0);

  const invoiceStatuses = ['confirmed', 'dispatched', 'delivered', 'pending'];

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Invoice Management</h1>
          <p>GST-compliant invoices for all orders</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={bulkDownloadCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Bulk Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="kpi-card" style={{ '--card-color': '#10b981', '--card-bg-light': '#d1fae5' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total Invoices</span>
            <span className="kpi-value">{filteredOrders.length}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>this page</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#d1fae5', color: '#10b981' }}><FileText size={22} /></div>
        </div>
        <div className="kpi-card" style={{ '--card-color': '#3b82f6', '--card-bg-light': '#dbeafe' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total Revenue</span>
            <span className="kpi-value" style={{ fontSize: '1.1rem' }}>{fmt(totalRevenue)}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>filtered period</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#dbeafe', color: '#3b82f6' }}><FileText size={22} /></div>
        </div>
        <div className="kpi-card" style={{ '--card-color': '#8b5cf6', '--card-bg-light': '#ede9fe' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total GST Collected</span>
            <span className="kpi-value" style={{ fontSize: '1.1rem' }}>{fmt(totalGST)}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>filtered period</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: '#ede9fe', color: '#8b5cf6' }}><FileText size={22} /></div>
        </div>
      </div>

      {/* Filters */}
      <div className="table-container" style={{ borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', borderBottom: 'none', marginBottom: 0 }}>
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="table-filters" style={{ flexWrap: 'wrap', gap: 10, flex: 1 }}>
            <div style={{ position: 'relative', minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by order #, buyer, business..."
                className="form-input"
                style={{ paddingLeft: '2rem', marginBottom: 0, fontSize: '0.85rem', height: 36 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="select-filter" style={{ marginBottom: 0 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {invoiceStatuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date" className="form-input"
                style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
              <input
                type="date" className="form-input"
                style={{ marginBottom: 0, fontSize: '0.82rem', height: 36, width: 140 }}
                value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>
            {(dateFrom || dateTo || searchQuery || statusFilter) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setStatusFilter(''); }} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {filteredOrders.length} invoice{filteredOrders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
        {loading ? (
          <div className="loading-center" style={{ padding: '3rem 0' }}><div className="spinner" /></div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Buyer / Business</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>GST</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedOrder(o)}>
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>INV-{o.order_number}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ord: {o.order_number}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{o.buyer_business || o.buyer_name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{o.buyer_name}{o.buyer_mobile ? ` · ${o.buyer_mobile}` : ''}</div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                      fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                      background: `${statusColor[o.status] || '#6b7280'}20`,
                      color: statusColor[o.status] || '#6b7280',
                      border: `1px solid ${statusColor[o.status] || '#6b7280'}40`
                    }}>{o.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmt(o.subtotal)}</td>
                  <td style={{ textAlign: 'right', color: '#8b5cf6', fontWeight: 600 }}>{fmt(o.gst_amount)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{fmt(o.grand_total)}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(o.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.72rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <ExternalLink size={11} /> View Invoice
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                    {loading ? 'Loading...' : 'No invoices found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
        <span style={{ padding: '6px 14px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>Page {page}</span>
        <button className="btn btn-secondary btn-sm" disabled={filteredOrders.length < 50} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>

      {/* Invoice Preview Modal */}
      {selectedOrder && (
        <InvoiceModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
};

export default Invoices;
