import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './AdminPanel.css';
import { ALL_INDIAN_STATES, ALL_INDIAN_DISTRICTS, PROOF_OF_IDENTITY_OPTIONS, PROOF_OF_ADDRESS_OPTIONS, PROOF_OF_DOB_OPTIONS } from '../../utils/indiaData';

import Form49APdfTemplate, { generateForm49APdf } from '../pancard/Form49APdfGenerator';
import { Form49ADirectEditModal } from '../pancard/Form49ADirectEditModal';
import { API_URL, apiFetch } from '../../utils/apiClient';
import NotificationBell from '../../context/NotificationBell';
import { exportSinglePanApplicationToExcel } from '../../utils/exportPanToExcel';

const showCustomToast = (title, text = '', icon = 'success') => {
  const existingContainer = document.getElementById('custom-app-toast-container');
  if (existingContainer) existingContainer.remove();

  const toastContainer = document.createElement('div');
  toastContainer.id = 'custom-app-toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 999999;
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    border: 1.5px solid ${icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#10b981'};
    padding: 12px 18px;
    border-radius: 12px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 16px ${icon === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    cursor: pointer;
    transition: opacity 0.25s ease, transform 0.25s ease;
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
    max-width: 420px;
    box-sizing: border-box;
  `;

  const iconBg = icon === 'error' ? '#ef4444' : icon === 'warning' ? '#f59e0b' : '#10b981';
  const iconSymbol = icon === 'error' ? '✕' : icon === 'warning' ? '⚠️' : '✓';

  toastContainer.innerHTML = `
    <div style="background: ${iconBg}; color: #ffffff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 13px; flex-shrink: 0; box-shadow: 0 2px 8px ${iconBg}66;">
      ${iconSymbol}
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-size: 13px; font-weight: 800; color: #ffffff; letter-spacing: 0.2px;">${title || 'Notification'}</div>
      ${text ? `<div style="font-size: 11.5px; color: #94a3b8; font-weight: 500; line-height: 1.3;">${text}</div>` : ''}
    </div>
    <div style="margin-left: 8px; font-size: 14px; color: #64748b; font-weight: 700;" title="Close">✕</div>
  `;

  document.body.appendChild(toastContainer);

  requestAnimationFrame(() => {
    toastContainer.style.opacity = '1';
    toastContainer.style.transform = 'translateY(0) scale(1)';
  });

  let timer = null;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    toastContainer.style.opacity = '0';
    toastContainer.style.transform = 'translateY(-15px) scale(0.95)';
    setTimeout(() => {
      if (toastContainer.parentNode) {
        toastContainer.parentNode.removeChild(toastContainer);
      }
    }, 250);
  };

  toastContainer.onclick = dismiss;
  timer = setTimeout(dismiss, 1000);
};

const Toast = {
  fire: (opts = {}) => {
    const title = opts.title || opts.text || 'Notification';
    const text = (opts.title && opts.text) ? opts.text : '';
    const icon = opts.icon || 'success';
    showCustomToast(title, text, icon);
  }
};

// ─── Fees Ledger Tab Component ────────────────────────────────────────────────
const FeesLedgerTab = ({ title, icon, color, applicationType, applications }) => {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [feePerApp, setFeePerApp] = React.useState(107);

  const filtered = React.useMemo(() => {
    return (applications || []).filter(app => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (app.userId || '').toLowerCase().includes(q) ||
        (app.applicantName || app.name || '').toLowerCase().includes(q) ||
        (app.referenceId || app._id || '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || (app.status || '').toLowerCase() === statusFilter.toLowerCase();
      const appDate = app.createdAt ? new Date(app.createdAt) : null;
      const matchStart = !startDate || (appDate && appDate >= new Date(startDate));
      const matchEnd = !endDate || (appDate && appDate <= new Date(endDate + 'T23:59:59'));
      return matchSearch && matchStatus && matchStart && matchEnd;
    });
  }, [applications, search, statusFilter, startDate, endDate]);

  const totalFees = filtered.length * feePerApp;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['S.No', 'Date', 'Retailer ID', 'Applicant Name', 'Reference ID', 'Status', `Fee (₹)`];
    const rows = filtered.map((app, i) => [
      i + 1,
      app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-',
      `"${app.userId || '-'}"`,
      `"${(app.applicantName || app.name || '-').replace(/"/g, '""')}"`,
      `"${app.referenceId || app._id || '-'}"`,
      `"${app.status || '-'}"`,
      feePerApp
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Fees_Ledger_${applicationType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>${title}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}
        h2{color:${color};margin-bottom:4px}
        .meta{font-size:13px;color:#64748b;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #cbd5e1;padding:9px 12px;text-align:left;font-size:12px}
        th{background:#f1f5f9;font-weight:700}
        .total{margin-top:14px;font-size:15px;font-weight:800;color:${color}}
      </style></head><body>
      <h2>${icon} ${title}</h2>
      <div class="meta">Generated: ${new Date().toLocaleString()} | Total Applications: <strong>${filtered.length}</strong> | Fee/App: <strong>₹${feePerApp}</strong></div>
      <table>
        <thead><tr><th>S.No</th><th>Date</th><th>Retailer ID</th><th>Applicant</th><th>Reference ID</th><th>Status</th><th>Fee (₹)</th></tr></thead>
        <tbody>
          ${filtered.map((app, i) => `<tr>
            <td>${i + 1}</td>
            <td>${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}</td>
            <td>${app.userId || '-'}</td>
            <td>${app.applicantName || app.name || '-'}</td>
            <td>${app.referenceId || app._id || '-'}</td>
            <td>${app.status || '-'}</td>
            <td>₹${feePerApp}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="total">Total Collected Fees: ₹${totalFees.toLocaleString()}</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '500px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2.5px solid #f1f5f9', paddingBottom: '15px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: 'white' }}>
            {icon}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>{title}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>Separate fee ledger for each PAN application type</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
            📥 Export CSV
          </button>
          <button onClick={handlePrint} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
            🖨️ Print PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Total Applications', value: filtered.length, bg: '#eff6ff', border: '#bfdbfe', textColor: '#1d4ed8', icon: '📋' },
          { label: 'Fee per Application', value: `₹${feePerApp}`, bg: '#fefce8', border: '#fde68a', textColor: '#b45309', icon: '💵' },
          { label: 'Total Fees Collected', value: `₹${totalFees.toLocaleString()}`, bg: '#f0fdf4', border: '#bbf7d0', textColor: '#15803d', icon: '💰' },
        ].map((card, i) => (
          <div key={i} style={{ background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{card.icon}</div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{card.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: card.textColor, marginTop: '4px' }}>{card.value}</div>
          </div>
        ))}
        <div style={{ background: '#faf5ff', border: '1.5px solid #e9d5ff', borderRadius: '12px', padding: '16px 18px' }}>
          <div style={{ fontSize: '22px', marginBottom: '6px' }}>⚙️</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Fee Rate (₹/App)</div>
          <input
            type="number"
            min="0"
            value={feePerApp}
            onChange={e => setFeePerApp(Number(e.target.value) || 0)}
            style={{ fontSize: '20px', fontWeight: 900, color: '#7c3aed', marginTop: '4px', width: '100%', border: '1.5px solid #d8b4fe', borderRadius: '8px', padding: '4px 8px', background: 'transparent', outline: 'none' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 160px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>🔍 Search</label>
          <input type="text" placeholder="Retailer ID / Name / Ref..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 130px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}>
            <option>All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Submitted">Submitted</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 140px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>From Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 140px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>To Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
        </div>
        <button onClick={() => { setSearch(''); setStatusFilter('All'); setStartDate(''); setEndDate(''); }}
          style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-end' }}>
          ↺ Reset
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>No applications found</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>Try adjusting filters or check PAN submissions</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['S.No', 'Date', 'Retailer ID', 'Applicant Name', 'Reference ID', 'Status', 'Fee (₹)'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 800, color: '#334155', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => {
                const status = app.status || 'Pending';
                const statusColors = { Approved: { bg: '#f0fdf4', color: '#15803d' }, Rejected: { bg: '#fef2f2', color: '#dc2626' }, Pending: { bg: '#fefce8', color: '#b45309' }, Submitted: { bg: '#eff6ff', color: '#1d4ed8' } };
                const sc = statusColors[status] || { bg: '#f8fafc', color: '#475569' };
                return (
                  <tr key={app._id || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#f8fafc'}>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{app.userId || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>{app.applicantName || app.name || '-'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{app.referenceId || (app._id ? app._id.toString().slice(-8).toUpperCase() : '-')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 }}>{status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: color }}>₹{feePerApp}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e2e8f0' }}>
                <td colSpan={6} style={{ padding: '11px 14px', fontWeight: 800, color: '#334155', textAlign: 'right' }}>TOTAL FEES COLLECTED ({filtered.length} applications):</td>
                <td style={{ padding: '11px 14px', fontWeight: 900, fontSize: '15px', color: '#15803d' }}>₹{totalFees.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const AdminPanel = () => {
  const navigate = useNavigate();
  // Role & Staff Permissions
  const userRole = localStorage.getItem('userRole') || 'admin';
  const staffName = localStorage.getItem('staffName') || '';
  const [staffPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('staffPermissions') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    const role = localStorage.getItem('userRole') || 'admin';
    if (role === 'staff') {
      try {
        const perms = JSON.parse(localStorage.getItem('staffPermissions') || '[]');
        return perms.length > 0 ? perms[0] : '';
      } catch (e) {
        return '';
      }
    }
    return 'actionCards';
  });

  const [isUiSubmenuOpen, setIsUiSubmenuOpen] = useState(() => {
    return ['actionCards', 'topTabs', 'sidebarMenus', 'banners', 'newsImages'].includes(activeTab);
  });
  const [isPanSubmenuOpen, setIsPanSubmenuOpen] = useState(() => {
    return ['panSubmissions', 'panForms'].includes(activeTab);
  });
  const [isFeesSubmenuOpen, setIsFeesSubmenuOpen] = useState(() => {
    return ['feesNewApplication', 'feesCorrection'].includes(activeTab);
  });

  useEffect(() => {
    if (['actionCards', 'topTabs', 'sidebarMenus', 'banners', 'newsImages'].includes(activeTab)) {
      setIsUiSubmenuOpen(true);
    }
    if (['panSubmissions', 'panForms'].includes(activeTab)) {
      setIsPanSubmenuOpen(true);
    }
    if (['feesNewApplication', 'feesCorrection'].includes(activeTab)) {
      setIsFeesSubmenuOpen(true);
    }
  }, [activeTab]);

  // Protect Admin Panel - redirect unauthenticated users to Admin Login
  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (adminAuth !== 'true') {
      navigate('/admin-login');
    }
  }, [navigate]);

  // Ensure staff cannot access unauthorized tabs
  useEffect(() => {
    if (userRole === 'staff') {
      const perms = staffPermissions || [];
      if (perms.length > 0 && !perms.includes(activeTab)) {
        setActiveTab(perms[0]);
      }
    }
  }, [userRole, staffPermissions, activeTab]);

  // Staff Management State (Admin only)
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffStatusFilter, setStaffStatusFilter] = useState('ALL');
  const [staffViewMode, setStaffViewMode] = useState('GRID'); // 'GRID' | 'TABLE' | 'BOTH'
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    mobile: '',
    permissions: [],
    isActive: true
  });

  const AVAILABLE_STAFF_MODULES = [
    { id: 'actionCards', label: 'Action Cards', icon: '💳' },
    { id: 'topTabs', label: 'Top Tabs', icon: '📑' },
    { id: 'sidebarMenus', label: 'Sidebar Menus', icon: '☰' },
    { id: 'banners', label: 'Banners', icon: '🖼️' },
    { id: 'newsImages', label: 'Login News Images', icon: '📰' },
    { id: 'panSubmissions', label: 'Retailer PAN Submissions', icon: '📇' },
    { id: 'panForms', label: 'PAN Form Manager', icon: '📝' },
    { id: 'walletRequests', label: 'Wallet Requests', icon: '💼' },
    { id: 'ledgerHistory', label: 'Ledger History', icon: '📒' },
    { id: 'feesNewApplication', label: 'Fees – PAN New Application', icon: '💰' },
    { id: 'feesCorrection', label: 'Fees – PAN Correction', icon: '💰' },
    { id: 'users', label: 'User Management', icon: '👥' },
  ];

  const fetchStaffList = async () => {
    setStaffLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff`);
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff list', err);
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staffMembers' && userRole === 'admin') {
      fetchStaffList();
    }
  }, [activeTab, userRole]);

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setStaffFormData({
      name: '',
      username: '',
      password: '',
      email: '',
      mobile: '',
      permissions: ['panSubmissions', 'panForms'],
      isActive: true
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff) => {
    setEditingStaffId(staff._id);
    setStaffFormData({
      name: staff.name || '',
      username: staff.username || '',
      password: '',
      email: staff.email || '',
      mobile: staff.mobile || '',
      permissions: staff.permissions || [],
      isActive: staff.isActive !== false
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffFormData.name || !staffFormData.username) {
      Toast.fire({ icon: 'warning', title: 'Name and Username are required' });
      return;
    }
    if (!editingStaffId && !staffFormData.password) {
      Toast.fire({ icon: 'warning', title: 'Password is required for new staff' });
      return;
    }

    try {
      const url = editingStaffId 
        ? `${API_URL}/api/staff/${editingStaffId}` 
        : `${API_URL}/api/staff`;
      const method = editingStaffId ? 'PUT' : 'POST';

      const payload = { ...staffFormData };
      if (editingStaffId && !payload.password) {
        delete payload.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = null;
      }

      if (res.ok && data?.success) {
        Toast.fire({
          icon: 'success',
          title: editingStaffId ? 'Staff updated successfully!' : 'Staff created successfully!'
        });
        setIsStaffModalOpen(false);
        fetchStaffList();
      } else {
        Toast.fire({ icon: 'error', title: data?.message || `Failed to save staff (Status ${res.status})` });
      }
    } catch (err) {
      console.error('Staff save error:', err);
      Toast.fire({ icon: 'error', title: err?.message || 'Server error saving staff' });
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    try {
      const res = await fetch(`${API_URL}/api/staff/${staff._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !staff.isActive })
      });
      let data;
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = null;
      }
      if (res.ok && data?.success) {
        Toast.fire({
          icon: 'success',
          title: `Staff ${!staff.isActive ? 'Activated' : 'Suspended'}`
        });
        fetchStaffList();
      } else {
        Toast.fire({ icon: 'error', title: data?.message || 'Update failed' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: err?.message || 'Failed to update status' });
    }
  };

  const handleDeleteStaff = async (staffId, sName) => {
    const result = await Swal.fire({
      title: 'Delete Staff Member?',
      text: `Are you sure you want to remove ${sName}? They will no longer be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`${API_URL}/api/staff/${staffId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          Toast.fire({ icon: 'success', title: 'Staff member deleted' });
          fetchStaffList();
        } else {
          Toast.fire({ icon: 'error', title: data.message || 'Delete failed' });
        }
      } catch (err) {
        Toast.fire({ icon: 'error', title: 'Failed to delete staff' });
      }
    }
  };

  const handleToggleAllPermissions = (select) => {
    if (select) {
      setStaffFormData(prev => ({
        ...prev,
        permissions: AVAILABLE_STAFF_MODULES.map(m => m.id)
      }));
    } else {
      setStaffFormData(prev => ({
        ...prev,
        permissions: []
      }));
    }
  };

  const handleTogglePermission = (moduleId) => {
    setStaffFormData(prev => {
      const current = prev.permissions || [];
      if (current.includes(moduleId)) {
        return { ...prev, permissions: current.filter(id => id !== moduleId) };
      } else {
        return { ...prev, permissions: [...current, moduleId] };
      }
    });
  };

  // eslint-disable-next-line no-unused-vars
  const totalStaffCount = staffList.length;
  // eslint-disable-next-line no-unused-vars
  const activeStaffCount = staffList.filter(s => s.isActive !== false).length;
  // eslint-disable-next-line no-unused-vars
  const suspendedStaffCount = staffList.filter(s => s.isActive === false).length;
  // eslint-disable-next-line no-unused-vars
  const totalPermissionsAssigned = staffList.reduce((acc, s) => acc + (s.permissions ? s.permissions.length : 0), 0);

  const filteredStaffList = staffList.filter(s => {
    if (staffStatusFilter === 'ACTIVE' && s.isActive === false) return false;
    if (staffStatusFilter === 'SUSPENDED' && s.isActive !== false) return false;

    if (!staffSearch.trim()) return true;
    const q = staffSearch.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.username && s.username.toLowerCase().includes(q)) ||
      (s.mobile && s.mobile.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  // States for Retailer PAN Card Submissions & Analytics
  const [panSubmissionsData, setPanSubmissionsData] = useState({
    totalApplications: 0,
    uniqueRetailersCount: 0,
    statusCounts: { Submitted: 0, InProgress: 0, Approved: 0, Completed: 0, Rejected: 0 },
    retailers: [],
    applications: []
  });
  const [panSearchQuery, setPanSearchQuery] = useState('');
  const [panStatusFilter, setPanStatusFilter] = useState('All');
  const [panRetailerFilter, setPanRetailerFilter] = useState('All');
  const [panStartDate, setPanStartDate] = useState('');
  const [panEndDate, setPanEndDate] = useState('');
  const [panMonth, setPanMonth] = useState('');
  const [panPage, setPanPage] = useState(1);
  const [panPageSize, setPanPageSize] = useState(10);
  const [panShowFilters, setPanShowFilters] = useState(true);
  const [selectedPanAppDetails, setSelectedPanAppDetails] = useState(null);
  const [selectedPanAppDocuments, setSelectedPanAppDocuments] = useState(null);
  const [editingPanAppStatus, setEditingPanAppStatus] = useState(null);
  const [newStatusVal, setNewStatusVal] = useState('Submitted');
  const [newStatusRemarks, setNewStatusRemarks] = useState('');
  const [newReceiptFileUrl, setNewReceiptFileUrl] = useState('');
  const [newNsdlReceiptNumber, setNewNsdlReceiptNumber] = useState('');
  const [pdfTargetData, setPdfTargetData] = useState(null);

  const handleDownloadPdf = (app) => {
    if (!app) return;
    const d = app.details || {};
    
    const nameParts = (app.applicantName || d.nameAsPerAadhaar || app.nameAsPerAadhaar || '').trim().split(' ');
    const fName = (app.firstName !== undefined && app.firstName !== '') ? app.firstName : (d.firstName || (nameParts.length > 1 ? nameParts[0] : nameParts[0] || ''));
    const lName = (app.lastName !== undefined && app.lastName !== '') ? app.lastName : (d.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '') || '');
    const mName = (app.middleName !== undefined && app.middleName !== '') ? app.middleName : (d.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '') || '');

    const normalized = {
      ...d,
      ...app,
      firstName: fName,
      lastName: lName,
      middleName: mName,
      nameAsPerAadhaar: app.nameAsPerAadhaar || d.nameAsPerAadhaar || app.applicantName || `${fName} ${lName}`.trim(),
      title: app.title || d.title || 'SHRI',
      otherName: app.otherName || d.otherName || 'NO',
      gender: (app.gender || d.gender || 'MALE').toUpperCase(),
      dob: app.dob || d.dob || '',
      mobileNumber: app.mobileNumber || d.mobileNumber || '',
      email: app.email || d.email || '',
      aadhaarNumber: app.aadhaarNumber || d.aadhaarNumber || '',
      panNumber: app.panNumber || d.panNumber || '',
      photoUrl: app.photoUrl || d.photoUrl || '',
      signatureUrl: app.signatureUrl || d.signatureUrl || '',
      fatherFirstName: (app.fatherFirstName !== undefined && app.fatherFirstName !== '') ? app.fatherFirstName : (d.fatherFirstName || app.fatherName || ''),
      fatherLastName: (app.fatherLastName !== undefined && app.fatherLastName !== '') ? app.fatherLastName : (d.fatherLastName || ''),
      fatherMiddleName: (app.fatherMiddleName !== undefined && app.fatherMiddleName !== '') ? app.fatherMiddleName : (d.fatherMiddleName || ''),
      motherFirstName: app.motherFirstName || d.motherFirstName || '',
      motherMiddleName: app.motherMiddleName || d.motherMiddleName || '',
      motherLastName: app.motherLastName || d.motherLastName || '',
      isSingleParent: app.isSingleParent || app.isSingleMother || d.isSingleParent || d.isSingleMother || 'NO',
      isSingleMother: app.isSingleMother || app.isSingleParent || d.isSingleMother || d.isSingleParent || 'NO',
      cardParentName: app.cardParentName || d.cardParentName || 'FATHER',
      parentNameToPrint: app.cardParentName || d.cardParentName || 'FATHER',
      aoAreaCode: app.aoAreaCode || d.aoAreaCode || 'PNE',
      aoType: app.aoType || d.aoType || 'C',
      aoRangeCode: app.aoRangeCode || d.aoRangeCode || '94',
      aoNo: app.aoNo || d.aoNo || '1',
      flatNo: app.flatNo || d.flatNo || '',
      premises: app.premises || d.premises || '',
      roadStreet: app.roadStreet || d.roadStreet || '',
      areaTaluka: app.areaTaluka || d.areaTaluka || '',
      district: app.district || d.district || '',
      state: app.state || d.state || 'MAHARASHTRA',
      pincode: app.pincode || d.pincode || '',
      commAddress: app.commAddress || d.commAddress || 'RESIDENCE',
      communicationAddress: app.commAddress || d.commAddress || 'RESIDENCE',
      applicantStatus: app.applicantStatus || d.applicantStatus || 'INDIVIDUAL',
      incomeSource: app.incomeSource || d.incomeSource || 'NO INCOME',
      proofOfIdentity: app.proofOfIdentity || d.proofOfIdentity || 'AADHAAR CARD',
      proofOfAddress: app.proofOfAddress || d.proofOfAddress || 'AADHAAR CARD',
      proofOfDob: app.proofOfDob || d.proofOfDob || 'AADHAAR CARD',
      verifierName: app.verifierName || d.verifierName || `${fName} ${lName}`.trim() || app.applicantName || '',
      verifierCapacity: app.verifierCapacity || d.verifierCapacity || 'HIMSELF/HERSELF',
      verifierPlace: app.verifierPlace || d.verifierPlace || app.district || d.district || '',
      verifierDate: app.verifierDate || d.verifierDate || new Date().toISOString().split('T')[0]
    };

    setPdfTargetData(normalized);

    setTimeout(() => {
      generateForm49APdf(normalized);
    }, 200);
  };

  const handleOpenPanDocuments = async (app) => {
    if (!app?._id) return;
    try {
      const response = await fetch(`${API_URL}/api/pancard/application/${app._id}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to fetch documents.');
      setSelectedPanAppDocuments(data.application);
    } catch (error) {
      console.error('Error fetching PAN documents:', error);
      alert(error.message || 'Unable to fetch documents.');
    }
  };

  const handleViewPanDocument = async (applicationId, documentKey) => {
    const viewer = window.open('', '_blank');
    if (!viewer) {
      alert('Please allow popups to view uploaded documents.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/pancard/application/${applicationId}/document/${documentKey}`);
      if (!response.ok) throw new Error('Unable to load document.');
      const documentBlob = await response.blob();
      viewer.location.href = URL.createObjectURL(documentBlob);
    } catch (error) {
      viewer.close();
      console.error('Error viewing PAN document:', error);
      alert(error.message || 'Unable to load document.');
    }
  };

  const [editPanData, setEditPanData] = useState(null);

  useEffect(() => {
    if (selectedPanAppDetails) {
      const app = selectedPanAppDetails;
      const d = app.details || {};
      const nameParts = (app.applicantName || d.nameAsPerAadhaar || '').trim().split(' ');
      setEditPanData({
        _id: app._id,
        title: d.title || 'SHRI',
        lastName: d.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0] || ''),
        firstName: d.firstName || (nameParts.length > 1 ? nameParts[0] : ''),
        middleName: d.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''),
        nameAsPerAadhaar: d.nameAsPerAadhaar || app.applicantName || '',
        gender: app.gender || d.gender || 'Male',
        dob: app.dob || d.dob || '',
        fatherLastName: d.fatherLastName || (app.fatherName || '').split(' ').pop() || '',
        fatherFirstName: d.fatherFirstName || (app.fatherName || '').split(' ')[0] || '',
        fatherMiddleName: d.fatherMiddleName || '',
        motherLastName: d.motherLastName || '',
        motherFirstName: d.motherFirstName || '',
        motherMiddleName: d.motherMiddleName || '',
        aoAreaCode: d.aoAreaCode || 'PNE',
        aoType: d.aoType || 'C',
        aoRangeCode: d.aoRangeCode || '94',
        aoNo: d.aoNo || '1',
        flatNo: d.flatNo || '',
        premises: d.premises || '',
        roadStreet: d.roadStreet || '',
        areaTaluka: d.areaTaluka || '',
        district: d.district || '',
        state: d.state || 'MAHARASHTRA',
        pincode: d.pincode || '',
        mobileNumber: app.mobileNumber || d.mobileNumber || '',
        email: app.email || d.email || '',
        aadhaarNumber: app.aadhaarNumber || d.aadhaarNumber || '',
        panNumber: app.panNumber || d.panNumber || '',
        proofOfIdentity: d.proofOfIdentity || 'AADHAAR CARD',
        proofOfAddress: d.proofOfAddress || 'AADHAAR CARD',
        proofOfDob: d.proofOfDob || 'AADHAAR CARD',
        photoUrl: app.photoUrl || d.photoUrl || '',
        signatureUrl: app.signatureUrl || d.signatureUrl || '',
        applicationType: app.applicationType || 'Manual New PAN',
        ackNumber: app.ackNumber || '',
        userId: app.userId || ''
      });
    } else {
      setEditPanData(null);
    }
  }, [selectedPanAppDetails]);

  // eslint-disable-next-line no-unused-vars
  const handleSaveEditedPanApp = async () => {
    if (!editPanData || !editPanData._id) return;
    try {
      const fullApplicantName = `${editPanData.title || ''} ${editPanData.firstName || ''} ${editPanData.middleName || ''} ${editPanData.lastName || ''}`.trim() || editPanData.nameAsPerAadhaar;
      const fullFatherName = `${editPanData.fatherFirstName || ''} ${editPanData.fatherMiddleName || ''} ${editPanData.fatherLastName || ''}`.trim();

      const payload = {
        applicantName: fullApplicantName,
        fatherName: fullFatherName,
        dob: editPanData.dob,
        gender: editPanData.gender,
        mobileNumber: editPanData.mobileNumber,
        email: editPanData.email,
        aadhaarNumber: editPanData.aadhaarNumber,
        panNumber: editPanData.panNumber,
        details: { ...editPanData }
      };

      const res = await fetch(`${API_URL}/api/pancard/update-application/${editPanData._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        alert('✅ Application details updated & saved to database!');
        setPdfTargetData({ ...editPanData, applicantName: fullApplicantName, fatherName: fullFatherName });
        fetchAll();
      } else {
        alert('Error updating application: ' + data.message);
      }
    } catch (err) {
      alert('Failed to save changes: ' + err.message);
    }
  };

  // States for fetching data
  const [cards, setCards] = useState([]);
  const [topTabs, setTopTabs] = useState([]);
  const [sidebarMenus, setSidebarMenus] = useState([]);
  const [banners, setBanners] = useState([]);
  const [newsImages, setNewsImages] = useState([]);
  const [users, setUsers] = useState([]);
  const [marqueeInput, setMarqueeInput] = useState('WELCOME TO MB MITRA');

  // States for Wallet Ledger History Reports
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFilters, setLedgerFilters] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    month: '',
    transactionType: 'All',
    status: 'All',
    search: ''
  });
  const [filterInput, setFilterInput] = useState({
    userId: '',
    startDate: '',
    endDate: '',
    month: '',
    transactionType: 'All',
    status: 'All',
    search: ''
  });
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerPageSize, setLedgerPageSize] = useState(10);

  // States for Admin to Retailer Wallet Payment / Adjustment
  const [retailerSearchQuery, setRetailerSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showRetailerModal, setShowRetailerModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [transferTxType, setTransferTxType] = useState('Credit'); // 'Credit' | 'Debit'
  const [transferAmount, setTransferAmount] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Form States
  const DEFAULT_PAN_TABS = [
    {
      id: 'manual_new_pan',
      label: 'Manual New PAN',
      icon: '📄',
      fee: 107,
      badge: 'Form 49A Physical',
      badgeClass: '',
      description: 'Detailed manual PAN Application with Photo & Signature Upload support.',
      fields: [
        { name: 'category', label: 'CATEGORY OF APPLICANT', type: 'select', options: ['INDIVIDUAL', 'FIRM', 'BODY OF INDIVIDUALS', 'TRUST', 'ASSOCIATION OF PERSONS', 'LOCAL AUTHORITY', 'COMPANY', 'HINDU UNDIVIDED FAMILY', 'LIMITED LIABILITY PARTNERSHIP', 'ARTIFICIAL JURIDICAL PERSON', 'GOVERNMENT'], required: true, formType: 'Both' },
        { name: 'aadhaarNumber', label: 'AADHAAR NO', type: 'text', placeholder: '12 DIGITS UID NO', required: true, formType: 'Form 93' },
        { name: 'proofOfDob', label: 'PROOF OF DOB', type: 'select', options: PROOF_OF_DOB_OPTIONS, required: true, formType: 'Form 93' },
        { name: 'title', label: 'TITLE', type: 'select', options: ['SELECT', 'SHRI', 'SMT', 'KUMARI'], required: true, formType: 'Form 93' },
        { name: 'firstName', label: 'FIRST NAME', type: 'text', placeholder: 'FIRST NAME', required: false, formType: 'Form 93' },
        { name: 'middleName', label: 'MIDDLE NAME', type: 'text', placeholder: 'MIDDLE NAME', required: false, formType: 'Form 93' },
        { name: 'lastName', label: 'LAST NAME / SURNAME', type: 'text', placeholder: 'LAST NAME / SURNAME', required: true, formType: 'Form 93' },
        { name: 'isSingleParent', label: 'WHETHER MOTHER/FATHER IS A SINGLE PARENT', type: 'select', options: ['NO', 'YES'], required: true, formType: 'Form 93' },
        { name: 'fatherFirstName', label: "FATHER'S FIRST NAME", type: 'text', placeholder: 'FATHER FIRST NAME', required: false, formType: 'Form 93' },
        { name: 'fatherMiddleName', label: "FATHER'S MIDDLE NAME", type: 'text', placeholder: 'FATHER MIDDLE NAME', required: false, formType: 'Form 93' },
        { name: 'fatherLastName', label: "FATHER'S LAST NAME", type: 'text', placeholder: 'FATHER LAST NAME', required: false, formType: 'Form 93' },
        { name: 'motherFirstName', label: "MOTHER'S FIRST NAME", type: 'text', placeholder: 'MOTHER FIRST NAME', required: false, formType: 'Form 93' },
        { name: 'motherMiddleName', label: "MOTHER'S MIDDLE NAME", type: 'text', placeholder: 'MOTHER MIDDLE NAME', required: false, formType: 'Form 93' },
        { name: 'motherLastName', label: "MOTHER'S LAST NAME", type: 'text', placeholder: 'MOTHER LAST NAME', required: false, formType: 'Form 93' },
        { name: 'nameAsPerAadhaar', label: 'NAME AS PER AADHAAR', type: 'text', placeholder: 'NAME AS PER AADHAAR', required: true, formType: 'Form 93' },
        { name: 'gender', label: 'GENDER', type: 'select', options: ['SELECT', 'MALE', 'FEMALE', 'TRANSGENDER'], required: true, formType: 'Form 93' },
        { name: 'dob', label: 'DATE OF BIRTH', type: 'date', required: true, formType: 'Form 93' },
        { name: 'mobileNumber', label: 'MOBILE NO.', type: 'tel', placeholder: 'MOBILE NO.', required: true, formType: 'Both' },
        { name: 'email', label: 'EMAIL ID', type: 'email', placeholder: 'EMAIL ID', required: true, formType: 'Both' },
        { name: 'flatNo', label: 'FLAT/DOOR/BLOCK NO', type: 'text', placeholder: 'FLAT/DOOR/BLOCK NO', required: true, formType: 'Form 93' },
        { name: 'premises', label: 'PREMISES/BUILDING/VILLAGE', type: 'text', placeholder: 'PREMISES/BUILDING/VILLAGE', required: true, formType: 'Form 93' },
        { name: 'roadStreet', label: 'ROAD/STREET/POST OFFICE', type: 'text', placeholder: 'ROAD/STREET/LANE/POST OFFICE', required: true, formType: 'Form 93' },
        { name: 'areaTaluka', label: 'AREA/TALUKA/SUB DIVISION', type: 'text', placeholder: 'AREA/TALUKA/SUB DIVISION', required: true, formType: 'Form 93' },
        { name: 'state', label: 'STATE', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: true, formType: 'Form 93' },
        { name: 'district', label: 'TOWN/DISTRICT', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: true, formType: 'Form 93' },
        { name: 'pincode', label: 'PINCODE', type: 'text', placeholder: 'PINCODE', required: true, formType: 'Form 93' },
        { name: 'proofOfIdentity', label: 'PROOF OF IDENTITY', type: 'select', options: PROOF_OF_IDENTITY_OPTIONS, required: true, formType: 'Form 93' },
        { name: 'proofOfAddress', label: 'PROOF OF ADDRESS', type: 'select', options: PROOF_OF_ADDRESS_OPTIONS, required: true, formType: 'Form 93' },

        { name: 'photoUrl', label: 'Upload Applicant Photo', type: 'file', required: false, formType: 'Form 93' },
        { name: 'signatureUrl', label: 'Upload Applicant Signature', type: 'file', required: false, formType: 'Form 93' },
        // Form 94 (Non-Individual / Other Entities) Fields
        { name: 'entityName', label: 'NAME OF FIRM / COMPANY / TRUST / ENTITY (FORM 94)', type: 'text', placeholder: 'NAME OF ENTITY / FIRM', required: false, formType: 'Form 94' },
        { name: 'dateOfIncorporation', label: 'DATE OF INCORPORATION / AGREEMENT / FORMATION (FORM 94)', type: 'date', required: false, formType: 'Form 94' },
        { name: 'registrationNumber', label: 'REGISTRATION NUMBER (IF ANY) (FORM 94)', type: 'text', placeholder: 'REGISTRATION NUMBER', required: false, formType: 'Form 94' },
        { name: 'incomeSource', label: 'SOURCE OF INCOME (FORM 94)', type: 'select', options: ['Income from Business/Profession', 'Salary', 'Capital Gains', 'Income from House Property', 'Income from Other Sources', 'No Income'], required: false, formType: 'Form 94' },
        { name: 'proofOfIncorporation', label: 'PROOF OF INCORPORATION / REGISTRATION (FORM 94)', type: 'select', options: ['CERTIFICATE OF INCORPORATION / REGISTRATION', 'PARTNERSHIP DEED', 'TRUST DEED / AGREEMENT', 'REGISTRATION CERTIFICATE'], required: false, formType: 'Form 94' },
        { name: 'commFlatNo', label: 'OFFICE FLAT/DOOR/BLOCK NO (FORM 94)', type: 'text', placeholder: 'OFFICE FLAT NO', required: false, formType: 'Form 94' },
        { name: 'commPremises', label: 'OFFICE PREMISES/BUILDING/VILLAGE (FORM 94)', type: 'text', placeholder: 'OFFICE PREMISES', required: false, formType: 'Form 94' },
        { name: 'commRoadStreet', label: 'OFFICE ROAD/STREET/POST OFFICE (FORM 94)', type: 'text', placeholder: 'OFFICE ROAD STREET', required: false, formType: 'Form 94' },
        { name: 'commAreaTaluka', label: 'OFFICE AREA/TALUKA/SUB DIVISION (FORM 94)', type: 'text', placeholder: 'OFFICE AREA TALUKA', required: false, formType: 'Form 94' },
        { name: 'commState', label: 'OFFICE STATE (FORM 94)', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: false, formType: 'Form 94' },
        { name: 'commDistrict', label: 'OFFICE TOWN/DISTRICT (FORM 94)', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: false, formType: 'Form 94' },
        { name: 'commPincode', label: 'OFFICE PINCODE (FORM 94)', type: 'text', placeholder: 'OFFICE PINCODE', required: false, formType: 'Form 94' },
        { name: 'raTitle', label: 'REPRESENTATIVE ASSESSEE TITLE (FORM 94)', type: 'select', options: ['SHRI', 'SMT', 'KUMARI', 'M/S'], required: false, formType: 'Form 94' },
        { name: 'raFirstName', label: 'REPRESENTATIVE ASSESSEE FIRST NAME (FORM 94)', type: 'text', placeholder: 'RA FIRST NAME', required: false, formType: 'Form 94' },
        { name: 'raMiddleName', label: 'REPRESENTATIVE ASSESSEE MIDDLE NAME (FORM 94)', type: 'text', placeholder: 'RA MIDDLE NAME', required: false, formType: 'Form 94' },
        { name: 'raLastName', label: 'REPRESENTATIVE ASSESSEE LAST NAME (FORM 94)', type: 'text', placeholder: 'RA LAST NAME', required: false, formType: 'Form 94' },
        { name: 'raPanNumber', label: 'REPRESENTATIVE ASSESSEE PAN (FORM 94)', type: 'text', placeholder: 'RA PAN NUMBER', required: false, formType: 'Form 94' },
        { name: 'raAadhaarNumber', label: 'REPRESENTATIVE ASSESSEE AADHAAR NO (FORM 94)', type: 'text', placeholder: 'RA AADHAAR NO', required: false, formType: 'Form 94' },
        { name: 'raMobileNumber', label: 'REPRESENTATIVE ASSESSEE MOBILE NO (FORM 94)', type: 'text', placeholder: 'RA MOBILE NO', required: false, formType: 'Form 94' },
        { name: 'raEmail', label: 'REPRESENTATIVE ASSESSEE EMAIL ID (FORM 94)', type: 'email', placeholder: 'RA EMAIL ID', required: false, formType: 'Form 94' },
        { name: 'raFlatNo', label: 'REPRESENTATIVE ASSESSEE FLAT NO (FORM 94)', type: 'text', placeholder: 'RA FLAT NO', required: false, formType: 'Form 94' },
        { name: 'raRoadStreet', label: 'REPRESENTATIVE ASSESSEE ROAD/STREET (FORM 94)', type: 'text', placeholder: 'RA ROAD STREET', required: false, formType: 'Form 94' },
        { name: 'raAreaTaluka', label: 'REPRESENTATIVE ASSESSEE AREA/TALUKA (FORM 94)', type: 'text', placeholder: 'RA AREA TALUKA', required: false, formType: 'Form 94' },
        { name: 'raDistrict', label: 'REPRESENTATIVE ASSESSEE DISTRICT (FORM 94)', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: false, formType: 'Form 94' },
        { name: 'raState', label: 'REPRESENTATIVE ASSESSEE STATE (FORM 94)', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: false, formType: 'Form 94' },
        { name: 'raPincode', label: 'REPRESENTATIVE ASSESSEE PINCODE (FORM 94)', type: 'text', placeholder: 'RA PINCODE', required: false, formType: 'Form 94' },
        { name: 'verifierName', label: 'VERIFIER NAME (FORM 94)', type: 'text', placeholder: 'VERIFIER NAME', required: false, formType: 'Form 94' },
        { name: 'verifierCapacity', label: 'VERIFIER CAPACITY (FORM 94)', type: 'select', options: ['PARTNER', 'DIRECTOR', 'TRUSTEE', 'AUTHORISED SIGNATORY', 'PROPRIETOR', 'KARTA'], required: false, formType: 'Form 94' },
        { name: 'verifierPlace', label: 'VERIFIER PLACE (FORM 94)', type: 'text', placeholder: 'VERIFIER PLACE', required: false, formType: 'Form 94' },
        { name: 'verifierDate', label: 'VERIFIER DATE (FORM 94)', type: 'date', required: false, formType: 'Form 94' }
      ]
    },
    {
      id: 'epan_kyc',
      label: 'Aadhaar OTP New PAN',
      icon: '📲',
      fee: 107,
      badge: 'Instant E-KYC Mode',
      badgeClass: '',
      description: 'Instant E-KYC application using Aadhaar OTP / Biometric verification.',
      fields: [
        { name: 'applicantName', label: 'Applicant Full Name (As per Aadhaar)', type: 'text', placeholder: 'Enter full name of applicant...', icon: '👤', required: true, gridSpan: 1 },
        { name: 'fatherName', label: "Father's Full Name", type: 'text', placeholder: "Enter father's full name...", icon: '👨‍👦', required: true, gridSpan: 1 },
        { name: 'dob', label: 'Date of Birth (DOB)', type: 'date', icon: '📅', required: true, gridSpan: 1 },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Transgender'], icon: '🚻', required: true, gridSpan: 1, defaultValue: 'Male' },
        { name: 'mobileNumber', label: 'Mobile Number', type: 'tel', maxLength: 10, placeholder: '10-digit mobile number...', icon: '📱', required: true, gridSpan: 1 },
        { name: 'email', label: 'Email Address', type: 'email', placeholder: 'Enter email for e-PAN soft copy...', icon: '📧', required: true, gridSpan: 1 },
        { name: 'aadhaarNumber', label: '12-Digit Aadhaar Number', type: 'text', maxLength: 12, placeholder: '12-digit Aadhaar number...', icon: '🆔', required: true, gridSpan: 1 }
      ]
    },
    {
      id: 'epan_correction',
      label: 'Already PAN / Correction',
      icon: '📝',
      fee: 107,
      badge: 'PAN Update Service',
      badgeClass: 'badge-correction',
      description: 'Update or correct personal details on your existing PAN Card record.',
      fields: [
        { name: 'category', label: 'CATEGORY OF APPLICANT', type: 'select', options: ['INDIVIDUAL', 'FIRM', 'BODY OF INDIVIDUALS', 'TRUST', 'ASSOCIATION OF PERSONS', 'LOCAL AUTHORITY', 'COMPANY', 'HINDU UNDIVIDED FAMILY', 'LIMITED LIABILITY PARTNERSHIP', 'ARTIFICIAL JURIDICAL PERSON', 'GOVERNMENT'], required: true, formType: 'Both' },
        { name: 'panNumber', label: 'EXISTING PAN NUMBER', type: 'text', placeholder: 'e.g. ABCDE1234F', required: true, uppercase: true, formType: 'Both' },
        { name: 'aadhaarNumber', label: 'AADHAAR NO', type: 'text', placeholder: '12 DIGITS UID NO', required: true, formType: 'Form 93' },
        { name: 'firstName', label: 'FIRST NAME', type: 'text', placeholder: 'FIRST NAME', required: true, formType: 'Form 93' },
        { name: 'middleName', label: 'MIDDLE NAME', type: 'text', placeholder: 'MIDDLE NAME', required: false, formType: 'Form 93' },
        { name: 'lastName', label: 'LAST NAME / SURNAME', type: 'text', placeholder: 'LAST NAME / SURNAME', required: true, formType: 'Form 93' },
        { name: 'nameAsPerAadhaar', label: 'NAME AS PER AADHAAR', type: 'text', placeholder: 'NAME AS PER AADHAAR', required: true, formType: 'Form 93' },
        { name: 'gender', label: 'GENDER', type: 'select', options: ['SELECT', 'MALE', 'FEMALE', 'TRANSGENDER'], required: true, formType: 'Form 93' },
        { name: 'dob', label: 'DATE OF BIRTH', type: 'date', required: true, formType: 'Form 93' },
        { name: 'mobileNumber', label: 'MOBILE NO.', type: 'tel', placeholder: 'MOBILE NO.', required: true, formType: 'Both' },
        { name: 'email', label: 'EMAIL ID', type: 'email', placeholder: 'EMAIL ID', required: true, formType: 'Both' },
        { name: 'flatNo', label: 'FLAT / DOOR / BLOCK NO', type: 'text', placeholder: 'FLAT / DOOR / BLOCK NO', required: true, formType: 'Form 93' },
        { name: 'premises', label: 'PREMISES / BUILDING / VILLAGE', type: 'text', placeholder: 'PREMISES / BUILDING / VILLAGE', required: true, formType: 'Form 93' },
        { name: 'roadStreet', label: 'ROAD / STREET / POST OFFICE', type: 'text', placeholder: 'ROAD / STREET / POST OFFICE', required: true, formType: 'Form 93' },
        { name: 'areaTaluka', label: 'AREA / TALUKA / SUB DIVISION', type: 'text', placeholder: 'AREA / TALUKA / SUB DIVISION', required: true, formType: 'Form 93' },
        { name: 'state', label: 'STATE / UNION TERRITORY', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: true, formType: 'Form 93' },
        { name: 'district', label: 'TOWN / DISTRICT', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: true, formType: 'Form 93' },
        { name: 'pincode', label: 'PINCODE', type: 'text', placeholder: 'PINCODE', required: true, formType: 'Form 93' },
        { name: 'parentToPrint', label: 'PARENT NAME TO PRINT ON PAN CARD', type: 'select', options: ['Father', 'Mother'], required: true, formType: 'Form 93' },
        { name: 'fatherFirstName', label: "FATHER'S FIRST NAME", type: 'text', placeholder: "FATHER'S FIRST NAME", required: true, formType: 'Form 93' },
        { name: 'fatherMiddleName', label: "FATHER'S MIDDLE NAME", type: 'text', placeholder: "FATHER'S MIDDLE NAME", required: false, formType: 'Form 93' },
        { name: 'fatherLastName', label: "FATHER'S LAST NAME", type: 'text', placeholder: "FATHER'S LAST NAME", required: true, formType: 'Form 93' },
        { name: 'motherFirstName', label: "MOTHER'S FIRST NAME", type: 'text', placeholder: "MOTHER'S FIRST NAME", required: false, formType: 'Form 93' },
        { name: 'motherMiddleName', label: "MOTHER'S MIDDLE NAME", type: 'text', placeholder: "MOTHER'S MIDDLE NAME", required: false, formType: 'Form 93' },
        { name: 'motherLastName', label: "MOTHER'S LAST NAME", type: 'text', placeholder: "MOTHER'S LAST NAME", required: false, formType: 'Form 93' },
        { name: 'proofOfIdentity', label: 'PROOF OF IDENTITY', type: 'select', options: PROOF_OF_IDENTITY_OPTIONS, required: true, formType: 'Form 93' },
        { name: 'proofOfAddress', label: 'PROOF OF ADDRESS', type: 'select', options: PROOF_OF_ADDRESS_OPTIONS, required: true, formType: 'Form 93' },
        { name: 'proofOfDob', label: 'PROOF OF DATE OF BIRTH', type: 'select', options: PROOF_OF_DOB_OPTIONS, required: true, formType: 'Form 93' },

        { name: 'passportNumber', label: 'PASSPORT NUMBER (IF APPLICABLE)', type: 'text', placeholder: 'PASSPORT NUMBER', required: false, formType: 'Form 93' },
        { name: 'photoUrl', label: 'UPLOAD APPLICANT PHOTO', type: 'file', required: false, formType: 'Form 93' },
        { name: 'signatureUrl', label: 'UPLOAD APPLICANT SIGNATURE', type: 'file', required: false, formType: 'Form 93' },
        // Form 94 (Non-Individual / Entity Corrections)
        { name: 'entityName', label: 'NAME OF FIRM / COMPANY / TRUST / ENTITY (FORM 94)', type: 'text', placeholder: 'NAME OF ENTITY / FIRM', required: false, formType: 'Form 94' },
        { name: 'dateOfIncorporation', label: 'DATE OF INCORPORATION / AGREEMENT / FORMATION (FORM 94)', type: 'date', required: false, formType: 'Form 94' },
        { name: 'registrationNumber', label: 'REGISTRATION NUMBER (IF ANY) (FORM 94)', type: 'text', placeholder: 'REGISTRATION NUMBER', required: false, formType: 'Form 94' },
        { name: 'incomeSource', label: 'SOURCE OF INCOME (FORM 94)', type: 'select', options: ['Income from Business/Profession', 'Salary', 'Capital Gains', 'Income from House Property', 'Income from Other Sources', 'No Income'], required: false, formType: 'Form 94' },
        { name: 'proofOfIncorporation', label: 'PROOF OF INCORPORATION / REGISTRATION (FORM 94)', type: 'select', options: ['CERTIFICATE OF INCORPORATION / REGISTRATION', 'PARTNERSHIP DEED', 'TRUST DEED / AGREEMENT', 'REGISTRATION CERTIFICATE'], required: false, formType: 'Form 94' },
        { name: 'commFlatNo', label: 'OFFICE FLAT/DOOR/BLOCK NO (FORM 94)', type: 'text', placeholder: 'OFFICE FLAT NO', required: false, formType: 'Form 94' },
        { name: 'commPremises', label: 'OFFICE PREMISES/BUILDING/VILLAGE (FORM 94)', type: 'text', placeholder: 'OFFICE PREMISES', required: false, formType: 'Form 94' },
        { name: 'commRoadStreet', label: 'OFFICE ROAD/STREET/POST OFFICE (FORM 94)', type: 'text', placeholder: 'OFFICE ROAD STREET', required: false, formType: 'Form 94' },
        { name: 'commAreaTaluka', label: 'OFFICE AREA/TALUKA/SUB DIVISION (FORM 94)', type: 'text', placeholder: 'OFFICE AREA TALUKA', required: false, formType: 'Form 94' },
        { name: 'commState', label: 'OFFICE STATE (FORM 94)', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: false, formType: 'Form 94' },
        { name: 'commDistrict', label: 'OFFICE TOWN/DISTRICT (FORM 94)', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: false, formType: 'Form 94' },
        { name: 'commPincode', label: 'OFFICE PINCODE (FORM 94)', type: 'text', placeholder: 'OFFICE PINCODE', required: false, formType: 'Form 94' },
        { name: 'raTitle', label: 'REPRESENTATIVE ASSESSEE TITLE (FORM 94)', type: 'select', options: ['SHRI', 'SMT', 'KUMARI', 'M/S'], required: false, formType: 'Form 94' },
        { name: 'raFirstName', label: 'REPRESENTATIVE ASSESSEE FIRST NAME (FORM 94)', type: 'text', placeholder: 'RA FIRST NAME', required: false, formType: 'Form 94' },
        { name: 'raMiddleName', label: 'REPRESENTATIVE ASSESSEE MIDDLE NAME (FORM 94)', type: 'text', placeholder: 'RA MIDDLE NAME', required: false, formType: 'Form 94' },
        { name: 'raLastName', label: 'REPRESENTATIVE ASSESSEE LAST NAME (FORM 94)', type: 'text', placeholder: 'RA LAST NAME', required: false, formType: 'Form 94' },
        { name: 'raPanNumber', label: 'REPRESENTATIVE ASSESSEE PAN (FORM 94)', type: 'text', placeholder: 'RA PAN NUMBER', required: false, formType: 'Form 94' },
        { name: 'raAadhaarNumber', label: 'REPRESENTATIVE ASSESSEE AADHAAR NO (FORM 94)', type: 'text', placeholder: 'RA AADHAAR NO', required: false, formType: 'Form 94' },
        { name: 'raMobileNumber', label: 'REPRESENTATIVE ASSESSEE MOBILE NO (FORM 94)', type: 'text', placeholder: 'RA MOBILE NO', required: false, formType: 'Form 94' },
        { name: 'raEmail', label: 'REPRESENTATIVE ASSESSEE EMAIL ID (FORM 94)', type: 'email', placeholder: 'RA EMAIL ID', required: false, formType: 'Form 94' },
        { name: 'raFlatNo', label: 'REPRESENTATIVE ASSESSEE FLAT NO (FORM 94)', type: 'text', placeholder: 'RA FLAT NO', required: false, formType: 'Form 94' },
        { name: 'raRoadStreet', label: 'REPRESENTATIVE ASSESSEE ROAD/STREET (FORM 94)', type: 'text', placeholder: 'RA ROAD STREET', required: false, formType: 'Form 94' },
        { name: 'raAreaTaluka', label: 'REPRESENTATIVE ASSESSEE AREA/TALUKA (FORM 94)', type: 'text', placeholder: 'RA AREA TALUKA', required: false, formType: 'Form 94' },
        { name: 'raDistrict', label: 'REPRESENTATIVE ASSESSEE DISTRICT (FORM 94)', type: 'select', options: ['SELECT', ...ALL_INDIAN_DISTRICTS], required: false, formType: 'Form 94' },
        { name: 'raState', label: 'REPRESENTATIVE ASSESSEE STATE (FORM 94)', type: 'select', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES], required: false, formType: 'Form 94' },
        { name: 'raPincode', label: 'REPRESENTATIVE ASSESSEE PINCODE (FORM 94)', type: 'text', placeholder: 'RA PINCODE', required: false, formType: 'Form 94' },
        { name: 'verifierName', label: 'VERIFIER NAME (FORM 94)', type: 'text', placeholder: 'VERIFIER NAME', required: false, formType: 'Form 94' },
        { name: 'verifierCapacity', label: 'VERIFIER CAPACITY (FORM 94)', type: 'select', options: ['PARTNER', 'DIRECTOR', 'TRUSTEE', 'AUTHORISED SIGNATORY', 'PROPRIETOR', 'KARTA'], required: false, formType: 'Form 94' },
        { name: 'verifierPlace', label: 'VERIFIER PLACE (FORM 94)', type: 'text', placeholder: 'VERIFIER PLACE', required: false, formType: 'Form 94' },
        { name: 'verifierDate', label: 'VERIFIER DATE (FORM 94)', type: 'date', required: false, formType: 'Form 94' }
      ]

    }
  ];

  const [cardForm, setCardForm] = useState({ title: '', imgFile: null, icon: '', isAeps: false, url: '' });
  const [tabForm, setTabForm] = useState({ label: '', order: 0, url: '' });
  
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingTabId, setEditingTabId] = useState(null);
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [menuForm, setMenuForm] = useState({ label: '', url: '', isActive: false, order: 0 });
  const [bannerForm, setBannerForm] = useState({ imgFile: null, fallbackIcon: '', fallbackPerson: '' });
  const [newsImageForm, setNewsImageForm] = useState({ imgFile: null });
  const [paymentRequisitions, setPaymentRequisitions] = useState([]);
  const [upiConfig, setUpiConfig] = useState(null); // eslint-disable-line no-unused-vars
  const [upiForm, setUpiForm] = useState({ upiId: '', qrCodeImgFile: null });
  const [userForm, setUserForm] = useState({ userId: '', email: '', mobile: '', role: 'customer' });
  const [userSearch, setUserSearch] = useState('');
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState('All');

  // PAN Form Manager States
  const [panTabsConfigList, setPanTabsConfigList] = useState(DEFAULT_PAN_TABS);
  const [selectedPanTabId, setSelectedPanTabId] = useState('manual_new_pan');
  const [panFormTypeFilter, setPanFormTypeFilter] = useState('Form93'); // 'Form93' (Individual), 'Form94' (Non-Individual), or 'ALL'
  const [panCategoryFilter, setPanCategoryFilter] = useState('ALL'); // Category filter option ('ALL', 'INDIVIDUAL', 'FIRM', 'COMPANY', 'TRUST', etc.)
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [newTabForm, setNewTabForm] = useState({
    id: '',
    label: '',
    icon: '📄',
    fee: 107,
    badge: 'New Service',
    description: ''
  });
  const [newPanFieldForm, setNewPanFieldForm] = useState({
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    icon: '📝',
    required: true,
    hidden: false,
    gridSpan: 1,
    optionsRaw: ''
  });
  
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
      await fetch(`${API_URL}/api/${endpoint}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds })
      });
    } catch (e) { console.error("Error saving order"); }
  };

  // Drag and drop states & handlers for PAN form field reordering
  const [draggedPanFieldIndex, setDraggedPanFieldIndex] = useState(null);
  const [dragOverPanFieldIndex, setDragOverPanFieldIndex] = useState(null);

  const handlePanFieldDragStart = (e, index) => {
    setDraggedPanFieldIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (err) {}
  };

  const handlePanFieldDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPanFieldIndex !== index) {
      setDragOverPanFieldIndex(index);
    }
  };

  const handlePanFieldDrop = (e, targetIndex) => {
    e.preventDefault();
    const fromIndex = draggedPanFieldIndex !== null ? draggedPanFieldIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (isNaN(fromIndex) || fromIndex === null || fromIndex === targetIndex) {
      setDraggedPanFieldIndex(null);
      setDragOverPanFieldIndex(null);
      return;
    }

    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        const fields = [...(tab.fields || [])];
        const [movedField] = fields.splice(fromIndex, 1);
        fields.splice(targetIndex, 0, movedField);
        return { ...tab, fields };
      }
      return tab;
    });

    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
    setDraggedPanFieldIndex(null);
    setDragOverPanFieldIndex(null);
  };

  const handlePanFieldDragEnd = () => {
    setDraggedPanFieldIndex(null);
    setDragOverPanFieldIndex(null);
  };

  const handleSavePanTabsConfig = async (overrideList) => {
    const listToSave = overrideList || panTabsConfigList;
    try {
      const res = await fetch(`${API_URL}/api/pancard/tabs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: listToSave })
      });
      const data = await res.json();
      if (data.success) {
        if (!overrideList) {
          Swal.fire({ icon: 'success', title: 'Saved!', text: 'PAN Card form configurations saved successfully.', timer: 1500, showConfirmButton: false });
        }
      }
    } catch (err) {
      console.error('Error saving PAN tabs config:', err);
    }
  };

  const handleUpdatePanField = (fieldIndex, prop, value) => {
    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        const fields = [...(tab.fields || [])];
        fields[fieldIndex] = { ...fields[fieldIndex], [prop]: value };
        return { ...tab, fields };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
  };

  const handleTogglePanField = (fieldIndex, prop) => {
    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        const fields = [...(tab.fields || [])];
        const currentVal = fields[fieldIndex][prop];
        fields[fieldIndex] = { ...fields[fieldIndex], [prop]: !currentVal };
        return { ...tab, fields };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
  };

  const handleMovePanField = (fieldIndex, direction) => {
    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        const fields = [...(tab.fields || [])];
        const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
        if (targetIndex < 0 || targetIndex >= fields.length) return tab;
        const temp = fields[fieldIndex];
        fields[fieldIndex] = fields[targetIndex];
        fields[targetIndex] = temp;
        return { ...tab, fields };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
  };

  const handleDeletePanField = async (fieldIndex) => {
    const confirmRes = await Swal.fire({
      title: 'Delete Input Field?',
      text: 'Are you sure you want to delete this input field from the form configuration?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete Field',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        const fields = (tab.fields || []).filter((_, idx) => idx !== fieldIndex);
        return { ...tab, fields };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    await handleSavePanTabsConfig(updated);
    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Field removed successfully.', timer: 1200, showConfirmButton: false });
  };

  const handleAddFieldToPanTab = () => {
    if (!newPanFieldForm.label.trim()) {
      return Swal.fire({ icon: 'warning', text: 'Please enter a field label.' });
    }

    const nameKey = newPanFieldForm.name.trim() || newPanFieldForm.label.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    const options = newPanFieldForm.type === 'select' && newPanFieldForm.optionsRaw
      ? newPanFieldForm.optionsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const isDualFormTab = selectedPanTabId === 'manual_new_pan' || selectedPanTabId === 'epan_correction';
    const newFieldObj = {
      name: nameKey,
      label: newPanFieldForm.label,
      type: newPanFieldForm.type,
      placeholder: newPanFieldForm.placeholder,
      icon: newPanFieldForm.icon || '📝',
      required: newPanFieldForm.required,
      hidden: newPanFieldForm.hidden,
      formType: isDualFormTab ? (panFormTypeFilter === 'Form94' ? 'Form 94' : 'Form 93') : 'Both',
      ...(options.length > 0 ? { options } : {})
    };

    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        return { ...tab, fields: [...(tab.fields || []), newFieldObj] };
      }
      return tab;
    });

    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
    setNewPanFieldForm({ name: '', label: '', type: 'text', placeholder: '', icon: '📝', required: true, hidden: false, gridSpan: 1, optionsRaw: '' });
    Swal.fire({ icon: 'success', title: 'Field Added!', text: `Field "${newPanFieldForm.label}" added to ${newFieldObj.formType}.`, timer: 1500, showConfirmButton: false });
  };

  const handleResetDefaultPanFields = async () => {
    const confirmRes = await Swal.fire({
      title: 'Reset Standard Fields?',
      text: 'Reset all fields for this form back to standard defaults? Custom fields added will be replaced.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Reset Fields',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    const defaultTab = DEFAULT_PAN_TABS.find(t => t.id === selectedPanTabId);
    if (!defaultTab) return;
    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        return { ...tab, fields: [...defaultTab.fields] };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    await handleSavePanTabsConfig(updated);
    Swal.fire({ icon: 'success', title: 'Reset Complete!', text: 'Form fields restored to default.', timer: 1200, showConfirmButton: false });
  };

  const handleUpdateTabHeader = (field, value) => {
    const updated = panTabsConfigList.map(tab => {
      if (tab.id === selectedPanTabId) {
        return { ...tab, [field]: value };
      }
      return tab;
    });
    setPanTabsConfigList(updated);
    handleSavePanTabsConfig(updated);
  };

  const handleAddNewPanTab = () => {
    if (!newTabForm.label.trim()) return Swal.fire({ icon: 'warning', text: 'Please provide a tab title.' });
    const tabId = newTabForm.id.trim() || newTabForm.label.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const newTab = {
      id: tabId,
      label: newTabForm.label,
      icon: newTabForm.icon || '📄',
      fee: Number(newTabForm.fee) || 107,
      badge: newTabForm.badge || 'New Service',
      description: newTabForm.description || '',
      fields: []
    };
    const updated = [...panTabsConfigList, newTab];
    setPanTabsConfigList(updated);
    setSelectedPanTabId(tabId);
    handleSavePanTabsConfig(updated);
    setNewTabForm({ id: '', label: '', icon: '📄', fee: 107, badge: 'New Service', description: '' });
    setShowAddTabModal(false);
  };

  const handleDeletePanTab = async (tabId) => {
    if (panTabsConfigList.length <= 1) return Swal.fire({ icon: 'warning', text: 'You cannot delete the last remaining service tab.' });
    const confirmRes = await Swal.fire({
      title: 'Delete Service Tab?',
      text: 'Delete this service sub-tab permanently?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete Tab',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    const updated = panTabsConfigList.filter(t => t.id !== tabId);
    setPanTabsConfigList(updated);
    if (selectedPanTabId === tabId) {
      setSelectedPanTabId(updated[0].id);
    }
    await handleSavePanTabsConfig(updated);
    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Service sub-tab removed.', timer: 1200, showConfirmButton: false });
  };


  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLedgerTransactions = async () => {
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams();
      if (ledgerFilters.userId) params.append('userId', ledgerFilters.userId);
      if (ledgerFilters.startDate) params.append('startDate', ledgerFilters.startDate);
      if (ledgerFilters.endDate) params.append('endDate', ledgerFilters.endDate);
      if (ledgerFilters.month) params.append('month', ledgerFilters.month);
      if (ledgerFilters.transactionType) params.append('transactionType', ledgerFilters.transactionType);
      if (ledgerFilters.status) params.append('status', ledgerFilters.status);
      if (ledgerFilters.search) params.append('search', ledgerFilters.search);
      
      const res = await fetch(`${API_URL}/api/wallet-transactions/report?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLedgerTransactions(data);
      }
    } catch (err) {
      console.error("Error fetching ledger report:", err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledgerHistory') {
      fetchLedgerTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ledgerFilters]);

  const handleApplyFilters = () => {
    setLedgerFilters({ ...filterInput });
    setLedgerPage(1);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      userId: '',
      startDate: '',
      endDate: '',
      month: '',
      transactionType: 'All',
      status: 'All',
      search: ''
    };
    setFilterInput(emptyFilters);
    setLedgerFilters(emptyFilters);
    setLedgerPage(1);
  };

  const exportLedgerToCSV = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return Swal.fire({ icon: 'warning', text: 'No transaction data to export.' });
    }
    const headers = ['Date', 'User ID', 'Transaction Type', 'Amount (INR)', 'Balance Before (INR)', 'Balance After (INR)', 'Description', 'Reference Number', 'Status'];
    const rows = transactions.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.userId,
      t.transactionType,
      t.amount,
      t.balanceBefore,
      t.balanceAfter,
      t.description,
      t.referenceNumber,
      t.status
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_history_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printLedgerPDF = (transactions, filters) => {
    if (!transactions || transactions.length === 0) {
      return Swal.fire({ icon: 'warning', text: 'No transaction data to print.' });
    }
    const printWindow = window.open('', '_blank');
    const filterInfo = `
      ${filters.userId ? `<strong>User ID:</strong> ${filters.userId} | ` : ''}
      ${filters.startDate ? `<strong>Start Date:</strong> ${filters.startDate} | ` : ''}
      ${filters.endDate ? `<strong>End Date:</strong> ${filters.endDate} | ` : ''}
      ${filters.month ? `<strong>Month:</strong> ${filters.month} | ` : ''}
      ${filters.transactionType !== 'All' ? `<strong>Type:</strong> ${filters.transactionType} | ` : ''}
      ${filters.status !== 'All' ? `<strong>Status:</strong> ${filters.status}` : ''}
    `.trim().replace(/\|\s*$/, '');

    const tableRowsHtml = transactions.map(t => `
      <tr>
        <td>${new Date(t.createdAt).toLocaleString()}</td>
        <td>${t.userId}</td>
        <td><span class="badge ${t.transactionType.toLowerCase()}">${t.transactionType}</span></td>
        <td class="amount text-right">₹${parseFloat(t.amount).toFixed(2)}</td>
        <td class="amount text-right">₹${parseFloat(t.balanceBefore).toFixed(2)}</td>
        <td class="amount text-right">₹${parseFloat(t.balanceAfter).toFixed(2)}</td>
        <td>${t.description}</td>
        <td class="mono">${t.referenceNumber}</td>
        <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
      <head>
        <title>Ledger History Report</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; font-size: 12px; line-height: 1.5; }
          .header { border-bottom: 2px solid #4318ff; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title h1 { margin: 0; font-size: 22px; color: #1b2559; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          .title p { margin: 5px 0 0 0; color: #64748b; font-size: 12px; }
          .meta-info { text-align: right; font-size: 11px; color: #64748b; }
          .filters-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; margin-bottom: 20px; font-size: 11px; }
          .filters-box h4 { margin: 0 0 6px 0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 1.5px solid #cbd5e1; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; word-break: break-word; }
          .text-right { text-align: right; }
          .amount { font-weight: 700; font-family: monospace; font-size: 12px; }
          .badge { padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; display: inline-block; }
          .badge.credit { background: #dcfce7; color: #166534; }
          .badge.debit { background: #fee2e2; color: #991b1b; }
          .status-badge { padding: 3px 8px; border-radius: 12px; font-size: 9px; font-weight: 700; display: inline-block; }
          .status-badge.success { background: #dcfce7; color: #166534; }
          .status-badge.pending { background: #fef9c3; color: #854d0e; }
          .status-badge.failed { background: #fee2e2; color: #991b1b; }
          .mono { font-family: monospace; font-size: 10px; color: #475569; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">
            <h1>Ledger History Report</h1>
            <p>MB Mitra Wallet Transaction Logs</p>
          </div>
          <div class="meta-info">
            <strong>Generated:</strong> ${new Date().toLocaleString()}<br/>
            <strong>Total Records:</strong> ${transactions.length}
          </div>
        </div>
        ${filterInfo ? `
          <div class="filters-box">
            <h4>Active Filters</h4>
            <div>${filterInfo}</div>
          </div>
        ` : ''}
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User ID</th>
              <th>Type</th>
              <th class="text-right">Amount</th>
              <th class="text-right">Before</th>
              <th class="text-right">After</th>
              <th>Description</th>
              <th>Reference No</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadCSVTemplate = () => {
    const headers = ['userId', 'transactionType', 'amount', 'description', 'referenceNumber', 'status', 'createdAt'];
    const sampleRow = ['MBM000012', 'Credit', '1000', 'Top-up reward', 'REF998877', 'Success', new Date().toISOString()];
    const csvContent = "\uFEFF" + [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "ledger_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push('');
      } else if ((char === '\r' || char === '\n') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const rows = parseCSV(text);
        if (rows.length < 2) {
          return Swal.fire({ icon: 'error', text: 'The CSV file is empty or only contains headers.' });
        }
        
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // Required fields index
        const userIdIdx = headers.indexOf('userid');
        const typeIdx = headers.indexOf('transactiontype');
        const amountIdx = headers.indexOf('amount');
        const descIdx = headers.indexOf('description');
        const refIdx = headers.indexOf('referencenumber');
        const statusIdx = headers.indexOf('status');
        const dateIdx = headers.indexOf('createdat');
        
        if (userIdIdx === -1 || typeIdx === -1 || amountIdx === -1) {
          return Swal.fire({
            icon: 'error',
            title: 'Invalid CSV Headers',
            text: 'CSV must contain at least "userId", "transactionType", and "amount" columns.'
          });
        }
        
        const transactions = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length <= 1 && row[0] === '') continue; // skip empty rows
          
          const userId = row[userIdIdx] ? row[userIdIdx].trim() : '';
          const transactionType = row[typeIdx] ? row[typeIdx].trim() : '';
          const amount = row[amountIdx] ? parseFloat(row[amountIdx].trim()) : 0;
          const description = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '';
          const referenceNumber = refIdx !== -1 && row[refIdx] ? row[refIdx].trim() : '';
          const status = statusIdx !== -1 && row[statusIdx] ? row[statusIdx].trim() : 'Success';
          const createdAt = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : undefined;
          
          if (!userId || !transactionType || isNaN(amount)) {
            continue; // skip rows with missing essential fields
          }
          
          transactions.push({
            userId,
            transactionType,
            amount,
            description,
            referenceNumber,
            status,
            createdAt
          });
        }
        
        if (transactions.length === 0) {
          return Swal.fire({ icon: 'warning', text: 'No valid transaction records found in the CSV.' });
        }
        
        // Prompt confirmation
        const confirm = await Swal.fire({
          title: 'Confirm Import',
          text: `Are you sure you want to import ${transactions.length} transaction records? User balances will be updated accordingly.`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Import',
          cancelButtonText: 'Cancel'
        });
        
        if (!confirm.isConfirmed) return;
        
        // Send to server
        Swal.showLoading();
        const res = await fetch(`${API_URL}/api/wallet-transactions/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions })
        });
        
        const result = await res.json();
        Swal.close();
        
        if (res.ok) {
          let msg = `Successfully imported ${result.successCount} transactions.`;
          if (result.failedCount > 0) {
            msg += ` Failed to import ${result.failedCount} rows.`;
            const failures = result.details.filter(d => d.status === 'Failed').slice(0, 5).map(f => `Row ${f.row}: ${f.message}`).join('\n');
            msg += `\n\nFirst few errors:\n${failures}`;
          }
          Swal.fire({
            icon: result.failedCount > 0 ? 'warning' : 'success',
            title: 'Import Complete',
            text: msg,
            customClass: {
              htmlContainer: 'swal-pre-wrap'
            }
          });
          
          fetchLedgerTransactions();
        } else {
          Swal.fire({ icon: 'error', title: 'Import Failed', text: result.message || 'Server error during import.' });
        }
      } catch (err) {
        console.error(evt, err);
        Swal.fire({ icon: 'error', title: 'Import Error', text: 'An error occurred while parsing the CSV file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const filteredRetailers = useMemo(() => {
    const q = retailerSearchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => {
      const nameMatch = u.name && u.name.toLowerCase().includes(q);
      const userIdMatch = u.userId && u.userId.toLowerCase().includes(q);
      const retailerIdMatch = u.retailerId && u.retailerId.toLowerCase().includes(q);
      const mobileMatch = u.mobile && u.mobile.toString().includes(q);
      const shopMatch = u.shopName && u.shopName.toLowerCase().includes(q);
      const emailMatch = u.email && u.email.toLowerCase().includes(q);
      return nameMatch || userIdMatch || retailerIdMatch || mobileMatch || shopMatch || emailMatch;
    });
  }, [users, retailerSearchQuery]);

  const handleAdminWalletTransfer = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRetailer) {
      return Swal.fire({ icon: 'warning', title: 'Select Retailer', text: 'Please search and select a retailer to transfer payment.' });
    }
    const amountNum = Number(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return Swal.fire({ icon: 'warning', title: 'Invalid Amount', text: 'Please enter a valid amount greater than 0.' });
    }

    const currentBal = Number(selectedRetailer.walletBalance || 0);
    const newBal = transferTxType === 'Credit' ? currentBal + amountNum : currentBal - amountNum;

    const confirmResult = await Swal.fire({
      title: `Confirm ${transferTxType.toUpperCase()} Payment?`,
      html: `
        <div style="text-align: left; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13.5px; font-family: sans-serif;">
          <p style="margin: 5px 0;"><strong>Retailer Name:</strong> ${selectedRetailer.name || selectedRetailer.userId}</p>
          <p style="margin: 5px 0;"><strong>User ID:</strong> ${selectedRetailer.userId} ${selectedRetailer.retailerId ? `(${selectedRetailer.retailerId})` : ''}</p>
          <p style="margin: 5px 0;"><strong>Mobile No:</strong> ${selectedRetailer.mobile || 'N/A'}</p>
          <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 10px 0;" />
          <p style="margin: 5px 0;"><strong>Action:</strong> <span style="color: ${transferTxType === 'Credit' ? '#16a34a' : '#dc2626'}; font-weight: 800;">${transferTxType === 'Credit' ? 'CREDIT (+)' : 'DEBIT (-)'} ₹${amountNum.toFixed(2)}</span></p>
          <p style="margin: 5px 0;"><strong>Current Balance:</strong> ₹${currentBal.toFixed(2)}</p>
          <p style="margin: 5px 0; color: #0284c7; font-weight: 800; font-size: 15px;"><strong>New Balance:</strong> ₹${newBal.toFixed(2)}</p>
          ${transferRemarks ? `<p style="margin: 5px 0; color: #475569;"><strong>Remarks:</strong> ${transferRemarks}</p>` : ''}
        </div>
      `,
      icon: transferTxType === 'Credit' ? 'info' : 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, ${transferTxType} ₹${amountNum}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: transferTxType === 'Credit' ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#64748b'
    });

    if (!confirmResult.isConfirmed) return;

    setTransferLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/wallet-transactions/admin-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedRetailer.userId,
          transactionType: transferTxType,
          amount: amountNum,
          description: transferRemarks.trim() || `Admin Manual Payment (${transferTxType})`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to process wallet transfer');

      Swal.fire({
        icon: 'success',
        title: 'Transaction Successful!',
        text: data.message,
        timer: 2200,
        showConfirmButton: false
      });

      // Refresh users list and ledger history
      const usersRes = await fetch(`${API_URL}/api/users`);
      if (usersRes.ok) {
        const updatedUsers = await usersRes.json();
        setUsers(updatedUsers);
        const updatedSelected = updatedUsers.find(u => u.userId === selectedRetailer.userId);
        if (updatedSelected) setSelectedRetailer(updatedSelected);
      }
      fetchLedgerTransactions();

      // Reset amount and remarks
      setTransferAmount('');
      setTransferRemarks('');
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Transfer Failed', text: err.message });
    } finally {
      setTransferLoading(false);
    }
  };

  const fetchAll = () => {
    const load = (path, onData) => apiFetch(path)
      .then(response => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json();
      })
      .then(onData)
      .catch(error => console.error(`Error loading ${path}:`, error));

    load('/api/action-cards', setCards);
    load('/api/top-tabs', setTopTabs);
    load('/api/sidebar-menus', setSidebarMenus);
    load('/api/banners', setBanners);
    load('/api/news-images', setNewsImages);
    load('/api/users', setUsers);
    load('/api/payment-requisitions', setPaymentRequisitions);
    load('/api/pancard/stats', data => {
      if (data && data.success) {
        setPanSubmissionsData(data);
      }
    });
    load('/api/pancard/tabs', data => {
      if (Array.isArray(data) && data.length > 0) {
        const merged = data.map(tab => {
          const defaultTabObj = DEFAULT_PAN_TABS.find(d => d.id === tab.id);
          let fields = tab.fields && tab.fields.length > 0 ? tab.fields : (defaultTabObj ? defaultTabObj.fields : []);
          if (tab.id === 'epan_correction' && (!tab.fields || tab.fields.length <= 5)) {
            fields = defaultTabObj ? defaultTabObj.fields : [];
          }
          
          // Ensure state and district fields have upper case labels and complete option lists
          fields = fields.map(f => {
            if (f.name === 'state') {
              return { ...f, label: (f.label && f.label !== 'state') ? f.label : 'STATE', options: ['PLEASE SELECT', ...ALL_INDIAN_STATES] };
            }
            if (f.name === 'district') {
              return { ...f, label: (f.label && f.label !== 'district') ? f.label : 'TOWN/DISTRICT', options: ['SELECT', ...ALL_INDIAN_DISTRICTS] };
            }
            return f;
          });

          return { ...tab, fields };
        });
        setPanTabsConfigList(merged);
      }
    });
    load('/api/upi-config', data => {
      setUpiConfig(data);
      if(data) setUpiForm({ upiId: data.upiId || '', qrCodeImgFile: null });
    });
    load('/api/site-settings/dashboard_marquee', data => {
      if (data && data.success && data.value) {
        setMarqueeInput(data.value);
      }
    });
  };

  const handleSaveMarquee = async () => {
    try {
      const res = await fetch(`${API_URL}/api/site-settings/dashboard_marquee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: marqueeInput })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.fire({
          icon: 'success',
          title: 'Marquee Announcement Saved!',
          text: 'New marquee text will now display across Retailer Dashboards.'
        });
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Failed to update marquee text' });
      }
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Error saving marquee setting' });
    }
  };

  const handleAdminDeletePanApp = async (app) => {
    const confirmRes = await Swal.fire({
      title: 'Delete PAN Application?',
      text: `Are you sure you want to delete application ${app.ackNumber} (Retailer: ${app.userId})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete Application',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/pancard/application/${app._id}?role=admin`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.fire({ icon: 'success', title: 'PAN application deleted successfully!' });
        fetchAll();
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Failed to delete application.' });
      }
    } catch (err) {
      console.error('Delete PAN error:', err);
      Toast.fire({ icon: 'error', title: 'Error deleting application.' });
    }
  };

  const handleUpdatePanStatus = async () => {
    if (!editingPanAppStatus) return;
    try {
      const res = await fetch(`${API_URL}/api/pancard/status/${editingPanAppStatus._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatusVal,
          adminRemarks: newStatusRemarks,
          receiptUrl: newReceiptFileUrl || undefined,
          nsdlReceiptNumber: newNsdlReceiptNumber
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Toast.fire({
          icon: 'success',
          title: 'Status Updated Successfully!',
          text: data.message || (newReceiptFileUrl
            ? `Approved receipt attached & sent to Retailer (${editingPanAppStatus.userId}).`
            : `Application status changed to '${newStatusVal}'.`)
        });
        setEditingPanAppStatus(null);
        setNewStatusRemarks('');
        setNewReceiptFileUrl('');
        setNewNsdlReceiptNumber('');
        fetchAll();
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Failed to update status' });
      }
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Error updating PAN application status' });
    }
  };



  const startEditMenu = (menu) => {
    setEditingMenuId(menu._id);
    setMenuForm({
      label: menu.label || '',
      url: menu.url || '',
      isActive: menu.isActive || false,
      order: menu.order || 0
    });
  };



  const addActionCard = async () => {
    const formData = new FormData();
    formData.append('title', cardForm.title);
    formData.append('icon', cardForm.icon);
    formData.append('isAeps', cardForm.isAeps);
    formData.append('url', cardForm.url);
    if (cardForm.imgFile) formData.append('image', cardForm.imgFile);
    
    if (editingCardId) {
      await fetch(`${API_URL}/api/action-cards/${editingCardId}`, { method: 'PUT', body: formData });
      setEditingCardId(null);
    } else {
      await fetch(`${API_URL}/api/action-cards`, { method: 'POST', body: formData });
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
    await fetch(`${API_URL}/api/banners`, { method: 'POST', body: formData });
    setBannerForm({ imgFile: null, fallbackIcon: '', fallbackPerson: '' });
    fetchAll();
  };

  const addNewsImage = async () => {
    const files = newsImageForm.imgFiles ? Array.from(newsImageForm.imgFiles) : (newsImageForm.imgFile ? [newsImageForm.imgFile] : []);
    if (files.length === 0) return Swal.fire({ icon: 'warning', text: 'Please select an image first', confirmButtonText: 'OK' });

    for (const file of files) {
      const formData = new FormData();
      formData.append('image', file);
      await fetch(`${API_URL}/api/news-images`, { method: 'POST', body: formData });
    }

    setNewsImageForm({ imgFile: null, imgFiles: null });
    fetchAll();
    Swal.fire({ icon: 'success', text: `${files.length} News Image(s) Uploaded Successfully!`, confirmButtonText: 'OK' });
  };

  const updateUpiConfig = async () => {
    const formData = new FormData();
    formData.append('upiId', upiForm.upiId);
    if (upiForm.qrCodeImgFile) formData.append('qrCodeImg', upiForm.qrCodeImgFile);
    await fetch(`${API_URL}/api/upi-config`, { method: 'PUT', body: formData });
    fetchAll();
    Swal.fire({ icon: 'success', text: 'UPI Configuration Updated!', confirmButtonText: 'OK' });
  };

  const addUser = async () => {
    if (!userForm.userId) return Swal.fire({ icon: 'warning', text: 'User ID is required', confirmButtonText: 'OK' });
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userForm) 
    });
    
    if(response.ok) {
      Toast.fire({ icon: 'success', title: 'User Created Successfully!' });
      setUserForm({ userId: '', email: '', mobile: '', role: 'customer' });
      fetchAll();
    } else {
      const data = await response.json();
      Toast.fire({ icon: 'error', title: data.message });
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    if (newStatus === 'Rejected') {
      const confirmRes = await Swal.fire({
        title: 'Reject User Registration?',
        text: 'Are you sure you want to reject this user registration account request?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Reject User',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b'
      });
      if (!confirmRes.isConfirmed) return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: `User ${newStatus}!`,
          text: data.message || `Account status updated to ${newStatus}.`,
          timer: 1800,
          showConfirmButton: false
        });
        fetchAll();
      } else {
        Swal.fire({ icon: 'error', text: data.message || 'Failed to update user status.' });
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      Swal.fire({ icon: 'error', text: 'Error connecting to server.' });
    }
  };

  const updateRequisition = async (id, status, reqAmount) => {
    let finalStatus = status;
    let approvedAmount = 0;

    if (status === 'Approved') {
      if (userRole === 'staff') {
        // Staff members can ONLY fully approve (partially approval is restricted to admin)
        const result = await Swal.fire({
          title: 'Fully Approve Payment?',
          text: `Are you sure you want to approve the full requested amount of ₹${reqAmount}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Approve Full Amount',
          confirmButtonColor: '#22c55e',
          cancelButtonColor: '#6b7280',
          customClass: {
            popup: 'small-prompt-modal'
          }
        });
        if (!result.isConfirmed) return; // cancelled
        approvedAmount = Number(reqAmount);
        finalStatus = 'Approved';
      } else {
        // Admin has full options: can edit amount to partially approve or fully approve
        const maxAllowed = Number(reqAmount);
        const { value: amountStr } = await Swal.fire({
          title: 'Approve Payment',
          text: `Enter approved amount (Requested: ₹${maxAllowed})`,
          input: 'number',
          inputValue: maxAllowed,
          inputAttributes: {
            min: '1',
            max: String(maxAllowed),
            step: '1'
          },
          showCancelButton: true,
          confirmButtonText: 'Approve',
          customClass: {
            popup: 'small-prompt-modal'
          },
          inputValidator: (value) => {
            if (!value) return 'Please enter an approval amount!';
            const valNum = Number(value);
            if (isNaN(valNum) || valNum <= 0) {
              return 'Please enter a valid positive amount!';
            }
            if (valNum > maxAllowed) {
              return `Approval amount cannot exceed requested amount of ₹${maxAllowed}!`;
            }
          }
        });
        if (!amountStr) return; // cancelled
        
        approvedAmount = Number(amountStr);
        if (approvedAmount > maxAllowed) {
          return Swal.fire({
            icon: 'error',
            text: `Approval amount (₹${approvedAmount}) cannot exceed requested amount of ₹${maxAllowed}!`
          });
        }
        if (approvedAmount < maxAllowed && approvedAmount > 0) {
          finalStatus = 'Partially Approved';
        } else {
          finalStatus = 'Approved';
        }
      }
    } else if (status === 'Rejected') {
      const result = await Swal.fire({
        title: 'Reject Payment Requisition?',
        text: 'Are you sure you want to reject this requisition?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Reject',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        customClass: {
          popup: 'small-prompt-modal'
        }
      });
      if (!result.isConfirmed) return;
      finalStatus = 'Rejected';
      approvedAmount = 0;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/payment-requisitions/${id}`, {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({ status: finalStatus, approvedAmount }) 
      });
      const data = await res.json();
      if (!res.ok) {
        Swal.fire({ icon: 'error', text: data.message || 'Failed to update requisition.' });
      } else {
        Swal.fire({
          icon: 'success',
          title: `Requisition ${finalStatus}!`,
          text: `Approved Amount: ₹${approvedAmount}`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error('Error updating payment requisition:', err);
      Swal.fire({ icon: 'error', text: 'Error connecting to server.' });
    }
    fetchAll();
  };

  const handleEditRequisition = async (req) => {
    const maxAllowed = Number(req.amount);
    const currentAppAmount = req.approvedAmount !== undefined ? req.approvedAmount : (req.status === 'Approved' ? maxAllowed : 0);

    const result = await Swal.fire({
      title: '✏️ Edit Payment Requisition',
      html: `
        <div style="text-align: left; font-size: 13px; color: #475569; margin-bottom: 14px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="margin-bottom: 4px;"><b>User ID:</b> ${req.userId}</div>
          <div style="margin-bottom: 4px;"><b>Reference No:</b> ${req.referenceNumber}</div>
          <div style="margin-bottom: 4px;"><b>Requested Amount:</b> <span style="color: #2563eb; font-weight: 700;">₹${maxAllowed}</span></div>
          <div><b>Current Approved:</b> <span style="color: #059669; font-weight: 700;">₹${currentAppAmount}</span></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px; text-align: left;">
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">Status</label>
            <select id="swal-edit-status" class="swal2-select" style="width: 100%; margin: 0; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px;">
              <option value="Approved" ${req.status === 'Approved' ? 'selected' : ''}>Approved (Full)</option>
              <option value="Partially Approved" ${req.status === 'Partially Approved' ? 'selected' : ''}>Partially Approved</option>
              <option value="Rejected" ${req.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
              <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Pending</option>
            </select>
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">
              Approved Amount (Max: ₹${maxAllowed})
            </label>
            <input id="swal-edit-amount" type="number" min="0" max="${maxAllowed}" value="${currentAppAmount}" class="swal2-input" style="width: 100%; margin: 0; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; box-sizing: border-box;" />
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700; color: #334155; display: block; margin-bottom: 4px;">Remarks (Optional)</label>
            <input id="swal-edit-remarks" type="text" placeholder="Add remarks..." value="${req.remarks && req.remarks !== '-' ? req.remarks : ''}" class="swal2-input" style="width: 100%; margin: 0; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; box-sizing: border-box;" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#2563eb',
      denyButtonText: '✕ Reject',
      denyButtonColor: '#ef4444',
      cancelButtonText: 'Cancel',
      cancelButtonColor: '#64748b',
      didOpen: () => {
        const statusSelect = document.getElementById('swal-edit-status');
        const amountInput = document.getElementById('swal-edit-amount');
        if (statusSelect && amountInput) {
          statusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'Rejected' || e.target.value === 'Pending') {
              amountInput.value = '0';
              amountInput.disabled = true;
            } else {
              amountInput.disabled = false;
              if (Number(amountInput.value) === 0) {
                amountInput.value = String(maxAllowed);
              }
            }
          });
          amountInput.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            if (val === 0 && e.target.value !== '') {
              statusSelect.value = 'Rejected';
            } else if (val > 0 && val < maxAllowed) {
              statusSelect.value = 'Partially Approved';
            } else if (val >= maxAllowed) {
              statusSelect.value = 'Approved';
            }
          });
          if (statusSelect.value === 'Rejected' || statusSelect.value === 'Pending') {
            amountInput.disabled = true;
          }
        }
      },
      preConfirm: () => {
        const selectedStatus = document.getElementById('swal-edit-status').value;
        const enteredAmountStr = document.getElementById('swal-edit-amount').value;
        const enteredRemarks = document.getElementById('swal-edit-remarks').value;

        const valNum = Number(enteredAmountStr);

        if (enteredAmountStr === '' || isNaN(valNum) || valNum < 0) {
          Swal.showValidationMessage('Please enter a valid amount (₹0 or more)!');
          return false;
        }

        if (valNum > maxAllowed) {
          Swal.showValidationMessage(`Approved amount cannot exceed requested amount of ₹${maxAllowed}!`);
          return false;
        }

        let finalStatus = selectedStatus;
        let finalAmount = valNum;

        if (valNum === 0 || selectedStatus === 'Rejected') {
          finalStatus = 'Rejected';
          finalAmount = 0;
        } else if (selectedStatus === 'Pending') {
          finalAmount = 0;
        } else {
          if (finalAmount < maxAllowed) {
            finalStatus = 'Partially Approved';
          } else {
            finalStatus = 'Approved';
          }
        }

        return {
          status: finalStatus,
          approvedAmount: finalAmount,
          remarks: enteredRemarks
        };
      },
      preDeny: () => {
        const enteredRemarks = document.getElementById('swal-edit-remarks')?.value;
        return {
          status: 'Rejected',
          approvedAmount: 0,
          remarks: enteredRemarks || req.remarks || 'Rejected by Admin'
        };
      }
    });

    let formValues = null;
    if (result.isConfirmed) {
      formValues = result.value;
    } else if (result.isDenied) {
      formValues = result.value || {
        status: 'Rejected',
        approvedAmount: 0,
        remarks: req.remarks || 'Rejected by Admin'
      };
    }

    if (!formValues) return; // Cancelled

    try {
      const res = await fetch(`${API_URL}/api/payment-requisitions/${req._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify(formValues)
      });
      const data = await res.json();
      if (!res.ok) {
        Swal.fire({ icon: 'error', text: data.message || 'Failed to update requisition.' });
      } else {
        Swal.fire({
          icon: 'success',
          title: formValues.status === 'Rejected' ? 'Requisition Rejected!' : 'Requisition Updated!',
          text: `Status: ${formValues.status} | Approved Amount: ₹${formValues.approvedAmount}`,
          timer: 1600,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error('Error updating requisition:', err);
      Swal.fire({ icon: 'error', text: 'Error connecting to server.' });
    }
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
    const confirmRes = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you really want to remove this item? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove It',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      await fetch(`${url}/${id}`, { method: 'DELETE' });
      Toast.fire({ icon: 'success', title: 'Item removed successfully!' });
      fetchAll();
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Failed to remove item.' });
    }
  };

  const allMenuItems = [
    { id: 'actionCards', label: 'Action Cards', icon: '💳' },
    { id: 'topTabs', label: 'Top Tabs', icon: '📑' },
    { id: 'sidebarMenus', label: 'Sidebar Menus', icon: '☰' },
    { id: 'banners', label: 'Banners', icon: '🖼️' },
    { id: 'newsImages', label: 'Login News Images', icon: '📰' },
    { id: 'panSubmissions', label: 'Retailer PAN Submissions', icon: '📇' },
    { id: 'panForms', label: 'PAN Form Manager', icon: '📝' },
    { id: 'walletRequests', label: 'Wallet Requests', icon: '💼' },
    { id: 'ledgerHistory', label: 'Ledger History', icon: '📒' },
    { id: 'feesNewApplication', label: 'Fees – PAN New Application', icon: '💰' },
    { id: 'feesCorrection', label: 'Fees – PAN Correction', icon: '💰' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'staffMembers', label: 'Staff Management', icon: '👔', adminOnly: true },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (userRole === 'admin') return true;
    if (item.adminOnly) return false;
    return staffPermissions.includes(item.id);
  });

  const uiSubmenuItems = [
    { id: 'actionCards', label: 'Action Cards', icon: '💳' },
    { id: 'topTabs', label: 'Top Tabs', icon: '📑' },
    { id: 'sidebarMenus', label: 'Sidebar Menus', icon: '☰' },
    { id: 'banners', label: 'Banners', icon: '🖼️' },
    { id: 'newsImages', label: 'Login News Images', icon: '📰' },
  ].filter(item => userRole === 'admin' || staffPermissions.includes(item.id));

  const panSubmenuItems = [
    { id: 'panSubmissions', label: 'Retailer PAN Submissions', icon: '📇' },
    { id: 'panForms', label: 'PAN Form Manager', icon: '📝' },
  ].filter(item => userRole === 'admin' || staffPermissions.includes(item.id));

  const standaloneItems = [
    { id: 'walletRequests', label: 'Wallet Requests', icon: '💼' },
    { id: 'ledgerHistory', label: 'Ledger History', icon: '📒' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'staffMembers', label: 'Staff Management', icon: '👔', adminOnly: true },
  ].filter(item => {
    if (userRole === 'admin') return true;
    if (item.adminOnly) return false;
    return staffPermissions.includes(item.id);
  });

  const feesSubmenuItems = [
    { id: 'feesNewApplication', label: 'PAN New Application', icon: '📄' },
    { id: 'feesCorrection', label: 'PAN Correction', icon: '✏️' },
  ].filter(item => userRole === 'admin' || staffPermissions.includes(item.id));

  return (
    <div className="admin-layout">
      {/* Vertical Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav-vertical">
          {/* Submenu 1: UI & Layout Setup */}
          {uiSubmenuItems.length > 0 && (
            <div className="admin-submenu-group">
              <button
                type="button"
                className={`admin-nav-parent-btn ${uiSubmenuItems.some(i => i.id === activeTab) ? 'active-group' : ''}`}
                onClick={() => setIsUiSubmenuOpen(!isUiSubmenuOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="nav-icon">🎨</span>
                  <span>UI & Layout Setup</span>
                </div>
                <span className={`submenu-arrow ${isUiSubmenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {isUiSubmenuOpen && (
                <div className="admin-submenu-items">
                  {uiSubmenuItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-nav-sub-btn ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="nav-icon" style={{ fontSize: '15px', marginRight: '8px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submenu 2: PAN Card Management */}
          {panSubmenuItems.length > 0 && (
            <div className="admin-submenu-group">
              <button
                type="button"
                className={`admin-nav-parent-btn ${panSubmenuItems.some(i => i.id === activeTab) ? 'active-group' : ''}`}
                onClick={() => setIsPanSubmenuOpen(!isPanSubmenuOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="nav-icon">📇</span>
                  <span>PAN Management</span>
                </div>
                <span className={`submenu-arrow ${isPanSubmenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {isPanSubmenuOpen && (
                <div className="admin-submenu-items">
                  {panSubmenuItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-nav-sub-btn ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="nav-icon" style={{ fontSize: '15px', marginRight: '8px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submenu 3: Fees Management */}
          {feesSubmenuItems.length > 0 && (
            <div className="admin-submenu-group">
              <button
                type="button"
                className={`admin-nav-parent-btn ${feesSubmenuItems.some(i => i.id === activeTab) ? 'active-group' : ''}`}
                onClick={() => setIsFeesSubmenuOpen(!isFeesSubmenuOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="nav-icon">💰</span>
                  <span>Fees Management</span>
                </div>
                <span className={`submenu-arrow ${isFeesSubmenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {isFeesSubmenuOpen && (
                <div className="admin-submenu-items">
                  {feesSubmenuItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className={`admin-nav-sub-btn ${activeTab === item.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="nav-icon" style={{ fontSize: '15px', marginRight: '8px' }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Standalone Items */}
          {standaloneItems.map(item => {
            const pendingCount = item.id === 'users' ? users.filter(u => u.status === 'Pending').length : 0;
            return (
              <button 
                key={item.id} 
                type="button"
                className={`admin-nav-btn ${activeTab === item.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                {pendingCount > 0 && (
                  <span style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 7px',
                    marginLeft: 'auto'
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          {/* Footer removed per user request */}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h1>{allMenuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}</h1>
          <div className="admin-topbar-actions" style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
            <NotificationBell />
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#f4f7fe', padding: '8px 15px', borderRadius: '20px', fontWeight: '600', color: '#2b3674' }}>
              <span style={{ fontSize: '18px' }}>{userRole === 'staff' ? '👔' : '👨‍💼'}</span>
              <span>{userRole === 'staff' ? `Staff: ${staffName || 'Member'}` : 'Admin Profile'}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('adminAuth');
                localStorage.removeItem('adminEmail');
                localStorage.removeItem('userRole');
                localStorage.removeItem('staffName');
                localStorage.removeItem('staffPermissions');
                localStorage.removeItem('currentUser');
                navigate('/admin-login');
              }} 
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
                        <button className="modern-edit-btn" onClick={() => startEditCard(c)} style={{ marginRight: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                        <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/action-cards`, c._id)}>Delete</button>
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
                  <button className="modern-submit-btn" onClick={() => addItem(`${API_URL}/api/top-tabs`, tabForm, setTabForm, { label: '', order: 0, url: '' }, editingTabId, setEditingTabId)}>
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
                        <button className="modern-edit-btn" onClick={() => startEditTab(t)} style={{ marginRight: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                        <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/top-tabs`, t._id)}>Delete</button>
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
                <h3>{editingMenuId ? 'Edit Sidebar Menu' : 'Add Sidebar Menu'}</h3>
                <div className="modern-form">
                  <input type="text" placeholder="Label (e.g. Wallet, PAN Card)" value={menuForm.label} onChange={e => setMenuForm({...menuForm, label: e.target.value})} />
                  <input type="text" placeholder="Routing URL (e.g. /pan-card, /wallet)" value={menuForm.url} onChange={e => setMenuForm({...menuForm, url: e.target.value})} />
                  <input type="number" placeholder="Order" value={menuForm.order} onChange={e => setMenuForm({...menuForm, order: e.target.value})} />
                  <label className="modern-checkbox">
                    <input type="checkbox" checked={menuForm.isActive} onChange={e => setMenuForm({...menuForm, isActive: e.target.checked})} /> 
                    <span>Is Active?</span>
                  </label>
                  <button className="modern-submit-btn" onClick={() => addItem(`${API_URL}/api/sidebar-menus`, menuForm, setMenuForm, { label: '', url: '', isActive: false, order: 0 }, editingMenuId, setEditingMenuId)}>
                    {editingMenuId ? 'Update Menu' : 'Add Menu'}
                  </button>
                  {editingMenuId && (
                    <button className="modern-submit-btn" style={{ background: '#6b7280', marginTop: '5px' }} onClick={() => { setEditingMenuId(null); setMenuForm({ label: '', url: '', isActive: false, order: 0 }); }}>Cancel Edit</button>
                  )}
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
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="item-name">{m.label || '(Empty Block)'} {m.isActive && '★'}</span>
                        {m.url && <span style={{ fontSize: '11px', color: '#3b82f6', fontFamily: 'monospace' }}>🔗 {m.url}</span>}
                      </div>
                      <div className="item-actions" style={{ marginLeft: 'auto' }}>
                        <button className="modern-edit-btn" onClick={() => startEditMenu(m)} style={{ marginRight: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>Edit</button>
                        <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/sidebar-menus`, m._id)}>Delete</button>
                      </div>
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
                      <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/banners`, b._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Dashboard Marquee Tag Setting Card */}
              <div className="admin-card form-card" style={{ gridColumn: '1 / -1', marginTop: '10px', background: '#ffffff', border: '1.5px solid #38bdf8', borderRadius: '14px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📢 Dashboard Marquee Announcement Text
                </h3>
                <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748b' }}>
                  Set the scrolling announcement text displayed at the top of all Retailer Dashboards (e.g. WELCOME TO MB MITRA).
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Enter Marquee Announcement (e.g. WELCOME TO MB MITRA)..."
                    value={marqueeInput}
                    onChange={(e) => setMarqueeInput(e.target.value)}
                    style={{
                      flex: '1 1 300px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #0284c7',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      background: '#f0f9ff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveMarquee}
                    style={{
                      padding: '10px 22px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '13px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    💾 Save Marquee Text
                  </button>
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
                    <input type="file" accept="image/*" multiple onChange={e => setNewsImageForm({ imgFile: e.target.files[0], imgFiles: e.target.files })} />
                  </div>
                  <button className="modern-submit-btn" onClick={addNewsImage}>Upload Image(s)</button>
                </div>
              </div>
              <div className="admin-card list-card">
                <h3>Existing News Images</h3>
                <div className="modern-list">
                  {newsImages.map(n => (
                    <div className="list-item" key={n._id}>
                      <img src={n.img} alt="" className="item-thumb portrait"/>
                      <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/news-images`, n._id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Retailer PAN Card Submissions Tab */}
          {activeTab === 'panSubmissions' && (
            <div className="admin-panel-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              
              {/* Sleek Header & KPI Summary Badges Bar */}
              <div className="admin-card" style={{ background: '#fff', borderRadius: '14px', padding: '18px 24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      📇
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                        Retailer PAN Card Submissions
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                        Real-time Retailer PAN form filings, status tracking, Form 49A PDF downloads, and approval management.
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Pills & Refresh Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {(() => {
                      const allApps = panSubmissionsData.applications || [];
                      const activeApps = panRetailerFilter === 'All'
                        ? allApps
                        : allApps.filter(a => (a.userId || '').toLowerCase() === panRetailerFilter.toLowerCase());

                      const totalCnt = activeApps.length;
                      const pendingCnt = activeApps.filter(a => (a.status || 'Submitted').toLowerCase() === 'submitted' || (a.status || '').toLowerCase() === 'in progress').length;
                      const approvedCnt = activeApps.filter(a => (a.status || '').toLowerCase() === 'approved' || (a.status || '').toLowerCase() === 'completed').length;
                      const rejectedCnt = activeApps.filter(a => (a.status || '').toLowerCase() === 'rejected').length;

                      return (
                        <>
                          <div style={{ padding: '6px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '20px', fontSize: '12px', color: '#334155' }}>
                            Total Forms: <strong>{totalCnt}</strong>
                          </div>
                          <div style={{ padding: '6px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '20px', fontSize: '12px', color: '#92400e' }}>
                            Pending/Submitted: <strong>{pendingCnt}</strong>
                          </div>
                          <div style={{ padding: '6px 14px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '20px', fontSize: '12px', color: '#166534' }}>
                            Approved: <strong>{approvedCnt}</strong>
                          </div>
                          <div style={{ padding: '6px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '20px', fontSize: '12px', color: '#991b1b' }}>
                            Rejected: <strong>{rejectedCnt}</strong>
                          </div>
                        </>
                      );
                    })()}

                    <button
                      onClick={fetchAll}
                      style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}
                    >
                      🔄 Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* RETAILER-WISE SUBMISSIONS BREAKDOWN SUMMARY TABLE */}
              <div className="admin-card" style={{ background: 'white', borderRadius: '14px', padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏪</span> Retailer Submission Breakdown
                    </h4>
                  </div>
                  {panRetailerFilter !== 'All' && (
                    <button
                      onClick={() => setPanRetailerFilter('All')}
                      style={{ padding: '4px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Clear Retailer Filter ({panRetailerFilter})
                    </button>
                  )}
                </div>

                {(() => {
                  const combinedBreakdownRetailers = (() => {
                    const existingMap = {};
                    (panSubmissionsData.retailers || []).forEach(ret => {
                      existingMap[ret.userId.toLowerCase()] = { ...ret };
                    });

                    (users || []).forEach(u => {
                      const uId = (u.userId || '').trim();
                      if (!uId) return;
                      const key = uId.toLowerCase();
                      if (!existingMap[key]) {
                        const userApps = (panSubmissionsData.applications || []).filter(a =>
                          (a.userId || '').toLowerCase() === key ||
                          (u.mobile && a.mobileNumber && u.mobile === a.mobileNumber)
                        );
                        existingMap[key] = {
                          userId: uId,
                          totalCount: userApps.length,
                          manualCount: userApps.filter(a => (a.applicationType || '').toLowerCase().includes('manual')).length,
                          ekycCount: userApps.filter(a => !(a.applicationType || '').toLowerCase().includes('manual') && !(a.applicationType || '').toLowerCase().includes('correction')).length,
                          correctionCount: userApps.filter(a => (a.applicationType || '').toLowerCase().includes('correction')).length,
                          latestSubmission: userApps.length > 0 ? userApps[0].createdAt : null,
                          mobile: u.mobile || ''
                        };
                      } else {
                        if (u.mobile) existingMap[key].mobile = u.mobile;
                      }
                    });

                    return Object.values(existingMap).sort((a, b) => b.totalCount - a.totalCount);
                  })();

                  if (combinedBreakdownRetailers.length === 0) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                        No retailer PAN submissions recorded.
                      </div>
                    );
                  }

                  return (
                    <div style={{ overflowX: 'auto', maxHeight: '220px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0, zIndex: 5 }}>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Retailer User ID</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Total Submitted</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Manual PAN</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Aadhaar OTP PAN</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Correction</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700 }}>Latest Submission</th>
                            <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>Filter Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combinedBreakdownRetailers.map((ret) => (
                            <tr key={ret.userId} style={{ borderBottom: '1px solid #f1f5f9', background: panRetailerFilter.toLowerCase() === ret.userId.toLowerCase() ? '#eff6ff' : 'transparent' }}>
                              <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1d4ed8' }}>
                                <div>👤 {ret.userId}</div>
                                {ret.mobile && (
                                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>
                                    📞 {ret.mobile}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ padding: '2px 10px', background: ret.totalCount > 0 ? '#dbeafe' : '#f1f5f9', color: ret.totalCount > 0 ? '#1e40af' : '#64748b', borderRadius: '12px', fontWeight: 800, fontSize: '13px' }}>
                                  {ret.totalCount}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                                {ret.manualCount}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                                {ret.ekycCount}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                                {ret.correctionCount}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '12px' }}>
                                {ret.latestSubmission ? new Date(ret.latestSubmission).toLocaleString() : 'No submissions yet'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <button
                                  onClick={() => setPanRetailerFilter(ret.userId)}
                                  style={{
                                    padding: '4px 12px',
                                    background: panRetailerFilter.toLowerCase() === ret.userId.toLowerCase() ? '#1d4ed8' : '#f1f5f9',
                                    color: panRetailerFilter.toLowerCase() === ret.userId.toLowerCase() ? 'white' : '#334155',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '11.5px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {panRetailerFilter.toLowerCase() === ret.userId.toLowerCase() ? '✓ Active Filter' : '🔍 Filter Submissions'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* ALL SUBMITTED PAN APPLICATIONS TABLE WITH SEARCH & FILTERS & SCROLLABLE VIEW */}
              <div className="admin-card" style={{ background: 'white', borderRadius: '14px', padding: '20px 24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📄</span> Detailed PAN Applications
                    </h4>
                  </div>
                </div>

                {/* FILTER & GENERATE REPORT card — matches Ledger style */}
                <div className="ledger-filter-card" style={{ marginBottom: '18px' }}>
                  <div
                    className="ledger-filter-header"
                    onClick={() => setPanShowFilters(v => !v)}
                  >
                    <div className="ledger-filter-title">🔍 FILTER &amp; GENERATE REPORT</div>
                    <div className="ledger-filter-chevron">{panShowFilters ? '▲' : '▼'}</div>
                  </div>

                  {panShowFilters && (
                    <div className="ledger-filter-content">
                      <div className="ledger-filter-grid">

                        <div className="ledger-field-group">
                          <label>Retailer User ID</label>
                          <select
                            className="ledger-filter-input"
                            value={panRetailerFilter}
                            onChange={(e) => setPanRetailerFilter(e.target.value)}
                          >
                            {(() => {
                              const allRetailerIds = Array.from(new Set([
                                ...(panSubmissionsData.retailers || []).map(r => r.userId),
                                ...(users || []).map(u => u.userId)
                              ])).filter(Boolean).sort();

                              return (
                                <>
                                  <option value="All">All Retailers ({allRetailerIds.length})</option>
                                  {allRetailerIds.map(uId => {
                                    const userObj = (users || []).find(u => (u.userId || '').toLowerCase() === uId.toLowerCase());
                                    const label = userObj?.mobile ? `${uId} (📞 ${userObj.mobile})` : uId;
                                    return <option key={uId} value={uId}>{label}</option>;
                                  })}
                                </>
                              );
                            })()}
                          </select>
                        </div>

                        <div className="ledger-field-group">
                          <label>Start Date</label>
                          <input
                            type="date"
                            className="ledger-filter-input"
                            value={panStartDate}
                            onChange={(e) => { setPanStartDate(e.target.value); setPanPage(1); }}
                          />
                        </div>

                        <div className="ledger-field-group">
                          <label>End Date</label>
                          <input
                            type="date"
                            className="ledger-filter-input"
                            value={panEndDate}
                            onChange={(e) => { setPanEndDate(e.target.value); setPanPage(1); }}
                          />
                        </div>

                        <div className="ledger-field-group">
                          <label>Specific Month</label>
                          <input
                            type="month"
                            className="ledger-filter-input"
                            value={panMonth}
                            onChange={(e) => { setPanMonth(e.target.value); setPanPage(1); }}
                          />
                        </div>

                        <div className="ledger-field-group">
                          <label>Status</label>
                          <select
                            className="ledger-filter-input"
                            value={panStatusFilter}
                            onChange={(e) => { setPanStatusFilter(e.target.value); setPanPage(1); }}
                          >
                            <option value="All">All Statuses</option>
                            <option value="Submitted">Submitted</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Approved">Approved</option>
                            <option value="Completed">Completed</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>

                        <div className="ledger-field-group">
                          <label>Search Keywords</label>
                          <input
                            type="text"
                            className="ledger-filter-input"
                            placeholder="Ack No, Name, Mobile, Aadhaar..."
                            value={panSearchQuery}
                            onChange={(e) => { setPanSearchQuery(e.target.value); setPanPage(1); }}
                          />
                        </div>

                        <div className="ledger-field-group">
                          <label>Items Per Page</label>
                          <select
                            className="ledger-filter-input"
                            value={panPageSize}
                            onChange={(e) => { setPanPageSize(Number(e.target.value)); setPanPage(1); }}
                          >
                            <option value={10}>10 per page</option>
                            <option value={25}>25 per page</option>
                            <option value={50}>50 per page</option>
                            <option value={100}>100 per page</option>
                          </select>
                        </div>

                      </div>

                      <div className="ledger-filter-actions-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                          }}
                          onClick={() => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            setPanStartDate(todayStr);
                            setPanEndDate(todayStr);
                            setPanMonth('');
                            setPanPage(1);
                          }}
                        >
                          📅 Today's Applications
                        </button>

                        <button
                          type="button"
                          className="ledger-btn-reset"
                          onClick={() => {
                            setPanRetailerFilter('All');
                            setPanStatusFilter('All');
                            setPanStartDate('');
                            setPanEndDate('');
                            setPanMonth('');
                            setPanSearchQuery('');
                            setPanPage(1);
                          }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table Data Render with fixed max height and sticky header for 100+ items */}
                {(() => {
                  let filtered = panSubmissionsData.applications || [];

                  if (panRetailerFilter !== 'All') {
                    filtered = filtered.filter(app => (app.userId || '').toLowerCase() === panRetailerFilter.toLowerCase());
                  }

                  if (panStatusFilter !== 'All') {
                    filtered = filtered.filter(app => (app.status || 'Submitted').toLowerCase() === panStatusFilter.toLowerCase());
                  }

                  // Date range filter
                  if (panStartDate) {
                    const start = new Date(panStartDate);
                    start.setHours(0, 0, 0, 0);
                    filtered = filtered.filter(app => new Date(app.createdAt) >= start);
                  }
                  if (panEndDate) {
                    const end = new Date(panEndDate);
                    end.setHours(23, 59, 59, 999);
                    filtered = filtered.filter(app => new Date(app.createdAt) <= end);
                  }

                  // Specific month filter (YYYY-MM)
                  if (panMonth) {
                    filtered = filtered.filter(app => {
                      const d = new Date(app.createdAt);
                      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      return ym === panMonth;
                    });
                  }

                  if (panSearchQuery.trim()) {
                    const q = panSearchQuery.toLowerCase();
                    filtered = filtered.filter(app =>
                      (app.ackNumber || '').toLowerCase().includes(q) ||
                      (app.userId || '').toLowerCase().includes(q) ||
                      (app.applicantName || '').toLowerCase().includes(q) ||
                      (app.mobileNumber || '').toLowerCase().includes(q) ||
                      (app.email || '').toLowerCase().includes(q) ||
                      (app.aadhaarNumber || '').toLowerCase().includes(q)
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13.5px' }}>
                        No PAN applications match the selected search & filters.
                      </div>
                    );
                  }

                  const totalPages = Math.ceil(filtered.length / panPageSize) || 1;
                  const currentPage = Math.min(panPage, totalPages);
                  const startIndex = (currentPage - 1) * panPageSize;
                  const paginated = filtered.slice(startIndex, startIndex + panPageSize);

                  return (
                    <div>
                      <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', color: '#334155', borderBottom: '2px solid #e2e8f0', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Ack Number</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Retailer ID</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Service Type</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Applicant Name</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Contact Info</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Date Submitted</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Status</th>
                              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginated.map(app => {
                              const st = app.status || 'Submitted';
                              let stBg = '#fef9c3', stFg = '#854d0e';
                              if (st === 'Approved' || st === 'Completed') { stBg = '#dcfce7'; stFg = '#166534'; }
                              else if (st === 'Rejected') { stBg = '#fee2e2'; stFg = '#991b1b'; }
                              else if (st === 'In Progress') { stBg = '#e0f2fe'; stFg = '#0369a1'; }

                              return (
                                <tr key={app._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                                    {app.ackNumber}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1d4ed8' }}>
                                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>
                                      👤 {app.userId}
                                    </span>
                                    {(() => {
                                      const retUser = (users || []).find(u =>
                                        (u.userId || '').toLowerCase() === (app.userId || '').toLowerCase() ||
                                        (u.retailerId || '').toLowerCase() === (app.userId || '').toLowerCase() ||
                                        (u.mobile && app.mobileNumber && u.mobile === app.mobileNumber)
                                      );
                                      if (!retUser) return null;
                                      return (
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, marginTop: '3px' }}>
                                          {retUser.mobile && <div>📞 {retUser.mobile}</div>}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#475569', fontWeight: 600 }}>
                                    {app.applicationType}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                                    {app.applicantName}
                                    {app.dob && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>DOB: {app.dob}</div>}
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#475569' }}>
                                    <div>📞 {app.mobileNumber}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>✉️ {app.email}</div>
                                  </td>
                                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '11.5px' }}>
                                    {new Date(app.createdAt).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ padding: '3px 9px', background: stBg, color: stFg, borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                                      {st}
                                    </span>
                                    {app.receiptUrl && (
                                      <div style={{ marginTop: '3px' }}>
                                        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '1px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                          📄 Receipt Sent
                                        </span>
                                      </div>
                                    )}
                                    {app.adminRemarks && (
                                      <div style={{ fontSize: '10.5px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                                        "{app.adminRemarks}"
                                      </div>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>

                                      {/* PDF Download Button */}
                                      <button
                                        onClick={() => handleDownloadPdf(app)}
                                        style={{ padding: '5px 9px', background: '#10b981', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                                        title="Download Pre-filled Form 49A PDF"
                                      >
                                        📥 PDF
                                      </button>

                                      {/* Retailer Uploaded Documents Button */}
                                      <button
                                        onClick={() => handleOpenPanDocuments(app)}
                                        style={{ padding: '5px 9px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                                        title="View documents uploaded by retailer"
                                      >
                                        📎 Documents
                                      </button>

                                      {/* Edit Status & Receipt Upload Modal Trigger */}
                                      <button
                                        onClick={() => {
                                          setEditingPanAppStatus(app);
                                          setNewStatusVal(app.status || 'Submitted');
                                          setNewStatusRemarks(app.adminRemarks || '');
                                          setNewNsdlReceiptNumber(app.nsdlReceiptNumber || app.ackNumber || '');
                                          setNewReceiptFileUrl('');
                                        }}
                                        style={{ padding: '5px 9px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                                        title="Update Status & Upload Approved Receipt"
                                      >
                                        ✏️ Status
                                      </button>

                                      {/* Download/View Receipt if already uploaded OR Upload & Send Receipt button */}
                                      {app.receiptUrl ? (
                                        <button
                                          onClick={() => window.open(app.receiptUrl, '_blank')}
                                          style={{ padding: '5px 9px', background: '#059669', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
                                          title="View approved receipt sent to retailer"
                                        >
                                          📄 View Receipt
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingPanAppStatus(app);
                                            setNewStatusVal(app.status === 'Submitted' ? 'Approved' : (app.status || 'Approved'));
                                            setNewStatusRemarks(app.adminRemarks || '');
                                            setNewNsdlReceiptNumber(app.nsdlReceiptNumber || app.ackNumber || '');
                                            setNewReceiptFileUrl('');
                                          }}
                                          style={{ padding: '5px 9px', background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
                                          title={`Upload approved receipt PDF/Image to send to retailer (${app.userId})`}
                                        >
                                          📤 Send Receipt
                                        </button>
                                      )}

                                      {/* Export Excel Button */}
                                      <button
                                        onClick={() => exportSinglePanApplicationToExcel(app)}
                                        style={{ padding: '5px 9px', background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', border: 'none', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                                        title="Download this application as Excel"
                                      >
                                        📊 Excel
                                      </button>

                                      {/* Delete Application Button */}
                                      <button
                                        onClick={() => handleAdminDeletePanApp(app)}
                                        style={{ padding: '5px 9px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '5px', fontSize: '11.5px', cursor: 'pointer', fontWeight: 700 }}
                                        title="Delete PAN application"
                                      >
                                        🗑️ Delete
                                      </button>

                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls Footer */}
                      <div style={{
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        marginTop: '12px',
                        padding: '12px 16px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                          Showing <strong>{filtered.length === 0 ? 0 : startIndex + 1}</strong> to <strong>{Math.min(startIndex + panPageSize, filtered.length)}</strong> of <strong>{filtered.length}</strong> submissions
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setPanPage(prev => Math.max(1, prev - 1))}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                              color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ◀ Prev
                          </button>

                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', padding: '0 8px' }}>
                            Page {currentPage} of {totalPages}
                          </span>

                          <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setPanPage(prev => Math.min(totalPages, prev + 1))}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                              color: currentPage >= totalPages ? '#94a3b8' : '#1e293b',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                            }}
                          >
                            Next ▶
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* PAN Form Manager Tab */}
          {activeTab === 'panForms' && (
            <div className="admin-panel-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div className="pan-manager-card">
                
                {/* Manager Header Bar */}
                <div className="pan-manager-header-bar">
                  <div className="pan-manager-header-title">
                    <div className="pan-manager-title-icon">📝</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800, letterSpacing: '-0.3px' }}>
                        PAN Card Forms & Sub-Tabs Manager
                      </h3>
                      <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748b' }}>
                        Manage dynamic service sub-tabs, application fees, instructions, and input fields for retailers.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSavePanTabsConfig()}
                    className="pan-save-all-btn"
                  >
                    <span>💾</span> Save All Form Changes
                  </button>
                </div>

                {/* STEP 1: Select Active Service Sub-Tab */}
                <div className="pan-step-card">
                  <div className="pan-step-header">
                    <div className="pan-step-title-group">
                      <span className="pan-step-num-badge">1</span>
                      <h4 className="pan-step-title">STEP 1: Select PAN Sub-Tab to Configure</h4>
                    </div>
                    <button
                      onClick={() => setShowAddTabModal(!showAddTabModal)}
                      className={`pan-create-tab-btn ${showAddTabModal ? 'is-open' : ''}`}
                    >
                      {showAddTabModal ? '❌ Close Form' : '➕ Create New Service Sub-Tab'}
                    </button>
                  </div>

                  {/* Collapsible Create Sub-Tab Form */}
                  {showAddTabModal && (
                    <div className="pan-add-tab-panel">
                      <h5 style={{ margin: '0 0 14px', color: '#1d4ed8', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✨ Add a Brand New PAN Service Sub-Tab
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                        <div>
                          <label className="pan-input-label">Tab Title / Label *</label>
                          <input
                            type="text"
                            placeholder="e.g. E-PAN Minor / Physical PAN"
                            value={newTabForm.label}
                            onChange={(e) => setNewTabForm({ ...newTabForm, label: e.target.value })}
                            className="pan-form-control"
                          />
                        </div>
                        <div>
                          <label className="pan-input-label">Icon Emoji</label>
                          <input
                            type="text"
                            placeholder="e.g. 👦 / 💳"
                            value={newTabForm.icon}
                            onChange={(e) => setNewTabForm({ ...newTabForm, icon: e.target.value })}
                            className="pan-form-control"
                          />
                        </div>
                        <div>
                          <label className="pan-input-label">Fee Amount (₹)</label>
                          <input
                            type="number"
                            placeholder="107"
                            value={newTabForm.fee}
                            onChange={(e) => setNewTabForm({ ...newTabForm, fee: e.target.value })}
                            className="pan-form-control pan-fee-input"
                          />
                        </div>
                        <div>
                          <label className="pan-input-label">Badge Header</label>
                          <input
                            type="text"
                            placeholder="e.g. Minor Application"
                            value={newTabForm.badge}
                            onChange={(e) => setNewTabForm({ ...newTabForm, badge: e.target.value })}
                            className="pan-form-control"
                          />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="pan-input-label">Service Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Application for minor below 18 years of age..."
                            value={newTabForm.description}
                            onChange={(e) => setNewTabForm({ ...newTabForm, description: e.target.value })}
                            className="pan-form-control"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddNewPanTab}
                        className="pan-save-all-btn"
                        style={{ padding: '10px 20px', fontSize: '13px' }}
                      >
                        ➕ Save & Add New Tab
                      </button>
                    </div>
                  )}

                  {/* Active Tabs Selection Pill Bar */}
                  <div className="pan-subtabs-grid">
                    {panTabsConfigList.map(tab => {
                      const isActive = selectedPanTabId === tab.id;
                      return (
                        <div
                          key={tab.id}
                          className={`pan-subtab-pill ${isActive ? 'active' : ''}`}
                          onClick={() => setSelectedPanTabId(tab.id)}
                        >
                          <span className="pan-subtab-icon">{tab.icon || '💳'}</span>
                          <span>{tab.label}</span>
                          <span className="pan-subtab-fields-badge">
                            {tab.fields?.length || 0} fields
                          </span>
                          <button
                            type="button"
                            className="pan-subtab-trash-btn"
                            title="Delete this sub-tab"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePanTab(tab.id);
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2 & STEP 3 Container */}
                {(() => {
                  const currentTab = panTabsConfigList.find(t => t.id === selectedPanTabId);
                  if (!currentTab) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      
                      {/* STEP 2: Configure Tab Info & Fee */}
                      <div className="pan-step-card" style={{ marginBottom: 0 }}>
                        <div className="pan-step-header">
                          <div className="pan-step-title-group">
                            <span className="pan-step-num-badge step-2">2</span>
                            <h4 className="pan-step-title">
                              STEP 2: Tab Details & Fee for "{currentTab.label}"
                            </h4>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div>
                            <label className="pan-input-label">Tab Display Label</label>
                            <input
                              type="text"
                              value={currentTab.label || ''}
                              onChange={(e) => handleUpdateTabHeader('label', e.target.value)}
                              className="pan-form-control"
                            />
                          </div>
                          <div>
                            <label className="pan-input-label">Tab Icon Emoji</label>
                            <input
                              type="text"
                              value={currentTab.icon || ''}
                              onChange={(e) => handleUpdateTabHeader('icon', e.target.value)}
                              className="pan-form-control"
                            />
                          </div>
                          <div>
                            <label className="pan-input-label">Application Fee (₹)</label>
                            <input
                              type="number"
                              value={currentTab.fee || 107}
                              onChange={(e) => handleUpdateTabHeader('fee', Number(e.target.value))}
                              className="pan-form-control pan-fee-input"
                            />
                          </div>
                          <div>
                            <label className="pan-input-label">Badge Header</label>
                            <input
                              type="text"
                              value={currentTab.badge || ''}
                              onChange={(e) => handleUpdateTabHeader('badge', e.target.value)}
                              className="pan-form-control"
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label className="pan-input-label">Subtitle Instructions / Description</label>
                            <input
                              type="text"
                              value={currentTab.description || ''}
                              onChange={(e) => handleUpdateTabHeader('description', e.target.value)}
                              className="pan-form-control"
                            />
                          </div>
                        </div>
                      </div>

                      {/* STEP 3: Manage Form Fields */}
                      <div className="pan-step-card" style={{ background: '#ffffff', borderColor: '#fdba74', marginBottom: 0 }}>
                        
                        <div className="pan-step-header" style={{ borderBottom: '1.5px solid #ffedd5', paddingBottom: '14px', marginBottom: '20px' }}>
                          <div className="pan-step-title-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span className="pan-step-num-badge step-3">3</span>
                              <h4 className="pan-step-title" style={{ color: '#9a3412', margin: 0 }}>
                                STEP 3: Form Fields Builder for "{currentTab.label}"
                              </h4>
                            </div>

                            {/* Dynamic Badge */}
                            <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 800 }}>
                              Active Tab: {currentTab.label}
                            </span>
                          </div>
                        </div>

                        {/* FORM 93 vs FORM 94 SEPARATE FORM SELECTOR CARDS */}
                        {(selectedPanTabId === 'manual_new_pan' || selectedPanTabId === 'epan_correction') && (() => {
                          const masterFields = currentTab.fields || [];
                          const isF94 = (f) => {
                            if (!f) return false;
                            if (f.formType === 'Form 94') return true;
                            if (f.formType === 'Form 93' || f.formType === 'Both') return false;
                            const name = f.name || '';
                            return name.startsWith('comm') || name.startsWith('ra') || name.startsWith('verifier') || name === 'entityName' || name === 'dateOfIncorporation' || name === 'registrationNumber' || name === 'incomeSource' || name === 'proofOfIncorporation';
                          };
                          const isF93 = (f) => {
                            if (!f) return false;
                            if (f.formType === 'Form 93' || f.formType === 'Both') return true;
                            if (f.formType === 'Form 94') return false;
                            return !isF94(f);
                          };

                          const countF93 = masterFields.filter(isF93).length;
                          const countF94 = masterFields.filter(isF94).length;


                          return (
                            <div style={{ marginBottom: '24px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <span>📋 Select Form Standard to Manage Drag & Drop Fields:</span>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  Click on Form 93 or Form 94 to view and manage their fields below
                                </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                                
                                {/* FORM 93 SELECTION CARD */}
                                <div
                                  onClick={() => {
                                    setPanFormTypeFilter('Form93');
                                    setPanCategoryFilter('INDIVIDUAL');
                                  }}
                                  style={{
                                    background: panFormTypeFilter === 'Form93' ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : '#ffffff',
                                    border: panFormTypeFilter === 'Form93' ? '2.5px solid #0284c7' : '1.5px solid #cbd5e1',
                                    borderRadius: '16px',
                                    padding: '18px 20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: panFormTypeFilter === 'Form93' ? '0 8px 20px rgba(2, 132, 199, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {panFormTypeFilter === 'Form93' && (
                                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#0284c7', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '3px 12px', borderRadius: '0 0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      ✓ ACTIVE SELECTION
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: panFormTypeFilter === 'Form93' ? '#0284c7' : '#f1f5f9', color: panFormTypeFilter === 'Form93' ? '#ffffff' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
                                      👤
                                    </div>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: panFormTypeFilter === 'Form93' ? '#0369a1' : '#0f172a' }}>
                                        FORM 93 (Individual Applicants)
                                      </h4>
                                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                        Standard Form 49A for Individual Citizens
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px 12px', marginTop: '10px' }}>
                                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                                      📌 Applicable Category:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      <span style={{ background: '#0284c7', color: '#ffffff', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                                        👤 INDIVIDUAL
                                      </span>
                                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                        {countF93} Form Fields Configured
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* FORM 94 SELECTION CARD */}
                                <div
                                  onClick={() => {
                                    setPanFormTypeFilter('Form94');
                                    if (panCategoryFilter === 'INDIVIDUAL') setPanCategoryFilter('ALL');
                                  }}
                                  style={{
                                    background: panFormTypeFilter === 'Form94' ? 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' : '#ffffff',
                                    border: panFormTypeFilter === 'Form94' ? '2.5px solid #9333ea' : '1.5px solid #cbd5e1',
                                    borderRadius: '16px',
                                    padding: '18px 20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: panFormTypeFilter === 'Form94' ? '0 8px 20px rgba(147, 51, 234, 0.18)' : '0 2px 6px rgba(0,0,0,0.03)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                >
                                  {panFormTypeFilter === 'Form94' && (
                                    <div style={{ position: 'absolute', top: 0, right: 0, background: '#9333ea', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '3px 12px', borderRadius: '0 0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      ✓ ACTIVE SELECTION
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: panFormTypeFilter === 'Form94' ? '#9333ea' : '#f1f5f9', color: panFormTypeFilter === 'Form94' ? '#ffffff' : '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
                                      🏢
                                    </div>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: panFormTypeFilter === 'Form94' ? '#7e22ce' : '#0f172a' }}>
                                        FORM 94 (Non-Individual / Entities)
                                      </h4>
                                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                        Form 49A for Firms, Trusts, Companies & Other Entities
                                      </span>
                                    </div>
                                  </div>

                                  <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #d8b4fe', borderRadius: '10px', padding: '10px 12px', marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#7e22ce' }}>
                                        🏢 Form 94 Applicable Categories:
                                      </span>
                                      <span style={{ background: '#9333ea', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontSize: '10.5px', fontWeight: 800 }}>
                                        {countF94} Fields
                                      </span>
                                    </div>

                                    {/* List of Form 94 Entity Names */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                      {['FIRM', 'TRUST', 'COMPANY', 'HUF', 'LLP', 'BODY OF INDIVIDUALS', 'ASSOCIATION OF PERSONS', 'LOCAL AUTHORITY', 'GOVERNMENT', 'ARTIFICIAL JURIDICAL PERSON'].map(cat => (
                                        <span
                                          key={cat}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPanFormTypeFilter('Form94');
                                            setPanCategoryFilter(cat);
                                          }}
                                          style={{
                                            background: panCategoryFilter === cat ? '#9333ea' : '#f3e8ff',
                                            color: panCategoryFilter === cat ? '#ffffff' : '#7e22ce',
                                            border: '1px solid #d8b4fe',
                                            padding: '2px 7px',
                                            borderRadius: '8px',
                                            fontSize: '10.5px',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                          }}
                                          title={`Click to view fields for ${cat}`}
                                        >
                                          {cat}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                              </div>

                              {/* All Fields Combined Button */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPanFormTypeFilter('ALL');
                                    setPanCategoryFilter('ALL');
                                  }}
                                  style={{
                                    background: panFormTypeFilter === 'ALL' ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' : '#ffffff',
                                    color: panFormTypeFilter === 'ALL' ? '#ffffff' : '#475569',
                                    border: '1.5px solid #cbd5e1',
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  📂 View All Fields Combined ({masterFields.length})
                                </button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Add New Field Box */}
                        <div style={{ background: '#fffbf5', border: '1.5px dashed #ea580c', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
                          <h5 style={{ margin: '0 0 14px', color: '#ea580c', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ➕ Add a New Form Input Field to {(selectedPanTabId === 'manual_new_pan' || selectedPanTabId === 'epan_correction') ? (panFormTypeFilter === 'Form94' ? 'Form 94 (Non-Individual)' : 'Form 93 (Individual)') : 'Form'}
                          </h5>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                            <div>
                              <label className="pan-input-label">Field Label (Displayed to Retailer) *</label>
                              <input
                                type="text"
                                placeholder="e.g. Father's Full Name"
                                value={newPanFieldForm.label}
                                onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, label: e.target.value })}
                                className="pan-form-control"
                              />
                            </div>
                            
                            <div>
                              <label className="pan-input-label">Input Type</label>
                              <select
                                value={newPanFieldForm.type}
                                onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, type: e.target.value })}
                                className="pan-form-control"
                                style={{ fontWeight: 600 }}
                              >
                                <option value="text">🔤 Text Input (Name, Address, PAN No)</option>
                                <option value="tel">📱 Mobile / Phone Number</option>
                                <option value="email">📧 Email Address</option>
                                <option value="date">📅 Date Picker (DOB)</option>
                                <option value="select">🔽 Dropdown Selection Menu</option>
                                <option value="file">📁 Direct File / Photo Upload (Choose File)</option>
                              </select>
                            </div>

                            {/* Dynamic Options Input if Dropdown Select */}
                            {newPanFieldForm.type === 'select' && (
                              <div style={{ gridColumn: 'span 2', background: '#fff7ed', border: '1.5px solid #fdba74', padding: '12px 16px', borderRadius: '10px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#c2410c', marginBottom: '4px' }}>
                                  🔽 Dropdown Options (Comma Separated) *
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Male, Female, Transgender  OR  Option A, Option B"
                                  value={newPanFieldForm.optionsRaw}
                                  onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, optionsRaw: e.target.value })}
                                  className="pan-form-control"
                                  style={{ borderColor: '#f97316', fontWeight: 600 }}
                                />
                                <span style={{ fontSize: '11px', color: '#9a3412', marginTop: '4px', display: 'block' }}>
                                  💡 Separate each dropdown choice with a comma.
                                </span>
                              </div>
                            )}

                            <div>
                              <label className="pan-input-label">Placeholder Hint Text</label>
                              <input
                                type="text"
                                placeholder="e.g. Enter details..."
                                value={newPanFieldForm.placeholder}
                                onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, placeholder: e.target.value })}
                                className="pan-form-control"
                              />
                            </div>

                            <div>
                              <label className="pan-input-label">Icon Emoji</label>
                              <input
                                type="text"
                                placeholder="e.g. 👨‍👦 / 📱 / 📧"
                                value={newPanFieldForm.icon}
                                onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, icon: e.target.value })}
                                className="pan-form-control"
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#ea580c', cursor: 'pointer', background: '#ffffff', padding: '8px 12px', border: '1.5px solid #fed7aa', borderRadius: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={newPanFieldForm.required}
                                  onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, required: e.target.checked })}
                                  style={{ width: '16px', height: '16px', accentColor: '#ea580c', cursor: 'pointer' }}
                                />
                                Mandatory / Required?
                              </label>

                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800, color: '#0284c7', cursor: 'pointer', background: '#ffffff', padding: '8px 12px', border: '1.5px solid #bae6fd', borderRadius: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={newPanFieldForm.hidden}
                                  onChange={(e) => setNewPanFieldForm({ ...newPanFieldForm, hidden: e.target.checked })}
                                  style={{ width: '16px', height: '16px', accentColor: '#0284c7', cursor: 'pointer' }}
                                />
                                Hide Field from User Form?
                              </label>
                            </div>
                          </div>

                          <button
                            onClick={handleAddFieldToPanTab}
                            className="pan-save-all-btn"
                            style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', boxShadow: '0 4px 12px rgba(234,88,12,0.25)' }}
                          >
                            ➕ Add Field to Form
                          </button>
                        </div>

                        {/* Existing Form Fields Grid */}
                        {(() => {
                          const masterFields = currentTab.fields || [];
                          const isF94 = (f) => {
                            if (!f) return false;
                            if (f.formType === 'Form 94') return true;
                            if (f.formType === 'Form 93' || f.formType === 'Both') return false;
                            const name = f.name || '';
                            return name.startsWith('comm') || name.startsWith('ra') || name.startsWith('verifier') || name === 'entityName' || name === 'dateOfIncorporation' || name === 'registrationNumber' || name === 'incomeSource' || name === 'proofOfIncorporation';
                          };
                          const isF93 = (f) => {
                            if (!f) return false;
                            if (f.formType === 'Form 93' || f.formType === 'Both') return true;
                            if (f.formType === 'Form 94') return false;
                            return !isF94(f);
                          };

                          let displayedFields = masterFields;
                          if (selectedPanTabId === 'manual_new_pan' || selectedPanTabId === 'epan_correction') {
                            if (panFormTypeFilter === 'Form93') {
                              displayedFields = masterFields.filter(isF93);
                            } else if (panFormTypeFilter === 'Form94') {
                              displayedFields = masterFields.filter(isF94);
                            }
                          }

                          return (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                <h5 style={{ margin: 0, color: '#0f172a', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  📋 Configured Form Fields ({displayedFields.length}) {(selectedPanTabId === 'manual_new_pan' || selectedPanTabId === 'epan_correction') && (panFormTypeFilter === 'Form93' ? '— Form 93 (Individual)' : panFormTypeFilter === 'Form94' ? `— Form 94 (Non-Individual${panCategoryFilter !== 'ALL' ? ` • ${panCategoryFilter}` : ''})` : '')}
                                </h5>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={handleResetDefaultPanFields}
                                    style={{
                                      background: '#0284c7',
                                      color: '#ffffff',
                                      border: 'none',
                                      padding: '6px 14px',
                                      borderRadius: '8px',
                                      fontSize: '12px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                    title="Click to restore all standard government form fields for this form"
                                  >
                                    🔄 Load All Fixed Fields
                                  </button>
                                </div>
                              </div>

                              <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)' }}>
                                <table className="pan-fields-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                  <thead>
                                    <tr style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
                                      <th style={{ padding: '12px 14px', width: '130px' }}>Order & Drag</th>
                                      <th style={{ padding: '12px 14px', width: '120px' }}>Form Badge</th>
                                      <th style={{ padding: '12px 14px' }}>Field Label</th>
                                      <th style={{ padding: '12px 14px' }}>Field Key</th>
                                      <th style={{ padding: '12px 14px', width: '130px' }}>Input Type</th>
                                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '130px' }}>Visibility</th>
                                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '130px' }}>Requirement</th>
                                      <th style={{ padding: '12px 14px', textAlign: 'center', width: '90px' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {displayedFields.map((field, dispIdx) => {
                                      const masterIdx = masterFields.findIndex(f => f.name === field.name);
                                      const isForm94Field = isF94(field);
                                      const isDragging = draggedPanFieldIndex === masterIdx;
                                      const isDragOver = dragOverPanFieldIndex === masterIdx;

                                      return (
                                        <tr
                                          key={field.name || dispIdx}
                                          draggable={true}
                                          onDragStart={(e) => handlePanFieldDragStart(e, masterIdx)}
                                          onDragOver={(e) => handlePanFieldDragOver(e, masterIdx)}
                                          onDrop={(e) => handlePanFieldDrop(e, masterIdx)}
                                          onDragEnd={handlePanFieldDragEnd}
                                          style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            background: isDragging ? '#f0f9ff' : isDragOver ? '#e0f2fe' : dispIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                            transition: 'background 0.15s ease'
                                          }}
                                        >
                                          {/* Order & Drag Handle */}
                                          <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span style={{ cursor: 'grab', fontSize: '15px', color: '#94a3b8', userSelect: 'none' }} title="Drag row to reorder">
                                                ⋮⋮
                                              </span>
                                              <span style={{ background: '#e2e8f0', color: '#334155', fontWeight: 800, fontSize: '11px', padding: '2px 6px', borderRadius: '6px' }}>
                                                #{dispIdx + 1}
                                              </span>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                <button
                                                  type="button"
                                                  disabled={dispIdx === 0}
                                                  onClick={() => handleMovePanField(masterIdx, 'up')}
                                                  style={{ border: 'none', background: 'transparent', cursor: dispIdx === 0 ? 'not-allowed' : 'pointer', opacity: dispIdx === 0 ? 0.3 : 1, fontSize: '10px', padding: '0' }}
                                                  title="Move Up"
                                                >
                                                  ⬆️
                                                </button>
                                                <button
                                                  type="button"
                                                  disabled={dispIdx === displayedFields.length - 1}
                                                  onClick={() => handleMovePanField(masterIdx, 'down')}
                                                  style={{ border: 'none', background: 'transparent', cursor: dispIdx === displayedFields.length - 1 ? 'not-allowed' : 'pointer', opacity: dispIdx === displayedFields.length - 1 ? 0.3 : 1, fontSize: '10px', padding: '0' }}
                                                  title="Move Down"
                                                >
                                                  ⬇️
                                                </button>
                                              </div>
                                            </div>
                                          </td>

                                          {/* Form Badge */}
                                          <td style={{ padding: '10px 14px' }}>
                                            {isForm94Field ? (
                                              <span style={{ background: '#f3e8ff', color: '#9333ea', border: '1px solid #d8b4fe', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                                                🏢 Form 94
                                              </span>
                                            ) : (
                                              <span style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #7dd3fc', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}>
                                                👤 Form 93
                                              </span>
                                            )}
                                          </td>

                                          {/* Editable Label */}
                                          <td style={{ padding: '10px 14px' }}>
                                            <input
                                              type="text"
                                              value={field.label || ''}
                                              onChange={(e) => handleUpdatePanField(masterIdx, 'label', e.target.value)}
                                              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}
                                            />
                                          </td>

                                          {/* Field Key */}
                                          <td style={{ padding: '10px 14px' }}>
                                            <code style={{ background: '#f1f5f9', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
                                              {field.name}
                                            </code>
                                          </td>

                                          {/* Input Type */}
                                          <td style={{ padding: '10px 14px' }}>
                                            <select
                                              value={field.type || 'text'}
                                              onChange={(e) => handleUpdatePanField(masterIdx, 'type', e.target.value)}
                                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}
                                            >
                                              <option value="text">Text</option>
                                              <option value="tel">Mobile</option>
                                              <option value="email">Email</option>
                                              <option value="date">Date</option>
                                              <option value="select">Dropdown</option>
                                              <option value="file">File Upload</option>
                                            </select>
                                          </td>

                                          {/* Visibility Toggle */}
                                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePanField(masterIdx, 'hidden')}
                                              style={{
                                                background: field.hidden ? '#f1f5f9' : '#dcfce7',
                                                color: field.hidden ? '#64748b' : '#15803d',
                                                border: `1px solid ${field.hidden ? '#cbd5e1' : '#86efac'}`,
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                width: '100%'
                                              }}
                                            >
                                              {field.hidden ? '🙈 HIDDEN' : '👁️ DISPLAYED'}
                                            </button>
                                          </td>

                                          {/* Requirement Toggle */}
                                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePanField(masterIdx, 'required')}
                                              style={{
                                                background: field.required ? '#fee2e2' : '#f1f5f9',
                                                color: field.required ? '#dc2626' : '#64748b',
                                                border: `1px solid ${field.required ? '#fca5a5' : '#cbd5e1'}`,
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                width: '100%'
                                              }}
                                            >
                                              {field.required ? '🔴 REQUIRED' : '⚪ OPTIONAL'}
                                            </button>
                                          </td>

                                          {/* Delete Action */}
                                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <button
                                              type="button"
                                              onClick={() => handleDeletePanField(masterIdx)}
                                              style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                                              title="Delete field"
                                            >
                                              🗑️ Delete
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    </div>
                  );
                })()}

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
                <div className="modern-table-container">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>User & Ref</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Remarks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRequisitions.filter(r => reqStatusFilter === 'All' || r.status === reqStatusFilter).filter(r => r.userId.toLowerCase().includes(reqSearch.toLowerCase()) || r.referenceNumber.toLowerCase().includes(reqSearch.toLowerCase())).map((req) => {
                        let statusClass = 'status-pending';
                        if (req.status === 'Approved') statusClass = 'status-approved';
                        if (req.status === 'Partially Approved') statusClass = 'status-partial';
                        if (req.status === 'Rejected') statusClass = 'status-rejected';

                        return (
                          <tr key={req._id}>
                            <td>
                              <strong>{req.userId}</strong><br/>
                              <span style={{ color: '#6b7280', fontSize: '12px' }}>{req.referenceNumber}</span>
                            </td>
                            <td>
                              <div>Req: ₹{req.amount}</div>
                              <div style={{ color: '#059669', fontSize: '12px' }}>App: ₹{req.approvedAmount || 0}</div>
                              <div style={{ color: '#6b7280', fontSize: '12px' }}>{new Date(req.paymentDate).toLocaleDateString()}</div>
                            </td>
                            <td>
                              <span className={`status-badge ${statusClass}`}>{req.status}</span>
                            </td>
                            <td style={{ maxWidth: '150px', wordWrap: 'break-word' }}>
                              {req.remarks || '-'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {req.status === 'Pending' && (
                                  <button className="modern-submit-btn" style={{ padding: '6px 12px', background: '#22c55e', fontSize: '13px', margin: 0 }} onClick={() => updateRequisition(req._id, 'Approved', req.amount)}>Approve</button>
                                )}
                                {req.status !== 'Rejected' && (
                                  <button className="modern-delete-btn" style={{ padding: '6px 12px', background: '#ef4444', fontSize: '13px', margin: 0 }} onClick={() => updateRequisition(req._id, 'Rejected', 0)}>Reject</button>
                                )}
                                <button
                                  className="modern-submit-btn"
                                  style={{ padding: '6px 12px', background: '#2563eb', color: '#ffffff', fontSize: '13px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleEditRequisition(req)}
                                  title="Edit payment requisition"
                                >
                                  <span>✏️</span> Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {paymentRequisitions.length === 0 && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No payment requisitions found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fees Management – PAN New Application Tab */}
          {activeTab === 'feesNewApplication' && (
            <FeesLedgerTab
              title="PAN New Application Fees Ledger"
              icon="📄"
              color="#2563eb"
              applicationType="new"
              applications={(panSubmissionsData.applications || []).filter(app => {
                const t = (app.applicationType || app.type || '').toLowerCase();
                return t === 'new' || t === 'new application' || t === 'manual_new_pan' || t === '' || !t;
              })}
            />
          )}

          {/* Fees Management – PAN Correction Tab */}
          {activeTab === 'feesCorrection' && (
            <FeesLedgerTab
              title="PAN Correction Fees Ledger"
              icon="✏️"
              color="#7c3aed"
              applicationType="correction"
              applications={(panSubmissionsData.applications || []).filter(app => {
                const t = (app.applicationType || app.type || '').toLowerCase();
                return t === 'correction' || t === 'pan correction' || t === 'manual_pan_correction';
              })}
            />
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Pending Account Approval Requests Section */}
              {users.filter(u => u.status === 'Pending').length > 0 && (
                <div className="admin-card" style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>⏳</span>
                      <div>
                        <h3 style={{ margin: 0, color: '#92400e', fontSize: '18px', fontWeight: '800' }}>
                          Pending Account Approval Requests ({users.filter(u => u.status === 'Pending').length})
                        </h3>
                        <p style={{ margin: '2px 0 0 0', color: '#b45309', fontSize: '13px' }}>
                          The following users registered online and are waiting for administrative approval to access their accounts.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                    {users.filter(u => u.status === 'Pending').map(u => (
                      <div key={u._id} style={{ background: '#ffffff', border: '1px solid #fcd34d', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(245,158,11,0.08)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>👤 {u.userId}</div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>📱 {u.mobile || 'No Mobile'}</div>
                            {u.email && <div style={{ fontSize: '12px', color: '#64748b' }}>✉️ {u.email}</div>}
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent'} | Retailer ID: {u.retailerId || 'MBM-Auto'}
                            </div>
                          </div>
                          <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '6px' }}>
                            PENDING
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                          <button
                            onClick={() => updateUserStatus(u._id, 'Approved')}
                            style={{ flex: 1, padding: '8px 12px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                          >
                            <span>✓</span> Approve User
                          </button>
                          <button
                            onClick={() => updateUserStatus(u._id, 'Rejected')}
                            style={{ padding: '8px 14px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="admin-panel-grid">
                <div className="admin-card form-card">
                  <h3>Create New User</h3>
                  <form className="modern-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                    <input type="text" placeholder="User ID (e.g. MBM000012)" value={userForm.userId} onChange={e => setUserForm({...userForm, userId: e.target.value})} autoComplete="off" />
                    <input type="email" placeholder="Email Address" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} autoComplete="off" />
                    <input type="text" placeholder="Mobile Number (10 digits)" value={userForm.mobile} onChange={e => setUserForm({...userForm, mobile: e.target.value})} autoComplete="off" />
                    <button type="button" className="modern-submit-btn" onClick={addUser}>Create User</button>
                  </form>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ fontSize: '16px', color: '#1e293b' }}>👤 {u.userId}</strong>
                          <span style={{ fontSize: '13px', color: '#64748b' }}>📱 {u.mobile || 'No Mobile'}</span>
                          {u.status === 'Pending' ? (
                            <span style={{ background: '#ffedd5', color: '#c2410c', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>⏳ Pending Approval</span>
                          ) : u.status === 'Rejected' ? (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>✕ Rejected</span>
                          ) : (
                            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '6px', width: 'fit-content' }}>✓ Approved</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                          {u.status === 'Pending' && (
                            <button
                              onClick={() => updateUserStatus(u._id, 'Approved')}
                              style={{ padding: '6px 12px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPanRetailerFilter(u.userId);
                              setActiveTab('panSubmissions');
                            }}
                            style={{ padding: '5px 9px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title={`View filings & send receipts for ${u.userId}`}
                          >
                            <span>📄</span> Receipts
                          </button>
                          <button className="modern-delete-btn" onClick={() => deleteItem(`${API_URL}/api/users`, u._id)} style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}>Remove</button>
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p style={{ color: '#888', padding: '20px' }}>No users found.</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ledgerHistory' && (
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '600px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2.5px solid #f1f5f9', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#1e293b', border: 'none', padding: 0 }}>📒 Wallet Ledger Transaction History</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button onClick={downloadCSVTemplate} style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    📋 Template
                  </button>
                  <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} id="admin-csv-import" />
                  <button onClick={() => document.getElementById('admin-csv-import').click()} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(245,158,11,0.25)' }}>
                    📥 Import CSV
                  </button>
                  <button onClick={() => exportLedgerToCSV(ledgerTransactions)} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(16,185,129,0.25)' }}>
                    🟢 Export Excel (CSV)
                  </button>
                  <button onClick={() => printLedgerPDF(ledgerTransactions, ledgerFilters)} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(139,92,246,0.25)' }}>
                    🟣 Download PDF
                  </button>
                </div>
              </div>

              {/* Professional Admin to Retailer Payment & Wallet Adjustment Card */}
              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                {/* Card Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: 'white', boxShadow: '0 4px 10px rgba(37,99,235,0.25)' }}>
                      💳
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Admin to Retailer Payment & Wallet Transfer</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Instantly Credit (+) or Debit (-) money for any retailer account</p>
                    </div>
                  </div>
                  
                  {selectedRetailer && (
                    <button 
                      onClick={() => { setSelectedRetailer(null); setRetailerSearchQuery(''); setTransferAmount(''); setTransferRemarks(''); }} 
                      style={{ padding: '6px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      🔄 Change Retailer
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
                  
                  {/* LEFT COLUMN: Retailer Selection */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', height: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Step 1: Choose Retailer
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowRetailerModal(true)}
                        style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        👥 Browse All ({users.length})
                      </button>
                    </div>

                    {!selectedRetailer ? (
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="🔍 Type Retailer Name, User ID, or Mobile..." 
                          value={retailerSearchQuery}
                          onFocus={() => setShowSearchDropdown(true)}
                          onChange={e => {
                            setRetailerSearchQuery(e.target.value);
                            setShowSearchDropdown(true);
                          }}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: 'white', fontSize: '13.5px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        />

                        {/* Search Dropdown Popup */}
                        {showSearchDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', marginTop: '6px', maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
                            <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                              <span>Matching Retailers ({filteredRetailers.length})</span>
                              <button type="button" onClick={() => setShowSearchDropdown(false)} style={{ border: 'none', background: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer', fontSize: '11px' }}>Close ✕</button>
                            </div>
                            {filteredRetailers.length === 0 ? (
                              <div style={{ padding: '16px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>No retailer found for "{retailerSearchQuery}"</div>
                            ) : (
                              filteredRetailers.map(r => (
                                <div 
                                  key={r._id || r.userId}
                                  onClick={() => {
                                    setSelectedRetailer(r);
                                    setRetailerSearchQuery(r.name ? `${r.name} (${r.userId})` : r.userId);
                                    setShowSearchDropdown(false);
                                  }}
                                  style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <div>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>👤 {r.name || r.userId}</div>
                                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>ID: <strong>{r.userId}</strong> {r.mobile ? `| 📱 ${r.mobile}` : ''}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#10b981' }}>₹{(r.walletBalance || 0).toFixed(2)}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Wallet</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Selected Retailer Card Banner */
                      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)', border: '1.5px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1e40af' }}>👤 {selectedRetailer.name || selectedRetailer.userId}</div>
                          <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
                            User ID: <strong>{selectedRetailer.userId}</strong> {selectedRetailer.mobile ? `| 📱 ${selectedRetailer.mobile}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Current Wallet</div>
                          <div style={{ fontSize: '17px', fontWeight: 900, color: '#059669' }}>₹{(selectedRetailer.walletBalance || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: Payment Details & Action */}
                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                      Step 2: Payment Action & Amount
                    </label>

                    {/* Credit / Debit Pills */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                      <button 
                        type="button"
                        onClick={() => setTransferTxType('Credit')}
                        style={{ 
                          padding: '10px', 
                          borderRadius: '10px', 
                          border: transferTxType === 'Credit' ? '2px solid #16a34a' : '1px solid #cbd5e1', 
                          background: transferTxType === 'Credit' ? '#dcfce7' : 'white', 
                          color: transferTxType === 'Credit' ? '#15803d' : '#475569', 
                          fontWeight: 800, 
                          fontSize: '13.5px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '6px'
                        }}
                      >
                        ➕ CREDIT (+)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTransferTxType('Debit')}
                        style={{ 
                          padding: '10px', 
                          borderRadius: '10px', 
                          border: transferTxType === 'Debit' ? '2px solid #dc2626' : '1px solid #cbd5e1', 
                          background: transferTxType === 'Debit' ? '#fee2e2' : 'white', 
                          color: transferTxType === 'Debit' ? '#b91c1c' : '#475569', 
                          fontWeight: 800, 
                          fontSize: '13.5px', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '6px'
                        }}
                      >
                        ➖ DEBIT (-)
                      </button>
                    </div>

                    {/* Amount & Presets */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Enter Amount (₹) *
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        step="any"
                        placeholder="e.g. 500" 
                        value={transferAmount}
                        onChange={e => setTransferAmount(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', background: 'white', fontSize: '14px', fontWeight: 700, color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />

                      {/* Quick Presets */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {[100, 500, 1000, 2000, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setTransferAmount(amt.toString())}
                            style={{ padding: '4px 8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}
                          >
                            +₹{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Remarks / Description
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Counter Payment, Commission, Adjustment" 
                        value={transferRemarks}
                        onChange={e => setTransferRemarks(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="button"
                      onClick={handleAdminWalletTransfer}
                      disabled={transferLoading || !selectedRetailer || !transferAmount}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        borderRadius: '10px', 
                        border: 'none', 
                        background: transferTxType === 'Credit' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                        color: 'white', 
                        fontSize: '14.5px', 
                        fontWeight: 800, 
                        cursor: (transferLoading || !selectedRetailer || !transferAmount) ? 'not-allowed' : 'pointer',
                        opacity: (transferLoading || !selectedRetailer || !transferAmount) ? 0.6 : 1,
                        boxShadow: transferTxType === 'Credit' ? '0 4px 12px rgba(16,185,129,0.3)' : '0 4px 12px rgba(239,68,68,0.3)'
                      }}
                    >
                      {transferLoading ? 'Processing...' : selectedRetailer ? `🚀 Submit ${transferTxType} Payment to ${selectedRetailer.name || selectedRetailer.userId}` : `Select Retailer First`}
                    </button>
                  </div>
                </div>
              </div>

              {/* Retailer Selection Overlay Modal (Ideal for 1,000+ Retailers) */}
              {showRetailerModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                  <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                    
                    {/* Modal Header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>👥 Select Retailer for Payment</h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Choose any retailer from the system ({users.length} registered retailers)</p>
                      </div>
                      <button 
                        onClick={() => setShowRetailerModal(false)}
                        style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: '#e2e8f0', color: '#475569', fontSize: '16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Modal Search Bar */}
                    <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                      <input 
                        type="text"
                        placeholder="🔍 Search by Retailer Name, User ID, Mobile No..."
                        value={modalSearch}
                        onChange={e => setModalSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Modal Retailer List Table */}
                    <div style={{ padding: '10px 20px', overflowY: 'auto', flex: 1 }}>
                      {users
                        .filter(u => {
                          if (!modalSearch.trim()) return true;
                          const q = modalSearch.toLowerCase().trim();
                          return (u.name && u.name.toLowerCase().includes(q)) ||
                                 (u.userId && u.userId.toLowerCase().includes(q)) ||
                                 (u.retailerId && u.retailerId.toLowerCase().includes(q)) ||
                                 (u.mobile && u.mobile.toString().includes(q));
                        })
                        .map(r => (
                          <div 
                            key={r._id || r.userId}
                            onClick={() => {
                              setSelectedRetailer(r);
                              setRetailerSearchQuery(r.name ? `${r.name} (${r.userId})` : r.userId);
                              setShowRetailerModal(false);
                            }}
                            style={{
                              display: 'flex',
                              justify: 'space-between',
                              alignItems: 'center',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              border: '1px solid #f1f5f9',
                              marginBottom: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              background: '#ffffff'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                                {(r.name || r.userId).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{r.name || r.userId}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  User ID: <strong>{r.userId}</strong> {r.mobile ? `| 📱 ${r.mobile}` : ''}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Wallet Balance</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981' }}>₹{(r.walletBalance || 0).toFixed(2)}</div>
                              </div>
                              <button 
                                style={{ padding: '7px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}


              {/* Filters Panel */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 800, letterSpacing: '0.5px' }}>Filter & Generate Report</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>User ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. MBM000012" 
                      value={filterInput.userId} 
                      onChange={e => setFilterInput({...filterInput, userId: e.target.value})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={filterInput.startDate} 
                      onChange={e => setFilterInput({...filterInput, startDate: e.target.value, month: ''})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>End Date</label>
                    <input 
                      type="date" 
                      value={filterInput.endDate} 
                      onChange={e => setFilterInput({...filterInput, endDate: e.target.value, month: ''})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Specific Month</label>
                    <input 
                      type="month" 
                      value={filterInput.month} 
                      onChange={e => setFilterInput({...filterInput, month: e.target.value, startDate: '', endDate: ''})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Tx Type</label>
                    <select 
                      value={filterInput.transactionType} 
                      onChange={e => setFilterInput({...filterInput, transactionType: e.target.value})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: 'white' }}
                    >
                      <option value="All">All Types</option>
                      <option value="Credit">Credit (+)</option>
                      <option value="Debit">Debit (-)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Status</label>
                    <select 
                      value={filterInput.status} 
                      onChange={e => setFilterInput({...filterInput, status: e.target.value})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: 'white' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Success">Success</option>
                      <option value="Pending">Pending</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Search Keywords (Ref, Description...)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. UPI, NetBanking, topup..." 
                      value={filterInput.search} 
                      onChange={e => setFilterInput({...filterInput, search: e.target.value})} 
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Items Per Page</label>
                    <select
                      value={ledgerPageSize}
                      onChange={e => { setLedgerPageSize(Number(e.target.value)); setLedgerPage(1); }}
                      style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', background: 'white' }}
                    >
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 10px rgba(37,99,235,0.2)'
                    }}
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const todayFilters = { ...filterInput, startDate: todayStr, endDate: todayStr, month: '' };
                      setFilterInput(todayFilters);
                      setLedgerFilters(todayFilters);
                      setLedgerPage(1);
                    }}
                  >
                    📅 Today's Applications / Transactions
                  </button>
                  <button onClick={handleResetFilters} style={{ padding: '8px 16px', background: '#cbd5e1', color: '#1e293b', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Reset Filters
                  </button>
                  <button onClick={handleApplyFilters} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #1b2559 0%, #4318ff 100%)', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(67,24,255,0.2)' }}>
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              {(() => {
                const totalLedgerPages = Math.ceil(ledgerTransactions.length / ledgerPageSize) || 1;
                const currentLedgerPage = Math.min(ledgerPage, totalLedgerPages);
                const ledgerStartIndex = (currentLedgerPage - 1) * ledgerPageSize;
                const paginatedLedger = ledgerTransactions.slice(ledgerStartIndex, ledgerStartIndex + ledgerPageSize);

                return (
                  <div>
                    <div className="modern-table-container" style={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}>
                      <table className="modern-table" style={{ width: '100%' }}>
                        <thead>
                          <tr style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9' }}>
                            <th style={{ padding: '12px' }}>Date & Time</th>
                            <th style={{ padding: '12px' }}>User ID</th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th style={{ padding: '12px' }}>Amount</th>
                            <th style={{ padding: '12px' }}>Before</th>
                            <th style={{ padding: '12px' }}>After</th>
                            <th style={{ padding: '12px' }}>Description</th>
                            <th style={{ padding: '12px' }}>Reference No</th>
                            <th style={{ padding: '12px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerLoading ? (
                            <tr>
                              <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #cbd5e1', borderTopColor: '#4318ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 'bold' }}>Loading transactions...</div>
                              </td>
                            </tr>
                          ) : ledgerTransactions.length === 0 ? (
                            <tr>
                              <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                <span style={{ fontSize: '30px' }}>📭</span>
                                <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>No transactions found for the selected filters.</p>
                              </td>
                            </tr>
                          ) : (
                            paginatedLedger.map(tx => (
                              <tr key={tx._id}>
                                <td style={{ whiteSpace: 'nowrap', padding: '12px', fontSize: '13px' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                                <td style={{ padding: '12px', fontSize: '13px' }}><strong>{tx.userId}</strong></td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                  <span className={`status-badge ${tx.transactionType === 'Credit' ? 'status-approved' : 'status-rejected'}`} style={{ padding: '4px 8px', fontSize: '11px' }}>
                                    {tx.transactionType}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', fontSize: '13px' }}><strong style={{ color: tx.transactionType === 'Credit' ? '#10b981' : '#ef4444' }}>{tx.transactionType === 'Credit' ? '+' : '-'} ₹{parseFloat(tx.amount).toFixed(2)}</strong></td>
                                <td style={{ color: '#64748b', padding: '12px', fontSize: '13px' }}>₹{parseFloat(tx.balanceBefore).toFixed(2)}</td>
                                <td style={{ fontWeight: 600, padding: '12px', fontSize: '13px' }}>₹{parseFloat(tx.balanceAfter).toFixed(2)}</td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>{tx.description}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px', padding: '12px' }}>{tx.referenceNumber}</td>
                                <td style={{ padding: '12px', fontSize: '13px' }}>
                                  <span className={`status-badge ${tx.status === 'Success' ? 'status-approved' : tx.status === 'Pending' ? 'status-pending' : 'status-rejected'}`} style={{ padding: '4px 8px', fontSize: '11px' }}>
                                    {tx.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Ledger Pagination Footer */}
                    <div style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600' }}>
                        Showing <strong>{ledgerTransactions.length === 0 ? 0 : ledgerStartIndex + 1}</strong> to <strong>{Math.min(ledgerStartIndex + ledgerPageSize, ledgerTransactions.length)}</strong> of <strong>{ledgerTransactions.length}</strong> transactions
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          disabled={currentLedgerPage <= 1}
                          onClick={() => setLedgerPage(prev => Math.max(1, prev - 1))}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: currentLedgerPage <= 1 ? '#f1f5f9' : '#ffffff',
                            color: currentLedgerPage <= 1 ? '#94a3b8' : '#1e293b',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: currentLedgerPage <= 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ◀ Prev
                        </button>

                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', padding: '0 8px' }}>
                          Page {currentLedgerPage} of {totalLedgerPages}
                        </span>

                        <button
                          type="button"
                          disabled={currentLedgerPage >= totalLedgerPages}
                          onClick={() => setLedgerPage(prev => Math.min(totalLedgerPages, prev + 1))}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: currentLedgerPage >= totalLedgerPages ? '#f1f5f9' : '#ffffff',
                            color: currentLedgerPage >= totalLedgerPages ? '#94a3b8' : '#1e293b',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: currentLedgerPage >= totalLedgerPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Next ▶
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Staff Management Tab (Admin Only) */}
          {activeTab === 'staffMembers' && userRole === 'admin' && (() => {
            const totalStaffCount = staffList.length;
            const activeStaffCount = staffList.filter(s => s.isActive !== false).length;
            const suspendedStaffCount = staffList.filter(s => s.isActive === false).length;
            const totalPermissionsAssigned = staffList.reduce((acc, s) => acc + (s.permissions || []).length, 0);

            return (
              <div className="staff-container" style={{ padding: '0 4px' }}>
                
                {/* KPI Stats Overview Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)' }}>
                      👥
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Total Staff Accounts
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '2px 0 0' }}>
                        {totalStaffCount}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '1.5px solid #bbf7d0', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                      🟢
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Active & Operational
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#14532d', margin: '2px 0 0' }}>
                        {activeStaffCount}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)', border: '1.5px solid #fed7aa', borderRadius: '16px', padding: '18px 22px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)' }}>
                      🛡️
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Assigned Permissions
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: '#7c2d12', margin: '2px 0 0' }}>
                        {totalPermissionsAssigned}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Header Card with Controls */}
                <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '20px 24px', marginBottom: '24px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>👔</span> Staff Access Control & Role Manager
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                        Create team member credentials and assign specific module permissions for secure admin access.
                      </p>
                    </div>

                    <button 
                      type="button"
                      className="staff-add-btn"
                      onClick={handleOpenAddStaff}
                      style={{
                        background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                        color: '#ffffff',
                        border: 'none',
                        padding: '12px 22px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                        transition: 'transform 0.15s ease'
                      }}
                    >
                      <span>➕</span> Add New Staff Member
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '14px' }}>
                    {/* Status Filter Switcher */}
                    <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('ALL')}
                        style={{
                          background: staffStatusFilter === 'ALL' ? '#ffffff' : 'transparent',
                          color: staffStatusFilter === 'ALL' ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: staffStatusFilter === 'ALL' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                        }}
                      >
                        All Staff ({totalStaffCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('ACTIVE')}
                        style={{
                          background: staffStatusFilter === 'ACTIVE' ? '#10b981' : 'transparent',
                          color: staffStatusFilter === 'ACTIVE' ? '#ffffff' : '#15803d',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: staffStatusFilter === 'ACTIVE' ? '0 2px 6px rgba(16,185,129,0.3)' : 'none'
                        }}
                      >
                        🟢 Active ({activeStaffCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffStatusFilter('SUSPENDED')}
                        style={{
                          background: staffStatusFilter === 'SUSPENDED' ? '#ef4444' : 'transparent',
                          color: staffStatusFilter === 'SUSPENDED' ? '#ffffff' : '#b91c1c',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '9px',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          boxShadow: staffStatusFilter === 'SUSPENDED' ? '0 2px 6px rgba(239,68,68,0.3)' : 'none'
                        }}
                      >
                        🔴 Suspended ({suspendedStaffCount})
                      </button>
                    </div>

                    {/* View Switcher & Search Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {/* View Mode Switcher */}
                      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setStaffViewMode('GRID')}
                          style={{
                            background: staffViewMode === 'GRID' ? '#ffffff' : 'transparent',
                            color: staffViewMode === 'GRID' ? '#ea580c' : '#64748b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: staffViewMode === 'GRID' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          🔲 Grid Cards
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffViewMode('TABLE')}
                          style={{
                            background: staffViewMode === 'TABLE' ? '#ffffff' : 'transparent',
                            color: staffViewMode === 'TABLE' ? '#ea580c' : '#64748b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: staffViewMode === 'TABLE' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          📋 Table View
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffViewMode('BOTH')}
                          style={{
                            background: staffViewMode === 'BOTH' ? '#ffffff' : 'transparent',
                            color: staffViewMode === 'BOTH' ? '#ea580c' : '#64748b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: staffViewMode === 'BOTH' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          📊 Show Both
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '15px' }}>
                          🔍
                        </span>
                        <input 
                          type="text" 
                          className="staff-search-input" 
                          placeholder="Search name, username, mobile..." 
                          value={staffSearch}
                          onChange={(e) => setStaffSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '9px 14px 9px 36px',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '10px',
                            fontSize: '13px',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Cards Grid */}
                {staffLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                    <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #cbd5e1', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <p style={{ marginTop: '12px', fontWeight: 700, fontSize: '14px' }}>Loading staff records...</p>
                  </div>
                ) : filteredStaffList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '18px', border: '1.5px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>👥</span>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                      {staffSearch ? 'No staff member found matching your search' : 'No staff accounts created yet'}
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#64748b', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto' }}>
                      Click "Add New Staff Member" above to create credentials and assign tab module permissions.
                    </p>
                    <button 
                      type="button"
                      onClick={handleOpenAddStaff}
                      style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ➕ Add First Staff Member
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Data Table View */}
                    {(staffViewMode === 'TABLE' || staffViewMode === 'BOTH') && (
                      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', overflowX: 'auto', marginBottom: staffViewMode === 'BOTH' ? '28px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📋</span> Staff Accounts Data Table ({filteredStaffList.length})
                          </h4>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Showing active & suspended accounts</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px' }}>STAFF MEMBER</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px' }}>CONTACT DETAILS</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px' }}>STATUS</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px' }}>ASSIGNED MODULE PERMISSIONS</th>
                              <th style={{ padding: '12px 14px', fontWeight: 800, fontSize: '12px', letterSpacing: '0.5px', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStaffList.map(staff => {
                              const isStaffActive = staff.isActive !== false;
                              const perms = staff.permissions || [];
                              return (
                                <tr key={staff._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: isStaffActive ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' : '#64748b', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', boxShadow: isStaffActive ? '0 3px 8px rgba(234, 88, 12, 0.25)' : 'none' }}>
                                        {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{staff.name}</div>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#ea580c', background: '#fff7ed', padding: '2px 6px', borderRadius: '5px', fontFamily: 'monospace' }}>@{staff.username}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '14px' }}>
                                    <div style={{ color: '#334155', fontWeight: 600, fontSize: '12.5px' }}>✉️ {staff.email || 'No Email'}</div>
                                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>📱 {staff.mobile || 'No Mobile'}</div>
                                  </td>
                                  <td style={{ padding: '14px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      style={{
                                        background: isStaffActive ? '#dcfce7' : '#fee2e2',
                                        color: isStaffActive ? '#15803d' : '#dc2626',
                                        border: `1px solid ${isStaffActive ? '#86efac' : '#fca5a5'}`,
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {isStaffActive ? '● Active' : '○ Suspended'}
                                    </button>
                                  </td>
                                  <td style={{ padding: '14px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxWidth: '400px' }}>
                                      {perms.length === 0 ? (
                                        <span style={{ fontSize: '11.5px', color: '#dc2626', fontStyle: 'italic', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px' }}>⚠️ No modules assigned</span>
                                      ) : (
                                        perms.map(permId => {
                                          const mod = AVAILABLE_STAFF_MODULES.find(m => m.id === permId);
                                          return (
                                            <span key={permId} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#1e293b', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              <span>{mod?.icon || '🔹'}</span>
                                              <span>{mod?.label || permId}</span>
                                            </span>
                                          );
                                        })
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '14px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStaff(staff)}
                                        style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)' }}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteStaff(staff._id, staff.name)}
                                        style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                                      >
                                        🗑️ Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Grid Cards View */}
                    {(staffViewMode === 'GRID' || staffViewMode === 'BOTH') && (
                      <div>
                        {staffViewMode === 'BOTH' && (
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🔲</span> Staff Cards Grid ({filteredStaffList.length})
                          </h4>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
                          {filteredStaffList.map(staff => {
                            const isStaffActive = staff.isActive !== false;
                            const perms = staff.permissions || [];

                            return (
                              <div 
                                key={staff._id} 
                                style={{
                                  background: '#ffffff',
                                  border: isStaffActive ? '1.5px solid #e2e8f0' : '1.5px solid #fca5a5',
                                  borderRadius: '18px',
                                  padding: '20px',
                                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '16px',
                                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                }}
                              >
                                <div>
                                  {/* Top Row: Avatar, Info, Status Badge */}
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      <div 
                                        style={{
                                          width: '48px',
                                          height: '48px',
                                          borderRadius: '14px',
                                          background: isStaffActive ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)' : '#64748b',
                                          color: '#ffffff',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '20px',
                                          fontWeight: 900,
                                          boxShadow: isStaffActive ? '0 4px 12px rgba(234, 88, 12, 0.3)' : 'none'
                                        }}
                                      >
                                        {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                                      </div>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
                                          {staff.name}
                                        </h4>
                                        <span style={{ display: 'inline-block', marginTop: '2px', background: '#f1f5f9', color: '#ea580c', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 800, fontFamily: 'monospace' }}>
                                          @{staff.username}
                                        </span>
                                      </div>
                                    </div>

                                    <button 
                                      type="button"
                                      onClick={() => handleToggleStaffStatus(staff)}
                                      style={{
                                        background: isStaffActive ? '#dcfce7' : '#fee2e2',
                                        color: isStaffActive ? '#15803d' : '#dc2626',
                                        border: `1px solid ${isStaffActive ? '#86efac' : '#fca5a5'}`,
                                        padding: '4px 10px',
                                        borderRadius: '10px',
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title="Click to toggle staff active status"
                                    >
                                      {isStaffActive ? '● Active' : '○ Suspended'}
                                    </button>
                                  </div>

                                  {/* Contact Info Pills */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px dashed #e2e8f0' }}>
                                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      ✉️ {staff.email || 'No Email'}
                                    </span>
                                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      📱 {staff.mobile || 'No Mobile'}
                                    </span>
                                  </div>

                                  {/* Permissions Area */}
                                  <div>
                                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span>🛡️ ASSIGNED PERMISSIONS:</span>
                                      <span style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '8px', fontSize: '10.5px' }}>
                                        {perms.length} Modules
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {perms.length === 0 ? (
                                        <span style={{ fontSize: '12px', color: '#dc2626', fontStyle: 'italic', background: '#fef2f2', padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecdd3' }}>
                                          ⚠️ No permissions assigned
                                        </span>
                                      ) : (
                                        perms.map(permId => {
                                          const mod = AVAILABLE_STAFF_MODULES.find(m => m.id === permId);
                                          return (
                                            <span 
                                              key={permId} 
                                              style={{
                                                background: '#f8fafc',
                                                border: '1px solid #cbd5e1',
                                                color: '#1e293b',
                                                padding: '4px 9px',
                                                borderRadius: '8px',
                                                fontSize: '11.5px',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                              }}
                                            >
                                              <span>{mod?.icon || '🔹'}</span>
                                              <span>{mod?.label || permId}</span>
                                            </span>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Footer Actions */}
                                <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenEditStaff(staff)}
                                    style={{
                                      flex: 1,
                                      padding: '9px 12px',
                                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '10px',
                                      fontSize: '12.5px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)'
                                    }}
                                  >
                                    ✏️ Edit Credentials & Access
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleDeleteStaff(staff._id, staff.name)}
                                    style={{
                                      padding: '9px 14px',
                                      background: '#fff1f2',
                                      color: '#e11d48',
                                      border: '1px solid #fecdd3',
                                      borderRadius: '10px',
                                      fontSize: '12.5px',
                                      fontWeight: 800,
                                      cursor: 'pointer'
                                    }}
                                    title="Delete Staff Account"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })()}

          {/* No Access Warning for Staff without permissions */}
          {userRole === 'staff' && menuItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>No Access Assigned</h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '460px', margin: '0 auto' }}>
                Your staff account is active, but the administrator has not granted permissions to any modules yet. Please contact the administrator.
              </p>
            </div>
          )}

        </div>
      </main>

      {/* RETAILER-UPLOADED PAN DOCUMENTS */}
      {selectedPanAppDocuments && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(15, 23, 42, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '620px', maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: '14px', padding: '22px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 800 }}>📎 Retailer Uploaded Documents</h3>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '12px' }}>Ack No: <strong>{selectedPanAppDocuments.ackNumber}</strong> · {selectedPanAppDocuments.applicantName}</p>
              </div>
              <button type="button" onClick={() => setSelectedPanAppDocuments(null)} style={{ border: 'none', background: '#f1f5f9', color: '#475569', width: '30px', height: '30px', borderRadius: '7px', fontSize: '18px', cursor: 'pointer' }}>×</button>
            </div>

            {(() => {
              const details = selectedPanAppDocuments.details || {};
              const documents = (Array.isArray(selectedPanAppDocuments.additionalDocuments) ? selectedPanAppDocuments.additionalDocuments : [])
                .filter(document => document.dataUrl);
              const photoUrl = selectedPanAppDocuments.photoUrl || details.photoUrl;
              const signatureUrl = selectedPanAppDocuments.signatureUrl || details.signatureUrl;

              if (!photoUrl && !signatureUrl && documents.length === 0) {
                return <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>No documents have been uploaded by this retailer.</div>;
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {photoUrl && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid #dbeafe', borderRadius: '9px', background: '#f8fbff' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={photoUrl} alt="Applicant" style={{ width: '54px', height: '64px', objectFit: 'cover', border: '1px solid #cbd5e1', borderRadius: '5px' }} /><strong style={{ color: '#1e3a8a', fontSize: '13px' }}>Applicant Photo</strong></div><button type="button" onClick={() => handleViewPanDocument(selectedPanAppDocuments._id, 'photo')} style={{ border: 'none', background: '#2563eb', color: '#fff', padding: '7px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>View</button></div>}
                  {signatureUrl && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', border: '1px solid #dbeafe', borderRadius: '9px', background: '#f8fbff' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><img src={signatureUrl} alt="Signature" style={{ width: '100px', height: '38px', objectFit: 'contain', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '5px' }} /><strong style={{ color: '#1e3a8a', fontSize: '13px' }}>Applicant Signature</strong></div><button type="button" onClick={() => handleViewPanDocument(selectedPanAppDocuments._id, 'signature')} style={{ border: 'none', background: '#2563eb', color: '#fff', padding: '7px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>View</button></div>}
                  {documents.map((document, index) => <div key={document._id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px', border: '1px solid #dbeafe', borderRadius: '9px', background: '#f8fbff' }}><div><strong style={{ color: '#1e3a8a', fontSize: '13px' }}>{document.name || 'Additional document'}</strong><div style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'Uploaded recently'}</div></div><button type="button" onClick={() => handleViewPanDocument(selectedPanAppDocuments._id, document._id)} style={{ border: 'none', background: '#2563eb', color: '#fff', padding: '7px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>View</button></div>)}
                </div>
              );
            })()}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}><button type="button" onClick={() => setSelectedPanAppDocuments(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#475569', padding: '9px 15px', borderRadius: '7px', fontWeight: 700, cursor: 'pointer' }}>Close</button></div>
          </div>
        </div>
      )}

      {/* PAN APPLICATION DIRECT OFFICIAL FORM 49A EDIT MODAL */}
      {selectedPanAppDetails && (
        <Form49ADirectEditModal
          selectedPanAppDetails={selectedPanAppDetails}
          onClose={() => setSelectedPanAppDetails(null)}
          onDataChange={(currentData) => {
            setPdfTargetData(currentData);
          }}
          onSaveSuccess={(updatedData) => {
            setPdfTargetData(updatedData);
            setSelectedPanAppDetails(prev => ({
              ...prev,
              ...updatedData,
              details: { ...(prev?.details || {}), ...updatedData }
            }));
            fetchAll();
          }}
          handleDownloadPdf={handleDownloadPdf}
        />
      )}

      {/* STATUS EDIT MODAL */}
      {editingPanAppStatus && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              ✏️ Update Application Status
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Ack No: <strong>{editingPanAppStatus.ackNumber}</strong> ({editingPanAppStatus.applicantName})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Application Status
                </label>
                <select
                  value={newStatusVal}
                  onChange={(e) => setNewStatusVal(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', background: '#fff' }}
                >
                  <option value="Submitted">Submitted (Pending)</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Admin Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter remarks for the retailer..."
                  value={newStatusRemarks}
                  onChange={(e) => setNewStatusRemarks(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* NSDL Receipt / Ack Slip Remark */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  NSDL Receipt / Ack Slip Remark (Send to Retailer)
                </label>
                <input
                  type="text"
                  placeholder="Enter NSDL receipt number or ack slip remark..."
                  value={newNsdlReceiptNumber}
                  onChange={(e) => setNewNsdlReceiptNumber(e.target.value)}
                  maxLength={50}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1.5px solid #0284c7',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0369a1',
                    background: '#f0f9ff',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                  💡 This receipt number / remark will be sent to retailer and displayed under the <strong>NSDL RECEIPT</strong> column in their application history.
                </span>
              </div>

              {/* Upload Approved Receipt PDF / Ack Slip */}
              <div style={{ background: '#f0f9ff', border: '1.5px dashed #0284c7', padding: '14px', borderRadius: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                  📄 Upload Approved Receipt PDF / Ack Slip (To Retailer):
                </label>
                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '0 0 8px 0' }}>
                  Select PDF or Image receipt to send directly to Retailer <strong>{editingPanAppStatus.userId}</strong>.
                </p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setNewReceiptFileUrl(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ width: '100%', padding: '7px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', boxSizing: 'border-box' }}
                />
                {(newReceiptFileUrl || editingPanAppStatus.receiptUrl) && (
                  <div style={{ marginTop: '8px', fontSize: '11.5px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ {newReceiptFileUrl ? 'New receipt PDF selected! Will be sent to retailer on save.' : 'Receipt already uploaded for retailer.'}
                    </span>
                    {editingPanAppStatus.receiptUrl && !newReceiptFileUrl && (
                      <a
                        href={editingPanAppStatus.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', textDecoration: 'underline', fontSize: '11.5px' }}
                      >
                        👁️ View Existing Receipt
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setEditingPanAppStatus(null);
                  setNewReceiptFileUrl('');
                }}
                style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePanStatus}
                style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Save Status & Send Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STAFF ADD / EDIT MODAL */}
      {isStaffModalOpen && (
        <div className="staff-modal-overlay">
          <div className="staff-modal-box">
            <div className="staff-modal-header">
              <h3>{editingStaffId ? '✏️ Edit Staff & Permissions' : '➕ Add New Staff Member'}</h3>
              <button 
                type="button"
                className="staff-modal-close" 
                onClick={() => setIsStaffModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff}>
              <div className="staff-modal-body">
                <div className="staff-input-row">
                  <div className="staff-input-group">
                    <label>Full Name *</label>
                    <input 
                      type="text" 
                      className="staff-input-field" 
                      placeholder="e.g. Rahul Sharma"
                      value={staffFormData.name}
                      onChange={e => setStaffFormData({...staffFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="staff-input-group">
                    <label>Login Username / ID *</label>
                    <input 
                      type="text" 
                      className="staff-input-field" 
                      placeholder="e.g. rahul01"
                      value={staffFormData.username}
                      onChange={e => setStaffFormData({...staffFormData, username: e.target.value.toLowerCase().replace(/\s+/g, '')})}
                      required
                    />
                  </div>
                </div>

                <div className="staff-input-row">
                  <div className="staff-input-group">
                    <label>{editingStaffId ? 'New Password (leave blank to keep current)' : 'Login Password *'}</label>
                    <input 
                      type="password" 
                      className="staff-input-field" 
                      placeholder={editingStaffId ? '••••••••' : 'Enter password'}
                      value={staffFormData.password}
                      onChange={e => setStaffFormData({...staffFormData, password: e.target.value})}
                      required={!editingStaffId}
                    />
                  </div>
                  <div className="staff-input-group">
                    <label>Mobile Number</label>
                    <input 
                      type="text" 
                      className="staff-input-field" 
                      placeholder="e.g. 9876543210"
                      value={staffFormData.mobile}
                      onChange={e => setStaffFormData({...staffFormData, mobile: e.target.value})}
                    />
                  </div>
                </div>

                <div className="staff-input-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="staff-input-field" 
                    placeholder="e.g. rahul@example.com"
                    value={staffFormData.email}
                    onChange={e => setStaffFormData({...staffFormData, email: e.target.value})}
                  />
                </div>

                <div className="staff-perm-matrix-wrapper">
                  <div className="staff-perm-matrix-header">
                    <span>Allowed Modules / Tabs Access</span>
                    <div className="perm-quick-btns">
                      <button 
                        type="button" 
                        className="perm-quick-btn" 
                        onClick={() => handleToggleAllPermissions(true)}
                      >
                        Select All
                      </button>
                      <button 
                        type="button" 
                        className="perm-quick-btn" 
                        onClick={() => handleToggleAllPermissions(false)}
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="staff-perm-grid">
                    {AVAILABLE_STAFF_MODULES.map(mod => {
                      const isChecked = (staffFormData.permissions || []).includes(mod.id);
                      return (
                        <label 
                          key={mod.id} 
                          className={`perm-checkbox-item ${isChecked ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleTogglePermission(mod.id);
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => {}}
                          />
                          <span className="perm-item-label">
                            {mod.icon} {mod.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input 
                    type="checkbox" 
                    id="staffActiveToggle"
                    style={{ width: '16px', height: '16px', accentColor: '#ea580c', cursor: 'pointer' }}
                    checked={staffFormData.isActive}
                    onChange={e => setStaffFormData({...staffFormData, isActive: e.target.checked})}
                  />
                  <label htmlFor="staffActiveToggle" style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                    Account Active (staff can log in)
                  </label>
                </div>
              </div>

              <div className="staff-modal-footer">
                <button 
                  type="button" 
                  className="staff-modal-cancel-btn"
                  onClick={() => setIsStaffModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="staff-modal-save-btn"
                >
                  {editingStaffId ? '💾 Save Changes' : '➕ Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Container for Form 49A PDF Generation */}
      <Form49APdfTemplate data={pdfTargetData || selectedPanAppDetails?.details || selectedPanAppDetails || {}} />

    </div>
  );
};

export default AdminPanel;
