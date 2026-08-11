import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, ArrowDownCircle, ArrowUpCircle, Search, Eye, 
  ArrowLeft, Download, Calendar, Filter, RefreshCw, PlusCircle,
  Users, ShoppingBag, X, FileText
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
  const [activeTab, setActiveTab] = useState('customers'); // 'customers' | 'suppliers'
  const [retailers, setRetailers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Party State
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerSummary, setLedgerSummary] = useState({
    outstanding_balance: 0,
    credit_limit: 0,
    available_balance: 0,
  });

  // Voucher Modal State
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [postingVoucher, setPostingVoucher] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    voucherType: 'PAYMENT',
    partyType: 'RETAILER',
    partyId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  // Pagination states
  const [pageRetailers, setPageRetailers] = useState(1);
  const [pageSuppliers, setPageSuppliers] = useState(1);
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
    setPageSuppliers(1);
  }, [searchQuery, activeTab]);

  const [loading, setLoading] = useState(true);

  // Load retailer directory, supplier directory or personal ledger
  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [retRes, supRes] = await Promise.all([
          api.get('/admin/retailers'),
          api.get('/purchases/suppliers')
        ]);
        setRetailers(retRes.data || []);
        setSuppliers(supRes.data || []);
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
      setSelectedSupplier(null);
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

  // Load specific supplier history
  const fetchSupplierLedger = async (supplier) => {
    setLoading(true);
    try {
      setSelectedRetailer(null);
      setSelectedSupplier(supplier);
      const { data } = await api.get(`/admin/suppliers/${supplier.id}/ledger`);
      setLedgerEntries(data.entries || []);
      setLedgerSummary({
        outstanding_balance: data.outstanding_balance || 0,
        credit_limit: 0,
        available_balance: 0,
      });
    } catch (err) {
      alert('Failed to load supplier ledger entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRetailer = (retailerUser) => {
    setSelectedSupplier(null);
    setDatePreset('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setEntryTypeFilter('all');
    setKeywordFilter('');
    setCustomStartDate('');
    setCustomEndDate('');
    fetchRetailerLedger(retailerUser);
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedRetailer(null);
    setDatePreset('all');
    setSelectedMonth('all');
    setSelectedYear('all');
    setEntryTypeFilter('all');
    setKeywordFilter('');
    setCustomStartDate('');
    setCustomEndDate('');
    fetchSupplierLedger(supplier);
  };

  // Handle Post Voucher Submission
  const handlePostVoucher = async (e) => {
    e.preventDefault();
    if (!voucherForm.partyId) return alert('Please select a party');
    if (!voucherForm.amount || Number(voucherForm.amount) <= 0) return alert('Please enter a valid amount');

    setPostingVoucher(true);
    try {
      const amountPaise = Math.round(Number(voucherForm.amount) * 100);
      const payload = {
        voucherType: voucherForm.voucherType,
        partyType: voucherForm.partyType,
        partyId: voucherForm.partyId,
        amount: amountPaise,
        description: voucherForm.description,
        date: voucherForm.date,
      };

      await api.post('/admin/vouchers', payload);
      alert('Voucher posted successfully!');
      setShowVoucherModal(false);

      setVoucherForm({
        voucherType: 'PAYMENT',
        partyType: 'RETAILER',
        partyId: '',
        amount: '',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });

      if (selectedRetailer) {
        fetchRetailerLedger(selectedRetailer);
      } else if (selectedSupplier) {
        fetchSupplierLedger(selectedSupplier);
      }
      loadInitialData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to post voucher');
    } finally {
      setPostingVoucher(false);
    }
  };

  const fmt = (paise) => `INR ${(Math.abs(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Filter calculation for history table
  const filteredEntries = useMemo(() => {
    const activeEntries = (selectedRetailer || selectedSupplier) ? ledgerEntries : ownEntries;
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
        const voucherMatch = entry.voucher_type?.toLowerCase().includes(q);
        if (!descMatch && !refTypeMatch && !refIdMatch && !voucherMatch) return false;
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
    selectedRetailer, selectedSupplier, ledgerEntries, ownEntries, entryTypeFilter, 
    keywordFilter, selectedMonth, selectedYear, datePreset, 
    customStartDate, customEndDate
  ]);

  // Export CSV Handler
  const exportCSV = () => {
    const isSupplier = !!selectedSupplier;
    const partyName = isSupplier 
      ? selectedSupplier.name 
      : (selectedRetailer?.retailer_profile?.business_name || 'Retailer');
    const ownerName = isSupplier
      ? (selectedSupplier.contactPerson || '')
      : (selectedRetailer?.retailer_profile?.owner_name || selectedRetailer?.full_name || '');
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `${isSupplier ? 'SUPPLIER' : 'RETAILER'} LEDGER STATEMENT - ${partyName.toUpperCase()}\n`;
    csvContent += `${isSupplier ? 'Contact' : 'Owner'}: ${ownerName}, Mobile: ${isSupplier ? (selectedSupplier.mobile || '') : (selectedRetailer?.mobile || '')}\n`;
    csvContent += `Outstanding Balance: ${fmt(ledgerSummary.outstanding_balance)}\n`;
    csvContent += `Export Date: ${new Date().toLocaleString()}\n\n`;
    
    csvContent += 'Date,Type,Amount (INR),Voucher Type,Reference Type,Reference ID,Description\n';

    filteredEntries.forEach(e => {
      const dateStr = new Date(e.created_at).toLocaleDateString('en-IN');
      const amtStr = (e.amount / 100).toFixed(2);
      const descStr = `"${(e.description || '').replace(/"/g, '""')}"`;
      csvContent += `${dateStr},${e.entry_type.toUpperCase()},${amtStr},${e.voucher_type || 'GENERAL'},${e.reference_type || ''},${e.reference_id || ''},${descStr}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const fileName = `ledger_${partyName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !selectedRetailer && !selectedSupplier && ownEntries.length === 0 && retailers.length === 0 && suppliers.length === 0) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  // ── 1. PARTY DETAIL HISTORY PAGE (Retailer or Supplier) ──
  if (isAdmin && (selectedRetailer || selectedSupplier)) {
    const isSupplier = !!selectedSupplier;
    const titleName = isSupplier 
      ? selectedSupplier.name 
      : (selectedRetailer.retailer_profile?.business_name || 'Retail Shop');
    const subtitleInfo = isSupplier
      ? `Contact: ${selectedSupplier.contactPerson || 'N/A'} | Mobile: ${selectedSupplier.mobile || 'N/A'} | GST: ${selectedSupplier.gstin || 'N/A'}`
      : `Owner: ${selectedRetailer.retailer_profile?.owner_name || selectedRetailer.full_name} | Mobile: ${selectedRetailer.mobile} | GST: ${selectedRetailer.retailer_profile?.gst_number || 'N/A'}`;

    return (
      <div style={{ paddingBottom: 40 }}>
        {/* Navigation Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { setSelectedRetailer(null); setSelectedSupplier(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
          >
            <ArrowLeft size={18} /> Back to Directory
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setVoucherForm({
                  voucherType: 'PAYMENT',
                  partyType: isSupplier ? 'SUPPLIER' : 'RETAILER',
                  partyId: isSupplier ? selectedSupplier.id : (selectedRetailer.retailer_profile?.id || selectedRetailer.id),
                  amount: '',
                  description: '',
                  date: new Date().toISOString().slice(0, 10),
                });
                setShowVoucherModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}
            >
              <PlusCircle size={18} /> + Post Voucher
            </button>
          
            <button 
              className="btn btn-secondary"
              onClick={exportCSV}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={18} /> Export CSV Statement
            </button>
          </div>
        </div>

        {/* Profile & Credit KPI Summary Header */}
        <div className="view-header" style={{ marginBottom: 24, background: 'var(--surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 15 }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: 8, display: 'inline-block' }}>
                {isSupplier ? 'Supplier Account' : 'Customer Account'}
              </span>
              <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{titleName}</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                {subtitleInfo}
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!isSupplier && (
                <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': 'var(--primary)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Credit Limit</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4 }}>
                    {fmt(ledgerSummary.credit_limit)}
                  </span>
                </div>
              )}

              <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': ledgerSummary.outstanding_balance > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {isSupplier ? 'Payable Outstanding' : 'Used (Outstanding)'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4, color: ledgerSummary.outstanding_balance > 0 ? 'var(--danger)' : 'inherit' }}>
                  {fmt(ledgerSummary.outstanding_balance)}
                </span>
              </div>

              {!isSupplier && (
                <div className="kpi-card" style={{ padding: '14px 20px', minWidth: 160, '--card-color': 'var(--success)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Available Credit</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, display: 'block', marginTop: 4, color: 'var(--success)' }}>
                    {fmt(ledgerSummary.available_balance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="table-container" style={{ marginBottom: 24, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            <Filter size={18} color="var(--primary)" /> Comprehensive Filters & History Search
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
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

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Month</label>
              <select className="form-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Year</label>
              <select className="form-input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                {YEARS.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Transaction Type</label>
              <select className="form-input" value={entryTypeFilter} onChange={e => setEntryTypeFilter(e.target.value)}>
                <option value="all">All Types (Debits & Credits)</option>
                <option value="debit">DEBIT</option>
                <option value="credit">CREDIT</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Search Keyword</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Voucher #, description..." 
                  value={keywordFilter} 
                  onChange={e => setKeywordFilter(e.target.value)} 
                  style={{ paddingLeft: '2.2rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

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

        {/* Ledger Entries Data Table */}
        <div className="table-container">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>Ledger Transaction Logs ({filteredEntries.length})</span>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => isSupplier ? fetchSupplierLedger(selectedSupplier) : fetchRetailerLedger(selectedRetailer)} 
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <RefreshCw size={14} /> Refresh Data
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Voucher Type</th>
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
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                        {e.voucher_type || 'GENERAL'}
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
                    <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No ledger entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

  // ── 2. ADMIN PARTY DIRECTORY PAGE (Retailers vs Suppliers Tabs) ──
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

    const filteredSuppliers = suppliers.filter(s => {
      const q = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.contactPerson?.toLowerCase().includes(q) ||
        s.mobile?.includes(q) ||
        s.gstin?.toLowerCase().includes(q)
      );
    });

    return (
      <div>
        <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15, marginBottom: 20 }}>
          <div className="view-title-wrap">
            <h1>Party Ledger & Accounts Directory</h1>
            <p>Manage customer & supplier balances, record payments, and post accounting vouchers</p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setVoucherForm({
                voucherType: 'PAYMENT',
                partyType: activeTab === 'suppliers' ? 'SUPPLIER' : 'RETAILER',
                partyId: '',
                amount: '',
                description: '',
                date: new Date().toISOString().slice(0, 10),
              });
              setShowVoucherModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: '10px 18px' }}
          >
            <PlusCircle size={18} /> + Post Voucher
          </button>
        </div>

        {/* Directory Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            className={`btn ${activeTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('customers')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: '10px 20px' }}
          >
            <Users size={18} /> Customers (Retailers) ({retailers.length})
          </button>

          <button
            className={`btn ${activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('suppliers')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: '10px 20px' }}
          >
            <ShoppingBag size={18} /> Suppliers (Vendors) ({suppliers.length})
          </button>
        </div>

        {/* Directory Search & Content */}
        {activeTab === 'customers' ? (
          <div className="table-container">
            <div className="table-toolbar">
              <div className="table-filters" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>All Active Retailer Accounts</span>
                <div style={{ position: 'relative', width: '320px' }}>
                  <input
                    type="text"
                    placeholder="Search retailer, business or mobile..."
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
        ) : (
          <div className="table-container">
            <div className="table-toolbar">
              <div className="table-filters" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>All Active Supplier Accounts</span>
                <div style={{ position: 'relative', width: '320px' }}>
                  <input
                    type="text"
                    placeholder="Search supplier, contact or GST..."
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
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Mobile</th>
                    <th>GSTIN</th>
                    <th>Payable Outstanding</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.slice((pageSuppliers - 1) * itemsPerPage, pageSuppliers * itemsPerPage).map(s => {
                    const balance = s.balance || 0;
                    return (
                      <tr key={s.id}>
                        <td style={{ fontWeight: 700 }}>{s.name}</td>
                        <td style={{ fontWeight: 600 }}>{s.contactPerson || '—'}</td>
                        <td>{s.mobile || '—'}</td>
                        <td>{s.gstin || '—'}</td>
                        <td style={{ color: balance > 0 ? 'var(--danger)' : 'var(--text-primary)', fontWeight: 700 }}>
                          {fmt(balance)}
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleSelectSupplier(s)} 
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            <Eye size={14} /> Full History Page
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No suppliers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {Math.ceil(filteredSuppliers.length / itemsPerPage) > 1 && (
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
                  Showing {((pageSuppliers - 1) * itemsPerPage) + 1} to {Math.min(pageSuppliers * itemsPerPage, filteredSuppliers.length)} of {filteredSuppliers.length} entries
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    disabled={pageSuppliers === 1}
                    onClick={() => setPageSuppliers(prev => prev - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                  >
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
                    Page {pageSuppliers} of {Math.ceil(filteredSuppliers.length / itemsPerPage)}
                  </span>
                  <button
                    disabled={pageSuppliers === Math.ceil(filteredSuppliers.length / itemsPerPage)}
                    onClick={() => setPageSuppliers(prev => prev + 1)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', height: 'auto' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Post Voucher */}
        {showVoucherModal && (
          <div className="modal-overlay" onClick={() => setShowVoucherModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <h2>Post Accounting Voucher</h2>
                <button className="btn-icon" onClick={() => setShowVoucherModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePostVoucher} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 0' }}>
                <div className="form-group">
                  <label className="form-label">Party Type *</label>
                  <select
                    className="form-select"
                    value={voucherForm.partyType}
                    onChange={e => setVoucherForm({ ...voucherForm, partyType: e.target.value, partyId: '' })}
                    required
                  >
                    <option value="RETAILER">Customer (Retailer)</option>
                    <option value="SUPPLIER">Supplier (Vendor)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select Party *</label>
                  <select
                    className="form-select"
                    value={voucherForm.partyId}
                    onChange={e => setVoucherForm({ ...voucherForm, partyId: e.target.value })}
                    required
                  >
                    <option value="">-- Select {voucherForm.partyType === 'RETAILER' ? 'Customer' : 'Supplier'} --</option>
                    {voucherForm.partyType === 'RETAILER' ? (
                      retailers.map(r => {
                        const rp = r.retailer_profile || {};
                        const name = rp.business_name ? `${rp.business_name} (${rp.owner_name || r.full_name})` : r.full_name;
                        return <option key={r.id} value={rp.id || r.id}>{name}</option>;
                      })
                    ) : (
                      suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Voucher Type *</label>
                  <select
                    className="form-select"
                    value={voucherForm.voucherType}
                    onChange={e => setVoucherForm({ ...voucherForm, voucherType: e.target.value })}
                    required
                  >
                    <option value="PAYMENT">Payment Voucher (Money Paid)</option>
                    <option value="RECEIPT">Receipt Voucher (Money Received)</option>
                    <option value="DEBIT_NOTE">Debit Note Voucher</option>
                    <option value="CREDIT_NOTE">Credit Note Voucher</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Amount (INR ₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 1500.00"
                      className="form-input"
                      value={voucherForm.amount}
                      onChange={e => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Voucher Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={voucherForm.date}
                      onChange={e => setVoucherForm({ ...voucherForm, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Particulars</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    placeholder="Enter notes, cheque number, or details..."
                    value={voucherForm.description}
                    onChange={e => setVoucherForm({ ...voucherForm, description: e.target.value })}
                  />
                </div>

                <div className="modal-footer" style={{ padding: 0, paddingTop: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowVoucherModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={postingVoucher}>
                    {postingVoucher ? 'Posting...' : 'Post Voucher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 3. RETAILER OWN LEDGER VIEW ──
  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>My Financial Ledger</h1>
          <p>Real-time record of all your purchases, payments, and account balance</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <div className="kpi-card" style={{ '--card-color': ownBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
          <div className="kpi-info">
            <span className="kpi-title">Current Outstanding Balance</span>
            <span className="kpi-value">{fmt(ownBalance)}</span>
          </div>
          <div className="kpi-icon-wrap">
            <BookOpen size={24} />
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
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.slice((pageOwn - 1) * itemsPerPage, pageOwn * itemsPerPage).map(e => (
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
                    No ledger entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Ledger;
