import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import logoImg from './assets/logo.png';

const Dashboard = () => {
  const navigate = useNavigate();
  const [actionCardsData, setActionCardsData] = useState([]);
  const [topTabsData, setTopTabsData] = useState([]);
  const [sidebarMenuData, setSidebarMenuData] = useState([]);
  const [bannersData, setBannersData] = useState([]);
  
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [walletTab, setWalletTab] = useState('paymentForm'); // 'paymentForm' or 'upiScanner'
  const [upiConfig, setUpiConfig] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ userId: '', amount: '', referenceNumber: '', paymentDate: '', remarks: '' });
  const [walletBalance, setWalletBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(false);
  
  const scrollRef = React.useRef(null);

  useEffect(() => {
    // Fetch Action Cards
    fetch('REACT_APP_API_URL/api/action-cards')
      .then(res => res.json())
      .then(data => setActionCardsData(data))
      .catch(err => console.error("Error fetching action cards:", err));
      
    // Fetch Top Tabs
    fetch('REACT_APP_API_URL/api/top-tabs')
      .then(res => res.json())
      .then(data => setTopTabsData(data))
      .catch(err => console.error("Error fetching top tabs:", err));
      
    // Fetch Sidebar Menus
    fetch('REACT_APP_API_URL/api/sidebar-menus')
      .then(res => res.json())
      .then(data => setSidebarMenuData(data))
      .catch(err => console.error("Error fetching sidebar menus:", err));
      
    // Fetch Banners
    fetch('REACT_APP_API_URL/api/banners')
      .then(res => res.json())
      .then(data => setBannersData(data))
      .catch(err => console.error("Error fetching banners:", err));
      
    // Fetch UPI Config
    fetch('REACT_APP_API_URL/api/upi-config')
      .then(res => res.json())
      .then(data => setUpiConfig(data))
      .catch(err => console.error("Error fetching upi config:", err));

    // Fetch wallet balance
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      fetch(`REACT_APP_API_URL/api/users/${currentUser}`)
        .then(res => res.json())
        .then(data => setWalletBalance(data.walletBalance || 0))
        .catch(err => console.error("Error fetching user data:", err));
    }
  }, []);

  // Auto-scrolling logic for Action Cards
  useEffect(() => {
    const el = scrollRef.current;
    let animationFrameId;
    let isHovered = false;

    if (el) {
      const handleMouseEnter = () => isHovered = true;
      const handleMouseLeave = () => isHovered = false;
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);

      const scroll = () => {
        if (!isHovered && el.scrollWidth > el.clientWidth) {
          el.scrollLeft += 1;
          if (el.scrollLeft >= (el.scrollWidth - el.clientWidth)) {
            el.scrollLeft = 0;
          }
        }
        animationFrameId = requestAnimationFrame(scroll);
      };
      
      const timer = setTimeout(() => {
        animationFrameId = requestAnimationFrame(scroll);
      }, 1000);

      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(animationFrameId);
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [actionCardsData]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('REACT_APP_API_URL/api/payment-requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      });
      if (response.ok) {
        alert('Payment requisition submitted successfully!');
        setPaymentForm({ userId: '', amount: '', referenceNumber: '', paymentDate: '', remarks: '' });
      } else {
        alert('Failed to submit requisition.');
      }
    } catch (err) {
      alert('Error submitting requisition.');
    }
  };

  const currentUser = localStorage.getItem('currentUser') || 'User';

  return (
    <div className="dash-root">
      
      {/* Top Header Bar */}
      <header className="dash-top-bar">
        <div className="dash-brand">
          <div className="brand-logo-badge">
            <img src={logoImg} alt="Logo" onError={(e) => e.target.style.display='none'} />
          </div>
          <div className="brand-text">
            <h2>ONECLICK <span>CRM</span></h2>
            <span className="brand-subtitle-tag">Partner Portal</span>
          </div>
        </div>

        <div className="dash-header-actions">
          {/* Quick Balance Pill */}
          <div className="wallet-quick-pill" onClick={() => setShowWallet(true)} title="Click to Load Wallet">
            <div className="wallet-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div className="wallet-pill-info">
              <span className="pill-label">Wallet Balance</span>
              <span className="pill-value">₹ {parseFloat(walletBalance).toFixed(2)}</span>
            </div>
          </div>

          {/* Profile Dropdown Trigger */}
          <div className="profile-wrapper">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="avatar-circle">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span className="user-name">{currentUser}</span>
              <svg className={`chevron-icon ${showProfileMenu ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showProfileMenu && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-user-header">
                  <div className="user-meta">
                    <span className="meta-name">{currentUser}</span>
                    <span className="meta-role">Active Account</span>
                  </div>
                </div>

                <div className="dropdown-balance-box">
                  <div className="balance-row">
                    <span>Available Balance</span>
                    <button className="eye-toggle-btn" onClick={() => setShowBalance(!showBalance)}>
                      {showBalance ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="balance-amount">
                    {showBalance ? `₹ ${parseFloat(walletBalance).toFixed(2)}` : '₹ •••••'}
                  </div>
                </div>

                <div className="menu-divider"></div>

                <button 
                  className="dropdown-item-btn"
                  onClick={() => { setShowWallet(true); setShowProfileMenu(false); }} 
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  Load Wallet
                </button>

                <div className="menu-divider"></div>

                <button 
                  className="dropdown-item-btn logout"
                  onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Access Top Bar & Tabs */}
      <section className="quick-access-bar">
        <div className="access-title">
          <div className="access-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="2"/>
              <rect x="14" y="3" width="7" height="7" rx="2"/>
              <rect x="3" y="14" width="7" height="7" rx="2"/>
              <rect x="14" y="14" width="7" height="7" rx="2"/>
            </svg>
          </div>
          <span>Quick Access</span>
        </div>

        <div className="tabs-container">
          {topTabsData.map((tab) => (
            <button 
              key={tab._id || tab.id} 
              className="quick-tab-btn"
              onClick={() => tab.url ? window.open(tab.url, '_blank') : null}
              style={{ cursor: tab.url ? 'pointer' : 'default' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Wallet Modal */}
      {showWallet && (
        <div className="wallet-overlay">
          <div className="wallet-modal">
            <div className="wallet-header">
              <div className="wallet-title">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                <h3>My Wallet</h3>
              </div>
              <button className="close-wallet-btn" onClick={() => setShowWallet(false)}>×</button>
            </div>
            
            <div className="wallet-tabs">
              <button 
                className={walletTab === 'paymentForm' ? 'active' : ''} 
                onClick={() => setWalletTab('paymentForm')}
              >
                Payment Requisition
              </button>
              <button 
                className={walletTab === 'upiScanner' ? 'active' : ''} 
                onClick={() => setWalletTab('upiScanner')}
              >
                UPI Scanner
              </button>
            </div>

            <div className="wallet-content">
              {walletTab === 'paymentForm' && (
                <form className="wallet-form" onSubmit={handlePaymentSubmit} autoComplete="off">
                  <div className="form-group">
                    <label>User ID</label>
                    <input 
                      type="text" 
                      required 
                      value={paymentForm.userId} 
                      onChange={e => setPaymentForm({...paymentForm, userId: e.target.value})} 
                      placeholder="e.g. MBM000012" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input 
                      type="number" 
                      required 
                      value={paymentForm.amount} 
                      onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="form-group">
                    <label>Bank Reference No.</label>
                    <input 
                      type="text" 
                      required 
                      value={paymentForm.referenceNumber} 
                      onChange={e => setPaymentForm({...paymentForm, referenceNumber: e.target.value})} 
                      placeholder="Enter Ref/UTR No." 
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Date</label>
                    <input 
                      type="date" 
                      required 
                      value={paymentForm.paymentDate} 
                      onChange={e => setPaymentForm({...paymentForm, paymentDate: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Remarks (Optional)</label>
                    <input 
                      type="text" 
                      value={paymentForm.remarks} 
                      onChange={e => setPaymentForm({...paymentForm, remarks: e.target.value})} 
                      placeholder="Any additional info..." 
                    />
                  </div>
                  <button type="submit" className="wallet-submit-btn">Submit Request</button>
                </form>
              )}

              {walletTab === 'upiScanner' && (
                <div className="wallet-upi-scanner">
                  {upiConfig?.qrCodeImg ? (
                    <>
                      <div className="qr-wrapper">
                        <img src={upiConfig.qrCodeImg} alt="UPI QR Code" className="upi-qr-img" />
                      </div>
                      {upiConfig.upiId && <p className="upi-id-text">UPI ID: <strong>{upiConfig.upiId}</strong></p>}
                      <p className="upi-scan-instruction">Scan with any UPI app to pay</p>
                    </>
                  ) : (
                    <div className="no-upi-config">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <p>UPI Scanner is not configured yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="dash-main-body">
        
        {/* Left Sidebar */}
        <aside className="dash-sidebar">
          <div className="sidebar-logo-card">
            <img src={logoImg} alt="MB MITRA" className="sidebar-logo-img" onError={(e) => e.target.style.display='none'} />
          </div>
          
          <div className="sidebar-menu-list">
            {sidebarMenuData.map((menu) => (
              <div 
                key={menu._id || menu.id} 
                className={`sidebar-menu-item ${menu.isActive ? 'active' : ''} ${!menu.label ? 'empty' : ''}`}
              >
                <span className="menu-dot"></span>
                <span className="menu-text">{menu.label}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Main Content */}
        <div className="dash-content-area">
          
          {/* Quick Analytics Summary Cards */}
          <div className="analytics-summary-grid">
            <div className="stat-card orange">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-title">Wallet Balance</span>
                <h3 className="stat-value">₹ {parseFloat(walletBalance).toFixed(2)}</h3>
              </div>
            </div>

            <div className="stat-card blue">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-title">Active Services</span>
                <h3 className="stat-value">{actionCardsData.length || 0} Available</h3>
              </div>
            </div>

            <div className="stat-card green">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="stat-details">
                <span className="stat-title">System Status</span>
                <h3 className="stat-value text-green">100% Operational</h3>
              </div>
            </div>
          </div>

          {/* Action Cards Services Marquee */}
          <div className="action-cards-container">
            <div className="section-header-title">
              <h3>Featured Services & Tools</h3>
              <span className="scroll-hint">Hover to pause • Click to open</span>
            </div>
            
            <div className="action-cards-wrapper" ref={scrollRef}>
              {actionCardsData.map((card) => (
                <div 
                  key={card._id || card.id} 
                  className="action-card-item" 
                  style={{ cursor: card.url ? 'pointer' : 'default' }}
                  onClick={() => card.url ? window.open(card.url, '_blank') : null}
                >
                  <img 
                    src={card.img} 
                    alt={card.title} 
                    className="card-img" 
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                  />
                  
                  {card.isAeps ? (
                    <div className="card-fallback aeps-fallback" style={{display: 'none'}}>
                      <div className="aeps-e">e</div>
                      <div className="aeps-text">A <span>P S</span></div>
                    </div>
                  ) : (
                    <div className="card-fallback" style={{display: 'none'}}>{card.icon || '⚡'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Banner Showcase Section */}
          <div className="banner-showcase-container">
            {bannersData.map((banner) => (
              <div key={banner._id || banner.id} className="banner-item-wrapper">
                <img 
                  src={banner.img} 
                  alt={banner.alt || 'Banner Showcase'} 
                  className="banner-img" 
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
                />
                <div className="banner-fallback" style={{display: 'none'}}>
                  <div className="banner-fallback-icon">📢</div>
                  <h4>Special Offers & Updates</h4>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

    </div>
  );
};

export default Dashboard;
