import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BookOpen, ArrowDownCircle, ArrowUpCircle, Filter, Calendar, 
  RefreshCw, FileText, Download, CheckCircle2, TrendingUp, TrendingDown 
} from 'lucide-react';

const TallyLedger = () => {
  const [daybook, setDaybook] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate, voucherTypeFilter]);

  const fetchDaybook = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const { data } = await api.get('/tally-daybook', { params });
      setDaybook(data || []);
    } catch (err) {
      console.error('Failed to fetch Tally Daybook', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDaybook();
  }, [startDate, endDate]);

  const filteredVouchers = daybook.filter(v => {
    if (voucherTypeFilter === 'ALL') return true;
    return v.voucherType === voucherTypeFilter;
  });

  const totals = filteredVouchers.reduce((acc, v) => {
    if (v.entryType === 'DEBIT') {
      acc.debit += v.amount;
    } else {
      acc.credit += v.amount;
    }
    return acc;
  }, { debit: 0, credit: 0 });

  const totalPages = Math.ceil(filteredVouchers.length / itemsPerPage);
  const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Tally Double-Entry Daybook & Accounting</h1>
          <p>Real-time voucher balances for Purchase Payables (Suppliers) and Sales Receivables (Retailers).</p>
        </div>
        <button
          onClick={fetchDaybook}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={16} /> Refresh Daybook
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-color': 'var(--danger)', '--card-bg-light': 'var(--danger-light)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total Debit Vouchers</span>
            <span className="kpi-value" style={{ color: 'var(--danger)' }}>₹{totals.debit.toLocaleString()}</span>
          </div>
          <div className="kpi-icon-wrap">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="kpi-card" style={{ '--card-color': 'var(--secondary)', '--card-bg-light': 'var(--secondary-light)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Total Credit Vouchers</span>
            <span className="kpi-value" style={{ color: 'var(--secondary)' }}>₹{totals.credit.toLocaleString()}</span>
          </div>
          <div className="kpi-icon-wrap">
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="kpi-card" style={{ '--card-color': 'var(--primary)', '--card-bg-light': 'var(--primary-light)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Net Voucher Difference</span>
            <span className="kpi-value" style={{ color: 'var(--primary)' }}>
              ₹{Math.abs(totals.debit - totals.credit).toLocaleString()}
            </span>
          </div>
          <div className="kpi-icon-wrap">
            <FileText size={24} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        <div className="table-toolbar">
          <div className="table-filters" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Voucher Type:</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['ALL', 'PURCHASE', 'SALES', 'PAYMENT', 'RECEIPT'].map((type) => (
                <button
                  key={type}
                  onClick={() => setVoucherTypeFilter(type)}
                  className={`btn ${voucherTypeFilter === type ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto' }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>
      </div>

      {/* Tally Vouchers Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading Tally Daybook...</div>
        ) : filteredVouchers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No accounting vouchers found for the selected criteria.
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Voucher Type</th>
                    <th>Debit Account</th>
                    <th>Credit Account</th>
                    <th>Supplier / Buyer</th>
                    <th>Description / Particulars</th>
                    <th style={{ textAlign: 'right' }}>Debit Amount</th>
                    <th style={{ textAlign: 'right' }}>Credit Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVouchers.map((v) => (
                    <tr key={v.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(v.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 10,
                          backgroundColor:
                            v.voucherType === 'PURCHASE' ? 'var(--warning-light)' :
                            v.voucherType === 'SALES' ? 'var(--primary-light)' :
                            v.voucherType === 'PAYMENT' ? 'var(--danger-light)' :
                            'var(--secondary-light)',
                          color:
                            v.voucherType === 'PURCHASE' ? 'var(--warning)' :
                            v.voucherType === 'SALES' ? 'var(--primary)' :
                            v.voucherType === 'PAYMENT' ? 'var(--danger)' :
                            'var(--secondary)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontWeight: 'bold'
                        }}>
                          {v.voucherType || 'GENERAL'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{v.debitAccount || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{v.creditAccount || '—'}</td>
                      <td>
                        {v.partyName !== '—' ? (
                          <div>
                            <strong style={{ display: 'block' }}>{v.partyName}</strong>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.partyType}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', maxW: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.description}>{v.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                        {v.entryType === 'DEBIT' ? `₹${v.amount.toLocaleString()}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--secondary)' }}>
                        {v.entryType === 'CREDIT' ? `₹${v.amount.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredVouchers.length)} of {filteredVouchers.length} entries
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
          </>
        )}
      </div>
    </div>
  );
};

export default TallyLedger;
