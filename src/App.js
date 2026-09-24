import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/login/Login';
import Dashboard from './pages/dashboard/Dashboard';
import AdminPanel from './pages/admin/AdminPanel';
import AdminLogin from './pages/admin/AdminLogin';
import { NotificationProvider } from './context/NotificationContext';
import './App.css';

function App() {
  return (
    <Router>
      <NotificationProvider>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ledger" element={<Dashboard />} />
            <Route path="/wallet" element={<Dashboard />} />
            <Route path="/pancard" element={<Dashboard />} />
            <Route path="/pan-card" element={<Dashboard />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-panel" element={<AdminPanel />} />
            <Route path="/admin" element={<Navigate to="/admin-login" />} />
          </Routes>
        </div>
      </NotificationProvider>
    </Router>
  );
}

export default App;
