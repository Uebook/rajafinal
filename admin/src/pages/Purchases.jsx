import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShoppingBag, Plus, Search, Eye, Filter, Calendar, 
  Truck, DollarSign, Package, CheckCircle, Clock, AlertCircle, UserPlus, X, Download
} from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState(null);

  // New Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstin: '',
    address: '',
  });

  // New Purchase Form
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    paidAmount: 0,
    notes: '',
    items: [{ productId: '', quantity: 1, purchaseRate: 0 }],
  });

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPurchaseForPayment, setSelectedPurchaseForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Load Purchases, Suppliers, and Products
  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSupplierFilter) params.supplierId = selectedSupplierFilter;
      if (startDateFilter) params.startDate = startDateFilter;
      if (endDateFilter) params.endDate = endDateFilter;

      const [purRes, supRes, prodRes] = await Promise.all([
        api.get('/purchases', { params }),
        api.get('/purchases/suppliers'),
        api.get('/products'),
      ]);

      setPurchases(purRes.data || []);
      setSuppliers(supRes.data || []);
      // Extract array from product API response
      const prods = Array.isArray(prodRes.data) ? prodRes.data : prodRes.data.products || [];
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load purchase data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSupplierFilter, startDateFilter, endDateFilter]);

  // Create Supplier Handler
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/purchases/suppliers', supplierForm);
      setSuppliers([...suppliers, data]);
      setPurchaseForm({ ...purchaseForm, supplierId: data.id });
      setShowNewSupplierModal(false);
      setSupplierForm({ name: '', contactPerson: '', mobile: '', email: '', gstin: '', address: '' });
      alert('Supplier created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create supplier');
    }
  };

  // Item row change in Purchase form
  const handleItemChange = (index, field, value) => {
    const newItems = [...purchaseForm.items];
    newItems[index][field] = field === 'quantity' || field === 'purchaseRate' ? Number(value) : value;

    // Auto populate default base price as fallback rate if product selected
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      if (prod && !newItems[index].purchaseRate) {
        newItems[index].purchaseRate = prod.basePrice || 0;
      }
    }
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  const addItemRow = () => {
    setPurchaseForm({
      ...purchaseForm,
      items: [...purchaseForm.items, { productId: '', quantity: 1, purchaseRate: 0 }],
    });
  };

  const removeItemRow = (index) => {
    if (purchaseForm.items.length === 1) return;
    const newItems = purchaseForm.items.filter((_, i) => i !== index);
    setPurchaseForm({ ...purchaseForm, items: newItems });
  };

  const calculateTotal = () => {
    return purchaseForm.items.reduce((sum, item) => sum + (item.quantity * item.purchaseRate || 0), 0);
  };

  // Submit Purchase Voucher
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.supplierId) return alert('Please select a supplier');
    if (purchaseForm.items.some(i => !i.productId || i.quantity <= 0)) {
      return alert('Please fill in valid products and quantities');
    }

    try {
      await api.post('/purchases', purchaseForm);
      alert('Purchase recorded! Stock auto-incremented cleanly.');
      setShowNewPurchaseModal(false);
      setPurchaseForm({
        supplierId: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        paidAmount: 0,
        notes: '',
        items: [{ productId: '', quantity: 1, purchaseRate: 0 }],
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record purchase');
    }
  };

  // Fetch Purchase Details
  const handleViewDetails = async (id) => {
    try {
      const { data } = await api.get(`/purchases/${id}`);
      setSelectedPurchaseDetails(data);
    } catch (err) {
      alert('Failed to fetch details');
    }
  };

  const openRecordPayment = (purchase) => {
    setSelectedPurchaseForPayment(purchase);
    setPaymentAmount(purchase.totalAmount - purchase.paidAmount);
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPurchaseForPayment) return;
    try {
      await api.patch(`/purchases/${selectedPurchaseForPayment.id}/payment`, {
        paidAmount: Number(paymentAmount)
      });
      alert('Payment recorded successfully and Tally Daybook updated!');
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSupplierFilter, startDateFilter, endDateFilter, searchQuery]);

  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    const headers = ['Purchase Invoice #', 'Supplier Name', 'Invoice Date', 'Total Amount', 'Paid Amount', 'Status'];
    const rows = filteredPurchases.map(p => [
      p.purchaseNumber,
      p.supplierName,
      new Date(p.invoiceDate).toLocaleDateString(),
      p.totalAmount,
      p.paidAmount,
      p.paymentStatus
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchase_History_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Top Header */}
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Purchase History & Supplier Stock</h1>
          <p>Record supplier purchases, track historical purchase rates, and auto-increment product stock.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={exportToCSV}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => setShowNewSupplierModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <UserPlus size={16} /> Add Supplier
          </button>
          <button
            onClick={() => setShowNewPurchaseModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} /> Record New Purchase
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="table-container" style={{ marginBottom: 20 }}>
        <div className="table-toolbar">
          <div className="table-filters" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="select-filter"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date:</span>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="form-input"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem', height: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}
              />
            </div>
          </div>

          <div className="table-search">
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by Invoice # or Supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Purchase List Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading purchase history...</div>
        ) : filteredPurchases.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p>No purchase entries found. Click "Record New Purchase" to add one.</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Purchase Invoice #</th>
                    <th>Supplier Name</th>
                    <th>Invoice Date</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPurchases.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.purchaseNumber}</td>
                      <td>{p.supplierName}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(p.invoiceDate).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 700 }}>₹{p.totalAmount.toLocaleString()}</td>
                      <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>₹{p.paidAmount.toLocaleString()}</td>
                      <td>
                        <span style={{
                          fontSize: 10,
                          backgroundColor: p.paymentStatus === 'PAID' ? 'var(--secondary-light)' : p.paymentStatus === 'PARTIAL' ? 'var(--warning-light)' : 'var(--danger-light)',
                          color: p.paymentStatus === 'PAID' ? 'var(--secondary)' : p.paymentStatus === 'PARTIAL' ? 'var(--primary)' : 'var(--danger)',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontWeight: 'bold'
                        }}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleViewDetails(p.id)}
                          className="btn-icon"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {p.paymentStatus !== 'PAID' && (
                          <button
                            onClick={() => openRecordPayment(p)}
                            className="btn-icon"
                            style={{ color: 'var(--secondary)', marginLeft: 8 }}
                            title="Record Payment"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPurchases.length)} of {filteredPurchases.length} entries
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

      {/* Modal: New Supplier */}
      {showNewSupplierModal && (
        <div className="modal-overlay" onClick={() => setShowNewSupplierModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>Add New Supplier</h2>
              <button className="btn-icon" onClick={() => setShowNewSupplierModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Company / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="form-input"
                    placeholder="e.g. ABC Traders Pvt Ltd"
                  />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      value={supplierForm.contactPerson}
                      onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input
                      type="text"
                      value={supplierForm.mobile}
                      onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">GSTIN Number</label>
                    <input
                      type="text"
                      value={supplierForm.gstin}
                      onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="form-textarea"
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Purchase Voucher Entry */}
      {showNewPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowNewPurchaseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <div>
                <h2>Record Purchase Voucher</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Purchased items will automatically increment product stock. Selling price in store remains unchanged.
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowNewPurchaseModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Select Supplier *</label>
                    <select
                      required
                      value={purchaseForm.supplierId}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                      className="form-select"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Invoice Date</label>
                    <input
                      type="date"
                      value={purchaseForm.invoiceDate}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceDate: e.target.value })}
                      className="form-input"
                    />
                  </div>

                   <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label" style={{ margin: 0 }}>Paid Amount (₹)</label>
                      <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={purchaseForm.paidAmount === calculateTotal() && calculateTotal() > 0}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setPurchaseForm(prev => ({
                              ...prev,
                              paidAmount: checked ? calculateTotal() : 0
                            }));
                          }}
                        />
                        Full Payment
                      </label>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={calculateTotal()}
                      value={purchaseForm.paidAmount}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: Number(e.target.value) })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  backgroundColor: 'var(--bg-primary)',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Purchase Items</h4>
                    <button
                      type="button"
                      onClick={addItemRow}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  {/* Header Row */}
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    padding: '0 12px 6px 12px',
                    fontWeight: 'bold',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: 10
                  }}>
                    <div style={{ flex: 1 }}>Product Name</div>
                    <div style={{ width: 90 }}>Qty / Unit</div>
                    <div style={{ width: 120 }}>Purchase Rate (₹)</div>
                    <div style={{ width: 100, textAlign: 'right' }}>Total Amount</div>
                    <div style={{ width: 28 }}></div>
                  </div>

                  {purchaseForm.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'center',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      marginBottom: 8
                    }}>
                      <div style={{ flex: 1 }}>
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                          className="form-select"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.stockQty} {p.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ width: 90 }}>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ width: 120 }}>
                        <input
                          type="number"
                          min="0"
                          placeholder="Rate ₹"
                          required
                          value={item.purchaseRate}
                          onChange={(e) => handleItemChange(idx, 'purchaseRate', e.target.value)}
                          className="form-input"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        />
                      </div>

                      <div style={{ width: 100, textAlign: 'right', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        ₹{(item.quantity * item.purchaseRate).toLocaleString()}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={purchaseForm.items.length === 1}
                        className="btn-icon"
                        style={{ color: 'var(--danger)', opacity: purchaseForm.items.length === 1 ? 0.3 : 1 }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-color)',
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    <span>Grand Total:</span>
                    <span style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>₹{calculateTotal().toLocaleString()}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={purchaseForm.notes}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                    className="form-textarea"
                    placeholder="Optional notes or supplier invoice terms..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Single Purchase Invoice */}
      {selectedPurchaseDetails && (
        <div className="modal-overlay" onClick={() => setSelectedPurchaseDetails(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', uppercase: 'true', letterSpacing: 0.5 }}>Purchase Voucher</span>
                <h2>{selectedPurchaseDetails.purchaseNumber}</h2>
              </div>
              <button className="btn-icon" onClick={() => setSelectedPurchaseDetails(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                backgroundColor: 'var(--bg-primary)',
                padding: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: 20
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: 4 }}>Supplier</span>
                  <strong>{selectedPurchaseDetails.supplierName}</strong>
                  {selectedPurchaseDetails.supplierGstin && (
                    <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: 4, fontSize: '0.75rem' }}>GSTIN: {selectedPurchaseDetails.supplierGstin}</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: 4 }}>Voucher Details</span>
                  <span style={{ display: 'block', fontSize: '0.85rem' }}>Date: <strong>{new Date(selectedPurchaseDetails.invoiceDate).toLocaleDateString()}</strong></span>
                  <span style={{ display: 'block', fontSize: '0.85rem', marginTop: 4 }}>Status: <strong style={{ color: 'var(--primary)' }}>{selectedPurchaseDetails.paymentStatus}</strong></span>
                </div>
              </div>

              <table className="custom-table" style={{ marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Purchase Rate</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchaseDetails.items.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600 }}>{it.productName} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>SKU: {it.productSku}</span></td>
                      <td>{it.quantity} {it.unit}</td>
                      <td>₹{it.purchaseRate.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{it.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 16,
                borderTop: '1px solid var(--border-color)',
                fontWeight: 'bold'
              }}>
                <span>Total Invoice Amount:</span>
                <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>₹{selectedPurchaseDetails.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedPurchaseDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && selectedPurchaseForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Record Supplier Payment</h2>
              <button className="btn-icon" onClick={() => setShowPaymentModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRecordPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="modal-body">
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginBottom: 16,
                  fontSize: '0.85rem',
                  lineHeight: '1.5'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Supplier:</span>
                    <strong>{selectedPurchaseForPayment.supplierName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span>
                    <strong>{selectedPurchaseForPayment.purchaseNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Invoice Total:</span>
                    <strong>₹{selectedPurchaseForPayment.totalAmount.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Amount Paid:</span>
                    <strong style={{ color: 'var(--secondary)' }}>₹{selectedPurchaseForPayment.paidAmount.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-color)', marginTop: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Pending Payable:</span>
                    <strong style={{ color: 'var(--danger)' }}>₹{(selectedPurchaseForPayment.totalAmount - selectedPurchaseForPayment.paidAmount).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label className="form-label" style={{ margin: 0 }}>Payment Amount (₹) *</label>
                    <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={Number(paymentAmount) === (selectedPurchaseForPayment.totalAmount - selectedPurchaseForPayment.paidAmount)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPaymentAmount(checked ? (selectedPurchaseForPayment.totalAmount - selectedPurchaseForPayment.paidAmount) : 0);
                        }}
                      />
                      Pay Full Pending
                    </label>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={selectedPurchaseForPayment.totalAmount - selectedPurchaseForPayment.paidAmount}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
