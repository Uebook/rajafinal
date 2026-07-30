import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Bell } from 'lucide-react';

const Header = ({ search, setSearch, setSidebarOpen }) => {
  const { user } = useAuth();
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'AD';

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          type="button"
          className="menu-toggle-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Toggle Sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
        <div className="search-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search anything..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="header-actions">
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} color="var(--text-secondary)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="admin-avatar">{initials}</div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{user?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{user?.role || 'admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
