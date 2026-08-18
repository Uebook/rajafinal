import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, Download, Search, X, Calendar, ExternalLink, Printer } from 'lucide-react';

const fmt = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const statusColor = {
  pending: '#f59e0b', confirmed: '#3b82f6', dispatched: '#8b5cf6',
  delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280'
};

// Helper: Convert number to Indian currency words
export const numberToWords = (num) => {
  if (!num || isNaN(num)) return 'Zero Rupees';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n) => {
    let str = '';
    const numVal = Math.floor(n);
    if (numVal === 0) return '';
    const n_arr = ('000000000' + numVal).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_arr) return '';
    str += (Number(n_arr[1]) !== 0) ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
    str += (Number(n_arr[2]) !== 0) ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
    str += (Number(n_arr[3]) !== 0) ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
    str += (Number(n_arr[4]) !== 0) ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
    str += (Number(n_arr[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) : '';
    return str.trim();
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = rupees > 0 ? `${inWords(rupees)} Rupees` : '';
  if (paise > 0) {
    result += `${result ? ' and ' : ''}${inWords(paise)} Paise`;
  }
  return result ? `${result} Only` : 'Zero Rupees';
};

// ── Invoice Preview Modal ───────────────────────────────────────
export const InvoiceModal = ({ order, onClose }) => {
  const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  
  // Format short invoice number like Supp 1, Supp 2
  const invoiceNumber = order.short_invoice_no || `Supp ${order.seq_no || order.order_number?.replace(/^(ORD-BEHALF-|ORD-)/, '').slice(-4) || '1'}`;

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-area');
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice - ${invoiceNumber}</title>
      <style>
        @page { size: A4; margin: 8mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; padding: 10px; font-size: 11px; line-height: 1.3; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        * { box-sizing: border-box; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 8px; }
        th { background-color: #1e3a8a !important; color: #ffffff !important; padding: 4px 6px; font-size: 10px; font-weight: 700; border: 1px solid #1e3a8a; }
        td { padding: 4px 6px; border: 1px solid #e2e8f0; font-size: 10.5px; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const downloadInvoiceCSV = () => {
    const rows = [
      ['Invoice Number', invoiceNumber],
      ['Order Number', order.order_number],
      ['Invoice Date', invoiceDate],
      ['Buyer Name', order.buyer_name || ''],
      ['Buyer Mobile', order.buyer_mobile || ''],
      ['Business', order.buyer_business || ''],
      ['GSTIN/UIN', order.company_gstin || '09GUUPK1598D1ZX'],
      ['FSSAI Lic No', order.company_fssai || '12719072000036'],
      [''],
      ['Product', 'Qty', 'Unit', 'Unit Price (₹)', 'GST %', 'GST Amt (₹)', 'Line Total (₹)'],
      ...(order.items || []).map(item => {
        const lineBase = (item.unit_price || item.price || 0) * item.quantity;
        const lineGst = Math.round(lineBase * (item.gst_rate || 0) / 100);
        return [
          item.product_name || item.name || '',
          item.quantity,
          item.unit || 'pcs',
          ((item.unit_price || item.price || 0) / 100).toFixed(2),
          item.gst_rate || 0,
          (lineGst / 100).toFixed(2),
          (lineBase / 100).toFixed(2)
        ];
      }),
      [''],
      ['Subtotal', '', '', '', '', '', ((order.subtotal || 0) / 100).toFixed(2)],
      ['GST Amount', '', '', '', '', '', ((order.gst_amount || 0) / 100).toFixed(2)],
      ['Grand Total', '', '', '', '', '', ((order.grand_total || 0) / 100).toFixed(2)],
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
  const discountPaise = order.discount_amount || 0;
  const grandTotal = order.grand_total || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 760, width: '95vw', padding: '16px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: 12, paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Invoice — <span style={{ color: 'var(--primary)' }}>{invoiceNumber}</span></h3>
            <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {invoiceDate} · {order.buyer_business || order.buyer_name || 'N/A'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: '0.78rem' }}>
              <Printer size={13} /> Print
            </button>
            <button className="btn btn-primary btn-sm" onClick={downloadInvoiceCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', fontSize: '0.78rem' }}>
              <Download size={13} /> Download CSV
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.3rem', lineHeight: 1 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ maxHeight: '78vh', overflowY: 'auto' }}>
          <div id="invoice-print-area" style={{ padding: '4px', background: '#fff', color: '#0f172a', borderRadius: '4px' }}>
            
            {/* Header Details (Company + Invoice Info) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '2px solid #1e3a8a' }}>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Supply Setu</div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 2, fontWeight: 500 }}>Ward no-16 Katra Lalganj</div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', fontWeight: 500 }}>Gauriganj Amethi - 227409, State: Uttar Pradesh</div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 3 }}>
                  <span>GSTIN/UIN: </span><strong style={{ color: '#0f172a' }}>{order.company_gstin || '09GUUPK1598D1ZX'}</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                  <span>FSSAI Licence No: </span><strong style={{ color: '#0f172a' }}>{order.company_fssai || '12719072000036'}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TAX INVOICE</div>
                <div style={{ fontSize: '0.88rem', marginTop: 4 }}>
                  <span style={{ color: '#4b5563' }}>Invoice No: </span>
                  <strong style={{ color: '#1e3a8a', fontSize: '0.95rem' }}>{invoiceNumber}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: 2 }}>
                  <span>Date: </span><strong style={{ color: '#0f172a' }}>{invoiceDate}</strong>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                  <span>Order Ref: </span><span style={{ fontFamily: 'monospace' }}>{order.order_number}</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span style={{
                    display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                    background: `${statusColor[order.status] || '#6b7280'}20`,
                    color: statusColor[order.status] || '#6b7280',
                    border: `1px solid ${statusColor[order.status] || '#6b7280'}40`
                  }}>{order.status}</span>
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>Buyer (Bill To)</div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{order.buyer_business || order.buyer_name || '—'}</div>
                {order.buyer_business && order.buyer_name && <div style={{ fontSize: '0.78rem', color: '#334155' }}>Attn: {order.buyer_name}</div>}
                {order.buyer_mobile && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ph: {order.buyer_mobile}</div>}
                {order.delivery_address && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{order.delivery_address}</div>
                )}
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>Payment Details</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Mode</span>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{order.payment_method || 'Credit / Ledger'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Order Status</span>
                    <span style={{ fontWeight: 700, color: statusColor[order.status] || '#6b7280', textTransform: 'uppercase', fontSize: '0.72rem' }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Total Items</span>
                    <span style={{ fontWeight: 600 }}>{order.items?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table (Compact formatting so 7-8 items fit cleanly!) */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                  <th style={{ padding: '5px 6px', width: 24, textAlign: 'center', border: '1px solid #1e3a8a' }}>#</th>
                  <th style={{ padding: '5px 8px', textAlign: 'left', border: '1px solid #1e3a8a' }}>Item / Description</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', width: 65, border: '1px solid #1e3a8a' }}>HSN</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right', width: 45, border: '1px solid #1e3a8a' }}>Qty</th>
                  <th style={{ padding: '5px 6px', textAlign: 'center', width: 40, border: '1px solid #1e3a8a' }}>Per</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: 75, border: '1px solid #1e3a8a' }}>Rate</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right', width: 50, border: '1px solid #1e3a8a' }}>GST %</th>
                  <th style={{ padding: '5px 6px', textAlign: 'right', width: 65, border: '1px solid #1e3a8a' }}>GST Amt</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', width: 80, border: '1px solid #1e3a8a' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, idx) => {
                  const lineBase = (item.unit_price || item.price || 0) * item.quantity;
                  const gstRate = item.gst_rate || 0;
                  const lineGst = Math.round(lineBase * gstRate / 100);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>{idx + 1}</td>
                      <td style={{ padding: '4px 8px', fontWeight: 600, color: '#0f172a', border: '1px solid #e2e8f0' }}>
                        {item.product_name || item.name || `Item ${idx + 1}`}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b', fontSize: '0.7rem', border: '1px solid #e2e8f0' }}>
                        {item.hsn || item.sku || '—'}
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, border: '1px solid #e2e8f0' }}>{item.quantity}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#64748b', fontSize: '0.7rem', border: '1px solid #e2e8f0' }}>
                        {item.unit || 'pcs'}
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #e2e8f0' }}>{fmt(item.unit_price || item.price)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#64748b', border: '1px solid #e2e8f0' }}>{gstRate}%</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: '#64748b', border: '1px solid #e2e8f0' }}>{fmt(lineGst)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, border: '1px solid #e2e8f0' }}>{fmt(lineBase)}</td>
                    </tr>
                  );
                })}
                {(!order.items || order.items.length === 0) && (
                  <tr><td colSpan="9" style={{ textAlign: 'center', color: '#64748b', padding: '12px' }}>No items available</td></tr>
                )}
              </tbody>
            </table>

            {/* Amount in Words + Totals */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
              <div style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount in Words</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginTop: 2, fontStyle: 'italic' }}>
                  {numberToWords(grandTotal / 100)}
                </div>
              </div>
              <div style={{ width: 250 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  <span>Subtotal (excl. GST)</span>
                  <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  <span>CGST</span>
                  <span>{fmt(gstAmount / 2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.75rem', color: '#4b5563' }}>
                  <span>SGST</span>
                  <span>{fmt(gstAmount / 2)}</span>
                </div>
                {discountPaise > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.75rem', color: '#dc2626' }}>
                    <span>Discount</span>
                    <span>-{fmt(discountPaise)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0 2px', borderTop: '2px solid #1e3a8a', marginTop: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>TOTAL AMOUNT</span>
                  <span style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>{fmt(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: 8, marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '0.68rem', color: '#64748b', maxWidth: 300, lineHeight: 1.3 }}>
                Computer-generated invoice. No physical signature required.
                Goods once sold will not be taken back unless under return policy.
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', marginBottom: 20 }}>For Supply Setu</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', borderTop: '1px solid #cbd5e1', paddingTop: 2, display: 'inline-block' }}>
                  Authorized Signatory
                </div>
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
      const params = { page, page_size: 50 };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (statusFilter) params.order_status = statusFilter;
      const { data } = await api.get('/orders', { params });
      
      const rawList = Array.isArray(data) ? data.filter(o => o.status !== 'cancelled') : [];
      
      // Map short invoice numbers: Supp 1, Supp 2...
      const totalCount = rawList.length;
      const formattedList = rawList.map((o, index) => {
        const seq = totalCount - index;
        const shortNo = `Supp ${seq}`;
        return {
          ...o,
          short_invoice_no: shortNo,
          seq_no: seq
        };
      });

      setOrders(formattedList);
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
        o.short_invoice_no || `Supp ${o.order_number}`,
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

  const totalRevenue = filteredOrders.reduce((acc, o) => acc + (o.grand_total || 0), 0);
  const totalGST = filteredOrders.reduce((acc, o) => acc + (o.gst_amount || 0), 0);

  const invoiceStatuses = ['confirmed', 'dispatched', 'delivered', 'pending'];

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Invoice Management</h1>
          <p>GST & FSSAI Compliant Invoices</p>
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
                placeholder="Search by Supp 1, order #, buyer..."
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
        <div className="table-responsive">
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
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{o.short_invoice_no}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ref: {o.order_number}</div>
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
        </div>
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

