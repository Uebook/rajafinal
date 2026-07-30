import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BookOpen,
  Warehouse, Tag, BarChart3, Shield, Settings, LogOut, Sun, Moon,
  Zap, FolderOpen, FileText, Bell, ShoppingBag, BookMarked, X
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/categories', label: 'Categories', icon: FolderOpen },
  { path: '/orders', label: 'Orders', icon: ShoppingCart },
  { path: '/purchases', label: 'Purchase History', icon: ShoppingBag },
  { path: '/tally-ledger', label: 'Tally Daybook', icon: BookMarked },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/ledger', label: 'Ledger & Credit', icon: BookOpen },
  { path: '/inventory', label: 'Inventory', icon: Warehouse },
  { path: '/schemes', label: 'Discounts', icon: Tag },
  { path: '/notifications', label: 'Notifications', icon: Bell },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/admin-users', label: 'Admin Security', icon: Shield, superAdminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen }) => {
  const { logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="brand-logo"><Zap size={20} /></div>
          <span className="brand-name">Supply Setu</span>
        </div>
        <button 
          className="sidebar-close-btn"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close Sidebar"
          style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return null;
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleDarkMode}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="theme-toggle-btn" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
