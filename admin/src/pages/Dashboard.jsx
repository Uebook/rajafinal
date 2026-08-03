import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  IndianRupee, ShoppingCart, Users, Package, Clock, TrendingUp,
  AlertCircle, ArrowUpRight, RefreshCw, Calendar
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        padding: '10px 14px', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)'
      }}>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: '4px 0 0', fontWeight: 700, fontSize: '0.85rem', color: p.color }}>
            {p.name === 'revenue' ? `₹${p.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : `${p.value} orders`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [kpis, setKpis] = useState({ total_orders: 0, total_revenue: 0, active_vendors: 0, active_retailers: 0, total_liability: 0, total_debt: 0, total_stock_value: 0, total_stock_qty: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [salesReport, setSalesReport] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Date filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = async () => {
    try {
      const [dashRes, ordersRes, logsRes, salesRes] = await Promise.all([
        api.get('/admin/reports/dashboard', { params: { start_date: startDate || undefined, end_date: endDate || undefined } }),
        api.get('/orders?page_size=8'),
        api.get('/admin/audit-log?page_size=6'),
        api.get('/admin/reports/sales?range=weekly'),
      ]);
      setKpis(dashRes.data);
      setRecentOrders(ordersRes.data);
      setAuditLogs(logsRes.data);
      setSalesReport(salesRes.data);

      if (salesRes.data?.top_products) {
        setTopProducts(salesRes.data.top_products.slice(0, 5));
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  const formatAmount = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatAmountShort = (paise) => {
    const rupees = (paise || 0) / 100;
    if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
    if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
    return `₹${rupees.toFixed(0)}`;
  };

  const statusColor = {
    pending: '#f59e0b', confirmed: '#3b82f6', dispatched: '#8b5cf6',
    delivered: '#10b981', cancelled: '#ef4444', returned: '#6b7280'
  };

  const cards = [
    {
      title: 'Total Orders', value: kpis.total_orders, icon: ShoppingCart,
      color: 'var(--primary)', bg: 'var(--primary-light)',
      sub: `${salesReport?.total_orders || 0} this week`
    },
    {
      title: 'Total Revenue', value: formatAmountShort(kpis.total_revenue), icon: IndianRupee,
      color: '#10b981', bg: '#d1fae5',
      sub: formatAmountShort(salesReport?.total_revenue) + ' this week'
    },
    {
      title: 'Active Vendors', value: kpis.active_vendors, icon: Package,
      color: '#3b82f6', bg: '#dbeafe',
      sub: 'Platform wholesalers'
    },
    {
      title: 'Active Retailers', value: kpis.active_retailers, icon: Users,
      color: '#8b5cf6', bg: '#ede9fe',
      sub: 'Registered buyers'
    },
    {
      title: 'Total Liability', value: formatAmountShort(kpis.total_liability), icon: IndianRupee,
      color: 'var(--danger)', bg: 'var(--danger-light)',
      sub: 'Outstanding payables'
    },
    {
      title: 'Total Debt', value: formatAmountShort(kpis.total_debt), icon: IndianRupee,
      color: 'var(--warning)', bg: 'var(--warning-light)',
      sub: 'Outstanding receivables'
    },
    {
      title: 'Total Stock', value: formatAmountShort(kpis.total_stock_value), icon: Package,
      color: '#06b6d4', bg: '#ecfeff',
      sub: `${kpis.total_stock_qty || 0} items on hand`
    },
  ];

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
    </div>
  );

  const trendData = salesReport?.trend_data || [];

  return (
    <div>
      {/* Header */}
      <div className="view-header" style={{ marginBottom: 16 }}>
        <div className="view-title-wrap">
          <h1>Dashboard</h1>
          <p>Platform overview & key metrics — Last updated: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { setLoading(true); load(); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Date Selector Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filter Period:</span>
          {[
            { label: 'All Time', start: '', end: '' },
            { label: 'Last 7 Days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
            { label: 'This Month', start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
            { label: 'This Year', start: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
          ].map(preset => {
            const isSelected = startDate === preset.start && endDate === preset.end;
            return (
              <button
                key={preset.label}
                type="button"
                className="btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-primary)',
                  color: isSelected ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  height: 'auto',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setStartDate(preset.start);
                  setEndDate(preset.end);
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              className="form-input"
              style={{ marginBottom: 0, padding: '4px 8px', fontSize: '0.8rem', height: 30, width: 125 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="form-input"
              style={{ marginBottom: 0, padding: '4px 8px', fontSize: '0.8rem', height: 30, width: 125 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 8px', height: 30, fontSize: '0.75rem', cursor: 'pointer' }}
              onClick={() => { setStartDate(''); setEndDate(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="kpi-card" style={{ '--card-color': c.color, '--card-bg-light': c.bg }}>
              <div className="kpi-info">
                <span className="kpi-title">{c.title}</span>
                <span className="kpi-value">{c.value}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</span>
              </div>
              <div className="kpi-icon-wrap" style={{ background: c.bg, color: c.color }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {/* Revenue Trend Chart */}
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">Revenue Trend (Last 7 Days)</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={13} /> Weekly view
            </span>
          </div>
          <div style={{ width: '100%', height: 260, marginTop: 12 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dashOrdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#dashRevGrad)" />
                  <Area yAxisId="right" type="monotone" dataKey="orders" name="orders" stroke="var(--primary)" strokeWidth={2.5} fill="url(#dashOrdGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%' }}>
                <TrendingUp size={32} style={{ color: 'var(--text-muted)' }} />
                <p>No trend data available yet</p>
              </div>
            )}
          </div>
          {/* Chart Legend */}
          <div style={{ display: 'flex', gap: 20, marginTop: 8, paddingLeft: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 12, height: 3, background: '#10b981', borderRadius: 2, display: 'inline-block' }} /> Revenue
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ width: 12, height: 3, background: 'var(--primary)', borderRadius: 2, display: 'inline-block' }} /> Orders
            </span>
          </div>
        </div>

        {/* Activity Log */}
        <div className="dashboard-card">
          <div className="card-header">
            <span className="card-title">Activity Log</span>
            <a href="/settings" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="activity-list">
            {auditLogs.length === 0 ? (
              <div className="empty-state"><Clock size={32} /><p>No recent activity</p></div>
            ) : (
              auditLogs.map((log, i) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-dot" style={{ background: 'var(--primary)' }} />
                  <div>
                    <div className="activity-text"><strong>{log.action}</strong> — {log.entity_type}</div>
                    <div className="activity-time">{new Date(log.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dashboard-grid">
        {/* Recent Orders */}
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">Recent Orders</span>
            <a href="/orders" style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
              Manage all <ArrowUpRight size={12} />
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="empty-state"><ShoppingCart size={40} /><h3>No orders yet</h3></div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Buyer</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{o.order_number}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {o.buyer_name || o.buyer_mobile || '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 12,
                          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                          background: `${statusColor[o.status] || '#6b7280'}20`,
                          color: statusColor[o.status] || '#6b7280',
                          border: `1px solid ${statusColor[o.status] || '#6b7280'}40`
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td>{o.items?.length || 0}</td>
                    <td style={{ fontWeight: 700 }}>{formatAmount(o.grand_total)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Stats */}
        <div className="dashboard-card">
          <div className="card-header"><span className="card-title">Order Status Breakdown</span></div>
          <div style={{ width: '100%', height: 220, marginTop: 12 }}>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.slice(-7)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.4} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="orders" name="orders" radius={[4, 4, 0, 0]}>
                    {trendData.slice(-7).map((_, i) => (
                      <Cell key={i} fill={`hsl(${220 + i * 8}, 70%, ${55 + i * 3}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available</p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Avg Order Value', value: kpis.total_orders > 0 ? formatAmountShort(kpis.total_revenue / kpis.total_orders) : '₹0', color: '#10b981' },
              { label: 'This Week Revenue', value: formatAmountShort(salesReport?.total_revenue), color: 'var(--primary)' },
              { label: 'Pending / Unconfirmed', value: salesReport?.pending_orders || 0, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.label}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
