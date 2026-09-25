import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './AdminLogin.css';
import logoImg from '../../assets/logo.png';
import cityBg from '../../assets/city_bg.png';
import { API_URL } from '../../utils/apiClient';

const ADMIN_EMAIL = 'mbtravels08@gmail.com';
const ADMIN_PASSWORD = '123456';

const AdminLogin = () => {
  const navigate = useNavigate();

  // Role toggle state ('admin' or 'staff')
  const [loginRole, setLoginRole] = useState('admin');

  // Admin form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Staff form states
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Direct Admin Login Handler
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password;

    if (!cleanEmail) {
      return Swal.fire({ icon: 'warning', text: 'Please enter your Admin Email.', confirmButtonColor: '#ea580c' });
    }
    if (!cleanPass) {
      return Swal.fire({ icon: 'warning', text: 'Please enter your Admin Password.', confirmButtonColor: '#ea580c' });
    }

    // STRICT VALIDATION: Only mbtravels08@gmail.com and password 123456
    if (cleanEmail !== ADMIN_EMAIL || cleanPass !== ADMIN_PASSWORD) {
      return Swal.fire({
        icon: 'error',
        title: 'Authentication Failed',
        text: 'Invalid Admin Email or Password. Please try again.',
        confirmButtonColor: '#ea580c'
      });
    }

    setIsLoading(true);
    // Tab-isolated session
    sessionStorage.setItem('adminAuth', 'true');
    sessionStorage.setItem('currentUser', 'admin');
    sessionStorage.setItem('adminEmail', cleanEmail);
    sessionStorage.setItem('userRole', 'admin');
    sessionStorage.removeItem('staffPermissions');
    sessionStorage.removeItem('staffName');

    // Persistent storage
    localStorage.setItem('adminAuth', 'true');
    localStorage.setItem('currentUser', 'admin');
    localStorage.setItem('adminEmail', cleanEmail);
    localStorage.setItem('userRole', 'admin');
    localStorage.removeItem('staffPermissions');
    localStorage.removeItem('staffName');

    Swal.fire({
      icon: 'success',
      title: 'Admin Access Granted',
      text: 'Welcome to MB MITRA Administrative Panel.',
      timer: 1600,
      showConfirmButton: false
    });

    setTimeout(() => {
      navigate('/admin-panel');
    }, 1000);
  };

  // Staff Login Handler
  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    const cleanUser = staffUsername.trim().toLowerCase();
    const cleanPass = staffPassword;

    if (!cleanUser) {
      return Swal.fire({ icon: 'warning', text: 'Please enter Staff Username/ID.', confirmButtonColor: '#ea580c' });
    }
    if (!cleanPass) {
      return Swal.fire({ icon: 'warning', text: 'Please enter Staff Password.', confirmButtonColor: '#ea580c' });
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/staff/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // Tab-isolated session
        sessionStorage.setItem('adminAuth', 'true');
        sessionStorage.setItem('currentUser', data.staff.username);
        sessionStorage.setItem('staffName', data.staff.name);
        sessionStorage.setItem('userRole', 'staff');
        sessionStorage.setItem('staffPermissions', JSON.stringify(data.staff.permissions || []));

        // Persistent storage
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('currentUser', data.staff.username);
        localStorage.setItem('staffName', data.staff.name);
        localStorage.setItem('userRole', 'staff');
        localStorage.setItem('staffPermissions', JSON.stringify(data.staff.permissions || []));

        Swal.fire({
          icon: 'success',
          title: 'Staff Access Granted',
          text: `Welcome back, ${data.staff.name}!`,
          timer: 1600,
          showConfirmButton: false
        });

        setTimeout(() => {
          navigate('/admin-panel');
        }, 1000);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Authentication Failed',
          text: data.message || 'Invalid Staff Credentials',
          confirmButtonColor: '#ea580c'
        });
      }
    } catch (err) {
      console.error('Staff login error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Server Error',
        text: 'Could not connect to authentication server.',
        confirmButtonColor: '#ea580c'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper" style={{ backgroundImage: `url(${cityBg})` }}>
      <div className="admin-login-overlay"></div>

      {/* Decorative Glow Orbs */}
      <div className="admin-orb admin-orb-1"></div>
      <div className="admin-orb admin-orb-2"></div>

      <div className="admin-login-card">
        {/* Header Branding */}
        <div className="admin-login-header">
          <div className="admin-badge-icon">
            <img src={logoImg} alt="MB MITRA Admin" className="admin-logo-img" />
          </div>
          <h1 className="admin-brand-title">
            <span className="brand-orange">MB</span> <span className="brand-white">MITRA</span>
          </h1>
          <span className="admin-security-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {loginRole === 'admin' ? 'ADMIN SECURITY PORTAL' : 'STAFF ACCESS PORTAL'}
          </span>
          <p className="admin-login-subtitle">
            {loginRole === 'admin'
              ? 'Enter administrative email & password credentials'
              : 'Enter staff member credentials to access authorized modules'}
          </p>
        </div>

        {/* Role Toggle Switcher */}
        <div className="admin-role-toggle-row">
          <button
            type="button"
            className={`role-tab-btn ${loginRole === 'admin' ? 'active' : ''}`}
            onClick={() => setLoginRole('admin')}
          >
            🛡️ Admin Login
          </button>
          <button
            type="button"
            className={`role-tab-btn ${loginRole === 'staff' ? 'active' : ''}`}
            onClick={() => setLoginRole('staff')}
          >
            👔 Staff Login
          </button>
        </div>

        {/* ADMIN LOGIN FORM */}
        {loginRole === 'admin' ? (
          <form className="admin-form-step" onSubmit={handleAdminLogin} autoComplete="off">
            {/* Admin Email Field */}
            <div className="admin-input-group">
              <label htmlFor="admin-email">Admin Email Address</label>
              <div className="admin-input-box">
                <span className="admin-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="admin-email"
                  type="email"
                  placeholder="Enter Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  required
                />
              </div>
            </div>

            {/* Admin Password Field */}
            <div className="admin-input-group">
              <label htmlFor="admin-password">Admin Password</label>
              <div className="admin-input-box">
                <span className="admin-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Admin Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-primary-btn" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-spinner"></span>
              ) : (
                <>
                  <span>Login to Admin Panel</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          /* STAFF LOGIN FORM */
          <form className="admin-form-step" onSubmit={handleStaffLogin} autoComplete="off">
            {/* Staff Username Field */}
            <div className="admin-input-group">
              <label htmlFor="staff-username">Staff Username / ID</label>
              <div className="admin-input-box">
                <span className="admin-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="staff-username"
                  type="text"
                  placeholder="Enter Staff Username / ID"
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  required
                />
              </div>
            </div>

            {/* Staff Password Field */}
            <div className="admin-input-group">
              <label htmlFor="staff-password">Staff Password</label>
              <div className="admin-input-box">
                <span className="admin-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Staff Password"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="admin-primary-btn staff-btn-color" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-spinner"></span>
              ) : (
                <>
                  <span>Login as Staff</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Back Link */}
        <div className="admin-login-footer">
          <button
            type="button"
            className="back-to-portal-link"
            onClick={() => navigate('/login')}
          >
            ← Return to MB MITRA Retailer Portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
