import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import defaultBgImg from './assets/city_skyline_golden.jpg';
import mbMitraLogo from './assets/mb_mitra_circle_logo.png';

const Login = () => {
  const navigate = useNavigate();
  const [userId, setUserId]           = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep]       = useState(1);
  const [mobile, setMobile]           = useState('');
  const [otp, setOtp]                 = useState('');
  const [role, setRole]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [signUpData, setSignUpData]   = useState({
    userId: '', mobile: '', password: '', confirmPassword: ''
  });

  const [activeSlide, setActiveSlide] = useState(0);
  const [updatesList, setUpdatesList] = useState([]);

  // Fetch dynamic updates images uploaded by Admin
  useEffect(() => {
    const fetchUpdatesImages = async () => {
      try {
        const newsRes = await fetch('REACT_APP_API_URL/api/news-images')
          .then(r => r.ok ? r.json() : [])
          .catch(() => []);

        let items = [];

        if (Array.isArray(newsRes)) {
          newsRes.forEach((item, idx) => {
            const rawImg = item.img || item.image;
            if (rawImg) {
              const imgUrl = rawImg.startsWith('http') ? rawImg : `REACT_APP_API_URL${rawImg}`;
              items.push({
                id: item._id || `news-${idx}`,
                image: imgUrl,
                tag: 'DAILY UPDATES'
              });
            }
          });
        }

        setUpdatesList(items);
      } catch (err) {
        console.error('Error fetching news images:', err);
      }
    };

    fetchUpdatesImages();
  }, []);

  // Lock document scroll on login page to fit 100% inside viewport
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  // Auto cycle images if multiple images uploaded by admin
  const hasAdminImages = updatesList.length > 0;
  useEffect(() => {
    if (updatesList.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % updatesList.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [updatesList.length]);

  const handleNextSlide = () => setActiveSlide((p) => (p + 1) % updatesList.length);
  const handlePrevSlide = () => setActiveSlide((p) => (p - 1 + updatesList.length) % updatesList.length);

  /* ── API Handlers ─────────────────────────────────────────────────── */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (userId === 'admin' || (data.user && data.user.role === 'admin')) {
          localStorage.setItem('currentUser', userId);
          navigate('/admin-login');
          return;
        }
        if (data.user?.mobile) setMobile(data.user.mobile);
        if (data.user?.role)   setRole(data.user.role);
        setAuthStep(2);
      } else {
        alert(data.message || 'Invalid User ID or Password.');
      }
    } catch { alert('Failed to connect to the server.'); }
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (mobile.length !== 10) return alert('Enter valid 10-digit mobile number');
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) { setAuthStep(3); alert(data.message); }
      else alert(data.message || 'Failed to send OTP');
    } catch { alert('Error connecting to server.'); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return alert('Enter valid 6-digit OTP');
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('currentUser', userId);
        navigate(role === 'admin' || userId === 'admin' ? '/admin-login' : '/dashboard');
      } else alert(data.message || 'Invalid OTP');
    } catch { alert('Error verifying OTP.'); }
  };

  const handleForgotPasswordClick = () => { setMobile(''); setAuthStep(4); };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) return alert('Enter valid 10-digit mobile number');
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (res.ok) { setAuthStep(5); alert(data.message); }
      else alert(data.message || 'Failed to send OTP');
    } catch { alert('Error connecting to server.'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6)        return alert('Enter valid 6-digit OTP');
    if (newPassword.length < 6)  return alert('Password must be at least 6 characters');
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Password Reset Successfully! You can now login.');
        setAuthStep(1); setPassword(''); setOtp('');
      } else alert(data.message || 'Failed to reset password');
    } catch { alert('Error resetting password.'); }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    if (signUpData.password !== signUpData.confirmPassword)
      return alert('Passwords do not match!');
    if (signUpData.password.length < 6)
      return alert('Password must be at least 6 characters.');
    try {
      const res  = await fetch('REACT_APP_API_URL/api/users/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:   signUpData.userId,
          mobile:   signUpData.mobile,
          password: signUpData.password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Account Activated Successfully! You can now login.');
        setAuthStep(1); setUserId(signUpData.userId); setPassword('');
      } else alert(data.message || 'Failed to set password.');
    } catch { alert('Error connecting to server.'); }
  };

  const currentItem = hasAdminImages ? updatesList[activeSlide % updatesList.length] : null;
  const currentImage = currentItem ? currentItem.image : defaultBgImg;

  return (
    <div className="login-page-wrapper">

      {/* ── DYNAMIC BLUR BACKGROUND (SHOWS SKYLINE UNTIL ADMIN UPLOADS IMAGE) ── */}
      <div 
        className="bg-blur-photo-layer" 
        style={{ backgroundImage: `url("${currentImage}")` }}
      />
      <div className="bg-dark-overlay" />

      {/* ── MAIN GLASS CONTAINER CARD ─────────────────────────────────── */}
      <div className="login-main-container">

        {/* ════ LEFT BRAND PANEL ════ */}
        <div className="left-brand-panel">
          
          {/* Header Logo (matching reference image) */}
          <div className="brand-logo-header">
            <div className="brand-logo-text-group">
              <div 
                className="brand-title-main"
                onDoubleClick={() => navigate('/admin-login')}
                title="Double click for Admin Panel"
              >
                <span className="brand-orange">MB</span> <span className="brand-white">MITRA</span>
              </div>
              <div className="brand-tagline">Empowering Banking Services</div>
            </div>
          </div>

          {/* FEATURED PROMO BOX (BLANK UNTIL ADMIN UPLOADS IMAGE) */}
          <div 
            className={`featured-banner-box${hasAdminImages ? ' has-image' : ' blank-box'}`}
            style={hasAdminImages ? { backgroundImage: `url("${currentImage}")` } : {}}
          >
            <div className="banner-mesh-grid" />

            {hasAdminImages ? (
              <>
                <div className="banner-content-overlay">
                  <div className="updates-tag-pill">
                    <span className="updates-orange-dot">•</span> {currentItem.tag || 'DAILY UPDATES'}
                  </div>
                </div>

                {updatesList.length > 1 && (
                  <div className="banner-controls-row">
                    <button className="slide-arrow-btn" onClick={handlePrevSlide} aria-label="Previous update">‹</button>
                    <div className="slide-dots-group">
                      {updatesList.map((_, idx) => (
                        <span 
                          key={idx} 
                          className={`slide-dot${(activeSlide % updatesList.length) === idx ? ' active' : ''}`}
                          onClick={() => setActiveSlide(idx)}
                        />
                      ))}
                    </div>
                    <button className="slide-arrow-btn" onClick={handleNextSlide} aria-label="Next update">›</button>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* 3 Icon Feature Cards Grid (matching reference image) */}
          <div className="feature-grid-3">
            
            {/* Box 1: Money Transfer */}
            <div className="feature-card-box">
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="3"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <path d="M7 15h.01M11 15h2"/>
                </svg>
              </div>
              <div className="feature-box-info">
                <div className="feature-box-title">Money Transfer</div>
                <div className="feature-box-sub">Send &amp; Receive Funds</div>
              </div>
            </div>

            {/* Box 2: Recharge & Bill Pay */}
            <div className="feature-card-box">
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3"/>
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3"/>
                  <path d="M9 7h6M9 11h6"/>
                </svg>
              </div>
              <div className="feature-box-info">
                <div className="feature-box-title">Recharge &amp; Bill Pay</div>
                <div className="feature-box-sub">Mobile, DTH &amp; Utility Payments</div>
              </div>
            </div>

            {/* Box 3: Insurance & Loans */}
            <div className="feature-card-box">
              <div className="feature-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M12 8v4M12 16h.01" strokeWidth="2.5"/>
                </svg>
              </div>
              <div className="feature-box-info">
                <div className="feature-box-title">Insurance &amp; Loans</div>
                <div className="feature-box-sub">Access Financial Services</div>
              </div>
            </div>

          </div>

          {/* Bottom Highlight Information */}
          <div className="bottom-highlights-container">
            <div className="highlight-item">
              <span className="highlight-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                </svg>
              </span>
              <span className="highlight-text">24x7 Support &amp; Fast Settlements</span>
            </div>
            
            <div className="highlight-item">
              <span className="highlight-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff8c38" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <span className="highlight-text">Trusted by <strong>1 Million+</strong> Agents</span>
            </div>
          </div>

        </div>

        {/* ════ RIGHT AUTH PANEL ════ */}
        <div className="right-auth-panel">
          <div className="auth-form-wrapper">

            {/* Auth Title Header */}
            <div className="auth-header-block">
              <div className="auth-logo-center-wrapper">
                <img src={mbMitraLogo} alt="MB Mitra Logo" className="auth-center-logo" />
              </div>
              <h1 className="auth-main-title">
                {authStep === 1 ? 'Welcome Back!' :
                 authStep === 2 ? 'Two-Step Verification' :
                 authStep === 3 ? 'Verify OTP' :
                 authStep === 4 ? 'Reset Password' :
                 authStep === 5 ? 'Set New Password' : 'Create Account'}
              </h1>
              <p className="auth-sub-title">
                {authStep === 1 ? 'Sign in to your account' :
                 authStep === 2 ? 'Enter registered mobile number' :
                 authStep === 3 ? 'Enter 6-digit OTP code' :
                 authStep === 4 ? 'Enter mobile to receive OTP' :
                 authStep === 5 ? 'Set your new secure password' : 'Activate your agent account'}
              </p>
            </div>

            {/* ── STEP 1: LOGIN ── */}
            {authStep === 1 && (
              <form onSubmit={handleLoginSubmit} className="auth-input-form" autoComplete="off">
                
                {/* User ID Field */}
                <div className="input-field-group">
                  <div className="input-icon-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    placeholder="User ID"
                    autoComplete="off"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="input-field-group">
                  <div className="input-icon-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="new-password"
                    required
                  />
                  <span className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </span>
                </div>

                {/* Forgot Password Row */}
                <div className="forgot-password-row">
                  <span className="forgot-password-link" onClick={handleForgotPasswordClick}>
                    Forgot Password?
                  </span>
                </div>

                {/* Submit Login Button */}
                <button type="submit" className="blue-gradient-btn">
                  Login
                </button>

                {/* Register Link Footer */}
                <div className="register-prompt-text">
                  New to MB MITRA? <span className="register-now-link" onClick={() => setAuthStep(6)}>Register Now</span>
                </div>

              </form>
            )}

            {/* ── STEP 2: SEND OTP ── */}
            {authStep === 2 && (
              <form onSubmit={handleSendOtp} className="auth-input-form" autoComplete="off">
                <div className="input-field-group">
                  <div className="input-icon-box">📱</div>
                  <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit Mobile Number" required />
                </div>
                <button type="submit" className="blue-gradient-btn">Send OTP</button>
              </form>
            )}

            {/* ── STEP 3: VERIFY OTP ── */}
            {authStep === 3 && (
              <form onSubmit={handleVerifyOtp} className="auth-input-form" autoComplete="off">
                <div className="input-field-group">
                  <div className="input-icon-box">🔑</div>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" required />
                </div>
                <button type="submit" className="blue-gradient-btn">Verify &amp; Login</button>
              </form>
            )}

            {/* ── STEP 4: FORGOT PASSWORD ── */}
            {authStep === 4 && (
              <form onSubmit={handleSendResetOtp} className="auth-input-form" autoComplete="off">
                <div className="input-field-group">
                  <div className="input-icon-box">📱</div>
                  <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="Registered Mobile Number" required />
                </div>
                <button type="submit" className="blue-gradient-btn">Send Reset OTP</button>
                <div className="form-footer-back">
                  <span className="forgot-password-link" onClick={() => setAuthStep(1)}>Back to Login</span>
                </div>
              </form>
            )}

            {/* ── STEP 5: RESET PASSWORD ── */}
            {authStep === 5 && (
              <form onSubmit={handleResetPassword} className="auth-input-form" autoComplete="off">
                <div className="input-field-group">
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" required />
                </div>
                <div className="input-field-group">
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" required />
                </div>
                <button type="submit" className="blue-gradient-btn">Reset Password</button>
              </form>
            )}

            {/* ── STEP 6: REGISTER / ACTIVATE ACCOUNT ── */}
            {authStep === 6 && (
              <form onSubmit={handleSignUpSubmit} className="auth-input-form" autoComplete="off">
                <div className="input-field-group">
                  <input type="text" value={signUpData.userId} onChange={e => setSignUpData({...signUpData, userId: e.target.value})} placeholder="User ID" required />
                </div>
                <div className="input-field-group">
                  <input type="text" value={signUpData.mobile} onChange={e => setSignUpData({...signUpData, mobile: e.target.value})} placeholder="Mobile Number" required />
                </div>
                <div className="input-field-group">
                  <input type="password" value={signUpData.password} onChange={e => setSignUpData({...signUpData, password: e.target.value})} placeholder="Password" required />
                </div>
                <div className="input-field-group">
                  <input type="password" value={signUpData.confirmPassword} onChange={e => setSignUpData({...signUpData, confirmPassword: e.target.value})} placeholder="Confirm Password" required />
                </div>
                <button type="submit" className="blue-gradient-btn">Register Account</button>
                <div className="form-footer-back">
                  <span className="forgot-password-link" onClick={() => setAuthStep(1)}>Back to Login</span>
                </div>
              </form>
            )}

            {/* App Store & Google Play Badges Footer */}
            <div className="app-store-badges-container">
              
              {/* Google Play */}
              <a href="#playstore" className="store-badge-btn" onClick={(e) => e.preventDefault()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L15.485 12 3.61 22.186a1.455 1.455 0 0 1-.61-.318V2.132c.18-.14.4-.247.609-.318zm13.11 10.957l2.873-1.64c.79-.452.79-1.19 0-1.642l-2.873-1.64-2.193 2.193 2.193 2.229zm-13.882 10.37l12.443-7.108-2.146-2.182-10.297 9.29zm0-22.282l10.297 9.29 2.146-2.182L2.837.859z"/>
                </svg>
                <div className="store-btn-text">
                  <span className="store-small">GET IT ON</span>
                  <span className="store-bold">Google Play</span>
                </div>
              </a>

              {/* App Store */}
              <a href="#appstore" className="store-badge-btn" onClick={(e) => e.preventDefault()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.16c.63-.77 1.07-1.83.95-2.9-.92.04-2.07.62-2.73 1.39-.59.68-1.11 1.77-.97 2.83 1.04.08 2.12-.55 2.75-1.32z"/>
                </svg>
                <div className="store-btn-text">
                  <span className="store-small">Download on the</span>
                  <span className="store-bold">App Store</span>
                </div>
              </a>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default Login;
