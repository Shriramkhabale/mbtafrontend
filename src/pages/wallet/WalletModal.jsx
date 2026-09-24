import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './WalletModal.css';
import { API_URL } from '../../utils/apiClient';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true
});

// Precision-Crafted Inline SVG Icons
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
    <path d="M4 6v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H4z" />
    <circle cx="16.5" cy="13.5" r="1.5" fill="currentColor" />
  </svg>
);

const DirectPayIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
    <line x1="6" y1="15" x2="10" y2="15" />
  </svg>
);

const RequisitionIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);


const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
  </svg>
);

const BankIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <polyline points="5 6 12 3 19 6" />
    <line x1="4" y1="10" x2="4" y2="21" />
    <line x1="9" y1="10" x2="9" y2="21" />
    <line x1="15" y1="10" x2="15" y2="21" />
    <line x1="20" y1="10" x2="20" y2="21" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const WalletModal = ({ isOpen, onClose, currentUser, initialTab = 'directPayment', walletBalance = 0, onBalanceUpdate, inlineMode = false }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'directPayment', 'requisition'

  useEffect(() => {
    if (initialTab && initialTab !== 'ledger') {
      setActiveTab(initialTab);
    } else {
      setActiveTab('directPayment');
    }
  }, [initialTab]);

  // Requisition Form state
  const getTodayDate = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const [reqForm, setReqForm] = useState({
    userId: currentUser || '',
    amount: '',
    referenceNumber: '',
    paymentDate: getTodayDate(),
    remarks: '',
    paymentMode: 'NetBanking'
  });

  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Direct Payment state
  const [directPaymentAmount, setDirectPaymentAmount] = useState('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState('UPI');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [pendingTxnId, setPendingTxnId] = useState(null);
  const [isProcessingDirect, setIsProcessingDirect] = useState(false);

  // Sync currentUser with forms and fetch details on mount
  useEffect(() => {
    if (!isOpen) return;

    if (currentUser) {
      fetch(`${API_URL}/api/users/${currentUser}`)
        .then(res => res.json())
        .then(data => {
          if (data.retailerId) {
            setReqForm(prev => ({ ...prev, referenceNumber: data.retailerId, userId: currentUser }));
          }
          if (data.walletBalance !== undefined && onBalanceUpdate) {
            onBalanceUpdate(data.walletBalance);
          }
        })
        .catch(err => console.error("Error loading user info:", err));
    }
  }, [isOpen, currentUser, onBalanceUpdate]);

  if (!isOpen) return null;

  // Handle Requisition Form Submit
  const handleRequisitionSubmit = async (e) => {
    e.preventDefault();
    if (!reqForm.amount || Number(reqForm.amount) <= 0) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid payment amount.' });
      return;
    }

    setIsSubmittingReq(true);
    try {
      const response = await fetch(`${API_URL}/api/payment-requisitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqForm)
      });

      setIsSubmittingReq(false);
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Requisition Submitted!',
          text: `Your requisition request of ₹${parseFloat(reqForm.amount).toFixed(2)} has been submitted for approval.`,
          confirmButtonColor: '#ea580c'
        });
        setReqForm(prev => ({
          ...prev,
          amount: '',
          remarks: ''
        }));
        onClose();
      } else {
        Toast.fire({ icon: 'error', title: 'Failed to submit requisition.' });
      }
    } catch (err) {
      setIsSubmittingReq(false);
      Toast.fire({ icon: 'error', title: 'Error submitting requisition request.' });
    }
  };

  // Handle Direct Payment Initiate
  const handleDirectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!directPaymentAmount || Number(directPaymentAmount) <= 0) {
      Toast.fire({ icon: 'error', title: 'Please enter a valid top-up amount.' });
      return;
    }

    setIsProcessingDirect(true);
    try {
      const res = await fetch(`${API_URL}/api/direct-payment/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser,
          amount: Number(directPaymentAmount),
          paymentMethod: directPaymentMethod
        })
      });

      const data = await res.json();
      if (data.success) {
        setPendingTxnId(data.txnId);
        if (data.qrCodeUrl) {
          setQrCodeUrl(data.qrCodeUrl);
        }
        confirmDirectPayment(data.txnId, Number(directPaymentAmount));
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Payment initiation failed.' });
        setIsProcessingDirect(false);
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to initiate direct payment.' });
      setIsProcessingDirect(false);
    }
  };

  // Confirm Direct Payment and update balance
  const confirmDirectPayment = async (txnId, amount) => {
    try {
      const res = await fetch(`${API_URL}/api/direct-payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser,
          txnId: txnId,
          amount: amount,
          paymentMethod: directPaymentMethod
        })
      });

      const data = await res.json();
      setIsProcessingDirect(false);
      if (data.success) {
        if (onBalanceUpdate && data.walletBalance !== undefined) {
          onBalanceUpdate(data.walletBalance);
        }
        Swal.fire({
          icon: 'success',
          title: 'Wallet Loaded Successfully!',
          text: `₹${amount.toFixed(2)} credited to your wallet balance. Ref: ${txnId}`,
          confirmButtonColor: '#ea580c'
        });
        setDirectPaymentAmount('');
        setQrCodeUrl(null);
        setPendingTxnId(null);
        onClose();
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Payment verification failed.' });
      }
    } catch (err) {
      setIsProcessingDirect(false);
      Toast.fire({ icon: 'error', title: 'Error confirming payment.' });
    }
  };

  const modalContent = (
    <div className={`wallet-modal-card ${inlineMode ? 'inline-mode' : ''}`}>
      
      {/* Modern Ultra-Sleek Header */}
      <div className="wallet-modal-header">
        <div className="wallet-header-left">
          <div className="wallet-title-cluster">
            <div className="wallet-header-icon-badge">
              <WalletIcon />
            </div>
            <div>
              <h3 className="wallet-modal-title">My Wallet</h3>
              <div className="wallet-modal-subtitle">
                <span>Current Balance:</span>
                <span className="header-balance-badge">₹{parseFloat(walletBalance || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="wallet-header-actions">
          {inlineMode && (
            <button
              type="button"
              className="wallet-back-btn"
              onClick={onClose}
              title="Back to Dashboard"
            >
              <ArrowLeftIcon />
              <span>Back to Dashboard</span>
            </button>
          )}
          <button className="close-wallet-btn" onClick={onClose} title="Close Modal">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Segmented Pill Navigation Tabs */}
      <div className="wallet-tabs-container">
        <div className="wallet-tabs-bar">
          <button
            type="button"
            className={`wallet-tab-btn ${activeTab === 'directPayment' ? 'active' : ''}`}
            onClick={() => setActiveTab('directPayment')}
          >
            <DirectPayIcon />
            <span>Direct Payment</span>
          </button>
          <button
            type="button"
            className={`wallet-tab-btn ${activeTab === 'requisition' ? 'active' : ''}`}
            onClick={() => setActiveTab('requisition')}
          >
            <RequisitionIcon />
            <span>Requisition</span>
          </button>
        </div>
      </div>

      {/* Modal Scrollable Content Body */}
      <div className="wallet-modal-body">
        
        {/* TAB 1: DIRECT PAYMENT */}
        {activeTab === 'directPayment' && (
          <div className="form-card-box">
            <div className="form-section-header">
              <div className="section-header-icon">
                <BoltIcon />
              </div>
              <div className="section-header-text">
                <div className="section-title">Instant Wallet Top-Up</div>
                <div className="section-desc">Load money instantly using UPI, NetBanking or Cards</div>
              </div>
            </div>

            <form onSubmit={handleDirectPaymentSubmit}>
              
              {/* Quick Amount Chips */}
              <div className="form-group-pro">
                <label className="pro-label">Quick Amount Selection</label>
                <div className="quick-amounts-row">
                  {[500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className={`quick-amount-btn ${Number(directPaymentAmount) === amt ? 'selected' : ''}`}
                      onClick={() => setDirectPaymentAmount(String(amt))}
                    >
                      + ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="form-group-pro">
                <label className="pro-label">Enter Top-Up Amount (₹)</label>
                <div className="input-with-icon-wrapper">
                  <input
                    type="number"
                    required
                    min="1"
                    className="form-input-pro amount-input"
                    placeholder="e.g. 1000"
                    value={directPaymentAmount}
                    onChange={e => setDirectPaymentAmount(e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="form-group-pro">
                <label className="pro-label">Choose Payment Method</label>
                <div className="payment-methods-grid">
                  <div
                    className={`pm-card ${directPaymentMethod === 'UPI' ? 'selected' : ''}`}
                    onClick={() => setDirectPaymentMethod('UPI')}
                  >
                    <div className="pm-icon"><PhoneIcon /></div>
                    <div className="pm-info">
                      <span className="pm-name">UPI / QR</span>
                      <span className="pm-sub">GPay, PhonePe</span>
                    </div>
                  </div>

                  <div
                    className={`pm-card ${directPaymentMethod === 'NetBanking' ? 'selected' : ''}`}
                    onClick={() => setDirectPaymentMethod('NetBanking')}
                  >
                    <div className="pm-icon"><BankIcon /></div>
                    <div className="pm-info">
                      <span className="pm-name">NetBanking</span>
                      <span className="pm-sub">Instant Bank Pay</span>
                    </div>
                  </div>

                  <div
                    className={`pm-card ${directPaymentMethod === 'Card' ? 'selected' : ''}`}
                    onClick={() => setDirectPaymentMethod('Card')}
                  >
                    <div className="pm-icon"><DirectPayIcon /></div>
                    <div className="pm-info">
                      <span className="pm-name">Cards</span>
                      <span className="pm-sub">Debit & Credit</span>
                    </div>
                  </div>
                </div>
              </div>

              {qrCodeUrl && (
                <div className="qr-preview-box">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="qr-preview-img" />
                  <p className="qr-preview-sub">Scan with any UPI app to complete payment{pendingTxnId ? ` (Ref: ${pendingTxnId})` : ''}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessingDirect}
                className="form-submit-btn-primary"
              >
                {isProcessingDirect ? (
                  <span className="btn-loading-state">
                    <span className="btn-spinner"></span> Processing Top-Up...
                  </span>
                ) : (
                  <>
                    <BoltIcon />
                    <span>Pay & Load ₹{directPaymentAmount ? Number(directPaymentAmount).toLocaleString() : '0.00'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: REQUISITION */}
        {activeTab === 'requisition' && (
          <div className="form-card-box">
            <div className="form-section-header">
              <div className="section-header-icon">
                <RequisitionIcon />
              </div>
              <div className="section-header-text">
                <div className="section-title">Submit Payment Requisition</div>
                <div className="section-desc">Submit offline bank deposit, NEFT/RTGS, or IMPS details for approval</div>
              </div>
            </div>

            <form onSubmit={handleRequisitionSubmit}>
              
              <div className="form-grid-two-col">
                {/* User ID */}
                <div className="form-group-pro">
                  <div className="label-row">
                    <label className="pro-label">User ID</label>
                    <span className="badge-readonly">
                      <LockIcon /> Auto-filled
                    </span>
                  </div>
                  <div className="input-with-icon-wrapper">
                    <input
                      type="text"
                      required
                      value={reqForm.userId}
                      readOnly
                      className="form-input-pro readonly-input"
                    />
                  </div>
                </div>

                {/* Retailer ID / Reference Number */}
                <div className="form-group-pro">
                  <div className="label-row">
                    <label className="pro-label">Retailer Ref ID</label>
                    <span className="badge-readonly">
                      <LockIcon /> Auto-filled
                    </span>
                  </div>
                  <div className="input-with-icon-wrapper">
                    <input
                      type="text"
                      required
                      value={reqForm.referenceNumber}
                      readOnly
                      className="form-input-pro readonly-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-grid-two-col">
                {/* Amount (₹) */}
                <div className="form-group-pro">
                  <label className="pro-label">Amount (₹)</label>
                  <div className="input-with-icon-wrapper">
                    <input
                      type="number"
                      required
                      min="1"
                      className="form-input-pro amount-input"
                      placeholder="Enter amount"
                      value={reqForm.amount}
                      onChange={e => setReqForm({ ...reqForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Payment Date */}
                <div className="form-group-pro">
                  <label className="pro-label">Payment Date</label>
                  <div className="input-with-icon-wrapper">
                    <input
                      type="date"
                      required
                      className="form-input-pro date-input-pro"
                      value={reqForm.paymentDate}
                      onChange={e => setReqForm({ ...reqForm, paymentDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Amount Options */}
              <div className="form-group-pro">
                <label className="pro-label">Quick Amount Options</label>
                <div className="quick-amounts-row">
                  {[1000, 2000, 5000, 10000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      className={`quick-amount-btn ${Number(reqForm.amount) === amt ? 'selected' : ''}`}
                      onClick={() => setReqForm({ ...reqForm, amount: String(amt) })}
                    >
                      + ₹{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks (Optional) */}
              <div className="form-group-pro">
                <label className="pro-label">Remarks / UTR Number (Optional)</label>
                <div className="input-with-icon-wrapper">
                  <input
                    type="text"
                    className="form-input-pro"
                    placeholder="Bank reference, UTR, or deposit transaction ID..."
                    value={reqForm.remarks}
                    onChange={e => setReqForm({ ...reqForm, remarks: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingReq}
                className="form-submit-btn-primary"
              >
                {isSubmittingReq ? (
                  <span className="btn-loading-state">
                    <span className="btn-spinner"></span> Submitting Request...
                  </span>
                ) : (
                  <>
                    <SendIcon />
                    <span>{reqForm.amount ? `Submit ₹${Number(reqForm.amount).toLocaleString()} Requisition Request` : 'Submit Requisition Request'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );

  if (inlineMode) {
    return (
      <div className="wallet-inline-container">
        {modalContent}
      </div>
    );
  }

  return (
    <div className="wallet-modal-overlay">
      {modalContent}
    </div>
  );
};

export default WalletModal;
