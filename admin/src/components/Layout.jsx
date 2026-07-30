import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('amb_dark') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('amb_dark', next);
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <div className={`admin-shell ${sidebarOpen ? 'sidebar-active' : ''}`}>
      <Sidebar darkMode={darkMode} toggleDarkMode={toggleDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      <div className="main-workspace">
        <Header search={search} setSearch={setSearch} setSidebarOpen={setSidebarOpen} />
        <Outlet context={{ search }} />
      </div>
    </div>
  );
};

export default Layout;
