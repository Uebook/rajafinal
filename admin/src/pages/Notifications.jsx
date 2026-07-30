import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, Send, Users, Package, User, Clock, CheckCircle, AlertCircle, X, Plus } from 'lucide-react';

// ── Compose Notification Modal ──────────────────────────────────
const ComposeModal = ({ onClose, onSend }) => {
  const [form, setForm] = useState({ title: '', body: '', target: 'all' });
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert('Please enter both title and message.');
      return;
    }
    setSending(true);
    try {
      await onSend(form);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending notification');
    } finally {
      setSending(false);
    }
  };

  const targetOptions = [
    { value: 'all', label: 'All Users', icon: Users, desc: 'Vendors + Retailers' },
    { value: 'vendors', label: 'Vendors Only', icon: Package, desc: 'All wholesalers' },
    { value: 'retailers', label: 'Retailers Only', icon: User, desc: 'All buyers' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} /> Compose Notification
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.4rem' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSend}>
          <div className="modal-body">
            {/* Target Audience */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: 10, display: 'block' }}>
                Target Audience
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {targetOptions.map(opt => {
                  const Icon = opt.icon;
                  const isSelected = form.target === opt.value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => setForm({ ...form, target: opt.value })}
                      style={{
                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-light)' : 'var(--bg-secondary)',
                        transition: 'all 0.15s ease',
                        textAlign: 'center',
                      }}
                    >
                      <Icon size={20} style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)', display: 'block', margin: '0 auto 6px' }} />
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Notification Title *</label>
              <input
                type="text"
                className="form-input"
                required
                maxLength={80}
                placeholder="e.g. New Products Available!"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {form.title.length}/80 characters
              </small>
            </div>

            {/* Body */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>Message Body *</label>
              <textarea
                className="form-input"
                required
                maxLength={256}
                rows={4}
                placeholder="Enter the notification message..."
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                style={{ resize: 'vertical', minHeight: 90 }}
              />
              <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                {form.body.length}/256 characters
              </small>
            </div>

            {/* Preview */}
            {(form.title || form.body) && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginTop: 4 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Preview
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bell size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{form.title || 'Notification Title'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{form.body || 'Notification message will appear here.'}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>now • Supply Setu</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Send size={14} /> {sending ? 'Sending...' : `Send to ${form.target === 'all' ? 'All' : form.target === 'vendors' ? 'Vendors' : 'Retailers'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Notifications Page ─────────────────────────────────────
const Notifications = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0 });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/notifications?page_size=50');
      setLogs(data?.notifications || data || []);
      if (data?.stats) setStats(data.stats);
      else {
        const total = (data?.notifications || data || []).length;
        const sent = (data?.notifications || data || []).filter(n => n.status === 'sent').length;
        setStats({ total, sent, failed: total - sent });
      }
    } catch (err) {
      // Endpoint may not exist yet — show empty state gracefully
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async (form) => {
    await api.post('/admin/notifications/send', {
      title: form.title,
      body: form.body,
      target_audience: form.target,
    });
    load();
  };

  const targetIcon = (t) => {
    if (t === 'vendors') return <Package size={13} />;
    if (t === 'retailers') return <User size={13} />;
    return <Users size={13} />;
  };

  const statusIcon = (s) => {
    if (s === 'sent') return <CheckCircle size={14} color="#10b981" />;
    if (s === 'failed') return <AlertCircle size={14} color="#ef4444" />;
    return <Clock size={14} color="#f59e0b" />;
  };

  return (
    <div>
      {/* Header */}
      <div className="view-header">
        <div className="view-title-wrap">
          <h1>Notifications</h1>
          <p>Compose and send push notifications to users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Compose Notification
        </button>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        {[
          { title: 'Total Sent', value: stats.total, icon: Bell, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { title: 'Delivered', value: stats.sent, icon: CheckCircle, color: '#10b981', bg: '#d1fae5' },
          { title: 'Failed', value: stats.failed, icon: AlertCircle, color: '#ef4444', bg: '#fee2e2' },
        ].map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="kpi-card" style={{ '--card-color': c.color, '--card-bg-light': c.bg }}>
              <div className="kpi-info">
                <span className="kpi-title">{c.title}</span>
                <span className="kpi-value">{c.value}</span>
              </div>
              <div className="kpi-icon-wrap" style={{ background: c.bg, color: c.color }}>
                <Icon size={22} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery Log */}
      <div className="table-container">
        <div className="table-toolbar">
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Delivery Log</span>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: '3rem 0' }}><div className="spinner" /></div>
        ) : logs.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 0' }}>
            <Bell size={44} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <h3>No notifications sent yet</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Click "Compose Notification" to send your first push notification.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCompose(true)} style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Compose Now
            </button>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Target</th>
                <th>Status</th>
                <th>Sent By</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{ fontWeight: 700, maxWidth: 180 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.title}</div>
                  </td>
                  <td style={{ maxWidth: 260, color: 'var(--text-muted)', fontSize: '0.83rem' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.body || log.message}</div>
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700,
                      background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      {targetIcon(log.target_audience || log.target)}
                      {(log.target_audience || log.target || 'all').charAt(0).toUpperCase() + (log.target_audience || log.target || 'all').slice(1)}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', fontWeight: 600 }}>
                      {statusIcon(log.status)}
                      {(log.status || 'queued').charAt(0).toUpperCase() + (log.status || 'queued').slice(1)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{log.sent_by || log.actor || 'Admin'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at || log.sent_at).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
};

export default Notifications;
