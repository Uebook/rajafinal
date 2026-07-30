import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Settings2, Package, ShoppingCart, Bell, ChevronRight } from 'lucide-react';

// ── Tab: Audit Log ─────────────────────────────────────────────
const AuditLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const params = { page, page_size: 50 };
        if (filter) params.action = filter;
        if (entityFilter) params.entity_type = entityFilter;
        const { data } = await api.get('/admin/audit-log', { params });
        setLogs(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    load();
  }, [filter, entityFilter, page]);

  const roleColor = { admin: '#3b82f6', super_admin: '#8b5cf6', vendor: '#10b981', retailer: '#f59e0b' };
  const entityTypes = ['order', 'product', 'user', 'vendor', 'retailer', 'category', 'scheme'];

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="table-filters" style={{ flexWrap: 'wrap', gap: 10, flex: 1 }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Filter by action..."
              className="form-input"
              style={{ paddingLeft: '2rem', marginBottom: 0, fontSize: '0.85rem', height: 36 }}
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <select
            className="select-filter"
            style={{ marginBottom: 0 }}
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            {entityTypes.map(e => (
              <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{logs.length} entries</span>
      </div>

      <table className="custom-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Entity</th>
            <th>Role</th>
            <th>Changes</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id}>
              <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.action}</td>
              <td>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 8,
                  background: 'var(--bg-secondary)', fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--text-secondary)', border: '1px solid var(--border-color)'
                }}>
                  {l.entity_type}
                </span>
              </td>
              <td>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                  background: `${roleColor[l.role] || '#6b7280'}20`,
                  color: roleColor[l.role] || '#6b7280',
                  border: `1px solid ${roleColor[l.role] || '#6b7280'}40`
                }}>
                  {l.role}
                </span>
              </td>
              <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {l.description || (l.diff_json ? JSON.stringify(l.diff_json).slice(0, 80) : '—')}
              </td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {new Date(l.created_at).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No audit entries found</td></tr>
          )}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
        <span style={{ padding: '6px 14px', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>Page {page}</span>
        <button className="btn btn-secondary btn-sm" disabled={logs.length < 50} onClick={() => setPage(p => p + 1)}>Next →</button>
      </div>
    </div>
  );
};

// ── Tab: Platform Settings / MOV ───────────────────────────────
const PlatformSettingsTab = () => {
  const [settings, setSettings] = useState({
    global_mov: '',
    vendor_mov: '',
    retailer_mov: '',
    platform_name: 'Supply Setu',
    support_email: '',
    support_phone: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load from localStorage as a simple config store (no backend needed yet)
  useEffect(() => {
    const stored = localStorage.getItem('platform_settings');
    if (stored) {
      try { setSettings(JSON.parse(stored)); } catch (e) { /* ignore */ }
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('platform_settings', JSON.stringify(settings));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 600);
  };

  return (
    <form onSubmit={handleSave} style={{ maxWidth: 680 }}>
      {/* MOV Section */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Minimum Order Value (MOV)
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Set the minimum cart value required to place an order (in INR).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[
            { key: 'global_mov', label: 'Global MOV', icon: ShoppingCart, desc: 'Applies to all users' },
            { key: 'vendor_mov', label: 'Vendor MOV', icon: Package, desc: 'Overrides global for vendors' },
            { key: 'retailer_mov', label: 'Retailer MOV', icon: Bell, desc: 'Overrides global for retailers' },
          ].map(field => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={13} /> {field.label}
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  step="1"
                  placeholder="e.g. 500"
                  value={settings[field.key]}
                  onChange={e => setSettings({ ...settings, [field.key]: e.target.value })}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{field.desc}</small>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-color)', margin: '0 0 24px' }} />

      {/* Platform Info Section */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Platform Information
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Configure branding and support details.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Platform Name</label>
            <input
              type="text"
              className="form-input"
              value={settings.platform_name}
              onChange={e => setSettings({ ...settings, platform_name: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Support Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="support@supplysetu.in"
              value={settings.support_email}
              onChange={e => setSettings({ ...settings, support_email: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Support Phone</label>
            <input
              type="text"
              className="form-input"
              placeholder="+91 XXXXX XXXXX"
              value={settings.support_phone}
              onChange={e => setSettings({ ...settings, support_phone: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 140 }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
        {saved && <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>Changes saved successfully.</span>}
      </div>
    </form>
  );
};

// ── Main Settings Page ──────────────────────────────────────────
const Settings = () => {
  const [activeTab, setActiveTab] = useState('audit');

  const tabs = [
    { id: 'audit', label: 'Audit Log', icon: Search },
    { id: 'platform', label: 'Platform Settings', icon: Settings2 },
  ];

  return (
    <div>
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Settings</h1>
          <p>Audit log, MOV configuration, and platform settings</p>
        </div>
      </div>

      {/* Tab Row */}
      <div className="tab-row" style={{ marginBottom: 0 }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="table-container" style={{ borderRadius: '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)' }}>
        {activeTab === 'audit' && <AuditLogTab />}
        {activeTab === 'platform' && <PlatformSettingsTab />}
      </div>
    </div>
  );
};

export default Settings;
