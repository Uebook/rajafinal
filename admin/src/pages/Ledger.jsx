import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, ArrowDownCircle, ArrowUpCircle, Search, Eye, 
  ArrowLeft, Download, Calendar, Filter, RefreshCw 
} from 'lucide-react';

const MONTHS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const YEARS = ['all', '2024', '2025', '2026', '2027'];

const Ledger = () => {
  const { isAdmin } = useAuth();
  
  // Own retailer view state
  const [ownEntries, setOwnEntries] = useState([]);
  const [ownBalance, setOwnBalance] = useState(0);

  // Admin View State
  const [retailers, setRetailers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Retailer Full History Page State
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    outstanding_balance: 0,
    credit_limit: 0,
    available_balance: 0,
  });

  // Pagination states
  const [pageRetailers, setPageRetailers] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);
  const [pageOwn, setPageOwn] = useState(1);
  const itemsPerPage = 20;

  // Filter States for Ledger Detail Page
  const [datePreset, setDatePreset] = useState('all'); // all, week, month, year, custom
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all'); // all, debit, credit
  const [keywordFilter, setKeywordFilter] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    setPageHistory(1);
    setPageOwn(1);
  }, [datePreset, selectedMonth, selectedYear, entryTypeFilter, keywordFilter, customStartDate, customEndDate]);

  useEffect(() => {
    setPageRetailers(1);
  }, [searchQuery]);

  const [loading, setLoading] = useState(true);

  // Load retailer directory or personal ledger
  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const { data } = await api.get('/admin/retailers');
        setRetailers(data);
      } else {
        const { data } = await api.get('/ledger', { params: { page_size: 200 } });
        setOwnEntries(data.entries || []);
        setOwnBalance(data.outstanding_balance || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [isAdmin]);

  // Load specific retailer history
  const fetchRetailerLedger = async (retailerUser) => {
    setLoading(true);
    try {
      setSelectedRetailer(retailerUser);
      const params = {
        retailer_id: retailerUser.id,
        page_size: 500,
      };
      if (entryTypeFilter !== 'all') params.entry_type = entryTypeFilter;

      const { data } = await api.get('/ledger', { params });
      setLedgerEntries(data.entries || []);
      setLedgerSummary({
        outstanding_balance: data.outstanding_balance || 0,
        credit_limit: data.credit_limit || retailerUser.retailer_profile?.credit_limit || 0,
        available_balance: data.available_balance || 0,
      });
    } catch (err) {
      alert('Failed to load retailer ledger entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRetailer = (retailerUser) => {
    // Reset filters
    setDatePreset('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setEntryTypeFilter('all');
    setKeywordFilter('');
    setCustomStartDate('');
    setCustomEndDate('');
    fetchRetailerLedger(retailerUser);
  };

  const fmt = (paise) => `INR ${(Math.abs(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Filter calculation for history table
  const filteredEntries = useMemo(() => {
    const activeEntries = selectedRetailer ? ledgerEntries : ownEntries;
    return activeEntries.filter(entry => {
      const entryDate = new Date(entry.created_at);

      // Entry type filter
      if (entryTypeFilter !== 'all' && entry.entry_type !== entryTypeFilter) {
        return false;
      }

      // Keyword search filter
      if (keywordFilter.trim()) {
        const q = keywordFilter.toLowerCase();
        const descMatch = entry.description?.toLowerCase().includes(q);
        const refTypeMatch = entry.reference_type?.toLowerCase().includes(q);
        const refIdMatch = entry.reference_id?.toLowerCase().includes(q);
        if (!descMatch && !refTypeMatch && !refIdMatch) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        if (entryDate.getMonth().toString() !== selectedMonth) return false;
      }

      // Year filter
      if (selectedYear !== 'all') {
        if (entryDate.getFullYear().toString() !== selectedYear) return false;
      }

      // Date Preset Filter
      const now = new Date();
      if (datePreset === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        if (entryDate < oneWeekAgo) return false;
      } else if (datePreset === 'month') {
        if (entryDate.getMonth() !== now.getMonth() || entryDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (datePreset === 'year') {
        if (entryDate.getFullYear() !== now.getFullYear()) return false;
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const s = new Date(customStartDate);
          if (entryDate < s) return false;
        }
        if (customEndDate) {
          const e = new Date(customEndDate);
          e.setHours(23, 59, 59, 999);
          if (entryDate > e) return false;
        }
      }

      return true;
    });
  }, [
    selectedRetailer, ledgerEntries, ownEntries, entryTypeFilter, 
    keywordFilter, selectedMonth, selectedYear, datePreset, 
    customStartDate, customEndDate
  ]);

  // Export CSV Handler
  const exportCSV = () => {
    const retailerName = selectedRetailer?.retailer_profile?.business_name || 'Retailer';
    const ownerName = selectedRetailer?.retailer_profile?.owner_name || selectedRetailer?.full_name || '';
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `RETAILER LEDGER STATEMENT - ${retailerName.toUpperCase()}\n`;
    csvContent += `Owner: ${ownerName}, Mobile: ${selectedRetailer?.mobile || ''}\n`;
    csvContent += `Credit Limit: ${fmt(ledgerSummary.credit_limit)}, Used Outstanding: ${fmt(ledgerSummary.outstanding_balance)}, Available: ${fmt(ledgerSummary.available_balance)}\n`;
    csvContent += `Export Date: ${new Date().toLocaleString()}\n\n`;
    
    csvContent += 'Date,Type,Amount (INR),Reference Type,Reference ID,Description\n';

    filteredEntries.forEach(e => {
      const dateStr = new Date(e.created_at).toLocaleDateString('en-IN');
      const amtStr = (e.amount / 100).toFixed(2);
      const descStr = `"${(e.description || '').replace(/"/g, '""')}"`;
      csvContent += `${dateStr},${e.entry_type.toUpperCase()},${amtStr},${e.reference_type || ''},${e.reference_id || ''},${descStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = `ledger_${retailerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !selectedRetailer && ownEntries.length === 0 && retailers.length === 0) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  // ── 1. RETAILER DETAIL HISTORY PAGE ──
  if (isAdmin && selectedRetailer) {
    const rp = selectedRetailer.retailer_profile || {};
    return (
      <div style={{ paddingBottom: 40 }}>
        {/* Navigation Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => setSelectedRetailer(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
          >
            <ArrowLeft size={18} /> Back to Retailer Directory
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={18} /> Export CSV Statement
          </button>
        </div>

        {/* Retailer Profile & Credit KPI Summary Header */}
        <div className="view-header" style={{ marginBottom: 24, background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: 8, display: 'inline-block' }}>Retailer Credit Account</span>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{rp.business_name || 'Retail Shop'}</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Owner: <strong>{rp.owner_name || selectedRetailer.full_name}</strong> | Mobile: <strong>{selectedRetailer.mobile}</strong> | GST: <strong>{rp.gst_number || 'N/A'}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': 'var(--primary)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credit Limit</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4 }}>
                  {fmt(ledgerSummary.credit_limit)}
                </span>
              </div>
              <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': ledgerSummary.outstanding_balance > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Used (Outstanding)</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4, color: ledgerSummary.outstanding_balance > 0 ? 'var(--danger)' : 'inherit' }}>
                  {fmt(ledgerSummary.outstanding_balance)}
                </span>
              </div>
              <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': 'var(--success)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available Credit</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4, color: 'var(--success)' }}>
                  {fmt(ledgerSummary.available_balance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="table-container" style={{ marginBottom: 24, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            <Filter size={18} color="var(--primary)" /> Comprehensive Filters & History Search
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {/* Quick Preset Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Time Range Preset</label>
              <select className="form-input" value={datePreset} onChange={e => setDatePreset(e.target.value)}>
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Month</label>
              <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Year</label>
              <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
              </select>
            </div>

            {/* Entry Type Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Transaction Type</label>
              <select className="form-input" value={entryTypeFilter} onChange={e => setEntryTypeFilter(e.target.value)}>
                <option value="all">All Types (Debits & Credits)</option>
                <option value="debit">DEBIT (Orders / Charges)</option>
                <option value="credit">CREDIT (Payments / Credits)</option>
              </select>
            </div>

            {/* Search Keyword Filter */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Search Keyword</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Order ID, reference..." 
                  value={keywordFilter} 
                  onChange={e => setKeywordFilter(e.target.value)} 
                  style={{ paddingLeft: '2.2rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Custom Date Inputs if 'custom' selected */}
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>From Date</label>
                <input type="date" className="form-input" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>To Date</label>
                <input type="date" className="form-input" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Ledger Entries History Data Table */}
        <div className="table-container">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Ledger Transaction Logs ({filteredEntries.length})</span>
            <button className="btn btn-secondary btn-sm" onClick={() => fetchRetailerLedger(selectedRetailer)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.slice((pageHistory - 1) * itemsPerPage, pageHistory * itemsPerPage).map(e => (
                  <tr key={e.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {e.entry_type === 'debit' ? <ArrowUpCircle size={16} color="var(--danger)" /> : <ArrowDownCircle size={16} color="var(--secondary)" />}
                        <span style={{ fontWeight: 700, color: e.entry_type === 'debit' ? 'var(--danger)' : 'var(--secondary)' }}>
                          {e.entry_type.toUpperCase()}
                        </span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmt(e.amount)}</td>
                    <td><span className="badge badge-secondary">{e.reference_type}</span></td>
                    <td>{e.description || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(e.created_at).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No ledger entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {Math.ceil(filteredEntries.length / itemsPerPage) > 1 && (
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
                Showing {((pageHistory - 1) * itemsPerPage) + 1} to {Math.min(pageHistory * itemsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={pageHistory === 1}
                  onClick={() => setPageHistory(prev => prev - 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                  Page {pageHistory} of {Math.ceil(filteredEntries.length / itemsPerPage)}
                </span>
                <button
                  disabled={pageHistory === Math.ceil(filteredEntries.length / itemsPerPage)}
                  onClick={() => setPageHistory(prev => prev + 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 2. ADMIN RETAILER CREDIT DIRECTORY PAGE ──
  if (isAdmin) {
    const filteredRetailers = retailers.filter(r => {
      const rp = r.retailer_profile || {};
      const q = searchQuery.toLowerCase();
      return (
        rp.business_name?.toLowerCase().includes(q) ||
        rp.owner_name?.toLowerCase().includes(q) ||
        r.mobile?.includes(q)
      );
    });

    return (
      <div>
        <div className="view-header">
          <div className="view-title-wrap">
            <h1>Retailer Credit & Ledger Directory</h1>
            <p>Monitor credit limits, outstanding balances, and access complete transaction statements</p>
          </div>
        </div>

        <div className="table-container">
          <div className="table-toolbar">
            <div className="table-filters" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>All Active Retailer Accounts</span>
              <div style={{ position: 'relative', width: '320px' }}>
                <input
                  type="text"
                  placeholder="Search by retailer, business or mobile..."
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Owner Name</th>
                  <th>Contact</th>
                  <th>Credit Limit</th>
                  <th>Used (Outstanding)</th>
                  <th>Available Credit</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRetailers.slice((pageRetailers - 1) * itemsPerPage, pageRetailers * itemsPerPage).map(r => {
                  const rp = r.retailer_profile || {};
                  const creditLimit = rp.credit_limit || 0;
                  const usedLimit = rp.used_limit || 0;
                  const availableLimit = rp.available_limit || 0;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700 }}>{rp.business_name || 'N/A'}</td>
                      <td style={{ fontWeight: 600 }}>{rp.owner_name || r.full_name}</td>
                      <td>{r.mobile}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(creditLimit)}</td>
                      <td style={{ color: usedLimit > 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 700 }}>
                        {fmt(usedLimit)}
                      </td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                        {fmt(availableLimit)}
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => handleSelectRetailer(r)} 
                          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                          <Eye size={14} /> Full History Page
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredRetailers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No retailers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {Math.ceil(filteredRetailers.length / itemsPerPage) > 1 && (
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
                Showing {((pageRetailers - 1) * itemsPerPage) + 1} to {Math.min(pageRetailers * itemsPerPage, filteredRetailers.length)} of {filteredRetailers.length} entries
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={pageRetailers === 1}
                  onClick={() => setPageRetailers(prev => prev - 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                >
                  Previous
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                  Page {pageRetailers} of {Math.ceil(filteredRetailers.length / itemsPerPage)}
                </span>
                <button
                  disabled={pageRetailers === Math.ceil(filteredRetailers.length / itemsPerPage)}
                  onClick={() => setPageRetailers(prev => prev + 1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 3. RETAILER OWN LEDGER PAGE ──
  const balanceColor = ownBalance > 0 ? 'var(--danger)' : ownBalance < 0 ? 'var(--secondary)' : 'var(--text-primary)';

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>My Account Ledger & Credit</h1>
          <p>Track all your debit, credit, and order transaction history</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: 20 }}>
        <div className="kpi-card" style={{ '--card-color': balanceColor }}>
          <div className="kpi-info">
            <span className="kpi-title">Outstanding Balance</span>
            <span className="kpi-value" style={{ color: balanceColor }}>{fmt(ownBalance)}</span>
          </div>
          <div className="kpi-icon-wrap" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BookOpen size={22} />
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {ownEntries.slice((pageOwn - 1) * itemsPerPage, pageOwn * itemsPerPage).map(e => (
                <tr key={e.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {e.entry_type === 'debit' ? <ArrowUpCircle size={16} color="var(--danger)" /> : <ArrowDownCircle size={16} color="var(--secondary)" />}
                      <span style={{ fontWeight: 700, color: e.entry_type === 'debit' ? 'var(--danger)' : 'var(--secondary)' }}>
                        {e.entry_type.toUpperCase()}
                      </span>
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{fmt(e.amount)}</td>
                  <td>{e.reference_type}</td>
                  <td>{e.description || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {ownEntries.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No ledger entries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {Math.ceil(ownEntries.length / itemsPerPage) > 1 && (
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
              Showing {((pageOwn - 1) * itemsPerPage) + 1} to {Math.min(pageOwn * itemsPerPage, ownEntries.length)} of {ownEntries.length} entries
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={pageOwn === 1}
                onClick={() => setPageOwn(prev => prev - 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                Page {pageOwn} of {Math.ceil(ownEntries.length / itemsPerPage)}
              </span>
              <button
                disabled={pageOwn === Math.ceil(ownEntries.length / itemsPerPage)}
                onClick={() => setPageOwn(prev => prev + 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ledger;
