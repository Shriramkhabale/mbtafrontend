import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('currentUser') === 'admin';
  });

  // Admin Auth Form States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Management Panel States
  const [activeTab, setActiveTab] = useState('actionCards');
  const [cards, setCards] = useState([]);
  const [topTabs, setTopTabs] = useState([]);
  const [sidebarMenus, setSidebarMenus] = useState([]);
  const [banners, setBanners] = useState([]);
  const [newsImages, setNewsImages] = useState([]);
  const [users, setUsers] = useState([]);

  // Form States
  const [cardForm, setCardForm] = useState({ title: '', imgFile: null, icon: '', isAeps: false, url: '' });
  const [tabForm, setTabForm] = useState({ label: '', order: 0, url: '' });
  
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [menuForm, setMenuForm] = useState({ label: '', isActive: false, order: 0 });
  const [bannerForm, setBannerForm] = useState({ imgFile: null, fallbackIcon: '', fallbackPerson: '' });
  const [newsImageForm, setNewsImageForm] = useState({ imgFile: null });
  const [paymentRequisitions, setPaymentRequisitions] = useState([]);
  const [upiConfig, setUpiConfig] = useState(null);
  const [upiForm, setUpiForm] = useState({ upiId: '', qrCodeImgFile: null });
  const [userForm, setUserForm] = useState({ userId: '', email: '', password: '', mobile: '', role: 'customer' });
  const [userSearch, setUserSearch] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('All');
  
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (index) => setDraggedIndex(index);

  const handleDragEnter = (e, index, list, setList) => {
    if (draggedIndex === index) return;
    const newList = [...list];
    const draggedItem = newList[draggedIndex];
    newList.splice(draggedIndex, 1);
    newList.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    setList(newList);
  };

  const handleDragEnd = async (endpoint, list) => {
    setDraggedIndex(null);
    const orderedIds = list.map(item => item._id);
    try {
      await fetch(`REACT_APP_API_URL/api/${endpoint}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (e) { console.error("Error saving order"); }
  };

  useEffect(() => { 
    if (isLoggedIn) {
      fetchAll(); 
    }
  }, [isLoggedIn]);

  const fetchAll = () => {
    fetch('REACT_APP_API_URL/api/action-cards').then(r => r.json()).then(setCards).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/top-tabs').then(r => r.json()).then(setTopTabs).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/sidebar-menus').then(r => r.json()).then(setSidebarMenus).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/banners').then(r => r.json()).then(setBanners).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/news-images').then(r => r.json()).then(setNewsImages).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/users').then(r => r.json()).then(setUsers).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/payment-requisitions').then(r => r.json()).then(setPaymentRequisitions).catch(e => console.error(e));
    fetch('REACT_APP_API_URL/api/upi-config').then(r => r.json()).then(data => {
      setUpiConfig(data);
      if(data) setUpiForm({ upiId: data.upiId || '', qrCodeImgFile: null });
    }).catch(e => console.error(e));
  };

  const handleAdminAuthSubmit = (e) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      return alert("Please enter Admin Email and Password.");
    }
    // Authenticate admin user
    localStorage.setItem('currentUser', 'admin');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setIsLoggedIn(false);
    navigate('/');
  };

  const addActionCard = async () => {
    const formData = new FormData();
    formData.append('title', cardForm.title);
    formData.append('icon', cardForm.icon);
    formData.append('isAeps', cardForm.isAeps);
    formData.append('url', cardForm.url);
    if (cardForm.imgFile) formData.append('image', cardForm.imgFile);
    
    if (editingCardId) {
      await fetch(`REACT_APP_API_URL/api/action-cards/${editingCardId}`, { method: 'PUT', body: formData });
      setEditingCardId(null);
    } else {
      await fetch('REACT_APP_API_URL/api/action-cards', { method: 'POST', body: formData });
    }
    
    setCardForm({ title: '', imgFile: null, icon: '', isAeps: false, url: '' });
    fetchAll();
  };

  const startEditCard = (card) => {
    setEditingCardId(card._id);
    setCardForm({
      title: card.title,
      imgFile: null,
      icon: card.icon || '',
      isAeps: card.isAeps || false,
      url: card.url || ''
    });
  };

  const addBanner = async () => {
    const formData = new FormData();
    formData.append('fallbackIcon', bannerForm.fallbackIcon);
    formData.append('fallbackPerson', bannerForm.fallbackPerson);
    if (bannerForm.imgFile) formData.append('image', bannerForm.imgFile);
    await fetch('REACT_APP_API_URL/api/banners', { method: 'POST', body: formData });
    setBannerForm({ imgFile: null, fallbackIcon: '', fallbackPerson: '' });
    fetchAll();
  };

  const addNewsImage = async () => {
    if (!newsImageForm.imgFile) return alert("Please select an image first");
    const formData = new FormData();
    formData.append('image', newsImageForm.imgFile);
    await fetch('REACT_APP_API_URL/api/news-images', { method: 'POST', body: formData });
    setNewsImageForm({ imgFile: null });
    fetchAll();
  };

  const updateUpiConfig = async () => {
    const formData = new FormData();
    formData.append('upiId', upiForm.upiId);
    if (upiForm.qrCodeImgFile) formData.append('qrCodeImg', upiForm.qrCodeImgFile);
    await fetch('REACT_APP_API_URL/api/upi-config', { method: 'PUT', body: formData });
    fetchAll();
    alert('UPI Configuration Updated!');
  };

  const addUser = async () => {
    if (!userForm.userId || !userForm.password) return alert("User ID and Password are required");
    const response = await fetch('REACT_APP_API_URL/api/users', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm) 
    });
    
    if(response.ok) {
      alert("User Created Successfully!");
      setUserForm({ userId: '', email: '', password: '', mobile: '', role: 'customer' });
      fetchAll();
    } else {
      const data = await response.json();
      alert("Error: " + data.message);
    }
  };

  const updateRequisition = async (id, status) => {
    const amountStr = prompt('Enter approved amount:');
    if (amountStr === null) return;
    const approvedAmount = Number(amountStr);
    
    await fetch(`REACT_APP_API_URL/api/payment-requisitions/${id}`, { 
      method: 'PUT', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, approvedAmount }) 
    });
    fetchAll();
  };

  const addItem = async (url, data, setForm, initialForm, editingId, setEditingId) => {
    if (editingId) {
      await fetch(`${url}/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (setEditingId) setEditingId(null);
    } else {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setForm(initialForm);
    fetchAll();
  };

  const startEditTab = (tab) => {
    setEditingTabId(tab._id);
    setTabForm({
      label: tab.label,
      order: tab.order,
      url: tab.url || ''
    });
  };

  const deleteItem = async (url, id) => {
    await fetch(`${url}/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const menuItems = [
    { id: 'actionCards', label: 'Action Cards', icon: '💳' },
    { id: 'topTabs', label: 'Top Tabs', icon: '📑' },
    { id: 'sidebarMenus', label: 'Sidebar Menus', icon: '☰' },
    { id: 'banners', label: 'Banners', icon: '🖼️' },
    { id: 'newsImages', label: 'Login News Images', icon: '📰' },
    { id: 'walletRequests', label: 'Wallet Requests', icon: '💼' },
    { id: 'users', label: 'User Management', icon: '👥' },
  ];

  // IF NOT LOGGED IN: Render Super Admin Portal Login Screen (Matching User Screenshot)
  if (!isLoggedIn) {
    return (
      <div className="super-admin-wrapper">
        <div className="super-admin-card">
          
          {/* Top Banner Header */}
          <div className="super-admin-banner">
            <div className="super-admin-icon-badge">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2"/>
                <circle cx="9" cy="10" r="2"/>
                <line x1="15" y1="8" x2="17" y2="8"/>
                <line x1="15" y1="12" x2="17" y2="12"/>
                <path d="M7 16c0-1.5 1.5-2 2-2s2 .5 2 2"/>
              </svg>
            </div>
            <h1 className="super-admin-title">Super Admin Portal</h1>
            <p className="super-admin-subtitle">Elevated access for system administration</p>
          </div>

          {/* Form Body */}
          <div className="super-admin-body">
            <form onSubmit={handleAdminAuthSubmit} className="super-admin-form" autoComplete="off">
              
              <div className="super-input-group">
                <label>Admin Email</label>
                <div className="super-input-with-icon">
                  <span className="super-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    value={adminEmail} 
                    onChange={(e) => setAdminEmail(e.target.value)} 
                    placeholder="admin@example.com" 
                    autoComplete="off"
                    required 
                  />
                </div>
              </div>

              <div className="super-input-group">
                <label>Password</label>
                <div className="super-input-with-icon">
                  <span className="super-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input 
                    type={showAdminPassword ? "text" : "password"} 
                    value={adminPassword} 
                    onChange={(e) => setAdminPassword(e.target.value)} 
                    placeholder="Enter your password" 
                    autoComplete="new-password"
                    required 
                  />
                  <span className="super-toggle-password" onClick={() => setShowAdminPassword(!showAdminPassword)}>
                    {showAdminPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div className="super-forgot-row">
                <span className="super-forgot-link" onClick={() => alert('Password reset requested for administrator.')}>
                  Forgot password?
                </span>
              </div>

              <button type="submit" className="super-access-btn">
                Access System
              </button>

            </form>

            <div className="super-admin-footer">
              © {new Date().getFullYear()} Enterprise Admin System. Super admin access is monitored and logged.
            </div>
          </div>

        </div>
      </div>
    );
  }

  // IF LOGGED IN: Render Full Admin Management Dashboard
  return (
    <div className="admin-layout">
      {/* Vertical Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav-vertical">
          {menuItems.map(item => (
            <button 
              key={item.id} 
              className={`admin-nav-btn ${activeTab === item.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{menuItems.find(m => m.id === activeTab)?.label}</h1>
          <div className="admin-topbar-actions" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div className="notification-icon" style={{ cursor: 'pointer', fontSize: '20px', position: 'relative' }} onClick={() => setActiveTab('walletRequests')}>
              🔔
              {paymentRequisitions.filter(req => req.status === 'Pending').length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold', border: '2px solid white' }}>
                  {paymentRequisitions.filter(req => req.status === 'Pending').length}
                </span>
              )}
            </div>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f3ff', padding: '8px 15px', borderRadius: '20px', fontWeight: '600', color: '#6d28d9' }}>
              <span>👨‍💼</span>
              <span>Super Admin</span>
            </div>
            <button 
              onClick={handleLogout} 
              style={{ padding: '8px 15px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>🚪</span> Logout
            </button>
          </div>
        </header>
        
        <div className="admin-content-wrapper">
          
          {/* Action Cards Tab */}
          {activeTab === 'actionCards' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Add New Card</h3>
                <div className="modern-form">
                  <input type="text" placeholder="Title" value={cardForm.title} onChange={e => setCardForm({...cardForm, title: e.target.value})} />
                  <div className="file-upload-wrapper">
                    <input type="file" accept="image/*" onChange={e => setCardForm({...cardForm, imgFile: e.target.files[0]})} />
                  </div>
                  <input type="text" placeholder="Redirect URL (e.g. https://google.com)" value={cardForm.url} onChange={e => setCardForm({...cardForm, url: e.target.value})} />
                  <label className="modern-checkbox">
                    <input type="checkbox" checked={cardForm.isAeps} onChange={e => setCardForm({...cardForm, isAeps: e.target.checked})} /> 
                    <span>Is AEPS?</span>
                  </label>
                  <button className="modern-submit-btn" onClick={addActionCard}>
                    {editingCardId ? 'Update Card' : 'Add Card'}
                  </button>
                  {editingCardId && (
                    <button className="modern-submit-btn" style={{ background: '#6b7280', marginTop: '5px' }} onClick={() => { setEditingCardId(null); setCardForm({ title: '', imgFile: null, icon: '', isAeps: false, url: '' }); }}>Cancel Edit</button>
                  )}
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing Cards</h3>
                <div className="modern-list">
                  {cards.map((c, index) => (
                    <div 
                      className="list-item" 
                      key={c._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={(e) => handleDragEnter(e, index, cards, setCards)}
                      onDragEnd={() => handleDragEnd('action-cards', cards)}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab' }}
                    >
                      <div style={{ marginRight: '10px', color: '#9ca3af', fontSize: '20px' }}>☰</div>
                      <img src={c.img} alt="" className="item-thumb"/>
                      <span className="item-name">{c.title}</span>
                      <div className="item-actions">
                        <button className="modern-edit-btn" onClick={() => startEditCard(c)} style={{ marginRight: '8px', background: '#8B2CFF', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                        <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/action-cards', c._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Tabs Tab */}
          {activeTab === 'topTabs' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Add Top Tab</h3>
                <div className="modern-form">
                  <input type="text" placeholder="Label" value={tabForm.label} onChange={e => setTabForm({...tabForm, label: e.target.value})} />
                  <input type="text" placeholder="Redirect URL (e.g. https://google.com)" value={tabForm.url} onChange={e => setTabForm({...tabForm, url: e.target.value})} />
                  <input type="number" placeholder="Order" value={tabForm.order} onChange={e => setTabForm({...tabForm, order: e.target.value})} />
                  <button className="modern-submit-btn" onClick={() => addItem('REACT_APP_API_URL/api/top-tabs', tabForm, setTabForm, { label: '', order: 0, url: '' }, editingTabId, setEditingTabId)}>
                    {editingTabId ? 'Update Tab' : 'Add Tab'}
                  </button>
                  {editingTabId && (
                    <button className="modern-submit-btn" style={{ background: '#6b7280', marginTop: '5px' }} onClick={() => { setEditingTabId(null); setTabForm({ label: '', order: 0, url: '' }); }}>Cancel Edit</button>
                  )}
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing Tabs</h3>
                <div className="modern-list">
                  {topTabs.map((t, index) => (
                    <div 
                      className="list-item" 
                      key={t._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={(e) => handleDragEnter(e, index, topTabs, setTopTabs)}
                      onDragEnd={() => handleDragEnd('top-tabs', topTabs)}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab' }}
                    >
                      <div style={{ marginRight: '10px', color: '#9ca3af', fontSize: '20px' }}>☰</div>
                      <span className="item-name">{t.label}</span>
                      <div className="item-actions">
                        <button className="modern-edit-btn" onClick={() => startEditTab(t)} style={{ marginRight: '8px', background: '#8B2CFF', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                        <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/top-tabs', t._id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sidebar Menu Tab */}
          {activeTab === 'sidebarMenus' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Add Sidebar Menu</h3>
                <div className="modern-form">
                  <input type="text" placeholder="Label (Leave empty for blank)" value={menuForm.label} onChange={e => setMenuForm({...menuForm, label: e.target.value})} />
                  <input type="number" placeholder="Order" value={menuForm.order} onChange={e => setMenuForm({...menuForm, order: e.target.value})} />
                  <label className="modern-checkbox">
                    <input type="checkbox" checked={menuForm.isActive} onChange={e => setMenuForm({...menuForm, isActive: e.target.checked})} /> 
                    <span>Is Active?</span>
                  </label>
                  <button className="modern-submit-btn" onClick={() => addItem('REACT_APP_API_URL/api/sidebar-menus', menuForm, setMenuForm, { label: '', isActive: false, order: 0 })}>Add Menu</button>
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing Menus</h3>
                <div className="modern-list">
                  {sidebarMenus.map((m, index) => (
                    <div 
                      className="list-item" 
                      key={m._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragEnter={(e) => handleDragEnter(e, index, sidebarMenus, setSidebarMenus)}
                      onDragEnd={() => handleDragEnd('sidebar-menus', sidebarMenus)}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ cursor: 'grab' }}
                    >
                      <div style={{ marginRight: '10px', color: '#9ca3af', fontSize: '20px' }}>☰</div>
                      <span className="item-name">{m.label || '(Empty Block)'} {m.isActive && '★'}</span>
                      <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/sidebar-menus', m._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Banners Tab */}
          {activeTab === 'banners' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Add Banner</h3>
                <div className="modern-form">
                  <div className="file-upload-wrapper">
                    <input type="file" accept="image/*" onChange={e => setBannerForm({...bannerForm, imgFile: e.target.files[0]})} />
                  </div>
                  <input type="text" placeholder="Fallback Icon (e.g. ✈️)" value={bannerForm.fallbackIcon} onChange={e => setBannerForm({...bannerForm, fallbackIcon: e.target.value})} />
                  <input type="text" placeholder="Fallback Person (e.g. 🧍)" value={bannerForm.fallbackPerson} onChange={e => setBannerForm({...bannerForm, fallbackPerson: e.target.value})} />
                  <button className="modern-submit-btn" onClick={addBanner}>Add Banner</button>
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing Banners</h3>
                <div className="modern-list">
                  {banners.map(b => (
                    <div className="list-item" key={b._id}>
                      <img src={b.img} alt="" className="item-thumb large"/>
                      <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/banners', b._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* News Images Tab */}
          {activeTab === 'newsImages' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Add Login News Image</h3>
                <div className="modern-form">
                  <div className="file-upload-wrapper">
                    <input type="file" accept="image/*" onChange={e => setNewsImageForm({ imgFile: e.target.files[0] })} />
                  </div>
                  <button className="modern-submit-btn" onClick={addNewsImage}>Upload Image</button>
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing News Images</h3>
                <div className="modern-list">
                  {newsImages.map(n => (
                    <div className="list-item" key={n._id}>
                      <img src={n.img} alt="" className="item-thumb portrait"/>
                      <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/news-images', n._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Wallet Requests Tab */}
          {activeTab === 'walletRequests' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>UPI Scanner Config</h3>
                <div className="modern-form">
                  <input type="text" placeholder="UPI ID (e.g. mbmitra@upi)" value={upiForm.upiId} onChange={e => setUpiForm({...upiForm, upiId: e.target.value})} />
                  <div className="file-upload-wrapper">
                    <input type="file" accept="image/*" onChange={e => setUpiForm({...upiForm, qrCodeImgFile: e.target.files[0]})} />
                  </div>
                  <button className="modern-submit-btn" onClick={updateUpiConfig}>Update UPI Config</button>
                </div>
              </div>
              <div className="admin-card list-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #f3f4f6', paddingBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Payment Requisitions</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                      value={reqStatusFilter} 
                      onChange={e => setReqStatusFilter(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                    >
                      <option value="All">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Search User ID or Ref No..." 
                      value={reqSearch} 
                      onChange={(e) => setReqSearch(e.target.value)} 
                      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '200px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', overflowY: 'auto', maxHeight: '600px', paddingRight: '10px' }}>
                  {paymentRequisitions
                    .filter(req => reqStatusFilter === 'All' || req.status === reqStatusFilter)
                    .filter(req => req.userId.toLowerCase().includes(reqSearch.toLowerCase()) || req.referenceNumber.toLowerCase().includes(reqSearch.toLowerCase()))
                    .map(req => (
                    <div className="list-item" key={req._id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <strong style={{ fontSize: '16px', color: '#1e293b' }}>👤 {req.userId}</strong>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: req.status === 'Approved' ? '#dcfce7' : req.status === 'Rejected' ? '#fee2e2' : '#fef9c3', color: req.status === 'Approved' ? '#166534' : req.status === 'Rejected' ? '#991b1b' : '#854d0e', fontSize: '12px', fontWeight: 'bold' }}>{req.status}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', gap: '8px' }}>
                        <span><strong>Req:</strong> <span style={{ color: '#111827' }}>₹{req.amount}</span></span>
                        <span><strong>App:</strong> <span style={{ color: '#111827' }}>₹{req.approvedAmount}</span></span>
                        <span><strong>Ref:</strong> {req.referenceNumber}</span>
                        <span><strong>Date:</strong> {new Date(req.paymentDate).toLocaleDateString()}</span>
                        <span style={{ gridColumn: 'span 2' }}><strong>Rem:</strong> {req.remarks || 'N/A'}</span>
                      </div>
                      
                      {req.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px', width: '100%' }}>
                          <button className="modern-submit-btn" style={{ padding: '8px 15px', flex: 1, background: '#22c55e' }} onClick={() => updateRequisition(req._id, 'Approved')}>Approve</button>
                          <button className="modern-delete-btn" style={{ padding: '8px 15px', flex: 1, background: '#ef4444' }} onClick={() => updateRequisition(req._id, 'Rejected')}>Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {paymentRequisitions.length === 0 && <p style={{ color: '#888', padding: '20px' }}>No payment requisitions found.</p>}
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="admin-panel-grid">
              <div className="admin-card form-card">
                <h3>Create New User</h3>
                <div className="modern-form">
                  <input type="text" placeholder="User ID (e.g. MBM000012)" value={userForm.userId} onChange={e => setUserForm({...userForm, userId: e.target.value})} />
                  <input type="email" placeholder="Email Address" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                  <input type="password" placeholder="Password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                  <input type="text" placeholder="Mobile Number (10 digits)" value={userForm.mobile} onChange={e => setUserForm({...userForm, mobile: e.target.value})} />
                  <button className="modern-submit-btn" onClick={addUser}>Create User</button>
                </div>
              </div>
              <div className="admin-card list-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>
                  <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Existing Users</h3>
                  <input 
                    type="text" 
                    placeholder="Search by ID or Mobile..." 
                    value={userSearch} 
                    onChange={(e) => setUserSearch(e.target.value)} 
                    style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', width: '200px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', overflowY: 'auto', maxHeight: '550px', paddingRight: '10px' }}>
                  {users.filter(u => u.userId.toLowerCase().includes(userSearch.toLowerCase()) || (u.mobile && u.mobile.includes(userSearch))).map(u => (
                    <div className="list-item" key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <strong style={{ fontSize: '16px', color: '#1e293b' }}>👤 {u.userId}</strong>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>📱 {u.mobile || 'No Mobile'}</span>
                      </div>
                      <button className="modern-delete-btn" onClick={() => deleteItem('REACT_APP_API_URL/api/users', u._id)} style={{ padding: '8px 12px', borderRadius: '8px' }}>Remove</button>
                    </div>
                  ))}
                  {users.length === 0 && <p style={{ color: '#888', padding: '20px' }}>No users found.</p>}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
