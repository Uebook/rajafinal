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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Tally Double-Entry Daybook & Accounting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time voucher balances for Purchase Payables (Suppliers) and Sales Receivables (Retailers).
          </p>
        </div>
        <button
          onClick={fetchDaybook}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition self-start"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Daybook
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Debit Vouchers</span>
            <span className="text-2xl font-extrabold text-rose-600 mt-1 block">₹{totals.debit.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Credit Vouchers</span>
            <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">₹{totals.credit.toLocaleString()}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Net Voucher Difference</span>
            <span className={`text-2xl font-extrabold mt-1 block ${totals.debit >= totals.credit ? 'text-indigo-600' : 'text-amber-600'}`}>
              ₹{Math.abs(totals.debit - totals.credit).toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase">Voucher Type:</span>
          {['ALL', 'PURCHASE', 'SALES', 'PAYMENT', 'RECEIPT'].map((type) => (
            <button
              key={type}
              onClick={() => setVoucherTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                voucherTypeFilter === type
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none"
          />
        </div>
      </div>

      {/* Tally Vouchers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading Tally Daybook...</div>
        ) : filteredVouchers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No accounting vouchers found for the selected criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Voucher Type</th>
                <th className="py-3 px-4">Debit Account</th>
                <th className="py-3 px-4">Credit Account</th>
                <th className="py-3 px-4">Description / Particulars</th>
                <th className="py-3 px-4 text-right">Debit Amount</th>
                <th className="py-3 px-4 text-right">Credit Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredVouchers.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50/80 transition">
                  <td className="py-3 px-4 text-xs text-gray-500">
                    {new Date(v.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      v.voucherType === 'PURCHASE' ? 'bg-amber-100 text-amber-800' :
                      v.voucherType === 'SALES' ? 'bg-indigo-100 text-indigo-800' :
                      v.voucherType === 'PAYMENT' ? 'bg-rose-100 text-rose-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {v.voucherType || 'GENERAL'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{v.debitAccount || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{v.creditAccount || '-'}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{v.description}</td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600">
                    {v.entryType === 'DEBIT' ? `₹${v.amount.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">
                    {v.entryType === 'CREDIT' ? `₹${v.amount.toLocaleString()}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TallyLedger;
