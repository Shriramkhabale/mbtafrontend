import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import './Dashboard.css';
import logoImg from '../../assets/logo.png';
import WalletModal from '../wallet/WalletModal';
import LedgerView from '../ledger/LedgerView';
import PanCardView from '../pancard/PanCardView';
import NotificationBell from '../../context/NotificationBell';
import { API_URL } from '../../utils/apiClient';

// eslint-disable-next-line no-unused-vars
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});

const getMenuIcon = (label) => {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('dash')) return <span className="icon-badge icon-orange">📊</span>;
  if (l.includes('adhar') || l.includes('aadhaar')) return <span className="icon-badge icon-purple">ID</span>;
  if (l.includes('pan')) return <span className="icon-badge icon-amber">💳</span>;
  if (l.includes('report') || l.includes('history')) return <span className="icon-badge icon-blue">📑</span>;
  if (l.includes('user') || l.includes('profile')) return <span className="icon-badge icon-teal">👤</span>;
  if (l.includes('setting')) return <span className="icon-badge icon-slate">⚙️</span>;
  return <span className="icon-badge icon-orange">⚡</span>;
};

const getTabIcon = (label) => {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes('wallet point') || (l.includes('wallet') && !l.includes('ledger'))) return <span className="tab-icon">💼</span>;
  if (l.includes('ledger') || l.includes('report')) return <span className="tab-icon">📒</span>;
  if (l.includes('dmt') || l.includes('transfer') || l.includes('money')) return <span className="tab-icon">💸</span>;
  if (l.includes('hotel')) return <span className="tab-icon">🏨</span>;
  if (l.includes('recharge') || l.includes('bill')) return <span className="tab-icon">📱</span>;
  if (l.includes('travel') || l.includes('flight') || l.includes('bus') || l.includes('train')) return <span className="tab-icon">✈️</span>;
  if (l.includes('aeps') || l.includes('withdraw')) return <span className="tab-icon">🏧</span>;
  if (l.includes('insurance')) return <span className="tab-icon">🛡️</span>;
  return <span className="tab-icon">🚀</span>;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLedgerRoute = location.pathname === '/ledger';
  const isWalletRoute = location.pathname === '/wallet';
  const isPanCardRoute = location.pathname === '/pancard' || location.pathname === '/pan-card';
  const isPanNewAppTab = isPanCardRoute && (location.search.includes('new_app') || (!location.search.includes('epan') && !location.search.includes('history')));
  const isPanEpanTab = isPanCardRoute && location.search.includes('epan');
  const isStandaloneRoute = isLedgerRoute || isWalletRoute || isPanCardRoute;
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'dark';
  });


  const [actionCardsData, setActionCardsData] = useState([]);
  const [topTabsData, setTopTabsData] = useState([]);
  const [sidebarMenuData, setSidebarMenuData] = useState([]);
  const [bannersData, setBannersData] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeTabId, setActiveTabId] = useState(null);
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeBannerId, setActiveBannerId] = useState(null);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [walletTab, setWalletTab] = useState('directPayment');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPanSubmenuOpen, setIsPanSubmenuOpen] = useState(true);

  // Sync /wallet URL route with showWallet modal state
  useEffect(() => {
    if (location.pathname === '/wallet') {
      setShowWallet(true);
    } else {
      setShowWallet(false);
    }
  }, [location.pathname]);



  const [walletBalance, setWalletBalance] = useState(0);
  const [showBalance, setShowBalance] = useState(() => {
    return localStorage.getItem('showWalletBalance') === 'true';
  });
  const [marqueeText, setMarqueeText] = useState('WELCOME TO MB MITRA');

  useEffect(() => {
    fetch(`${API_URL}/api/site-settings/dashboard_marquee`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.value) {
          setMarqueeText(data.value);
        }
      })
      .catch(() => {});
  }, []);

  const toggleShowBalance = () => {
    setShowBalance(prev => {
      const nextState = !prev;
      localStorage.setItem('showWalletBalance', String(nextState));
      return nextState;
    });
  };



  useEffect(() => {
    // Fetch Action Cards
    fetch(`${API_URL}/api/action-cards`)
      .then(res => res.json())
      .then(data => {
        setActionCardsData(data);
        if (data.length > 0) setActiveCardId(data[0]._id || data[0].id);
      });

    // Fetch Top Tabs
    fetch(`${API_URL}/api/top-tabs`)
      .then(res => res.json())
      .then(data => {
        let tabs = Array.isArray(data) ? [...data] : [];
        if (!tabs.some(t => t.label && t.label.toLowerCase().includes('wallet point'))) {
          tabs.unshift({ _id: 'tab_wallet_points', label: 'Wallet Points' });
        }
        if (!tabs.some(t => t.label && t.label.toLowerCase().includes('ledger'))) {
          const insertIdx = tabs.findIndex(t => t.label && t.label.toLowerCase().includes('wallet point')) + 1;
          tabs.splice(insertIdx > 0 ? insertIdx : 1, 0, { _id: 'tab_wallet_ledger', label: 'Wallet Ledger' });
        }
        setTopTabsData(tabs);
        if (tabs.length > 0) setActiveTabId(tabs[0]._id || tabs[0].id);
      });

    // Fetch Sidebar Menus
    fetch(`${API_URL}/api/sidebar-menus`)
      .then(res => res.json())
      .then(data => {
        let menus = Array.isArray(data) ? data.filter(m => {
          if (!m.label) return true;
          const l = m.label.toLowerCase();
          return !l.includes('wallet') && !l.includes('ledger') && !l.includes('report');
        }) : [];
        setSidebarMenuData(menus);
        const activeItem = menus.find(m => m.isActive) || menus[0];
        if (activeItem) {
          setActiveMenuId(activeItem._id || activeItem.id);
        }
      });

    // Fetch Banners
    fetch(`${API_URL}/api/banners`)
      .then(res => res.json())
      .then(data => {
        setBannersData(data);
        if (data.length > 0) setActiveBannerId(data[0]._id || data[0].id);
      });



    // Setup an interval to periodically fetch wallet balance
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      const fetchWalletBalance = () => {
        fetch(`${API_URL}/api/users/${currentUser}`)
          .then(res => res.json())
          .then(data => {
            if (data.walletBalance !== undefined) {
              setWalletBalance(data.walletBalance);
            }

          })
          .catch(err => console.error(err));
      };

      fetchWalletBalance(); // Initial fetch
      const interval = setInterval(fetchWalletBalance, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className={`dashboard-container-new theme-${theme}`}>
      {/* Ambient Glowing Orbs */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>

      {/* Top Header Bar */}
      <div className="dash-top-title">
        <div className="header-left-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Mobile Navigation"
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
          <div className="header-brand-logo" onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }} style={{ cursor: 'pointer' }}>
            <div className="header-logo-badge-round">
              <img src={logoImg} alt="MB MITRA" className="header-logo-img" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <span className="brand-gold-text">MITRA</span>
          </div>
        </div>

        <div className="title-marquee-wrapper">
          <div className="title-marquee-text">
            {marqueeText || 'WELCOME TO MB MITRA'}
          </div>
        </div>

        <div className="header-right-controls">
          <NotificationBell dark={theme === 'dark'} />
          <div
            className="top-wallet-box"
            onClick={() => { setWalletTab('directPayment'); navigate('/wallet'); }}
            title="Click to view My Wallet & Load Wallet Requisition"
          >
            <span className="wallet-icon">💼</span>
            <span className="wallet-label-text">Wallet Balance:</span>
            <span className="wallet-amount-text">
              {showBalance ? `₹ ${parseFloat(walletBalance).toFixed(2)}` : '₹ •••••'}
            </span>
          </div>

          <button
            className="top-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <span className="profile-avatar-icon">👤</span>
            <span>{localStorage.getItem('currentUser') || 'My Profile'}</span>
            <span className="dropdown-caret">▼</span>
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown-card">
              <div className="dropdown-user-info">
                <div className="user-info-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="user-info-label">Wallet Balance</span>
                  <span
                    style={{ cursor: 'pointer', fontSize: '15px' }}
                    onClick={toggleShowBalance}
                    title={showBalance ? "Hide Balance" : "Show Balance"}
                  >
                    {showBalance ? '🔒' : '👁️'}
                  </span>
                </div>
                <div className="user-info-amount">
                  {showBalance ? `₹ ${parseFloat(walletBalance).toFixed(2)}` : '₹ •••••'}
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-action-item"
                onClick={() => { setWalletTab('directPayment'); setShowProfileMenu(false); navigate('/wallet'); }}
              >
                💼 Load Wallet / Request
              </button>
              <button
                className="dropdown-action-item"
                onClick={() => { setShowProfileMenu(false); navigate('/ledger'); }}
              >
                📒 Ledger
              </button>
              <div className="dropdown-divider"></div>
              <div className="dropdown-theme-section">
                <div style={{ padding: '4px 20px', fontSize: '11px', fontWeight: 800, color: theme === 'light' ? '#ea580c' : '#fb923c', letterSpacing: '0.5px' }}>THEME OPTIONS</div>
                <div className="theme-options-row">
                  <button
                    type="button"
                    className={`theme-option-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => { setTheme('light'); localStorage.setItem('appTheme', 'light'); }}
                  >
                    ☀️ White
                  </button>
                  <button
                    type="button"
                    className={`theme-option-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => { setTheme('dark'); localStorage.setItem('appTheme', 'dark'); }}
                  >
                    🌙 Black
                  </button>
                </div>
              </div>
              <div className="dropdown-divider"></div>
              <button
                className="dropdown-action-item logout-btn"
                onClick={() => { localStorage.removeItem('currentUser'); navigate('/'); }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* My Wallet Modal Overlay */}
      {!isWalletRoute && (
        <WalletModal
          isOpen={showWallet}
          onClose={() => { setShowWallet(false); navigate('/dashboard'); }}
          currentUser={localStorage.getItem('currentUser')}
          initialTab={walletTab}
          walletBalance={walletBalance}
          onBalanceUpdate={(newBal) => setWalletBalance(newBal)}
        />
      )}

      {/* Main Layout */}
      <div className="dash-main-new">
        {/* Mobile Backdrop Overlay */}
        {isMobileMenuOpen && (
          <div
            className="sidebar-mobile-backdrop"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Left Glass Sidebar */}
        <div className={`sidebar-new ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Top Subtle Amber Wave Curve */}
          <svg className="sidebar-wave-overlay" viewBox="0 0 240 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="amberWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#c2410c" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M -10,120 C 50,90 100,50 140,30 C 180,10 210,5 250,-5"
              fill="none"
              stroke="url(#amberWaveGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>

          <div className="sidebar-brand-section">
            <div className="sidebar-logo-wrapper">
              <div className="logo-glowing-ring"></div>
              <img src={logoImg} alt="MB MITRA" className="sidebar-logo-img" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <span className="sidebar-brand-title">MB MITRA</span>
          </div>

          <div className="sidebar-divider-title">
            <span>— • SERVICES • —</span>
          </div>

          <div className="sidebar-menu-new">
            {sidebarMenuData.map((menu) => {
              const menuId = menu._id || menu.id;
              const isPan = menu.label && menu.label.toLowerCase().includes('pan');
              const isSelected = activeMenuId ? activeMenuId === menuId : menu.isActive;
              return (
                <React.Fragment key={menuId}>
                  <div
                    className={`menu-item-new ${isSelected ? 'active' : ''} ${!menu.label ? 'empty' : ''}`}
                    onClick={() => {
                      setActiveMenuId(menuId);
                      if (isPan) {
                        setIsPanSubmenuOpen(!isPanSubmenuOpen);
                      } else {
                        setIsMobileMenuOpen(false);
                        if (menu.url && menu.url.trim() !== '') {
                          const targetUrl = menu.url.trim();
                          if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
                            window.open(targetUrl, '_blank');
                          } else {
                            navigate(targetUrl);
                          }
                        } else if (menu.label && menu.label.toLowerCase().includes('dash')) {
                          navigate('/dashboard');
                        } else if (menu.label && (menu.label.toLowerCase().includes('report') || menu.label.toLowerCase().includes('ledger'))) {
                          navigate('/ledger');
                        } else if (menu.label && menu.label.toLowerCase().includes('wallet')) {
                          navigate('/wallet');
                        }
                      }
                    }}
                  >
                    {getMenuIcon(menu.label)}
                    <span className="menu-label-text">{menu.label}</span>
                    <span className="active-chevron">{isPan ? (isPanSubmenuOpen ? '▼' : '›') : '›'}</span>
                  </div>

                  {/* PAN Card Submenu Options - ONLY New Application & Already PAN */}
                  {isPan && isPanSubmenuOpen && (
                    <div className="sidebar-pan-submenu">
                      <div
                        className={`pan-submenu-item ${isPanNewAppTab ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                          navigate('/pancard?tab=new_app_landing');
                        }}
                      >
                        <div className="pan-submenu-left">
                          <span className="pan-submenu-icon-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="12" y1="18" x2="12" y2="12" />
                              <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                          </span>
                          <span className="pan-submenu-text">New Application</span>
                        </div>
                        <span className="pan-submenu-chevron">›</span>
                      </div>

                      <div
                        className={`pan-submenu-item ${isPanEpanTab ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(false);
                          navigate('/pancard?tab=epan_correction');
                        }}
                      >
                        <div className="pan-submenu-left">
                          <span className="pan-submenu-icon-badge">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="20" height="14" rx="2" />
                              <line x1="2" y1="10" x2="22" y2="10" />
                              <path d="M7 15h3" />
                              <path d="M14 15l2 2 4-4" />
                            </svg>
                          </span>
                          <span className="pan-submenu-text">Already PAN</span>
                        </div>
                        <span className="pan-submenu-chevron">›</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Bottom Subtle Amber Wave Stroke Lines */}
          <svg className="sidebar-bottom-wave-overlay" viewBox="0 0 240 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="amberBottomWaveGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#c2410c" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              d="M 10,160 C 70,135 140,125 245,60"
              fill="none"
              stroke="url(#amberBottomWaveGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 50,160 C 100,145 150,135 245,90"
              fill="none"
              stroke="url(#amberBottomWaveGrad)"
              strokeWidth="2"
              opacity="0.6"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Main Content Area */}
        <div className="content-area-new">

          {/* Top Header Tabs */}
          {topTabsData.length > 0 && (
            <div className="top-tabs-new">
              {topTabsData.map((tab) => {
                const tabId = tab._id || tab.id;
                const label = (tab.label || '').toLowerCase();
                const isSelected = 
                  (isWalletRoute && label.includes('wallet')) ||
                  (isLedgerRoute && label.includes('ledger')) ||
                  (!isStandaloneRoute && activeTabId === tabId);

                return (
                  <button
                    key={tabId}
                    className={`tab-btn-new ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTabId(tabId);
                      if (label.includes('ledger') || label.includes('report')) {
                        navigate('/ledger');
                      } else if (label.includes('wallet')) {
                        navigate('/wallet');
                      } else {
                        navigate('/dashboard');
                        if (tab.url) window.open(tab.url, '_blank');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {getTabIcon(tab.label)}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Action Cards Marquee Showcase (Only show on Dashboard, hide on Ledger & Wallet routes) */}
          {!isStandaloneRoute && (
            <div className="action-cards-container">
              <div className="action-cards-wrapper">
                <div className="action-cards-track-scroll">
                  {[...actionCardsData, ...actionCardsData].map((card, index) => {
                    const cardId = card._id || card.id;
                    const isSelected = activeCardId === cardId;
                    return (
                      <div key={(cardId || 'card') + '-' + index} className="action-card-new">
                        <div
                          className={`action-card-inner ${isSelected ? 'active' : ''}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setActiveCardId(cardId);
                            if (card.url) window.open(card.url, '_blank');
                          }}
                        >
                          <img
                            src={card.img}
                            alt={card.title || 'Service'}
                            className="card-img"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />

                          {card.isAeps ? (
                            <div className="card-fallback aeps-fallback" style={{ display: 'none' }}>
                              <div className="aeps-e">e</div>
                              <div className="aeps-text">A <span>P S</span></div>
                            </div>
                          ) : (
                            <div className="card-fallback" style={{ display: 'none' }}>{card.icon || '💳'}</div>
                          )}

                          <div className="card-hover-overlay">
                            <span className="card-open-btn">Open Service →</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Main Content Display: Ledger View, Wallet View, or Banner Showcase */}
          {isLedgerRoute ? (
            <LedgerView currentUser={localStorage.getItem('currentUser')} walletBalance={walletBalance} />
          ) : isWalletRoute ? (
            <WalletModal
              isOpen={true}
              inlineMode={true}
              onClose={() => navigate('/dashboard')}
              currentUser={localStorage.getItem('currentUser')}
              initialTab={walletTab}
              walletBalance={walletBalance}
              onBalanceUpdate={(newBal) => setWalletBalance(newBal)}
            />
          ) : isPanCardRoute ? (
            <PanCardView
              currentUser={localStorage.getItem('currentUser')}
              walletBalance={walletBalance}
              onClose={() => navigate('/dashboard')}
            />
          ) : (
            bannersData.length > 0 && (
              <div className={`banner-area-new ${activeBannerId ? 'active' : ''}`}>
                {bannersData.map((banner) => {
                  const bannerId = banner._id || banner.id;
                  const isSelected = activeBannerId === bannerId;
                  return (
                    <div
                      key={bannerId}
                      className={`banner-item-wrapper ${isSelected ? 'active' : ''}`}
                      onClick={() => setActiveBannerId(bannerId)}
                      style={{ cursor: 'pointer' }}
                    >
                      <img
                        src={banner.img}
                        alt={banner.alt || 'Banner'}
                        className="banner-img"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                      <div className="banner-fallback" style={{ display: 'none' }}>
                        <div className="sun-new"></div>
                        <div className="plane-shadow">{banner.fallbackIcon}</div>
                        <div className="person-shadow">{banner.fallbackPerson}</div>
                      </div>
                      <div className="banner-shine-overlay"></div>
                    </div>
                  );
                })}
              </div>
            )
          )}

        </div>
      </div>

    </div>
  );
};

export default Dashboard;
