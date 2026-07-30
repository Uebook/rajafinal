import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShoppingBag, Plus, Search, Eye, Filter, Calendar, 
  Truck, DollarSign, Package, CheckCircle, Clock, AlertCircle, UserPlus, X
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

  const filteredPurchases = purchases.filter(p => 
    p.purchaseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-indigo-600" />
            Purchase History & Supplier Stock
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Record supplier purchases, track historical purchase rates, and auto-increment product stock.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNewSupplierModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            <UserPlus className="w-4 h-4" /> Add Supplier
          </button>
          <button
            onClick={() => setShowNewPurchaseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Record New Purchase
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Purchase # or Supplier Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <select
          value={selectedSupplierFilter}
          onChange={(e) => setSelectedSupplierFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Date:</span>
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-700 outline-none"
          />
        </div>
      </div>

      {/* Purchase List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading purchase history...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            No purchase entries found. Click "Record New Purchase" to add one.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Purchase Invoice #</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Invoice Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-indigo-600">{p.purchaseNumber}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{p.supplierName}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(p.invoiceDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-bold text-gray-900">₹{p.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-emerald-600 font-medium">₹{p.paidAmount.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      p.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                      p.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {p.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleViewDetails(p.id)}
                      className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: New Supplier */}
      {showNewSupplierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl relative">
            <button 
              onClick={() => setShowNewSupplierModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. ABC Traders Pvt Ltd"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={supplierForm.mobile}
                    onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSupplierModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Purchase Voucher Entry */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setShowNewPurchaseModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Record Purchase Voucher</h3>
            <p className="text-xs text-gray-500 mb-6">
              Purchased items will automatically increment product stock. Selling price in store remains unchanged.
            </p>

            <form onSubmit={handleCreatePurchase} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={purchaseForm.supplierId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={purchaseForm.invoiceDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={purchaseForm.paidAmount}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, paidAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Purchase Items</h4>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product Item
                  </button>
                </div>

                {purchaseForm.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                    <div className="flex-1">
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Stock: {p.stockQty} {p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="0"
                        placeholder="Purchase Rate ₹"
                        required
                        value={item.purchaseRate}
                        onChange={(e) => handleItemChange(idx, 'purchaseRate', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs outline-none"
                      />
                    </div>

                    <div className="w-28 text-right font-bold text-xs text-gray-900">
                      ₹{(item.quantity * item.purchaseRate).toLocaleString()}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      disabled={purchaseForm.items.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-3 border-t border-gray-200 font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="text-indigo-600 text-base">₹{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs outline-none"
                  placeholder="Optional notes or supplier invoice terms..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl relative">
            <button 
              onClick={() => setSelectedPurchaseDetails(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Purchase Voucher</span>
                <h3 className="text-xl font-bold text-gray-900">{selectedPurchaseDetails.purchaseNumber}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500 block">Date</span>
                <span className="text-sm font-semibold">{new Date(selectedPurchaseDetails.invoiceDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs mb-4 bg-gray-50 p-3 rounded-xl border">
              <div>
                <span className="text-gray-500 block">Supplier</span>
                <strong className="text-gray-900 text-sm">{selectedPurchaseDetails.supplierName}</strong>
                {selectedPurchaseDetails.supplierGstin && (
                  <span className="block text-gray-500 mt-0.5">GSTIN: {selectedPurchaseDetails.supplierGstin}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-gray-500 block">Payment Status</span>
                <span className="font-bold text-sm text-indigo-600">{selectedPurchaseDetails.paymentStatus}</span>
              </div>
            </div>

            <table className="w-full text-left border-collapse text-xs mb-4">
              <thead>
                <tr className="bg-gray-100 text-gray-600 font-semibold">
                  <th className="p-2">Item</th>
                  <th className="p-2">Quantity</th>
                  <th className="p-2">Purchase Rate</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedPurchaseDetails.items.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2 font-medium">{it.productName} ({it.productSku})</td>
                    <td className="p-2">{it.quantity} {it.unit}</td>
                    <td className="p-2">₹{it.purchaseRate}</td>
                    <td className="p-2 text-right font-bold">₹{it.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center border-t pt-4 font-bold text-sm">
              <span>Total Invoice Amount:</span>
              <span className="text-indigo-600 text-base">₹{selectedPurchaseDetails.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;
