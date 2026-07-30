import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Orders from '../pages/Orders';
import Users from '../pages/Users';
import Ledger from '../pages/Ledger';
import Inventory from '../pages/Inventory';
import Schemes from '../pages/Schemes';
import Reports from '../pages/Reports';
import AdminUsers from '../pages/AdminUsers';
import Categories from '../pages/Categories';
import Settings from '../pages/Settings';
import Invoices from '../pages/Invoices';
import Notifications from '../pages/Notifications';
import Purchases from '../pages/Purchases';
import TallyLedger from '../pages/TallyLedger';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="users" element={<Users />} />
        <Route path="ledger" element={<Ledger />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="tally-ledger" element={<TallyLedger />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="schemes" element={<Schemes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="admin-users" element={<AdminUsers />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
