import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { PDFDocument } from 'pdf-lib/dist/pdf-lib.esm.js';
import './PanCardView.css';
import Form93PdfTemplate, { generateForm49APdf } from './Form49APdfGenerator';
import FormPanCrPdfTemplate, { generatePanCrPdf } from './PanCrPdfGenerator';
import PanCorrectionForm from './PanCorrectionForm';
import { Form49ADirectEditModal } from './Form49ADirectEditModal'; // eslint-disable-line no-unused-vars
import { ALL_INDIAN_STATES, INDIAN_STATES_DISTRICTS, ALL_INDIAN_DISTRICTS, PROOF_OF_IDENTITY_OPTIONS, PROOF_OF_ADDRESS_OPTIONS, PROOF_OF_DOB_OPTIONS } from '../../utils/indiaData';

import { AO_CODES_LIST, getAoCodesForDistrict } from '../../utils/aoCodeData';
import { API_URL, apiFetch } from '../../utils/apiClient';

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

const downloadReceiptToPc = (url) => {
  if (!url) return;
  try {
    window.open(url, '_blank');
  } catch (e) {
    console.warn('Error opening receipt window:', e);
  }
};

// Interactive Drag & Drop File Upload Dropzone Component
const DropzoneBox = ({ label, fieldName, isRequired, currentValue, onFileSelect, accept, hint, icon }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const [isCompressing, setIsCompressing] = useState(false); // eslint-disable-line no-unused-vars

  // Compress image via canvas (resize + quality reduction)
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_W = 1400;
          const MAX_H = 1400;
          let { width, height } = img;
          if (width > MAX_W || height > MAX_H) {
            const ratio = Math.min(MAX_W / width, MAX_H / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.72);
          resolve({ dataUrl: compressed, originalSize: file.size, compressedSize: Math.round((compressed.length * 3) / 4) });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Re-save the PDF with object streams so the compressed bytes remain a valid PDF.
  const compressPdf = async (file) => {
    const originalDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      const compressedBytes = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < compressedBytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...compressedBytes.subarray(offset, offset + chunkSize));
      }
      const compressedDataUrl = `data:application/pdf;base64,${btoa(binary)}`;
      return {
        dataUrl: compressedDataUrl,
        originalSize: file.size,
        compressedSize: compressedBytes.length
      };
    } catch (error) {
      console.warn('PDF compression failed; using the original valid PDF:', error);
      return { dataUrl: originalDataUrl, originalSize: file.size, compressedSize: file.size };
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = async (file) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      Toast.fire({ icon: 'error', title: 'Please select a valid image (JPG, PNG) or PDF document' });
      return;
    }

    setIsCompressing(true);
    try {
      if (isImage) {
        const { dataUrl, originalSize, compressedSize } = await compressImage(file);
        onFileSelect(dataUrl);
        const saved = originalSize - compressedSize;
        if (saved > 0) {
          Toast.fire({
            icon: 'success',
            title: `✅ Image compressed: ${formatSize(originalSize)} → ${formatSize(compressedSize)} (saved ${formatSize(saved)})`,
            timer: 1000
          });
        } else {
          Toast.fire({
            icon: 'success',
            title: `✅ Image ready (${formatSize(originalSize)})`,
            timer: 1000
          });
        }
      } else {
        const { dataUrl, originalSize, compressedSize } = await compressPdf(file);
        onFileSelect(dataUrl);
        const saved = originalSize - compressedSize;
        if (saved > 512) {
          Toast.fire({
            icon: 'success',
            title: `✅ PDF compressed: ${formatSize(originalSize)} → ~${formatSize(compressedSize)} (saved ${formatSize(saved)})`,
            timer: 1000
          });
        } else {
          Toast.fire({
            icon: 'success',
            title: `✅ PDF ready (${formatSize(originalSize)})`,
            timer: 1000
          });
        }
      }
      setTimeout(() => {
        if (Swal.isVisible() && Swal.getPopup()?.classList?.contains('swal2-toast')) {
          Swal.close();
        }
      }, 1100);
    } catch {
      Toast.fire({ icon: 'error', title: 'Error processing file. Please try again.', timer: 1000 });
    }
    setIsCompressing(false);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onFileSelect('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPdf = currentValue && currentValue.startsWith('data:application/pdf');

  return (
    <div style={{ marginBottom: '6px' }}>
      <label style={{ fontSize: '11.5px', fontWeight: '800', color: '#94a3b8', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label} {isRequired && <span className="req-star">*</span>}
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: isDragging ? '1.5px dashed #38bdf8' : (currentValue ? '1.5px solid #10b981' : '1.5px dashed rgba(56, 189, 248, 0.35)'),
          background: isDragging ? 'rgba(56, 189, 248, 0.15)' : (currentValue ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.75)'),
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: isDragging ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
          minHeight: '44px',
          gap: '10px'
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {currentValue ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              {isPdf ? (
                <span style={{ fontSize: '18px' }}>📑</span>
              ) : (
                <img
                  src={currentValue}
                  alt="Preview"
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}
                />
              )}
              <span style={{ color: '#34d399', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ✅ {isPdf ? 'PDF Attached' : 'File Ready'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              ✕ Remove
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: isDragging ? '#38bdf8' : '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isDragging ? 'Drop File Now' : 'Click or Drag File'}
                </span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hint}
                </span>
              </div>
            </div>
            <span style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', color: '#ffffff', fontSize: '10.5px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px', flexShrink: 0 }}>
              Browse
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const PanCardView = ({ currentUser, walletBalance = 0, onClose }) => {
  const [tabs, setTabs] = useState([]);

  // Read initial active tab from URL search parameters if available
  const getInitialTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'new_app_landing';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [loadingTabs, setLoadingTabs] = useState(true); // eslint-disable-line no-unused-vars
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState('user'); // 'all' (Admin View) or 'user' (My Applications)
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppForModal, setSelectedAppForModal] = useState(null);
  const [selectedAppForStatusUpdate, setSelectedAppForStatusUpdate] = useState(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState('Submitted');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [receiptInputUrl, setReceiptInputUrl] = useState('');
  const [nsdlReceiptInput, setNsdlReceiptInput] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [selectedAppForDocument, setSelectedAppForDocument] = useState(null);
  const [documentToAdd, setDocumentToAdd] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const [selectedAppForEdit, setSelectedAppForEdit] = useState(null); // eslint-disable-line no-unused-vars

  // Sync tab state when URL changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [window.location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form State for E-KYC & Correction
  const [formData, setFormData] = useState({
    applicantName: '',
    fatherName: '',
    dob: '',
    gender: 'Male',
    mobileNumber: '',
    email: '',
    aadhaarNumber: '',
    panNumber: '',
    photoUrl: '',
    signatureUrl: '',
    remarks: ''
  });

  // Dedicated Form State for Manual New PAN (Individual & Non-Individual Entity)
  const [manualData, setManualData] = useState({
    category: 'INDIVIDUAL',
    aadhaarNumber: '',
    proofOfDob: 'ABHA HEALTH GOVT ID CARD (CENTRAL GOVT)',
    title: 'SELECT',
    lastName: '',
    firstName: '',
    middleName: '',
    isSingleParent: 'NO',
    fatherLastName: '',
    fatherFirstName: '',
    fatherMiddleName: '',
    motherLastName: '',
    motherFirstName: '',
    motherMiddleName: '',
    nameAsPerAadhaar: '',
    gender: 'SELECT',
    dob: '',
    mobileNumber: '',
    email: '',
    flatNo: '',
    premises: '',
    roadStreet: '',
    areaTaluka: '',
    state: 'PLEASE SELECT',
    district: 'SELECT',
    pincode: '',
    proofOfIdentity: 'AADHAAR CARD ISSUED BY THE UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
    proofOfAddress: 'AADHAAR CARD ISSUED BY THE UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
    aoCity: 'SELECT CITY',
    aoAreaCode: '',
    aoType: '',
    aoRangeCode: '',
    aoNo: '',
    photoUrl: '',
    signatureUrl: '',
    // Document Proof Upload Fields (Identity, Address, Birth & Other Proof)
    proofOfIdentityUrl: '',
    proofOfAddressUrl: '',
    proofOfDobUrl: '',
    proofOfOtherUrl: '',
    // Non-Individual Entity Fields (Form No. 94 / Form 49A Non-Individual)
    entityName: '',
    dateOfIncorporation: '',
    registrationNumber: '',
    stdCode: '',
    landlineNumber: '',
    sameAsOfficeAddress: true,
    commFlatNo: '',
    commPremises: '',
    commRoadStreet: '',
    commAreaTaluka: '',
    commState: 'PLEASE SELECT',
    commDistrict: 'SELECT',
    commPincode: '',
    incomeSource: 'Income from Business/Profession',
    raTitle: 'SHRI',
    raFirstName: '',
    raMiddleName: '',
    raLastName: '',
    raPanNumber: '',
    raAadhaarNumber: '',
    raMobileNumber: '',
    raEmail: '',
    raStdCode: '',
    raLandlineNumber: '',
    raFlatNo: '',
    raPremises: '',
    raRoadStreet: '',
    raAreaTaluka: '',
    raDistrict: 'SELECT',
    raState: 'PLEASE SELECT',
    raPincode: '',
    raProofOfIdentity: '',
    raProofOfAddress: '',
    proofOfIncorporation: 'CERTIFICATE OF INCORPORATION / REGISTRATION',
    verifierName: '',
    verifierCapacity: 'PARTNER',
    verifierPlace: '',
    verifierDate: new Date().toISOString().split('T')[0]
  });
  const [correctionData, setCorrectionData] = useState({
    panNumber: '', aadhaarNumber: '', firstName: '', middleName: '', lastName: '', nameAsPerAadhaar: '', gender: '', dob: '', mobileNumber: '', email: '',
    flatNo: '', premises: '', roadStreet: '', areaTaluka: '', state: '', district: '', pincode: '',
    fatherFirstName: '', fatherMiddleName: '', fatherLastName: '', motherFirstName: '', motherMiddleName: '', motherLastName: '', parentToPrint: 'Father',
    proofOfIdentity: '', proofOfAddress: '', proofOfDob: '', passportNumber: '', taxpayerId: '', landlineNumber: '', photoUrl: '', signatureUrl: ''
  });

  // Fetch dynamic tabs from backend
  useEffect(() => {
    apiFetch('/api/pancard/tabs')
      .then(res => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTabs(data);
        } else {
          setTabs(getFallbackTabs());
        }
        setLoadingTabs(false);
      })
      .catch(err => {
        console.error('Error fetching PAN tabs:', err);
        setTabs(getFallbackTabs());
        setLoadingTabs(false);
      });
  }, []);

  const getFallbackTabs = () => [
    {
      id: 'ieil_scope1',
      label: '⚡ Instant e-KYC New PAN',
      icon: '⚡',
      fee: 107,
      scope: 1,
      mode: 'ONLINE',
      description: 'Paperless Instant e-KYC New PAN application via Aadhaar OTP / Biometric.'
    },
    {
      id: 'ieil_scope2',
      label: '📁 Physical Scan New PAN',
      icon: '📁',
      fee: 107,
      scope: 2,
      mode: 'ONLINE',
      description: 'Scanned Document New PAN application with Photo & Signature upload.'
    },
    {
      id: 'ieil_scope3',
      label: '✏️ Instant e-KYC PAN Correction',
      icon: '✏️',
      fee: 107,
      scope: 3,
      mode: 'ONLINE',
      description: 'Paperless Instant PAN Correction via Aadhaar e-KYC.'
    },
    {
      id: 'ieil_scope4',
      label: '📝 Physical Scan PAN Correction',
      icon: '📝',
      fee: 107,
      scope: 4,
      mode: 'ONLINE',
      description: 'Scanned Document PAN Correction with Supporting Document upload.'
    },
    {
      id: 'manual_new_pan',
      label: '📄 Offline Form 49A (New PAN)',
      icon: '📄',
      fee: 107,
      mode: 'OFFLINE',
      description: 'Offline Portal Form 49A with Photo/Signature Dropzone, PDF Generator & Admin Review.'
    },
    {
      id: 'manual_pan_correction',
      label: '📋 Offline PAN Correction',
      icon: '📋',
      fee: 107,
      mode: 'OFFLINE',
      description: 'Offline Portal PAN Correction Form with Pre-Filled PDF & Admin Manual Approval.'
    }
  ];

  // Fetch applications
  const fetchHistory = () => {
    setLoadingHistory(true);
    const userRole = localStorage.getItem('userRole') || '';
    const isAdmin = userRole.toLowerCase() === 'admin' || !currentUser || currentUser.toLowerCase() === 'admin';
    const url = isAdmin
      ? `${API_URL}/api/pancard/all`
      : `${API_URL}/api/pancard/applications/${currentUser || 'guest'}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setHistoryList(data.applications || []);
        }
        setLoadingHistory(false);
      })
      .catch(err => {
        console.error('Error fetching PAN application history:', err);
        setLoadingHistory(false);
      });
  };

  const handleRetailerDeleteApplication = async (app) => {
    const status = (app.status || '').toLowerCase();
    if (status === 'approved' || status === 'completed') {
      return Swal.fire({
        icon: 'error',
        title: 'Action Restricted',
        text: 'This PAN application has already been approved by Admin and cannot be deleted.'
      });
    }

    const confirmRes = await Swal.fire({
      title: 'Delete Application?',
      text: `Are you sure you want to delete application ${app.ackNumber}? Fee ₹${app.feeAmount || 107} will be refunded to your wallet.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete & Refund Fee',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/api/pancard/application/${app._id}?role=retailer&userId=${currentUser}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Application Deleted',
          text: data.message || 'Application deleted successfully.'
        });
        fetchHistory();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: data.message || 'Unable to delete application.'
        });
      }
    } catch (err) {
      console.error('Delete PAN error:', err);
      Swal.fire({ icon: 'error', text: 'Error connecting to server.' });
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveStatus = async (appId) => {
    if (!statusUpdateVal) return;
    setUpdatingStatusId(appId);
    try {
      const response = await fetch(`${API_URL}/api/pancard/status/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusUpdateVal,
          adminRemarks: adminRemarksInput,
          receiptUrl: receiptInputUrl,
          nsdlReceiptNumber: nsdlReceiptInput,
          actorRole: historyViewMode === 'user' ? 'retailer' : 'admin'
        })
      });
      const data = await response.json();
      setUpdatingStatusId(null);

      if (data.success) {
        Toast.fire({ icon: 'success', title: `Application status updated to '${statusUpdateVal}'!` });
        setSelectedAppForStatusUpdate(null);
        setReceiptInputUrl('');
        setNsdlReceiptInput('');
        fetchHistory();
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Failed to update status.' });
      }
    } catch (err) {
      setUpdatingStatusId(null);
      console.error('Error updating status:', err);
      Toast.fire({ icon: 'error', title: 'Server error updating status.' });
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleManualChange = (e) => {
    const { name, value } = e.target;

    // When district changes, update district and clear auto-selected AO codes (No auto-selection)
    if (name === 'district') {
      setManualData(prev => ({
        ...prev,
        district: value,
        aoCity: value !== 'SELECT' ? value : prev.aoCity,
        aoAreaCode: '',
        aoType: '',
        aoRangeCode: '',
        aoNo: ''
      }));
      return;
    }

    // When aoCity changes, update aoCity and clear auto-selected AO codes (No auto-selection)
    if (name === 'aoCity') {
      setManualData(prev => ({
        ...prev,
        aoCity: value,
        aoAreaCode: '',
        aoType: '',
        aoRangeCode: '',
        aoNo: ''
      }));
      return;
    }

    setManualData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAoSelect = (aoId) => {
    const cityToUse = manualData.aoCity !== 'SELECT CITY' ? manualData.aoCity : (manualData.district !== 'SELECT' ? manualData.district : '');
    const available = getAoCodesForDistrict(cityToUse);
    const selectedAo = available.find(item => String(item.id) === String(aoId)) || AO_CODES_LIST.find(item => String(item.id) === String(aoId));

    if (selectedAo) {
      setManualData(prev => ({
        ...prev,
        aoAreaCode: selectedAo.areaCode,
        aoType: selectedAo.aoType,
        aoRangeCode: selectedAo.rangeCode,
        aoNo: selectedAo.aoNo,
        aoCity: selectedAo.city
      }));
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleManualFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setManualData(prev => ({
        ...prev,
        [fieldName]: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCorrectionChange = (e) => setCorrectionData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCorrectionFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCorrectionData(prev => ({ ...prev, [fieldName]: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCorrectionDownload = async () => {
    const isIndiv = !correctionData.category || correctionData.category === 'INDIVIDUAL';
    if (!correctionData.panNumber) {
      Toast.fire({ icon: 'warning', title: 'Please enter Existing PAN Number first.' });
      return;
    }
    if (isIndiv && !correctionData.nameAsPerAadhaar && !correctionData.lastName) {
      Toast.fire({ icon: 'warning', title: 'Enter Aadhaar name before downloading.' });
      return;
    }
    if (!isIndiv && !correctionData.entityName && !correctionData.lastName) {
      Toast.fire({ icon: 'warning', title: 'Enter Name of Entity before downloading.' });
      return;
    }
    const docTitle = isIndiv ? 'PAN Correction' : 'Official Non-Individual PAN Changes/Correction (1-Page)';
    Toast.fire({ icon: 'info', title: `Generating ${docTitle} PDF...` });
    const success = await generatePanCrPdf(correctionData);
    Toast.fire({ icon: success ? 'success' : 'error', title: success ? `${docTitle} PDF generated and downloaded.` : 'Could not generate PAN CR PDF.' });
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (Swal.isVisible() && Swal.getPopup()?.classList?.contains('swal2-toast')) {
      Swal.close();
    }
    const correctionFee = tabs.find(t => t.id === 'epan_correction')?.fee ?? 107;
    
    if (!correctionData.panNumber) {
      Toast.fire({ icon: 'error', title: 'Please enter Existing PAN Number' });
      return;
    }

    const isIndiv = !correctionData.category || correctionData.category === 'INDIVIDUAL';
    if (isIndiv) {
      if (!correctionData.aadhaarNumber || !correctionData.lastName || !correctionData.mobileNumber || !correctionData.email) {
        Toast.fire({ icon: 'error', title: 'Please complete all required Individual correction details.' });
        return;
      }
      if (!correctionData.signatureUrl) {
        Toast.fire({ icon: 'warning', title: 'Please upload Applicant Signature.' });
        return;
      }
    } else {
      const entityTitle = correctionData.entityName || correctionData.lastName;
      if (!entityTitle) {
        Toast.fire({ icon: 'error', title: 'Please enter Name of Entity.' });
        return;
      }
      if (!correctionData.mobileNumber || !correctionData.email) {
        Toast.fire({ icon: 'error', title: 'Please complete Entity Mobile Number and Email.' });
        return;
      }
      if (!correctionData.signatureUrl) {
        Toast.fire({ icon: 'warning', title: 'Please upload Authorized Signatory Signature / Stamp.' });
        return;
      }
    }

    // Dynamic Custom Fields Validation (Only if defined for Correction tab)
    const corrTab = tabs.find(t => t.id === 'epan_correction');
    const activeCustomFields = (corrTab?.fields || []).filter(f => f && !f.hidden && f.isCustom);
    for (const cf of activeCustomFields) {
      if (cf.required && !correctionData[cf.name]) {
        Toast.fire({ icon: 'error', title: `Please enter ${cf.label}` });
        return;
      }
    }

    if (walletBalance < correctionFee) {
      Toast.fire({ icon: 'warning', title: `Insufficient wallet balance for the ₹${correctionFee} fee.` });
      return;
    }

    const appDisplayName = isIndiv
      ? (correctionData.nameAsPerAadhaar || `${correctionData.firstName || ''} ${correctionData.lastName || ''}`.trim())
      : (correctionData.entityName || correctionData.lastName || 'Entity');

    const confirmRes = await Swal.fire({
      title: `Submit PAN Correction (${correctionData.category || 'INDIVIDUAL'}) Application`,
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-top: 10px;">
          <p style="margin: 0 0 6px 0;"><b>PAN Number:</b> ${correctionData.panNumber}</p>
          <p style="margin: 0 0 6px 0;"><b>Applicant / Entity:</b> ${appDisplayName}</p>
          <p style="margin: 0;"><b>Fee Deducted:</b> <span style="color: #ea580c; font-weight: 800;">₹${correctionFee}</span></p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Submit & Pay ₹${correctionFee}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pancard/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser,
          applicationType: 'Already PAN',
          applicantName: appDisplayName,
          fatherName: isIndiv ? `${correctionData.fatherFirstName || ''} ${correctionData.fatherLastName || ''}`.trim() : (correctionData.verifierName || 'Authorized Signatory'),
          dob: isIndiv ? (correctionData.dob || '') : (correctionData.dateOfIncorporation || correctionData.dob || '2000-01-01'),
          gender: correctionData.gender || 'N/A',
          mobileNumber: correctionData.mobileNumber,
          email: correctionData.email,
          aadhaarNumber: correctionData.aadhaarNumber || '',
          panNumber: correctionData.panNumber,
          photoUrl: correctionData.photoUrl || '',
          signatureUrl: correctionData.signatureUrl || '',
          details: {
            ...correctionData,
            country: correctionData.country || 'INDIA',
            proofOfIncorporation: correctionData.proofOfIncorporation || (isIndiv ? '' : 'CERTIFICATE OF INCORPORATION'),
            proofOfIdentity: correctionData.proofOfIdentity || (isIndiv ? '' : 'CERTIFICATE OF INCORPORATION'),
            proofOfAddress: correctionData.proofOfAddress || (isIndiv ? '' : 'CERTIFICATE OF INCORPORATION')
          },
          remarks: 'PAN correction request submitted'
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Submission failed.');
      await generatePanCrPdf(correctionData);
      const isIndivApp = !correctionData.category || correctionData.category === 'INDIVIDUAL';
      const docMsg = isIndivApp
        ? 'Your PAN CR PDF download has started.'
        : 'Your official 1-page Non-Individual PAN Changes/Correction PDF download has started.';
      Swal.fire({
        icon: 'success',
        title: 'PAN Correction Application Submitted!',
        html: `<p>Ack No: <b>${result.ackNumber}</b></p><p style="margin-top: 10px; color: #16a34a; font-weight: 600;">📄 ${docMsg}</p>`,
        confirmButtonColor: '#0284c7'
      });
      fetchHistory('user');
    } catch (error) {
      Toast.fire({ icon: 'error', title: error.message || 'Error submitting correction application.' });
    } finally {
      setIsSubmitting(false);
    }
  };


  // eslint-disable-next-line no-unused-vars
  const handleDownloadAbha = () => {
    Swal.fire({
      title: 'Download ABHA Card',
      text: 'Redirecting to National Health Authority (ABHA) portal for instant card download...',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Proceed to ABHA Portal',
      confirmButtonColor: '#0284c7'
    }).then(res => {
      if (res.isConfirmed) {
        window.open('https://abha.abdm.gov.in/abha/v3/register', '_blank');
      }
    });
  };

  const handleGetAoCode = () => {
    const cityToUse = manualData.aoCity && manualData.aoCity !== 'SELECT CITY' ? manualData.aoCity : (manualData.district !== 'SELECT' ? manualData.district : '');
    if (!cityToUse) {
      Toast.fire({ icon: 'warning', title: 'Please select a State / District or City for AO Code lookup' });
      return;
    }
    const availableAo = getAoCodesForDistrict(cityToUse);
    if (availableAo && availableAo.length > 0) {
      const selected = availableAo[0];
      setManualData(prev => ({
        ...prev,
        aoCity: selected.city,
        aoAreaCode: selected.areaCode,
        aoType: selected.aoType,
        aoRangeCode: selected.rangeCode,
        aoNo: selected.aoNo
      }));
    }
  };

  // Helper to check if a specific field is set to Display or Hide by Admin
  const isFieldVisible = (fieldName, defaultVal = true) => {
    const manualTab = tabs.find(t => t.id === 'manual_new_pan');
    if (manualTab && Array.isArray(manualTab.fields)) {
      const found = manualTab.fields.find(f => f.name === fieldName);
      if (found && (found.hidden !== undefined || found.visible !== undefined)) {
        if (found.hidden !== undefined) return !found.hidden;
        if (found.visible !== undefined) return found.visible;
      }
    }
    return defaultVal;
  };

  // Helper to check if a specific field is set as mandatory by Admin
  const isFieldReq = (fieldName, defaultVal = true) => {
    if (!isFieldVisible(fieldName, defaultVal)) return false;
    const manualTab = tabs.find(t => t.id === 'manual_new_pan');
    if (manualTab && Array.isArray(manualTab.fields)) {
      const found = manualTab.fields.find(f => f.name === fieldName);
      if (found && found.required !== undefined) {
        return found.required;
      }
    }
    return defaultVal;
  };

  // Helper to extract custom dynamic fields added via Admin Panel for Form 93 / Form 94
  const getCustomFieldsForCurrentForm = () => {
    const manualTab = tabs.find(t => t.id === 'manual_new_pan');
    if (!manualTab || !Array.isArray(manualTab.fields)) return [];

    const isIndividual = manualData.category === 'INDIVIDUAL';
    const currentFormType = isIndividual ? 'Form 93' : 'Form 94';

    const STANDARD_F93 = new Set([
      'category', 'aadhaarNumber', 'proofOfDob', 'title', 'firstName', 'middleName', 'lastName',
      'isSingleParent', 'fatherFirstName', 'fatherMiddleName', 'fatherLastName',
      'motherFirstName', 'motherMiddleName', 'motherLastName', 'nameAsPerAadhaar',
      'gender', 'dob', 'mobileNumber', 'email', 'flatNo', 'premises', 'roadStreet',
      'areaTaluka', 'state', 'district', 'pincode', 'proofOfIdentity', 'proofOfAddress',
      'photoUrl', 'signatureUrl'
    ]);

    const STANDARD_F94 = new Set([
      'category', 'entityName', 'dateOfIncorporation', 'registrationNumber',
      'mobileNumber', 'email', 'landlineNumber', 'stdCode', 'incomeSource', 'proofOfIncorporation',
      'commFlatNo', 'commPremises', 'commRoadStreet', 'commAreaTaluka', 'commState',
      'commDistrict', 'commPincode', 'raTitle', 'raFirstName', 'raMiddleName',
      'raLastName', 'raPanNumber', 'raAadhaarNumber', 'raMobileNumber', 'raEmail',
      'raFlatNo', 'raRoadStreet', 'raAreaTaluka', 'raDistrict', 'raState',
      'raPincode', 'verifierName', 'verifierCapacity', 'verifierPlace', 'verifierDate'
    ]);

    const stdSet = isIndividual ? STANDARD_F93 : STANDARD_F94;

    return manualTab.fields.filter(f => {
      if (!f || f.hidden) return false;

      const fFormType = f.formType || 'Both';
      const isApplicable = fFormType === 'Both' ||
        fFormType === currentFormType ||
        (currentFormType === 'Form 93' && (fFormType === 'Form 93' || fFormType.includes('93'))) ||
        (currentFormType === 'Form 94' && (fFormType === 'Form 94' || fFormType.includes('94')));

      if (!isApplicable) return false;

      return !stdSet.has(f.name);
    });
  };


  // Helper for Underage / Minor Applicant age calculation
  const getAgeFromDob = (dobString) => {
    if (!dobString || typeof dobString !== 'string') return null;
    const trimmed = dobString.trim();
    if (!trimmed) return null;

    const birthDate = new Date(trimmed);
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If birthdate is today or in the future, it is not a past birthdate for minor logic
    if (birthDate >= today) {
      return null;
    }

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const applicantAge = getAgeFromDob(manualData.dob);
  const isMinor = applicantAge !== null && applicantAge >= 0 && applicantAge < 18;

  // Download Pre-Filled Form 49A / Form 94 PDF
  const handleDownloadPdf = async () => {
    const isNonInd = manualData.category && manualData.category !== 'INDIVIDUAL';
    if (!isNonInd && !manualData.lastName && !manualData.nameAsPerAadhaar && !manualData.aadhaarNumber) {
      Toast.fire({ icon: 'warning', title: 'Please fill in basic application form details first' });
      return;
    }
    if (isNonInd && !manualData.entityName && !manualData.lastName) {
      Toast.fire({ icon: 'warning', title: 'Please enter Name of Entity first' });
      return;
    }
    const docTitle = isNonInd ? 'Form No. 94' : 'Form 49A';
    Toast.fire({ icon: 'info', title: `Generating official ${docTitle} PDF...` });
    const payload = {
      ...manualData,
      isMinor,
      applicantAge
    };
    const success = await generateForm49APdf(payload);
    if (success) {
      Toast.fire({ icon: 'success', title: `Official ${docTitle} PDF generated and downloaded!` });
    } else {
      Toast.fire({ icon: 'error', title: 'Could not generate PDF. Please check your data.' });
    }
  };


  // eslint-disable-next-line no-unused-vars
  const handleAutoFillForm = () => {
    setManualData(prev => ({
      ...prev,
      category: 'INDIVIDUAL',
      aadhaarNumber: '987654321098',
      proofOfDob: 'AADHAAR CARD ISSUED BY UIDAI',
      title: 'SHRI',
      lastName: 'SHARMA',
      firstName: 'RAJESH',
      middleName: 'KUMAR',
      isSingleParent: 'NO',
      fatherLastName: 'SHARMA',
      fatherFirstName: 'RAMESH',
      fatherMiddleName: 'CHANDRA',
      nameAsPerAadhaar: 'RAJESH KUMAR SHARMA',
      gender: 'MALE',
      dob: '1995-08-15',
      mobileNumber: '9876543210',
      email: 'rajesh.sharma@gmail.com',
      flatNo: 'FLAT NO 402, SHANTI APARTMENTS',
      premises: 'SECTOR 15, NEAR MG ROAD',
      roadStreet: 'MAIN ROAD, SUBHASH NAGAR',
      areaTaluka: 'ANDHERI EAST',
      state: 'MAHARASHTRA',
      district: 'MUMBAI',
      pincode: '400069',
      proofOfIdentity: 'AADHAAR CARD ISSUED BY THE UNIQUE IDENTIFICATION AUTHORITY OF INDIA',
      proofOfAddress: 'AADHAAR CARD ISSUED BY THE UNIQUE IDENTIFICATION AUTHORITY OF INDIA'
    }));
    Toast.fire({ icon: 'success', title: '⚡ Form Auto-Filled! Form 49A PDF is ready to download.' });
  };

  const handleAddDocument = async () => {
    if (!selectedAppForDocument || !documentToAdd) {
      Toast.fire({ icon: 'warning', title: 'Please select a PDF or image document first.' });
      return;
    }

    setIsAddingDocument(true);
    try {
      const response = await fetch(`${API_URL}/api/pancard/${selectedAppForDocument._id}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser, name: documentName, document: documentToAdd })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Unable to add document.');

      Toast.fire({ icon: 'success', title: 'Document added. It is now available to Admin.' });
      setSelectedAppForDocument(null);
      setDocumentToAdd('');
      setDocumentName('');
      fetchHistory('user');
    } catch (err) {
      Toast.fire({ icon: 'error', title: err.message || 'Unable to add document.' });
    } finally {
      setIsAddingDocument(false);
    }
  };

  // Submit PAN Application (Manual / E-KYC / Correction / Dynamic Tabs)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (Swal.isVisible() && Swal.getPopup()?.classList?.contains('swal2-toast')) {
      Swal.close();
    }

    if (activeTab !== 'manual_new_pan') {
      // Handle E-KYC, Correction, or Dynamic tab submission
      if (!formData.applicantName) {
        Toast.fire({ icon: 'error', title: 'Please enter Applicant Full Name' });
        return;
      }
      if (!formData.mobileNumber || formData.mobileNumber.length < 10) {
        Toast.fire({ icon: 'error', title: 'Please enter a valid 10-digit Mobile Number' });
        return;
      }
      if (!formData.email) {
        Toast.fire({ icon: 'error', title: 'Please enter Email Address' });
        return;
      }
      if (activeTab === 'epan_kyc' && (!formData.aadhaarNumber || formData.aadhaarNumber.length < 12)) {
        Toast.fire({ icon: 'error', title: 'Please enter a valid 12-digit Aadhaar Number' });
        return;
      }
      if (activeTab === 'epan_correction' && !formData.panNumber) {
        Toast.fire({ icon: 'error', title: 'Please enter existing PAN Number' });
        return;
      }

      const feeAmount = tabs.find(t => t.id === activeTab)?.fee ?? 107;
      if (walletBalance < feeAmount) {
        Swal.fire({
          icon: 'warning',
          title: 'Insufficient Wallet Balance',
          html: `Your wallet balance is <b>₹${parseFloat(walletBalance).toFixed(2)}</b>.<br/>PAN Application fee required: <b>₹${feeAmount}</b>.`,
          confirmButtonColor: '#ea580c'
        });
        return;
      }

      const appLabel = getApplicationTypeLabel();
      const confirmRes = await Swal.fire({
        title: `Submit ${appLabel} Application`,
        html: `
          <div style="text-align: left; font-size: 14px; line-height: 1.6; background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-top: 10px;">
            <p style="margin: 0 0 6px 0;"><b>Applicant:</b> ${formData.applicantName}</p>
            <p style="margin: 0 0 6px 0;"><b>Mobile:</b> ${formData.mobileNumber}</p>
            <p style="margin: 0 0 6px 0;"><b>Email:</b> ${formData.email}</p>
            <p style="margin: 0;"><b>Fee Deducted:</b> <span style="color: #ea580c; font-weight: 800;">₹${feeAmount}</span></p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: `Submit & Pay ₹${feeAmount}`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#ea580c',
        cancelButtonColor: '#64748b'
      });

      if (!confirmRes.isConfirmed) return;

      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_URL}/api/pancard/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser,
            applicationType: appLabel,
            applicantName: formData.applicantName,
            fatherName: formData.fatherName || '',
            dob: formData.dob || '',
            gender: formData.gender || 'Male',
            mobileNumber: formData.mobileNumber,
            email: formData.email,
            aadhaarNumber: formData.aadhaarNumber || '',
            panNumber: formData.panNumber || '',
            details: formData,
            remarks: `${appLabel} Form Submission`
          })
        });

        const data = await response.json();
        setIsSubmitting(false);

        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: `${appLabel} Application Submitted!`,
            html: `
              <div style="text-align: center; line-height: 1.6;">
                <p style="font-size: 16px; color: #16a34a; font-weight: 700;">Ack No: ${data.ackNumber}</p>
                <p>Fee ₹${data.feeDeducted} deducted from your wallet balance.</p>
              </div>
            `,
            confirmButtonText: 'OK',
            confirmButtonColor: '#0284c7'
          });
          setHistoryViewMode('user');
          setActiveTab('history');
          fetchHistory('user');
        } else {
          Toast.fire({ icon: 'error', title: data.message || 'Submission failed.' });
        }
      } catch (err) {
        setIsSubmitting(false);
        console.error('Submit error:', err);
        Toast.fire({ icon: 'error', title: 'Error submitting application.' });
      }
      return;
    }

    if (manualData.category === 'INDIVIDUAL') {
      if (isFieldReq('aadhaarNumber') && (!manualData.aadhaarNumber || manualData.aadhaarNumber.length < 12)) {
        Toast.fire({ icon: 'error', title: 'Please enter a valid 12-digit Aadhaar Number' });
        return;
      }
      if (isFieldReq('lastName') && !manualData.lastName) {
        Toast.fire({ icon: 'error', title: 'Please enter Applicant Surname / Last Name' });
        return;
      }
      if (isFieldReq('firstName') && !manualData.firstName) {
        Toast.fire({ icon: 'error', title: 'Please enter Applicant First Name' });
        return;
      }
      if (isFieldReq('dob') && !manualData.dob) {
        Toast.fire({ icon: 'error', title: 'Please select Date of Birth' });
        return;
      }
      if (isFieldReq('mobileNumber') && (!manualData.mobileNumber || manualData.mobileNumber.length < 10)) {
        Toast.fire({ icon: 'error', title: 'Please enter a valid 10-digit Mobile Number' });
        return;
      }
      if (isFieldReq('email') && !manualData.email) {
        Toast.fire({ icon: 'error', title: 'Please enter Email Address' });
        return;
      }
      if (isFieldReq('photoUrl') && !manualData.photoUrl) {
        Toast.fire({ icon: 'error', title: 'Please upload Applicant Photo' });
        return;
      }
      if (isFieldReq('signatureUrl') && !manualData.signatureUrl) {
        Toast.fire({ icon: 'error', title: 'Please upload Applicant Signature' });
        return;
      }
    } else {
      // Non-Individual Entity Validations (FIRM, TRUST, COMPANY, BOI, AOP, etc.)
      const entityTitleName = manualData.entityName || manualData.lastName;
      if (!entityTitleName) {
        Toast.fire({ icon: 'error', title: 'Please enter Name of Firm / Company / Trust / Entity' });
        return;
      }
      const incDate = manualData.dateOfIncorporation || manualData.dob;
      if (!incDate) {
        Toast.fire({ icon: 'error', title: 'Please select Date of Incorporation / Agreement / Formation' });
        return;
      }
      if (!manualData.mobileNumber || manualData.mobileNumber.length < 10) {
        Toast.fire({ icon: 'error', title: 'Please enter a valid 10-digit Mobile Number' });
        return;
      }
      if (!manualData.email) {
        Toast.fire({ icon: 'error', title: 'Please enter Email Address' });
        return;
      }
    }

    // Custom Dynamic Fields Mandatory Check
    const activeCustomFields = getCustomFieldsForCurrentForm();
    for (const cf of activeCustomFields) {
      if (cf.required && !manualData[cf.name]) {
        Toast.fire({ icon: 'error', title: `Please enter ${cf.label}` });
        return;
      }
    }


    // MANDATORY CITY SELECTION CHECK
    const isDistrictPicked = manualData.district && manualData.district !== 'SELECT' && manualData.district !== 'PLEASE SELECT';
    const isAoCityPicked = manualData.aoCity && manualData.aoCity !== 'SELECT CITY';

    if (!isDistrictPicked && !isAoCityPicked) {
      Toast.fire({ icon: 'error', title: 'City Selection is mandatory. Please select your Town/District or AO City.' });
      return;
    }

    const feeAmount = tabs.find(t => t.id === 'manual_new_pan')?.fee ?? 107;
    if (walletBalance < feeAmount) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Wallet Balance',
        html: `Your wallet balance is <b>₹${parseFloat(walletBalance).toFixed(2)}</b>.<br/>PAN Application fee required: <b>₹${feeAmount}</b>.`,
        confirmButtonColor: '#ea580c'
      });
      return;
    }

    const applicantDisplayName = manualData.category === 'INDIVIDUAL'
      ? `${manualData.title !== 'SELECT' ? manualData.title : ''} ${manualData.firstName} ${manualData.lastName}`.trim() || manualData.lastName
      : (manualData.entityName || manualData.lastName);

    const confirmRes = await Swal.fire({
      title: `Submit Manual New PAN (${manualData.category}) Application`,
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; background: rgba(15, 23, 42, 0.6); padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); margin-top: 10px;">
          <p style="margin: 0 0 6px 0;"><b>Applicant / Entity:</b> ${applicantDisplayName}</p>
          <p style="margin: 0 0 6px 0;"><b>Category:</b> ${manualData.category}</p>
          <p style="margin: 0 0 6px 0;"><b>Mobile:</b> ${manualData.mobileNumber}</p>
          <p style="margin: 0;"><b>Fee Deducted:</b> <span style="color: #ea580c; font-weight: 800;">₹${feeAmount}</span></p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Submit & Pay ₹${feeAmount}`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b'
    });

    if (!confirmRes.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/pancard/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser,
          applicationType: 'Manual New PAN',
          applicantName: applicantDisplayName,
          fatherName: manualData.category === 'INDIVIDUAL' ? `${manualData.fatherFirstName} ${manualData.fatherLastName}`.trim() : (manualData.verifierName || 'Representative Assessee'),
          dob: manualData.category === 'INDIVIDUAL' ? manualData.dob : (manualData.dateOfIncorporation || manualData.dob),
          gender: manualData.gender !== 'SELECT' ? manualData.gender : 'N/A',
          mobileNumber: manualData.mobileNumber,
          email: manualData.email,
          aadhaarNumber: manualData.aadhaarNumber || manualData.raAadhaarNumber || '',
          panNumber: manualData.panNumber || '',
          photoUrl: manualData.photoUrl || '',
          signatureUrl: manualData.signatureUrl || '',
          details: {
            ...manualData,
            lastName: applicantDisplayName,
            dob: manualData.category === 'INDIVIDUAL' ? manualData.dob : (manualData.dateOfIncorporation || manualData.dob),
            applicantStatus: manualData.category
          },
          remarks: `Manual New PAN (${manualData.category}) Application Submitted`
        })
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (data.success) {
        // Automatically convert application into official Form No. 94 / Form 49A document layout & download PDF
        const isNonInd = manualData.category && manualData.category !== 'INDIVIDUAL';
        const docTitle = isNonInd ? 'Form No. 94' : 'Form 49A';
        generateForm49APdf(manualData);

        Swal.fire({
          icon: 'success',
          title: '✅ PAN Application Submitted!',
          html: `
            <div style="text-align: center; line-height: 1.6;">
              <p style="font-size: 16px; color: #16a34a; font-weight: 700;">Ack No: ${data.ackNumber}</p>
              <p>Fee ₹${data.feeDeducted} deducted from wallet balance.</p>
              <div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #15803d; font-size: 13px; font-weight: 600;">
                📄 Application automatically converted to official ${docTitle}! Your official 2-page PDF download has started.
              </div>
            </div>
          `,
          showConfirmButton: true,
          confirmButtonText: 'OK',
          confirmButtonColor: '#0284c7'
        });
        setHistoryViewMode('user');
        setActiveTab('history');
        fetchHistory('user');
      } else {
        Toast.fire({ icon: 'error', title: data.message || 'Submission failed.' });
      }
    } catch (err) {
      setIsSubmitting(false);
      console.error('Submit error:', err);
      Toast.fire({ icon: 'error', title: 'Error submitting application.' });
    }
  };

  const getApplicationTypeLabel = () => {
    if (activeTab === 'manual_new_pan') return 'Manual New PAN';
    if (activeTab === 'epan_kyc') return 'Aadhaar OTP New PAN';
    if (activeTab === 'epan_correction') return 'Already PAN / Correction';
    return 'Manual New PAN';
  };

  const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className="pancard-inline-container">
      <div className="pancard-card">

        {/* Header Bar */}
        <div className="pancard-header">
          <div className="pancard-header-left">
            <div className="pancard-brand-row">
              <div className="pancard-title-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <line x1="6" y1="15" x2="10" y2="15" />
                </svg>
              </div>
              <div className="pancard-title-wrap">
                <div className="pancard-title-with-tag">
                  <h3 className="pancard-title">PAN Card Services</h3>
                </div>
                <div className="pancard-subtitle">
                  Instant E-PAN Application, Form 49A Physical, Correction & Biometric e-KYC
                </div>
              </div>
            </div>
          </div>
          <div className="pancard-header-right">
            {walletBalance !== undefined && (
              <div className="pancard-balance-badge">
                <span className="pancard-balance-coin">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-7 0c0 2 1.5 3 3.5 3.5s3.5 1.5 3.5 3.5a3.5 3.5 0 0 1-7 0" />
                  </svg>
                </span>
                <div className="pancard-balance-details">
                  <span className="balance-label">WALLET BALANCE</span>
                  <span className="balance-amount">₹{parseFloat(walletBalance).toFixed(2)}</span>
                </div>
              </div>
            )}
            {onClose && (
              <button
                type="button"
                className="pancard-back-btn"
                onClick={onClose}
                title="Back to Dashboard"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Sub-Tabs Bar (Clean Official Navigation) */}
        <div className="pancard-tabs-bar">
          <button
            type="button"
            className={`pancard-tab-btn ${(activeTab === 'new_app_landing' || activeTab === 'manual_new_pan' || activeTab === 'epan_kyc') ? 'active' : ''}`}
            onClick={() => setActiveTab('new_app_landing')}
          >
            <span className="tab-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </span>
            <span>New Application</span>
          </button>
          <button
            type="button"
            className={`pancard-tab-btn ${activeTab === 'epan_correction' ? 'active' : ''}`}
            onClick={() => setActiveTab('epan_correction')}
          >
            <span className="tab-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            <span>Already PAN / Correction</span>
          </button>
          <button
            type="button"
            className={`pancard-tab-btn history-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <span className="tab-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </span>
            <span>Applications History</span>
          </button>
        </div>

        {/* MAIN CONTENT DISPLAY */}
        {activeTab === 'new_app_landing' ? (
          /* NEW APPLICATION LANDING PAGE (MODERN PORTAL DESIGN) */
          <div className="pan-landing-wrapper">

            {/* Portal Banner Header */}
            <div className="pan-portal-subhead">
              <div className="pan-portal-subhead-title">
                <div className="pan-portal-icon-glow">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2l10 8H2l10-8z"/>
                  </svg>
                </div>
                <div>
                  <div className="pan-portal-title-row">
                    <h3 className="pan-portal-h3">NEW PAN APPLICATION PORTAL</h3>
                  </div>
                  <div className="pan-portal-desc">
                    Income Tax Department of India • NSDL / UTIITSL e-Governance Infrastructure
                  </div>
                </div>
              </div>
              <div className="pan-breadcrumb">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                <span>Home</span>
                <span className="breadcrumb-separator">›</span>
                <span className="pan-breadcrumb-active">New PAN Application</span>
              </div>
            </div>

            {/* Service Options Cards Grid */}
            {/* Service Options Cards Grid (Redesigned Small Cards) */}
            <div className="pan-services-grid">

              {/* Card 1: Manual New PAN */}
              <div className="pan-service-card manual-card small-card">
                <div className="pan-card-header-compact">
                  <div className="pan-card-title-row">
                    <div className="pan-card-icon-wrapper manual-icon-bg small-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="pan-card-title small-title">MANUAL NEW PAN</h4>
                    </div>
                  </div>
                </div>

                <div className="pan-features-list compact-features">
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm manual-check">✓</span>
                    <span>Custom Photo & Signature Upload support</span>
                  </div>
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm manual-check">✓</span>
                    <span>ABHA Card supported as DOB Proof</span>
                  </div>
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm manual-check">✓</span>
                    <span>Physical PVC Card by post + Instant PDF</span>
                  </div>
                </div>

                <div className="pan-card-footer compact-footer">
                  <button
                    type="button"
                    className="pan-btn-manual small-btn"
                    onClick={() => setActiveTab('manual_new_pan')}
                  >
                    <span>Apply Manual New PAN</span>
                    <span className="btn-arrow">➔</span>
                  </button>
                  <div className="pan-card-footnote small-footnote">
                    <span>Includes India Post speed post delivery</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Aadhaar OTP New PAN */}
              <div className="pan-service-card kyc-card small-card">

                <div className="pan-card-header-compact">
                  <div className="pan-card-title-row">
                    <div className="pan-card-icon-wrapper kyc-icon-bg small-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="pan-card-title small-title">AADHAAR OTP NEW PAN</h4>
                    </div>
                  </div>
                </div>

                <div className="pan-features-list compact-features">
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm kyc-check">✓</span>
                    <span>100% Paperless UIDAI e-KYC process</span>
                  </div>
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm kyc-check">✓</span>
                    <span>Instant Mobile OTP Verification</span>
                  </div>
                  <div className="pan-feature-compact">
                    <span className="pan-check-sm kyc-check">✓</span>
                    <span>Fast e-PAN Allocation within 2 Hours</span>
                  </div>
                </div>

                <div className="pan-card-footer compact-footer">
                  <button
                    type="button"
                    className="pan-btn-kyc small-btn"
                    onClick={() => setActiveTab('epan_kyc')}
                  >
                    <span>Apply Aadhaar OTP PAN</span>
                    <span className="btn-arrow">➔</span>
                  </button>
                  <div className="pan-card-footnote small-footnote">
                    <span>Aadhaar linked mobile number required</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Official Note Banner */}
            <div className="pan-note-banner">
              <div className="pan-note-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <div className="pan-note-content">
                <span className="pan-note-tag">OFFICIAL GUIDELINE</span>
                <span className="pan-note-text">
                  If any other DOB (Date of Birth) Proof is not available, choose <strong>PROOF OF DOB List</strong> or <strong>ABHA Card</strong> for guaranteed compliance.
                </span>
              </div>
            </div>

          </div>
        ) : activeTab === 'history' ? (
          <div className="pancard-history-section" style={{ padding: '4px' }}>
            {/* Header & Controls Bar */}
            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(234, 88, 12, 0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#ea580c', fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📑</span> <span>Submitted PAN Application Requests</span>
                  </h4>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '12px' }}>
                    View all submitted Form 49A applications, inspect full form data, download PDFs, and update processing status.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => fetchHistory()}
                    style={{
                      background: '#fff7ed',
                      color: '#ea580c',
                      border: '1px solid #fdba74',
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(234, 88, 12, 0.08)'
                    }}
                  >
                    <span>🔄</span> <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Summary Statistics Cards Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '16px' }}>
                {/* Total Applications Sent */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    📤
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Sent to Admin</div>
                    <div style={{ fontSize: '19px', color: '#0f172a', fontWeight: '800' }}>{historyList.length}</div>
                  </div>
                </div>

                {/* Approved Applications */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    ✅
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#15803d', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Approved Applications</div>
                    <div style={{ fontSize: '19px', color: '#166534', fontWeight: '800' }}>
                      {historyList.filter(a => (a.status || '').toLowerCase() === 'approved' || (a.status || '').toLowerCase() === 'completed').length}
                    </div>
                  </div>
                </div>

                {/* In Progress / Pending */}
                <div style={{ background: '#fffbe6', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    ⏳
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#b45309', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Pending / In Progress</div>
                    <div style={{ fontSize: '19px', color: '#92400e', fontWeight: '800' }}>
                      {historyList.filter(a => (a.status || '').toLowerCase() === 'submitted' || (a.status || '').toLowerCase() === 'in progress').length}
                    </div>
                  </div>
                </div>

                {/* Rejected */}
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                    ❌
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#b91c1c', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Rejected / Correction</div>
                    <div style={{ fontSize: '19px', color: '#991b1b', fontWeight: '800' }}>
                      {historyList.filter(a => (a.status || '').toLowerCase() === 'rejected').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by Ack No, Applicant Name, Mobile or User ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fdba74',
                    borderRadius: '10px',
                    padding: '9px 14px',
                    color: '#1e293b',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fdba74',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: '#1e293b',
                    fontSize: '13px',
                    outline: 'none',
                    fontWeight: '600'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Approved">Approved</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Applications Data Table */}
            {loadingHistory ? (
              <div className="pancard-loading-state" style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #fed7aa' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '12px', color: '#ea580c', fontWeight: '600' }}>Loading PAN application requests...</p>
              </div>
            ) : (() => {
              const filteredList = historyList.filter(app => {
                const matchesStatus = statusFilter === 'ALL' || (app.status || 'Submitted').toLowerCase() === statusFilter.toLowerCase();
                const q = searchQuery.toLowerCase().trim();
                const matchesSearch = !q ||
                  (app.ackNumber && app.ackNumber.toLowerCase().includes(q)) ||
                  (app.applicantName && app.applicantName.toLowerCase().includes(q)) ||
                  (app.mobileNumber && app.mobileNumber.toLowerCase().includes(q)) ||
                  (app.userId && app.userId.toLowerCase().includes(q)) ||
                  (app.aadhaarNumber && app.aadhaarNumber.toLowerCase().includes(q));

                return matchesStatus && matchesSearch;
              }).sort((a, b) => {
                const statusA = (a.status || 'Submitted').toLowerCase();
                const statusB = (b.status || 'Submitted').toLowerCase();
                if (statusA === 'submitted' && statusB !== 'submitted') return -1;
                if (statusA !== 'submitted' && statusB === 'submitted') return 1;
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
              });

              if (filteredList.length === 0) {
                return (
                  <div className="pancard-empty-history" style={{ padding: '50px 20px', textAlign: 'center', background: '#fff7ed', borderRadius: '16px', border: '1px dashed #fdba74' }}>
                    <span style={{ fontSize: '36px', display: 'block', marginBottom: '10px' }}>📂</span>
                    <p style={{ color: '#ea580c', margin: 0, fontSize: '14px', fontWeight: '600' }}>
                      No PAN application requests found matching your filter.
                    </p>
                  </div>
                );
              }

              const getStatusBadgeStyle = (st = 'Submitted') => {
                const s = st.toLowerCase();
                if (s === 'approved' || s === 'completed') {
                  return { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
                }
                if (s === 'in progress') {
                  return { background: '#fffbe6', color: '#d97706', border: '1px solid #fde68a' };
                }
                if (s === 'rejected') {
                  return { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' };
                }
                return { background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74' };
              };

              return (
                  <div className="history-table-wrapper" style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="pancard-history-table" style={{ width: '100%', minWidth: '1000px', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                      <thead>
                        <tr style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', borderBottom: '2px solid #fed7aa' }}>
                          <th style={{ padding: '12px 10px', borderRadius: '10px 0 0 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ACK NO</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>CATEGORY</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>TYPE</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>APPLICANT NAME</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>MOBILE / EMAIL</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>SUBMITTED DATE</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>STATUS</th>
                          <th style={{ padding: '12px 10px', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>NSDL RECEIPT</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', borderRadius: '0 10px 10px 0', color: '#c2410c', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>ADMIN ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredList.map((app) => {
                          const fullPayload = { ...(app || {}), ...(app.details || {}) };
                          const statusStyle = getStatusBadgeStyle(app.status || 'Submitted');
                          const hasReceipt = Boolean(app.receiptUrl || app.nsdlReceiptNumber || (app.status || '').toLowerCase() === 'approved');

                          return (
                            <tr
                              key={app._id}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #fed7aa',
                                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.05)'
                              }}
                            >
                              {/* ACK NO */}
                              <td className="col-ack" style={{ padding: '11px 10px', borderRadius: '10px 0 0 10px', whiteSpace: 'nowrap' }}>
                                <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fdba74', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '800', fontFamily: 'monospace' }}>
                                  {app.ackNumber}
                                </span>
                              </td>

                              {/* CATEGORY */}
                              <td style={{ padding: '11px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                  {app.category || app.details?.category || 'INDIVIDUAL'}
                                </span>
                              </td>

                              {/* TYPE */}
                              <td style={{ padding: '11px 10px', fontSize: '11.5px', color: '#475569', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                {app.applicationType}
                              </td>

                              {/* APPLICANT NAME */}
                              <td style={{ padding: '11px 10px', fontSize: '12.5px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                                {app.applicantName}
                              </td>

                              {/* MOBILE / EMAIL */}
                              <td style={{ padding: '11px 10px', fontSize: '11.5px', color: '#334155', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: '600' }}>📞 {app.mobileNumber}</div>
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>✉️ {app.email}</div>
                              </td>

                              {/* SUBMITTED DATE */}
                              <td style={{ padding: '11px 10px', fontSize: '11.5px', color: '#475569', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                {new Date(app.createdAt).toLocaleDateString()} {new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>

                              {/* STATUS */}
                              <td style={{ padding: '11px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{ ...statusStyle, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-block', textTransform: 'capitalize' }}>
                                  ● {app.status || 'Submitted'}
                                </span>
                              </td>

                              {/* NSDL RECEIPT (15-DIGIT RECEIPT BUTTON / DASH) */}
                              <td style={{ padding: '11px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {hasReceipt ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (app.receiptUrl) {
                                        downloadReceiptToPc(app.receiptUrl, app.ackNumber || app.nsdlReceiptNumber || 'PAN');
                                      } else {
                                        Toast.fire({
                                          icon: 'info',
                                          title: `NSDL Receipt No: ${app.nsdlReceiptNumber || app.ackNumber}`
                                        });
                                      }
                                    }}
                                    title={app.receiptUrl ? "Click to view / download approved NSDL receipt" : `NSDL Receipt: ${app.nsdlReceiptNumber || app.ackNumber}`}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      background: '#f0f9ff',
                                      color: '#0284c7',
                                      border: '1px solid #7dd3fc',
                                      padding: '4px 9px',
                                      borderRadius: '7px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      fontFamily: 'monospace',
                                      cursor: app.receiptUrl ? 'pointer' : 'default',
                                      textDecoration: 'none',
                                      boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span style={{ fontSize: '11.5px' }}>🗎</span>
                                    <span style={{ textDecoration: app.receiptUrl ? 'underline' : 'none' }}>
                                      {app.nsdlReceiptNumber || app.ackNumber}
                                    </span>
                                  </button>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>—</span>
                                )}
                              </td>

                              {/* ADMIN ACTIONS (SINGLE-LINE SPACIOUS ACTIONS) */}
                              <td style={{ padding: '11px 10px', textAlign: 'center', borderRadius: '0 10px 10px 0', whiteSpace: 'nowrap', minWidth: '240px' }}>
                                <div style={{ display: 'inline-flex', gap: '5px', justifyContent: 'center', alignItems: 'center', whiteSpace: 'nowrap' }}>
                                  {/* View Full Form Details */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAppForModal(app)}
                                    style={{
                                      background: '#f0f9ff',
                                      color: '#0284c7',
                                      border: '1px solid #bae6fd',
                                      padding: '5px 9px',
                                      borderRadius: '7px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="View complete submitted form details"
                                  >
                                    <span>👁️</span> <span>Details</span>
                                  </button>

                                  {/* Add Documents */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAppForDocument(app);
                                      setDocumentToAdd('');
                                      setDocumentName('');
                                    }}
                                    style={{
                                      background: '#fff7ed',
                                      color: '#ea580c',
                                      border: '1px solid #fdba74',
                                      padding: '5px 9px',
                                      borderRadius: '7px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Add a supporting document to this application"
                                  >
                                    <span>📁</span> <span>Add Documents</span>
                                  </button>

                                  {/* Download Pre-Filled PDF */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (app.applicationType === 'Already PAN') {
                                        generatePanCrPdf(fullPayload);
                                      } else {
                                        generateForm49APdf(fullPayload);
                                      }
                                    }}
                                    style={{
                                      background: '#ecfdf5',
                                      color: '#059669',
                                      border: '1px solid #a7f3d0',
                                      padding: '5px 9px',
                                      borderRadius: '7px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="Download pre-filled official Form 49A PDF"
                                  >
                                    <span>📥</span> <span>PDF</span>
                                  </button>

                                  {/* Delete Submission (Locked if Approved or Completed) */}
                                  {((app.status || '').toLowerCase() === 'approved' || (app.status || '').toLowerCase() === 'completed') ? (
                                    <span
                                      style={{
                                        background: '#f1f5f9',
                                        color: '#94a3b8',
                                        border: '1px solid #cbd5e1',
                                        padding: '5px 9px',
                                        borderRadius: '7px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'not-allowed',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title="Approved by Admin — Cannot be deleted"
                                    >
                                      <span>🔒</span> <span>Approved</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRetailerDeleteApplication(app)}
                                      style={{
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fca5a5',
                                        padding: '5px 9px',
                                        borderRadius: '7px',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title="Delete application and get instant wallet refund"
                                    >
                                      <span>🗑️</span> <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
              );
            })()}

            {selectedAppForDocument && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ width: '100%', maxWidth: '520px', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#c2410c' }}>📎 Add supporting document</h4>
                      <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '12px' }}>Application: {selectedAppForDocument.ackNumber}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedAppForDocument(null)} style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}>×</button>
                  </div>
                  <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.5 }}>The document will be attached to this application and immediately visible in the Admin details screen. No fee is charged.</p>
                  <input
                    type="text"
                    value={documentName}
                    onChange={e => setDocumentName(e.target.value)}
                    placeholder="Document Name (e.g. Aadhaar Card, DOB Proof)"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box' }}
                  />
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setDocumentToAdd(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ width: '100%', marginBottom: '16px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                    <button type="button" onClick={() => setSelectedAppForDocument(null)} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                    <button type="button" onClick={handleAddDocument} disabled={isAddingDocument || !documentToAdd} style={{ padding: '10px 16px', border: 'none', borderRadius: '8px', color: '#fff', background: documentToAdd ? '#ea580c' : '#cbd5e1', cursor: documentToAdd ? 'pointer' : 'not-allowed', fontWeight: '700' }}>
                      {isAddingDocument ? 'Adding…' : 'Add document'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: VIEW FULL APPLICATION DETAILS (ADMIN / RETAILER) */}
            {/* ========================================================================= */}
            {selectedAppForModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 12px 12px 12px', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
                <div style={{ background: '#1e293b', border: '1.5px solid #0284c7', borderRadius: '16px', width: '96%', maxWidth: '940px', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', color: '#fff', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', overflow: 'hidden' }}>

                  {/* Fixed Header Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '12px 20px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#38bdf8', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> <span>PAN Form Details</span>
                        <span style={{ fontSize: '12px', background: 'rgba(2, 132, 199, 0.25)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#7dd3fc', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          ACK: {selectedAppForModal.ackNumber || 'N/A'}
                        </span>
                      </h4>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                        Submitted by User: <strong style={{ color: '#e2e8f0' }}>{selectedAppForModal.userId || selectedAppForModal.userMobile || 'Retailer'}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAppForModal(null)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Scrollable Body Content (Compact 2-Column Dashboard Layout) */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                    {(() => {
                      const d = selectedAppForModal.details || {};
                      const appStatus = (selectedAppForModal.status || 'Submitted').toUpperCase();
                      const statusColor = appStatus === 'APPROVED' || appStatus === 'COMPLETED' ? '#10b981' : appStatus === 'REJECTED' ? '#ef4444' : '#f59e0b';
                      const statusBg = appStatus === 'APPROVED' || appStatus === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : appStatus === 'REJECTED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';

                      return (
                        <>
                          {/* Top Status & Type Bar */}
                          <div style={{ background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(15, 23, 42, 0.4) 100%)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '8px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#94a3b8', fontSize: '11.5px', fontWeight: '600' }}>Current Status:</span>
                              <span style={{ background: statusBg, border: `1px solid ${statusColor}`, color: statusColor, padding: '2px 10px', borderRadius: '14px', fontWeight: '800', fontSize: '11.5px', letterSpacing: '0.4px' }}>
                                {appStatus}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              {selectedAppForModal.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => downloadReceiptToPc(selectedAppForModal.receiptUrl, selectedAppForModal.ackNumber || 'PAN')}
                                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}
                                >
                                  📄 View Approved Receipt
                                </button>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>Type:</span>
                                <strong style={{ color: '#38bdf8', background: 'rgba(2, 132, 199, 0.2)', padding: '2px 8px', borderRadius: '5px', fontSize: '11.5px' }}>
                                  {selectedAppForModal.applicationType || 'Manual New PAN'}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* 2-Column Responsive Dashboard */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px' }}>
                            
                            {/* Left Column: Personal Particulars & Parents */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {/* Personal Particulars */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h5 style={{ margin: '0 0 8px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>👤</span> <span>Personal Particulars</span>
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', color: '#cbd5e1', fontSize: '12px' }}>
                                  <div><span style={{ color: '#94a3b8' }}>Title:</span> <strong style={{ color: '#f8fafc' }}>{d.title || selectedAppForModal.title || 'SHRI'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Gender:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.gender || d.gender || 'Male'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Last Name:</span> <strong style={{ color: '#f8fafc' }}>{d.lastName || selectedAppForModal.applicantName || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>DOB:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.dob || d.dob || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>First Name:</span> <strong style={{ color: '#f8fafc' }}>{d.firstName || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Aadhaar:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.aadhaarNumber || d.aadhaarNumber || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Middle Name:</span> <strong style={{ color: '#f8fafc' }}>{d.middleName || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Mobile:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.mobileNumber || '—'}</strong></div>
                                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#94a3b8' }}>Email:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.email || '—'}</strong></div>
                                </div>
                              </div>

                              {/* Parents Details */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h5 style={{ margin: '0 0 8px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>👨‍👩‍👦</span> <span>Parents Details</span>
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#cbd5e1', fontSize: '12px' }}>
                                  <div><span style={{ color: '#94a3b8' }}>Father's Name:</span> <strong style={{ color: '#f8fafc' }}>{selectedAppForModal.fatherName || `${d.fatherFirstName || ''} ${d.fatherLastName || ''}`.trim() || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Mother's Name:</span> <strong style={{ color: '#f8fafc' }}>{`${d.motherFirstName || ''} ${d.motherLastName || ''}`.trim() || '—'}</strong></div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Address, AO Code & Attachments */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {/* Residence Address */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h5 style={{ margin: '0 0 8px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>🏠</span> <span>Residence Address</span>
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', color: '#cbd5e1', fontSize: '12px' }}>
                                  <div><span style={{ color: '#94a3b8' }}>Flat/Door:</span> <strong style={{ color: '#e2e8f0' }}>{d.flatNo || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Building:</span> <strong style={{ color: '#e2e8f0' }}>{d.premises || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Street:</span> <strong style={{ color: '#e2e8f0' }}>{d.roadStreet || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Area:</span> <strong style={{ color: '#e2e8f0' }}>{d.areaTaluka || '—'}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>District:</span> <strong style={{ color: '#38bdf8' }}>{(d.district && d.district !== 'SELECT') ? d.district : (selectedAppForModal.district || '—')}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>State:</span> <strong style={{ color: '#38bdf8' }}>{(d.state && d.state !== 'PLEASE SELECT') ? d.state : (selectedAppForModal.state || 'MAHARASHTRA')}</strong></div>
                                  <div><span style={{ color: '#94a3b8' }}>Pincode:</span> <strong style={{ color: '#f8fafc' }}>{d.pincode || '—'}</strong></div>
                                </div>
                              </div>

                              {/* AO Code Details */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h5 style={{ margin: '0 0 6px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>🏢</span> <span>AO Code Details</span>
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', textAlign: 'center' }}>
                                  <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '5px 4px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Area</div>
                                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{d.aoAreaCode || 'MUM'}</strong>
                                  </div>
                                  <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '5px 4px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Type</div>
                                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{d.aoType || 'C'}</strong>
                                  </div>
                                  <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '5px 4px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Range</div>
                                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{d.aoRangeCode || '11'}</strong>
                                  </div>
                                  <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '5px 4px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>AO No</div>
                                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{d.aoNo || '1'}</strong>
                                  </div>
                                  <div style={{ background: 'rgba(2, 132, 199, 0.15)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '5px 4px', borderRadius: '6px' }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>City</div>
                                    <strong style={{ color: '#38bdf8', fontSize: '12px' }}>{d.aoCity || d.district || 'MUMBAI'}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Photo & Signature Attachments */}
                              <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <h5 style={{ margin: '0 0 6px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>🖼️</span> <span>Attachments</span>
                                </h5>
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                  {(selectedAppForModal.photoUrl || d.photoUrl) && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '3px' }}>Photo</div>
                                      <img src={selectedAppForModal.photoUrl || d.photoUrl} alt="Photo" onClick={() => window.open(selectedAppForModal.photoUrl || d.photoUrl, '_blank')} style={{ width: '65px', height: '75px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #0284c7', cursor: 'pointer' }} title="Click to view full photo" />
                                    </div>
                                  )}
                                  {(selectedAppForModal.signatureUrl || d.signatureUrl) && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '3px' }}>Signature</div>
                                      <img src={selectedAppForModal.signatureUrl || d.signatureUrl} alt="Signature" onClick={() => window.open(selectedAppForModal.signatureUrl || d.signatureUrl, '_blank')} style={{ width: '120px', height: '50px', objectFit: 'contain', background: '#fff', padding: '4px', borderRadius: '6px', border: '1.5px solid #0284c7', cursor: 'pointer' }} title="Click to view full signature" />
                                    </div>
                                  )}
                                  {(d.raPhotoUrl || d.proofOfOtherUrl) && (
                                    <div style={{ textAlign: 'center' }}>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginBottom: '3px' }}>Guardian</div>
                                      <img src={d.raPhotoUrl || d.proofOfOtherUrl} alt="RA Photo" onClick={() => window.open(d.raPhotoUrl || d.proofOfOtherUrl, '_blank')} style={{ width: '65px', height: '75px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #f97316', cursor: 'pointer' }} title="Click to view full photo" />
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>

                          {(selectedAppForModal.additionalDocuments || []).length > 0 && (
                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <h5 style={{ margin: '0 0 6px 0', color: '#fb923c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>📎</span> <span>Additional Documents from Retailer</span>
                              </h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {selectedAppForModal.additionalDocuments.map((document, index) => (
                                  <div key={document._id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'rgba(255,255,255,0.06)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div>
                                      <strong style={{ color: '#f8fafc', fontSize: '12px' }}>{document.name || 'Additional document'}</strong>
                                      <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '1px' }}>Uploaded {document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : 'recently'}</div>
                                    </div>
                                    <button type="button" onClick={() => window.open(document.dataUrl, '_blank')} style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '5px', fontSize: '11.5px', fontWeight: '700', cursor: 'pointer' }}>View</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Fixed Footer Bar */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', flexWrap: 'wrap' }}>
                    {selectedAppForModal.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => downloadReceiptToPc(selectedAppForModal.receiptUrl, selectedAppForModal.ackNumber || 'PAN')}
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', fontSize: '12px' }}
                      >
                        📥 Download Receipt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const fullPayload = { ...(selectedAppForModal || {}), ...(selectedAppForModal.details || {}), ...(selectedAppForModal.details || {}) };
                        if (selectedAppForModal.applicationType === 'Already PAN') {
                          generatePanCrPdf(fullPayload);
                        } else {
                          generateForm49APdf(fullPayload);
                        }
                      }}
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                    >
                      📄 Download Form 49A PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAppForModal(null)}
                      style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                    >
                      Close
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: ADMIN STATUS UPDATE MODAL */}
            {/* ========================================================================= */}
            {selectedAppForStatusUpdate && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ background: '#1e293b', border: '1.5px solid #ea580c', borderRadius: '18px', width: '100%', maxWidth: '500px', padding: '24px', color: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '17px', color: '#ea580c', fontWeight: '800' }}>
                      ✏️ Update Form Status (Admin)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedAppForStatusUpdate(null)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', fontSize: '15px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ fontSize: '13px', marginBottom: '14px', color: '#cbd5e1' }}>
                    Updating status for Ack: <strong style={{ color: '#38bdf8' }}>{selectedAppForStatusUpdate.ackNumber}</strong> ({selectedAppForStatusUpdate.applicantName})
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
                      Select New Application Status:
                    </label>
                    <select
                      value={statusUpdateVal}
                      onChange={e => setStatusUpdateVal(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700' }}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Approved">Approved</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
                      Admin Remarks (Optional):
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Verified by Admin. e-PAN dispatched to email."
                      value={adminRemarksInput}
                      onChange={e => setAdminRemarksInput(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  {/* NSDL Receipt / Ack Slip Remark */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#38bdf8' }}>
                      NSDL Receipt / Ack Slip Remark (Send to Retailer):
                    </label>
                    <input
                      type="text"
                      placeholder="Enter NSDL receipt number or ack slip remark..."
                      value={nsdlReceiptInput}
                      onChange={e => setNsdlReceiptInput(e.target.value)}
                      maxLength={50}
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1.5px solid #0284c7', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', fontFamily: 'monospace', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      💡 This receipt number / remark will be sent to retailer and displayed in the <strong>NSDL RECEIPT</strong> column.
                    </div>
                  </div>

                  {/* Send / Upload Approved Application Receipt PDF */}
                  <div style={{ marginBottom: '20px', background: 'rgba(2, 132, 199, 0.1)', border: '1px dashed rgba(56, 189, 248, 0.4)', padding: '12px', borderRadius: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#38bdf8' }}>
                      📄 Send Approved Receipt PDF / Ack Slip (To Retailer):
                    </label>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setReceiptInputUrl(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ width: '100%', padding: '6px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                    />
                    {(receiptInputUrl || selectedAppForStatusUpdate.receiptUrl) && (
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#34d399', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>✓</span> <span>{receiptInputUrl ? 'New receipt PDF selected! Will be sent to retailer upon saving.' : 'Receipt already uploaded for retailer.'}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedAppForStatusUpdate(null)}
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatusId === selectedAppForStatusUpdate._id}
                      onClick={() => handleSaveStatus(selectedAppForStatusUpdate._id)}
                      style={{ background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
                    >
                      {updatingStatusId === selectedAppForStatusUpdate._id ? 'Saving...' : 'Save & Send to Retailer'}
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>
        ) : activeTab === 'epan_correction' ? (
          <PanCorrectionForm
            data={correctionData}
            onChange={handleCorrectionChange}
            onFileChange={handleCorrectionFileUpload}
            onSubmit={handleCorrectionSubmit}
            onDownload={handleCorrectionDownload}
            isSubmitting={isSubmitting}
            customFields={(tabs.find(t => t.id === 'epan_correction')?.fields || []).filter(f => f && !f.hidden && f.isCustom)}
          />

        ) : activeTab === 'manual_new_pan' ? (
          /* MANUAL NEW PAN APPLICATION FORM (EXACT MATCH FOR SCREENSHOT 2) */
          <div className="manual-pan-wrapper">

            {/* Top Breadcrumb & Title Bar */}
            <div className="manual-pan-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h3 style={{ margin: 0, color: '#0284c7', fontSize: '18px', fontWeight: '800' }}>
                New Pan Application
              </h3>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                <span>Home</span> &gt; <span style={{ color: '#0284c7', fontWeight: '700' }}>Pan New Application</span>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="manual-pan-form">
              {/* Row 1: Category */}
              {isFieldVisible('category') && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label-pro">CATEGORY OF APPLICANT {isFieldReq('category') && <span className="req-star">*</span>}</label>
                  <select
                    name="category"
                    value={manualData.category}
                    onChange={handleManualChange}
                    className="form-select-pro"
                    style={{ width: '100%' }}
                  >
                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                    <option value="FIRM">FIRM</option>
                    <option value="BODY OF INDIVIDUALS">BODY OF INDIVIDUALS</option>
                    <option value="TRUST">TRUST</option>
                    <option value="ASSOCIATION OF PERSONS">ASSOCIATION OF PERSONS</option>
                    <option value="LOCAL AUTHORITY">LOCAL AUTHORITY</option>
                    <option value="COMPANY">COMPANY</option>
                    <option value="HINDU UNDIVIDED FAMILY">HINDU UNDIVIDED FAMILY</option>
                    <option value="LIMITED LIABILITY PARTNERSHIP">LIMITED LIABILITY PARTNERSHIP</option>
                    <option value="ARTIFICIAL JURIDICAL PERSON">ARTIFICIAL JURIDICAL PERSON</option>
                    <option value="GOVERNMENT">GOVERNMENT</option>
                  </select>
                </div>
              )}

              {/* =========================================================================
                  IF CATEGORY IS INDIVIDUAL -> RENDER INDIVIDUAL FORM FIELDS (EXISTING)
                 ========================================================================= */}
              {manualData.category === 'INDIVIDUAL' ? (
                <>
                  {/* Row 2: Aadhaar No */}
                  {isFieldVisible('aadhaarNumber') && (
                    <div style={{ marginBottom: '16px' }}>
                      <label className="form-label-pro">AADHAAR NO {isFieldReq('aadhaarNumber') && <span className="req-star">*</span>}</label>
                      <input
                        type="text"
                        name="aadhaarNumber"
                        value={manualData.aadhaarNumber}
                        onChange={handleManualChange}
                        placeholder="12 DIGITS UID NO"
                        maxLength={12}
                        className="form-input-pro"
                        style={{ width: '100%' }}
                      />
                    </div>
                  )}

                  {/* Row 3: Important DOB Proof Note */}
                  <div style={{ background: 'rgba(234, 88, 12, 0.08)', border: '1px solid rgba(234, 88, 12, 0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: '#fb923c', fontSize: '12.5px', fontWeight: '700' }}>
                    📌 If any other DOB (Date of Birth) Proof is not available, choose PROOF OF DOB List or ABHA Card.
                  </div>

                  {/* Row 4: Proof of DOB */}
                  {isFieldVisible('proofOfDob') && (
                    <div style={{ marginBottom: '20px' }}>
                      <label className="form-label-pro">PROOF OF DOB {isFieldReq('proofOfDob') && <span className="req-star">*</span>}</label>
                      <select
                        name="proofOfDob"
                        value={manualData.proofOfDob}
                        onChange={handleManualChange}
                        className="form-select-pro"
                        style={{ width: '100%' }}
                      >
                        <option value="">Please Select</option>
                        {PROOF_OF_DOB_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                  )}


                  {/* Row 5: Applicant's Name Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {isFieldVisible('title') && (
                      <div>
                        <label className="form-label-pro">TITLE {isFieldReq('title') && <span className="req-star">*</span>}</label>
                        <select name="title" value={manualData.title} onChange={handleManualChange} className="form-select-pro">
                          <option value="SELECT">SELECT</option>
                          <option value="SHRI">SHRI</option>
                          <option value="SMT">SMT</option>
                          <option value="KUMARI">KUMARI</option>
                        </select>
                      </div>
                    )}
                    {isFieldVisible('firstName') && (
                      <div>
                        <label className="form-label-pro">FIRST NAME {isFieldReq('firstName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="firstName" value={manualData.firstName} onChange={handleManualChange} placeholder="FIRST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('middleName') && (
                      <div>
                        <label className="form-label-pro">MIDDLE NAME {isFieldReq('middleName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="middleName" value={manualData.middleName} onChange={handleManualChange} placeholder="MIDDLE NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('lastName') && (
                      <div>
                        <label className="form-label-pro">LAST NAME / SURNAME {isFieldReq('lastName') && <span className="req-star">*</span>}</label>
                        <input type="text" name="lastName" value={manualData.lastName} onChange={handleManualChange} placeholder="LAST NAME / SURNAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                  </div>

                  {/* Row 6: Single Parent Question */}
                  {isFieldVisible('isSingleParent') && (
                    <div style={{ marginBottom: '16px' }}>
                      <label className="form-label-pro">WHETHER MOTHER/FATHER IS A SINGLE PARENT {isFieldReq('isSingleParent') && <span className="req-star">*</span>}</label>
                      <select name="isSingleParent" value={manualData.isSingleParent} onChange={handleManualChange} className="form-select-pro">
                        <option value="NO">NO</option>
                        <option value="YES">YES</option>
                      </select>
                    </div>
                  )}

                  {/* Row 7: Father's Name Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {isFieldVisible('fatherFirstName') && (
                      <div>
                        <label className="form-label-pro">FATHER'S FIRST NAME {isFieldReq('fatherFirstName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="fatherFirstName" value={manualData.fatherFirstName} onChange={handleManualChange} placeholder="FATHER FIRST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('fatherMiddleName') && (
                      <div>
                        <label className="form-label-pro">FATHER'S MIDDLE NAME {isFieldReq('fatherMiddleName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="fatherMiddleName" value={manualData.fatherMiddleName} onChange={handleManualChange} placeholder="FATHER MIDDLE NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('fatherLastName') && (
                      <div>
                        <label className="form-label-pro">FATHER'S LAST NAME {isFieldReq('fatherLastName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="fatherLastName" value={manualData.fatherLastName} onChange={handleManualChange} placeholder="FATHER LAST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                  </div>

                  {/* Row 8: Mother's Name Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {isFieldVisible('motherFirstName') && (
                      <div>
                        <label className="form-label-pro">MOTHER'S FIRST NAME {isFieldReq('motherFirstName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="motherFirstName" value={manualData.motherFirstName} onChange={handleManualChange} placeholder="MOTHER FIRST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('motherMiddleName') && (
                      <div>
                        <label className="form-label-pro">MOTHER'S MIDDLE NAME {isFieldReq('motherMiddleName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="motherMiddleName" value={manualData.motherMiddleName} onChange={handleManualChange} placeholder="MOTHER MIDDLE NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('motherLastName') && (
                      <div>
                        <label className="form-label-pro">MOTHER'S LAST NAME {isFieldReq('motherLastName', false) && <span className="req-star">*</span>}</label>
                        <input type="text" name="motherLastName" value={manualData.motherLastName} onChange={handleManualChange} placeholder="MOTHER LAST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                  </div>

                  {/* Row 9: Aadhaar Name, Gender, DOB, Mobile, Email */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                    {isFieldVisible('nameAsPerAadhaar') && (
                      <div>
                        <label className="form-label-pro">NAME AS PER AADHAAR {isFieldReq('nameAsPerAadhaar') && <span className="req-star">*</span>}</label>
                        <input type="text" name="nameAsPerAadhaar" value={manualData.nameAsPerAadhaar} onChange={handleManualChange} placeholder="NAME AS PER AADHAAR" className="form-input-pro uppercase-text" />
                      </div>
                    )}
                    {isFieldVisible('gender') && (
                      <div>
                        <label className="form-label-pro">GENDER {isFieldReq('gender') && <span className="req-star">*</span>}</label>
                        <select name="gender" value={manualData.gender} onChange={handleManualChange} className="form-select-pro">
                          <option value="SELECT">SELECT</option>
                          <option value="MALE">MALE</option>
                          <option value="FEMALE">FEMALE</option>
                          <option value="TRANSGENDER">TRANSGENDER</option>
                        </select>
                      </div>
                    )}
                    {isFieldVisible('dob') && (
                      <div style={{ gridColumn: isMinor ? 'span 2' : 'span 1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label className="form-label-pro" style={{ margin: 0 }}>
                            DATE OF BIRTH {isFieldReq('dob') && <span className="req-star">*</span>}
                          </label>
                        </div>
                        <input type="date" name="dob" value={manualData.dob} onChange={handleManualChange} className="form-input-pro" />

                        {/* Inline Minor Applicant & Representative Assessee (Guardian) Fields directly below DOB */}
                        {isMinor && (
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(234, 88, 12, 0.06) 100%)',
                            border: '1.5px solid rgba(239, 68, 68, 0.35)',
                            borderRadius: '14px',
                            padding: '18px 20px',
                            marginTop: '14px',
                            marginBottom: '8px',
                            boxShadow: '0 8px 25px rgba(239, 68, 68, 0.1)'
                          }}>
                            <div style={{ color: '#f87171', fontWeight: '800', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>👶</span> <span>UNDERAGE MINOR APPLICANT DETAILS (Age &lt; 18 Years)</span>
                              </div>
                              <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '12px', fontWeight: '800' }}>
                                MANDATORY FOR MINOR
                              </span>
                            </div>

                            <p style={{ color: '#cbd5e1', fontSize: '12px', marginTop: 0, marginBottom: '14px', lineHeight: '1.4' }}>
                              As per Income Tax Department & NSDL rules, since the applicant is under 18 years old, Representative Assessee (Parent / Guardian) details and Guardian Photo are required for Form 49A (PART E).
                            </p>

                            {/* Representative Assessee Name Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                              <div>
                                <label className="form-label-pro">RA TITLE <span className="req-star">*</span></label>
                                <select name="raTitle" value={manualData.raTitle || 'SHRI'} onChange={handleManualChange} className="form-select-pro">
                                  <option value="SHRI">SHRI</option>
                                  <option value="SMT">SMT</option>
                                  <option value="KUMARI">KUMARI</option>
                                </select>
                              </div>
                              <div>
                                <label className="form-label-pro">GUARDIAN FIRST NAME <span className="req-star">*</span></label>
                                <input
                                  type="text"
                                  name="raFirstName"
                                  value={manualData.raFirstName || ''}
                                  onChange={handleManualChange}
                                  placeholder="GUARDIAN FIRST NAME"
                                  className="form-input-pro uppercase-text"
                                  required={isMinor}
                                />
                              </div>
                              <div>
                                <label className="form-label-pro">GUARDIAN MIDDLE NAME</label>
                                <input
                                  type="text"
                                  name="raMiddleName"
                                  value={manualData.raMiddleName || ''}
                                  onChange={handleManualChange}
                                  placeholder="MIDDLE NAME"
                                  className="form-input-pro uppercase-text"
                                />
                              </div>
                              <div>
                                <label className="form-label-pro">GUARDIAN LAST NAME <span className="req-star">*</span></label>
                                <input
                                  type="text"
                                  name="raLastName"
                                  value={manualData.raLastName || ''}
                                  onChange={handleManualChange}
                                  placeholder="LAST NAME / SURNAME"
                                  className="form-input-pro uppercase-text"
                                  required={isMinor}
                                />
                              </div>
                            </div>

                            {/* Guardian Aadhaar / PAN */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                              <div>
                                <label className="form-label-pro">GUARDIAN AADHAAR NUMBER <span className="req-star">*</span></label>
                                <input
                                  type="text"
                                  name="raAadhaarNumber"
                                  value={manualData.raAadhaarNumber || ''}
                                  onChange={handleManualChange}
                                  placeholder="12-DIGIT AADHAAR NUMBER"
                                  maxLength={12}
                                  className="form-input-pro"
                                  required={isMinor}
                                />
                              </div>
                              <div>
                                <label className="form-label-pro">GUARDIAN PAN NUMBER (IF ANY)</label>
                                <input
                                  type="text"
                                  name="raPanNumber"
                                  value={manualData.raPanNumber || ''}
                                  onChange={handleManualChange}
                                  placeholder="10-CHARACTER PAN (OPTIONAL)"
                                  maxLength={10}
                                  className="form-input-pro uppercase-text"
                                />
                              </div>
                            </div>

                            {/* Upload Guardian Photo (2nd Photo for Minor) */}
                            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '14px' }}>
                              <label className="form-label-pro" style={{ color: '#fb923c', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <span>📷</span> <span>UPLOAD GUARDIAN PHOTO (Parent / Representative Assessee Photo) <span className="req-star">*</span></span>
                              </label>
                              <DropzoneBox
                                label="Upload Parent / Guardian Photo (Minor Application)"
                                fieldName="raPhotoUrl"
                                isRequired={isMinor}
                                currentValue={manualData.raPhotoUrl || manualData.proofOfOtherUrl}
                                onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, raPhotoUrl: dataUrl, proofOfOtherUrl: dataUrl }))}
                                accept="image/*"
                                hint="Drag & drop Parent / Guardian passport photo here (JPG, PNG). Populated into PART E of downloadable Form 49A PDF."
                                icon="👨‍👦"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {isFieldVisible('mobileNumber') && (
                      <div>
                        <label className="form-label-pro">MOBILE NO. {isFieldReq('mobileNumber') && <span className="req-star">*</span>}</label>
                        <input type="tel" name="mobileNumber" value={manualData.mobileNumber} onChange={handleManualChange} placeholder="MOBILE NO." maxLength={10} className="form-input-pro" />
                      </div>
                    )}
                    {isFieldVisible('email') && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label-pro">EMAIL ID {isFieldReq('email') && <span className="req-star">*</span>}</label>
                        <input type="email" name="email" value={manualData.email} onChange={handleManualChange} placeholder="EMAIL ID" className="form-input-pro" />
                      </div>
                    )}
                  </div>

                  {/* Row 10: Address Section */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(255, 255, 255, 0.12)', marginBottom: '20px' }}>
                    <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '800', marginBottom: '12px' }}>
                      NOTE: Please fill Address details as per Aadhaar
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {isFieldVisible('flatNo') && (
                        <div>
                          <label className="form-label-pro">FLAT/DOOR/BLOCK NO {isFieldReq('flatNo') && <span className="req-star">*</span>}</label>
                          <input type="text" name="flatNo" value={manualData.flatNo} onChange={handleManualChange} placeholder="FLAT/DOOR/BLOCK NO" className="form-input-pro uppercase-text" />
                        </div>
                      )}
                      {isFieldVisible('premises') && (
                        <div>
                          <label className="form-label-pro">PREMISES/BUILDING/VILLAGE {isFieldReq('premises') && <span className="req-star">*</span>}</label>
                          <input type="text" name="premises" value={manualData.premises} onChange={handleManualChange} placeholder="PREMISES/BUILDING/VILLAGE" className="form-input-pro uppercase-text" />
                        </div>
                      )}
                      {isFieldVisible('roadStreet') && (
                        <div>
                          <label className="form-label-pro">ROAD/STREET/POST OFFICE {isFieldReq('roadStreet') && <span className="req-star">*</span>}</label>
                          <input type="text" name="roadStreet" value={manualData.roadStreet} onChange={handleManualChange} placeholder="ROAD/STREET/LANE/POST OFFICE" className="form-input-pro uppercase-text" />
                        </div>
                      )}
                      {isFieldVisible('areaTaluka') && (
                        <div>
                          <label className="form-label-pro">AREA/TALUKA/SUB DIVISION {isFieldReq('areaTaluka') && <span className="req-star">*</span>}</label>
                          <input type="text" name="areaTaluka" value={manualData.areaTaluka} onChange={handleManualChange} placeholder="AREA/TALUKA/SUB DIVISION" className="form-input-pro uppercase-text" />
                        </div>
                      )}
                      {isFieldVisible('state') && (
                        <div>
                          <label className="form-label-pro">STATE {isFieldReq('state') && <span className="req-star">*</span>}</label>
                          <select name="state" value={manualData.state} onChange={handleManualChange} className="form-select-pro">
                            <option value="PLEASE SELECT">PLEASE SELECT</option>
                            {ALL_INDIAN_STATES.map(st => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {isFieldVisible('district') && (
                        <div>
                          <label className="form-label-pro">TOWN/DISTRICT <span className="req-star">*</span></label>
                          <select name="district" value={manualData.district} onChange={handleManualChange} className="form-select-pro">
                            <option value="SELECT">SELECT</option>
                            {((manualData.state && INDIAN_STATES_DISTRICTS[manualData.state])
                              ? INDIAN_STATES_DISTRICTS[manualData.state]
                              : ALL_INDIAN_DISTRICTS
                            ).map(dist => (
                              <option key={dist} value={dist}>{dist}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {isFieldVisible('pincode') && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <label className="form-label-pro">PINCODE {isFieldReq('pincode') && <span className="req-star">*</span>}</label>
                          <input type="text" name="pincode" value={manualData.pincode} onChange={handleManualChange} placeholder="PINCODE" maxLength={6} className="form-input-pro" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 11: Proof of Identity & Proof of Address */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                    {isFieldVisible('proofOfIdentity') && (
                      <div>
                        <label className="form-label-pro">PROOF OF IDENTITY {isFieldReq('proofOfIdentity') && <span className="req-star">*</span>}</label>
                        <select name="proofOfIdentity" value={manualData.proofOfIdentity} onChange={handleManualChange} className="form-select-pro">
                          <option value="">Please Select</option>
                          {PROOF_OF_IDENTITY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {isFieldVisible('proofOfAddress') && (
                      <div>
                        <label className="form-label-pro">PROOF OF ADDRESS {isFieldReq('proofOfAddress') && <span className="req-star">*</span>}</label>
                        <select name="proofOfAddress" value={manualData.proofOfAddress} onChange={handleManualChange} className="form-select-pro">
                          <option value="">Please Select</option>
                          {PROOF_OF_ADDRESS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>


                  {/* Dynamic Custom Fields (Form 93) */}
                  {getCustomFieldsForCurrentForm().length > 0 && (
                    <div style={{ background: 'rgba(2, 132, 199, 0.05)', border: '1px dashed rgba(2, 132, 199, 0.3)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📝 Additional Form Fields (Form 93)
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                        {getCustomFieldsForCurrentForm().map(f => (
                          <div key={f.name}>
                            <label className="form-label-pro">
                              {f.icon ? `${f.icon} ` : ''}{f.label} {f.required && <span className="req-star">*</span>}
                            </label>
                            {f.type === 'select' ? (
                              <select
                                name={f.name}
                                value={manualData[f.name] || ''}
                                onChange={handleManualChange}
                                className="form-select-pro"
                                style={{ width: '100%' }}
                                required={f.required}
                              >
                                <option value="">-- Select {f.label} --</option>
                                {(f.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : f.type === 'file' ? (
                              <input
                                type="file"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setManualData(prev => ({ ...prev, [f.name]: reader.result }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="form-input-pro"
                                style={{ width: '100%' }}
                              />
                            ) : (
                              <input
                                type={f.type || 'text'}
                                name={f.name}
                                value={manualData[f.name] || ''}
                                onChange={handleManualChange}
                                placeholder={f.placeholder || `Enter ${f.label}`}
                                className="form-input-pro"
                                style={{ width: '100%' }}
                                required={f.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>

              ) : (
                /* =========================================================================
                    IF CATEGORY IS NOT INDIVIDUAL -> RENDER FORM NO. 94 / 49A NON-INDIVIDUAL
                   ========================================================================= */
                <div className="non-individual-form-wrapper" style={{ marginTop: '16px' }}>

                  {/* Header Notice Banner */}
                  <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(2, 132, 199, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#38bdf8', fontSize: '13px', fontWeight: '700' }}>
                    🏛️ <strong>FORM NO. 94 / 49A</strong>: Application for Allotment of Permanent Account Number for {manualData.category} (Company / Firm / Trust / Entity / Association of Persons / Body of Individuals).
                  </div>

                  {/* PART A: ENTITY INFORMATION */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                      PART A - Personal / Entity Information
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label-pro">1. NAME OF {manualData.category} / ENTITY <span className="req-star">*</span></label>
                        <input
                          type="text"
                          name="entityName"
                          value={manualData.entityName || manualData.lastName || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualData(prev => ({ ...prev, entityName: val, lastName: val }));
                          }}
                          placeholder={`ENTER FULL NAME OF ${manualData.category}`}
                          className="form-input-pro uppercase-text"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label-pro">2. DATE OF INCORPORATION / AGREEMENT / TRUST DEED / FORMATION <span className="req-star">*</span></label>
                        <input
                          type="date"
                          name="dateOfIncorporation"
                          value={manualData.dateOfIncorporation || manualData.dob || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualData(prev => ({ ...prev, dateOfIncorporation: val, dob: val }));
                          }}
                          className="form-input-pro"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label-pro">3. REGISTRATION NUMBER (FOR COMPANY, FIRM, LLP, TRUST, ETC.)</label>
                        <input
                          type="text"
                          name="registrationNumber"
                          value={manualData.registrationNumber || ''}
                          onChange={handleManualChange}
                          placeholder="ENTER REGISTRATION / CIN NO."
                          className="form-input-pro uppercase-text"
                        />
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '14px' }}>
                      <div>
                        <label className="form-label-pro">MOBILE NO. <span className="req-star">*</span></label>
                        <input
                          type="tel"
                          name="mobileNumber"
                          value={manualData.mobileNumber}
                          onChange={handleManualChange}
                          placeholder="10-DIGIT MOBILE NO."
                          maxLength={10}
                          className="form-input-pro"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label-pro">EMAIL ID <span className="req-star">*</span></label>
                        <input
                          type="email"
                          name="email"
                          value={manualData.email}
                          onChange={handleManualChange}
                          placeholder="OFFICIAL EMAIL ID"
                          className="form-input-pro"
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label-pro">LANDLINE NO. WITH STD CODE</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            name="stdCode"
                            value={manualData.stdCode || ''}
                            onChange={handleManualChange}
                            placeholder="STD"
                            style={{ width: '60px' }}
                            className="form-input-pro"
                          />
                          <input
                            type="text"
                            name="landlineNumber"
                            value={manualData.landlineNumber || ''}
                            onChange={handleManualChange}
                            placeholder="LANDLINE NO."
                            className="form-input-pro"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Custom Fields (Form 94) */}
                    {getCustomFieldsForCurrentForm().length > 0 && (
                      <div style={{ background: 'rgba(234, 88, 12, 0.05)', border: '1.5px dashed rgba(234, 88, 12, 0.3)', borderRadius: '10px', padding: '14px', marginTop: '16px' }}>
                        <h5 style={{ margin: '0 0 12px 0', fontSize: '13.5px', color: '#ea580c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          ✨ Additional Custom Form Fields (Form 94)
                        </h5>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                          {getCustomFieldsForCurrentForm().map(f => (
                            <div key={f.name}>
                              <label className="form-label-pro">
                                {f.icon ? `${f.icon} ` : ''}{f.label} {f.required && <span className="req-star">*</span>}
                              </label>
                              {f.type === 'select' ? (
                                <select
                                  name={f.name}
                                  value={manualData[f.name] || ''}
                                  onChange={handleManualChange}
                                  className="form-select-pro"
                                  style={{ width: '100%' }}
                                  required={f.required}
                                >
                                  <option value="">-- Select {f.label} --</option>
                                  {(f.options || []).map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : f.type === 'file' ? (
                                <input
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setManualData(prev => ({ ...prev, [f.name]: reader.result }));
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                  className="form-input-pro"
                                  style={{ width: '100%' }}
                                />
                              ) : (
                                <input
                                  type={f.type || 'text'}
                                  name={f.name}
                                  value={manualData[f.name] || ''}
                                  onChange={handleManualChange}
                                  placeholder={f.placeholder || `Enter ${f.label}`}
                                  className="form-input-pro"
                                  style={{ width: '100%' }}
                                  required={f.required}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>


                  {/* OFFICE & COMMUNICATION ADDRESS (Items 3 & 4 in Form 94) */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                      Office & Communication Address
                    </h4>

                    <div style={{ color: '#fb923c', fontSize: '12.5px', fontWeight: '700', marginBottom: '12px' }}>
                      🏢 3. Office Address:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label className="form-label-pro">FLAT / DOOR / BUILDING NO. <span className="req-star">*</span></label>
                        <input type="text" name="flatNo" value={manualData.flatNo} onChange={handleManualChange} placeholder="FLAT/DOOR/BLOCK NO" className="form-input-pro uppercase-text" required />
                      </div>
                      <div>
                        <label className="form-label-pro">ROAD / STREET / BLOCK / SECTOR <span className="req-star">*</span></label>
                        <input type="text" name="roadStreet" value={manualData.roadStreet} onChange={handleManualChange} placeholder="ROAD/STREET/SECTOR" className="form-input-pro uppercase-text" required />
                      </div>
                      <div>
                        <label className="form-label-pro">PREMISES / POST OFFICE</label>
                        <input type="text" name="premises" value={manualData.premises} onChange={handleManualChange} placeholder="POST OFFICE / PREMISES" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">AREA / LOCALITY / TOWN / CITY</label>
                        <input type="text" name="areaTaluka" value={manualData.areaTaluka} onChange={handleManualChange} placeholder="AREA/LOCALITY/TOWN/CITY" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">STATE / UNION TERRITORY <span className="req-star">*</span></label>
                        <select name="state" value={manualData.state} onChange={handleManualChange} className="form-select-pro">
                          <option value="PLEASE SELECT">PLEASE SELECT</option>
                          {ALL_INDIAN_STATES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label-pro">TOWN / DISTRICT <span className="req-star">*</span></label>
                        <select name="district" value={manualData.district} onChange={handleManualChange} className="form-select-pro">
                          <option value="SELECT">SELECT</option>
                          {((manualData.state && INDIAN_STATES_DISTRICTS[manualData.state])
                            ? INDIAN_STATES_DISTRICTS[manualData.state]
                            : ALL_INDIAN_DISTRICTS
                          ).map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label-pro">PIN / ZIP CODE <span className="req-star">*</span></label>
                        <input type="text" name="pincode" value={manualData.pincode} onChange={handleManualChange} placeholder="6-DIGIT PINCODE" maxLength={6} className="form-input-pro" required />
                      </div>
                    </div>

                    {/* 4. COMMUNICATION ADDRESS */}
                    <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ color: '#fb923c', fontSize: '12.5px', fontWeight: '700' }}>
                          📬 4. Communication Address:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600' }}>Same as Office Address?</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38bdf8', cursor: 'pointer', fontWeight: '700' }}>
                            <input
                              type="radio"
                              name="sameAsOfficeAddress"
                              checked={manualData.sameAsOfficeAddress === true || manualData.sameAsOfficeAddress === 'YES' || manualData.sameAsOfficeAddress === undefined}
                              onChange={() => setManualData(prev => ({ ...prev, sameAsOfficeAddress: true }))}
                              style={{ accentColor: '#38bdf8', cursor: 'pointer' }}
                            />
                            Yes
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f97316', cursor: 'pointer', fontWeight: '700' }}>
                            <input
                              type="radio"
                              name="sameAsOfficeAddress"
                              checked={manualData.sameAsOfficeAddress === false || manualData.sameAsOfficeAddress === 'NO'}
                              onChange={() => setManualData(prev => ({ ...prev, sameAsOfficeAddress: false }))}
                              style={{ accentColor: '#f97316', cursor: 'pointer' }}
                            />
                            No
                          </label>
                        </div>
                      </div>

                      {(!manualData.sameAsOfficeAddress || manualData.sameAsOfficeAddress === 'NO') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <label className="form-label-pro">FLAT / DOOR / BUILDING NO. <span className="req-star">*</span></label>
                            <input type="text" name="commFlatNo" value={manualData.commFlatNo || ''} onChange={handleManualChange} placeholder="FLAT/DOOR/BLOCK NO" className="form-input-pro uppercase-text" required={!manualData.sameAsOfficeAddress} />
                          </div>
                          <div>
                            <label className="form-label-pro">ROAD / STREET / BLOCK / SECTOR <span className="req-star">*</span></label>
                            <input type="text" name="commRoadStreet" value={manualData.commRoadStreet || ''} onChange={handleManualChange} placeholder="ROAD/STREET/SECTOR" className="form-input-pro uppercase-text" required={!manualData.sameAsOfficeAddress} />
                          </div>
                          <div>
                            <label className="form-label-pro">PREMISES / POST OFFICE</label>
                            <input type="text" name="commPremises" value={manualData.commPremises || ''} onChange={handleManualChange} placeholder="POST OFFICE / PREMISES" className="form-input-pro uppercase-text" />
                          </div>
                          <div>
                            <label className="form-label-pro">AREA / LOCALITY / TOWN / CITY</label>
                            <input type="text" name="commAreaTaluka" value={manualData.commAreaTaluka || ''} onChange={handleManualChange} placeholder="AREA/LOCALITY/TOWN/CITY" className="form-input-pro uppercase-text" />
                          </div>
                          <div>
                            <label className="form-label-pro">STATE / UNION TERRITORY <span className="req-star">*</span></label>
                            <select name="commState" value={manualData.commState || 'PLEASE SELECT'} onChange={handleManualChange} className="form-select-pro">
                              <option value="PLEASE SELECT">PLEASE SELECT</option>
                              {ALL_INDIAN_STATES.map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label-pro">TOWN / DISTRICT <span className="req-star">*</span></label>
                            <select name="commDistrict" value={manualData.commDistrict || 'SELECT'} onChange={handleManualChange} className="form-select-pro">
                              <option value="SELECT">SELECT</option>
                              {((manualData.commState && INDIAN_STATES_DISTRICTS[manualData.commState])
                                ? INDIAN_STATES_DISTRICTS[manualData.commState]
                                : ALL_INDIAN_DISTRICTS
                              ).map(dist => (
                                <option key={dist} value={dist}>{dist}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label className="form-label-pro">PIN / ZIP CODE <span className="req-star">*</span></label>
                            <input type="text" name="commPincode" value={manualData.commPincode || ''} onChange={handleManualChange} placeholder="6-DIGIT PINCODE" maxLength={6} className="form-input-pro" required={!manualData.sameAsOfficeAddress} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PART B: SOURCE OF INCOME */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                      PART B - Source of Income
                    </h4>
                    <label className="form-label-pro">8. SOURCE OF INCOME <span className="req-star">*</span></label>
                    <select name="incomeSource" value={manualData.incomeSource || 'Income from Business/Profession'} onChange={handleManualChange} className="form-select-pro" style={{ width: '100%' }}>
                      <option value="Income from Business/Profession">Income from Business/Profession</option>
                      <option value="Income from House Property">Income from House Property</option>
                      <option value="Capital Gains">Capital Gains</option>
                      <option value="Income from Other Sources">Income from Other Sources</option>
                      <option value="No Income">No Income</option>
                    </select>
                  </div>

                  {/* PART D: REPRESENTATIVE ASSESSEE (RA) / AUTHORIZED REPRESENTATIVE (AR) */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                      PART D - Representative Assessee (RA) / Authorized Representative (AR)
                    </h4>
                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: '-6px 0 14px 0' }}>
                      10. Details of Representative Assessee / Authorized Representative (Partner, Director, Trustee, Authorized Signatory)
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label className="form-label-pro">TITLE</label>
                        <select name="raTitle" value={manualData.raTitle || 'SHRI'} onChange={handleManualChange} className="form-select-pro">
                          <option value="SHRI">SHRI</option>
                          <option value="SMT">SMT</option>
                          <option value="KUMARI">KUMARI</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label-pro">RA FIRST NAME</label>
                        <input type="text" name="raFirstName" value={manualData.raFirstName || ''} onChange={handleManualChange} placeholder="FIRST NAME" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">RA MIDDLE NAME</label>
                        <input type="text" name="raMiddleName" value={manualData.raMiddleName || ''} onChange={handleManualChange} placeholder="MIDDLE NAME" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">RA LAST NAME</label>
                        <input type="text" name="raLastName" value={manualData.raLastName || ''} onChange={handleManualChange} placeholder="LAST NAME" className="form-input-pro uppercase-text" />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label className="form-label-pro">11. RA PERMANENT ACCOUNT NUMBER (PAN)</label>
                        <input type="text" name="raPanNumber" value={manualData.raPanNumber || ''} onChange={handleManualChange} placeholder="10-CHARACTER PAN (IF ANY)" maxLength={10} className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">12. RA AADHAAR NUMBER</label>
                        <input type="text" name="raAadhaarNumber" value={manualData.raAadhaarNumber || ''} onChange={handleManualChange} placeholder="12-DIGIT AADHAAR NO (IF PAN NOT AVAILABLE)" maxLength={12} className="form-input-pro" />
                      </div>
                    </div>

                    {/* RA Address (Item 13 in Form 94) */}
                    <div style={{ color: '#fb923c', fontSize: '12.5px', fontWeight: '700', margin: '14px 0 8px 0' }}>
                      🏠 13. Address of Representative Assessee:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div>
                        <label className="form-label-pro">FLAT / DOOR / BUILDING NO.</label>
                        <input type="text" name="raFlatNo" value={manualData.raFlatNo || ''} onChange={handleManualChange} placeholder="FLAT/DOOR/BLOCK NO" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">ROAD / STREET / BLOCK / SECTOR</label>
                        <input type="text" name="raRoadStreet" value={manualData.raRoadStreet || ''} onChange={handleManualChange} placeholder="ROAD/STREET/SECTOR" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">PREMISES / POST OFFICE</label>
                        <input type="text" name="raPremises" value={manualData.raPremises || ''} onChange={handleManualChange} placeholder="POST OFFICE / PREMISES" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">AREA / LOCALITY / TOWN / CITY</label>
                        <input type="text" name="raAreaTaluka" value={manualData.raAreaTaluka || ''} onChange={handleManualChange} placeholder="AREA/LOCALITY/TOWN/CITY" className="form-input-pro uppercase-text" />
                      </div>
                      <div>
                        <label className="form-label-pro">STATE / UNION TERRITORY</label>
                        <select name="raState" value={manualData.raState || 'PLEASE SELECT'} onChange={handleManualChange} className="form-select-pro">
                          <option value="PLEASE SELECT">PLEASE SELECT</option>
                          {ALL_INDIAN_STATES.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label-pro">TOWN / DISTRICT</label>
                        <select name="raDistrict" value={manualData.raDistrict || 'SELECT'} onChange={handleManualChange} className="form-select-pro">
                          <option value="SELECT">SELECT</option>
                          {((manualData.raState && INDIAN_STATES_DISTRICTS[manualData.raState])
                            ? INDIAN_STATES_DISTRICTS[manualData.raState]
                            : ALL_INDIAN_DISTRICTS
                          ).map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label-pro">PIN / ZIP CODE</label>
                        <input type="text" name="raPincode" value={manualData.raPincode || ''} onChange={handleManualChange} placeholder="6-DIGIT PINCODE" maxLength={6} className="form-input-pro" />
                      </div>
                    </div>

                    {/* RA Contact Details (Item 14 in Form 94) */}
                    <div style={{ color: '#fb923c', fontSize: '12.5px', fontWeight: '700', margin: '14px 0 8px 0' }}>
                      📞 14. Contact Details of Representative Assessee:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label-pro">RA MOBILE NO.</label>
                        <input
                          type="tel"
                          name="raMobileNumber"
                          value={manualData.raMobileNumber || ''}
                          onChange={handleManualChange}
                          placeholder="10-DIGIT MOBILE NO."
                          maxLength={10}
                          className="form-input-pro"
                        />
                      </div>
                      <div>
                        <label className="form-label-pro">RA EMAIL ID</label>
                        <input
                          type="email"
                          name="raEmail"
                          value={manualData.raEmail || ''}
                          onChange={handleManualChange}
                          placeholder="RA EMAIL ID"
                          className="form-input-pro"
                        />
                      </div>
                      <div>
                        <label className="form-label-pro">RA LANDLINE NO. WITH STD CODE</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input
                            type="text"
                            name="raStdCode"
                            value={manualData.raStdCode || ''}
                            onChange={handleManualChange}
                            placeholder="STD"
                            style={{ width: '60px' }}
                            className="form-input-pro"
                          />
                          <input
                            type="text"
                            name="raLandlineNumber"
                            value={manualData.raLandlineNumber || ''}
                            onChange={handleManualChange}
                            placeholder="LANDLINE NO."
                            className="form-input-pro"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* PART E: DOCUMENTS SUBMITTED & VERIFICATION DECLARATION */}
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                      PART E - Documents Submitted & Verification Declaration
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                      <div>
                        <label className="form-label-pro">15. PROOF OF IDENTITY OF ENTITY <span className="req-star">*</span></label>
                        <select name="proofOfIdentity" value={manualData.proofOfIdentity} onChange={handleManualChange} className="form-select-pro">
                          <option value="CERTIFICATE OF REGISTRATION ISSUED BY REGISTRAR OF COMPANIES/FIRMS">CERTIFICATE OF REGISTRATION (ROC/FIRMS)</option>
                          <option value="PARTNERSHIP DEED">PARTNERSHIP DEED</option>
                          <option value="TRUST DEED / AGREEMENT">TRUST DEED / AGREEMENT</option>
                          <option value="REGISTRATION CERTIFICATE ISSUED BY COMPETENT AUTHORITY">REGISTRATION CERTIFICATE ISSUED BY GOVT</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label-pro">PROOF OF ADDRESS OF ENTITY <span className="req-star">*</span></label>
                        <select name="proofOfAddress" value={manualData.proofOfAddress} onChange={handleManualChange} className="form-select-pro">
                          <option value="CERTIFICATE OF REGISTRATION ISSUED BY REGISTRAR OF COMPANIES/FIRMS">CERTIFICATE OF REGISTRATION (ROC/FIRMS)</option>
                          <option value="PARTNERSHIP DEED">PARTNERSHIP DEED</option>
                          <option value="BANK STATEMENT IN NAME OF ENTITY">BANK STATEMENT IN NAME OF ENTITY</option>
                          <option value="UTILITY BILL / ELECTRICITY BILL">UTILITY BILL / ELECTRICITY BILL</option>
                        </select>
                      </div>

                      <div style={{ gridColumn: 'span 2' }}>
                        <label className="form-label-pro">PROOF OF DATE OF INCORPORATION / AGREEMENT / DEED <span className="req-star">*</span></label>
                        <select name="proofOfIncorporation" value={manualData.proofOfIncorporation || 'CERTIFICATE OF INCORPORATION / REGISTRATION'} onChange={handleManualChange} className="form-select-pro">
                          <option value="CERTIFICATE OF INCORPORATION / REGISTRATION">CERTIFICATE OF INCORPORATION / REGISTRATION</option>
                          <option value="PARTNERSHIP DEED">PARTNERSHIP DEED</option>
                          <option value="TRUST DEED">TRUST DEED</option>
                          <option value="AGREEMENT / FORMATION DOCUMENT">AGREEMENT / FORMATION DOCUMENT</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label-pro">PROOF OF IDENTITY OF RA (IF APPLICABLE)</label>
                        <select name="raProofOfIdentity" value={manualData.raProofOfIdentity || ''} onChange={handleManualChange} className="form-select-pro">
                          <option value="">-- NOT APPLICABLE / SELECT --</option>
                          {PROOF_OF_IDENTITY_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label-pro">PROOF OF ADDRESS OF RA (IF APPLICABLE)</label>
                        <select name="raProofOfAddress" value={manualData.raProofOfAddress || ''} onChange={handleManualChange} className="form-select-pro">
                          <option value="">-- NOT APPLICABLE / SELECT --</option>
                          {PROOF_OF_ADDRESS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Verification & Declaration Text Box */}
                    <div style={{ background: 'rgba(2, 132, 199, 0.05)', border: '1px dashed rgba(2, 132, 199, 0.3)', borderRadius: '10px', padding: '14px', marginTop: '16px' }}>
                      <div style={{ fontWeight: '800', color: '#38bdf8', marginBottom: '8px', fontSize: '13px' }}>
                        ✍️ Verification & Declaration
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                        <div>
                          <label className="form-label-pro">DECLARANT / AUTHORIZED REPRESENTATIVE NAME <span className="req-star">*</span></label>
                          <input
                            type="text"
                            name="verifierName"
                            value={manualData.verifierName || ''}
                            onChange={handleManualChange}
                            placeholder="FULL NAME OF DECLARANT"
                            className="form-input-pro uppercase-text"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label-pro">CAPACITY / DESIGNATION <span className="req-star">*</span></label>
                          <select name="verifierCapacity" value={manualData.verifierCapacity || 'PARTNER'} onChange={handleManualChange} className="form-select-pro">
                            <option value="PARTNER">PARTNER</option>
                            <option value="DIRECTOR">DIRECTOR</option>
                            <option value="MANAGING TRUSTEE">MANAGING TRUSTEE</option>
                            <option value="AUTHORIZED SIGNATORY">AUTHORIZED SIGNATORY</option>
                            <option value="PROPRIETOR">PROPRIETOR</option>
                            <option value="SECRETARY">SECRETARY</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label-pro">PLACE <span className="req-star">*</span></label>
                          <input
                            type="text"
                            name="verifierPlace"
                            value={manualData.verifierPlace || ''}
                            onChange={handleManualChange}
                            placeholder="PLACE OF DECLARATION"
                            className="form-input-pro uppercase-text"
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label-pro">DATE <span className="req-star">*</span></label>
                          <input
                            type="date"
                            name="verifierDate"
                            value={manualData.verifierDate || new Date().toISOString().split('T')[0]}
                            onChange={handleManualChange}
                            className="form-input-pro"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* AO Code Selection Section (Common for both Individual & Non-Individual) */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginTop: '12px', marginBottom: '20px' }}>
                <div style={{ flex: '1' }}>
                  <label className="form-label-pro">For Help on AO Code, SELECT CITY <span className="req-star">*</span></label>
                  <select name="aoCity" value={manualData.aoCity} onChange={handleManualChange} className="form-select-pro">
                    <option value="SELECT CITY">SELECT CITY</option>
                    {Array.from(new Set([...AO_CODES_LIST.map(a => a.city), ...ALL_INDIAN_DISTRICTS])).sort().map((city, idx) => (
                      <option key={idx} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    type="button" 
                    onClick={handleGetAoCode}
                    style={{
                      background: '#00b4d8',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(0, 180, 216, 0.3)'
                    }}
                  >
                    <span>🔍</span> <span>Get AO Code</span>
                  </button>
                </div>
              </div>

              {/* Official PAN AO Code Selection Table View */}
              <div className="ao-table-wrapper">
                <div className="ao-table-container">
                  <table className="ao-table">
                    <thead>
                      <tr>
                        <th style={{ width: '55px', textAlign: 'center' }}>Select</th>
                        <th style={{ width: '140px' }}>Description</th>
                        <th>Additional Jurisdiction Description</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Area Code</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>AO Type</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Range Code</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>AO Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAoCodesForDistrict(manualData.aoCity !== 'SELECT CITY' ? manualData.aoCity : manualData.district).map((ao, idx) => {
                        const isSelected = (manualData.aoAreaCode === ao.areaCode && manualData.aoType === ao.aoType && manualData.aoRangeCode === ao.rangeCode && manualData.aoNo === ao.aoNo);
                        return (
                          <tr key={ao.id || idx} className={isSelected ? 'ao-row-selected' : ''}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="radio"
                                name="selectedAoCodeRow"
                                checked={isSelected}
                                onChange={() => handleAoSelect(ao.id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#38bdf8' }}
                              />
                            </td>
                            <td style={{ fontWeight: '700', color: '#f8fafc' }}>{ao.description}</td>
                            <td style={{ color: '#94a3b8', lineHeight: '1.4', fontSize: '11.5px' }}>{ao.additionalDesc || 'Territorial Jurisdiction Details'}</td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{ao.areaCode}</td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{ao.aoType}</td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{ao.rangeCode}</td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#38bdf8' }}>{ao.aoNo}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Active Synced AO Code Summary & Manual Input Sync */}
                <div className="ao-summary-bar">
                  <div style={{ fontSize: '12.5px', color: '#e2e8f0', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅ Active Synced AO Code: </span>
                    <span style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: '800', letterSpacing: '1px' }}>
                      {manualData.aoAreaCode || '--'} | {manualData.aoType || '--'} | {manualData.aoRangeCode || '--'} | {manualData.aoNo || '--'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Area:</span>
                      <input type="text" name="aoAreaCode" maxLength={3} value={manualData.aoAreaCode || ''} onChange={handleManualChange} className="form-input-pro" style={{ width: '50px', textAlign: 'center', padding: '4px', textTransform: 'uppercase', fontWeight: '800' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Type:</span>
                      <input type="text" name="aoType" maxLength={2} value={manualData.aoType || ''} onChange={handleManualChange} className="form-input-pro" style={{ width: '45px', textAlign: 'center', padding: '4px', textTransform: 'uppercase', fontWeight: '800' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>Range:</span>
                      <input type="text" name="aoRangeCode" maxLength={3} value={manualData.aoRangeCode || ''} onChange={handleManualChange} className="form-input-pro" style={{ width: '50px', textAlign: 'center', padding: '4px', textTransform: 'uppercase', fontWeight: '800' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>No:</span>
                      <input type="text" name="aoNo" maxLength={3} value={manualData.aoNo || ''} onChange={handleManualChange} className="form-input-pro" style={{ width: '50px', textAlign: 'center', padding: '4px', textTransform: 'uppercase', fontWeight: '800' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Photo, Signature & Proof Document Upload Section */}
              <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#fb923c', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📷</span> <span>{manualData.category === 'INDIVIDUAL' ? 'Photo & Signature Upload Form (Physical PAN Processing)' : 'Authorized Representative Signature & Stamp Upload'}</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: manualData.category === 'INDIVIDUAL' ? '1fr 1fr' : '1fr', gap: '20px', marginBottom: '20px' }}>
                  {manualData.category === 'INDIVIDUAL' && isFieldVisible('photoUrl') && (
                    <DropzoneBox
                      label="Upload Applicant Photo"
                      fieldName="photoUrl"
                      isRequired={isFieldReq('photoUrl')}
                      currentValue={manualData.photoUrl}
                      onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, photoUrl: dataUrl }))}
                      accept="image/*"
                      hint="Drag & drop applicant photo here or click to browse (JPG, PNG)"
                      icon="👤"
                    />
                  )}
                  {isFieldVisible('signatureUrl') && (
                    <DropzoneBox
                      label={manualData.category === 'INDIVIDUAL' ? 'Upload Applicant Signature' : 'Upload Authorized Signatory Signature / Official Stamp'}
                      fieldName="signatureUrl"
                      isRequired={isFieldReq('signatureUrl')}
                      currentValue={manualData.signatureUrl}
                      onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, signatureUrl: dataUrl }))}
                      accept="image/*"
                      hint={manualData.category === 'INDIVIDUAL' ? 'Drag & drop applicant signature here or click to browse (JPG, PNG)' : 'Drag & drop authorized signatory signature / official stamp here (JPG, PNG)'}
                      icon="✍️"
                    />
                  )}
                </div>

                {/* 3rd Uploaded Photo Field (Representative Assessee / Parent / Guardian Photo for Underage Minor) */}
                {(isMinor || manualData.raPhotoUrl || manualData.proofOfOtherUrl) && (
                  <div style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1.5px dashed rgba(2, 132, 199, 0.4)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <div style={{ color: '#38bdf8', fontWeight: '800', fontSize: '13.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>👶</span> <span>3rd Uploaded Photo: Representative Assessee (Parent / Guardian Photo) for Underage Applicant</span>
                      {isMinor && <span style={{ background: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>REQUIRED (UNDERAGE &lt; 18)</span>}
                    </div>
                    <DropzoneBox
                      label="Upload 3rd Photo (Representative Assessee / Parent / Guardian Photo)"
                      fieldName="raPhotoUrl"
                      isRequired={isMinor}
                      currentValue={manualData.raPhotoUrl || manualData.proofOfOtherUrl}
                      onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, raPhotoUrl: dataUrl, proofOfOtherUrl: dataUrl }))}
                      accept="image/*"
                      hint="Drag & drop Parent / Guardian photo (3rd photo). Displayed in PART E of downloaded Form 49A PDF."
                      icon="👨‍👦"
                    />
                  </div>
                )}

                {/* Proof Document Uploads (Identity, Address, Birth & Other Proof) */}
                <h4 style={{ margin: '20px 0 16px 0', fontSize: '15px', color: '#0284c7', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                  <span>📁</span> <span>Document Proof Uploads (Identity, Address, Birth & Other Proof)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <DropzoneBox
                    label="Upload Identity Proof (Identity Proof File)"
                    fieldName="proofOfIdentityUrl"
                    isRequired={false}
                    currentValue={manualData.proofOfIdentityUrl}
                    onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, proofOfIdentityUrl: dataUrl }))}
                    accept="image/*,application/pdf"
                    hint="Drag & drop Identity Proof (Aadhaar, Voter ID, Passport, DL) here (JPG, PNG, PDF)"
                    icon="🪪"
                  />
                  <DropzoneBox
                    label="Upload Address Proof (Address Proof File)"
                    fieldName="proofOfAddressUrl"
                    isRequired={false}
                    currentValue={manualData.proofOfAddressUrl}
                    onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, proofOfAddressUrl: dataUrl }))}
                    accept="image/*,application/pdf"
                    hint="Drag & drop Address Proof (Aadhaar, Voter ID, Utility Bill) here (JPG, PNG, PDF)"
                    icon="🏠"
                  />
                  <DropzoneBox
                    label="Upload Birth Proof (Date of Birth Proof File)"
                    fieldName="proofOfDobUrl"
                    isRequired={false}
                    currentValue={manualData.proofOfDobUrl}
                    onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, proofOfDobUrl: dataUrl }))}
                    accept="image/*,application/pdf"
                    hint="Drag & drop Birth Proof (Birth Certificate, 10th Pass Cert, ABHA Card) here (JPG, PNG, PDF)"
                    icon="🎂"
                  />
                  <DropzoneBox
                    label="Upload Other Proof / Supporting Document"
                    fieldName="proofOfOtherUrl"
                    isRequired={false}
                    currentValue={manualData.proofOfOtherUrl}
                    onFileSelect={(dataUrl) => setManualData(prev => ({ ...prev, proofOfOtherUrl: dataUrl }))}
                    accept="image/*,application/pdf"
                    hint="Drag & drop Any Other Supporting Proof document here (JPG, PNG, PDF)"
                    icon="📄"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <button type="submit" disabled={isSubmitting} className="pancard-submit-btn">
                  {isSubmitting ? 'Submitting...' : `🚀 Submit Application (Fee: ₹${tabs.find(t => t.id === 'manual_new_pan')?.fee ?? 107})`}
                </button>
                <button type="button" onClick={handleDownloadPdf} className="pancard-submit-btn" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                  📥 Download Pre-Filled PDF
                </button>
              </div>

            </form>
          </div>
        ) : (
          /* E-KYC / CORRECTION FORM DISPLAY */
          <form className="pancard-form" onSubmit={handleManualSubmit}>
            <div className="tab-form-section animated-tab-form" key={activeTab}>
              <div className="pancard-form-split-wrapper">

                <div className="pancard-form-main-col">
                  <div className="pancard-form-hero-card">
                    <div className="hero-card-header">
                      <h4 className="hero-form-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <span>{currentTabObj?.icon || '💳'} {currentTabObj?.label || 'PAN Application'} Form</span>
                        <span className="hero-fee-pill" style={{ marginLeft: '4px' }}>Fee: ₹{currentTabObj?.fee ?? 107}</span>
                      </h4>
                      <p className="hero-form-desc">{currentTabObj?.description}</p>
                    </div>
                  </div>

                  <div className="pancard-form-grid">
                    <div className="form-group-pro">
                      <label className="form-label-pro">Applicant Full Name (As per Aadhaar) <span className="req-star">*</span></label>
                      <input type="text" name="applicantName" value={formData.applicantName} onChange={handleChange} placeholder="Enter full name of applicant..." className="form-input-pro" required />
                    </div>
                    <div className="form-group-pro">
                      <label className="form-label-pro">Father's Full Name <span className="req-star">*</span></label>
                      <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Enter father's full name..." className="form-input-pro" required />
                    </div>
                    <div className="form-group-pro">
                      <label className="form-label-pro">Date of Birth (DOB) <span className="req-star">*</span></label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="form-input-pro" required />
                    </div>
                    <div className="form-group-pro">
                      <label className="form-label-pro">Gender <span className="req-star">*</span></label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="form-select-pro">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Transgender">Transgender</option>
                      </select>
                    </div>
                    <div className="form-group-pro">
                      <label className="form-label-pro">Mobile Number <span className="req-star">*</span></label>
                      <input type="tel" name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} placeholder="10-digit mobile number..." maxLength={10} className="form-input-pro" required />
                    </div>
                    <div className="form-group-pro">
                      <label className="form-label-pro">Email Address <span className="req-star">*</span></label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email address..." className="form-input-pro" required />
                    </div>
                    <div className="form-group-pro full-width-field">
                      <label className="form-label-pro">12-Digit Aadhaar Number <span className="req-star">*</span></label>
                      <input type="text" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} placeholder="12-digit Aadhaar number..." maxLength={12} className="form-input-pro" required />
                    </div>
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button type="submit" disabled={isSubmitting} className="pancard-submit-btn">
                      {isSubmitting ? 'Submitting...' : `🚀 Submit Application (Fee: ₹${currentTabObj?.fee ?? 107})`}
                    </button>
                  </div>

                </div>

                {/* Right Summary Sidebar */}
                <div className="pancard-summary-sidebar">
                  <div className="summary-card-pro">
                    <div className="summary-card-header">
                      <h5 className="summary-title">Application Review</h5>
                      <span className="live-pulse-badge">Live Preview</span>
                    </div>

                    <div className="summary-details-list">
                      <div className="summary-detail-item">
                        <span className="detail-label">Service Type:</span>
                        <span className="detail-val highlight-orange">{getApplicationTypeLabel()}</span>
                      </div>
                      <div className="summary-detail-item">
                        <span className="detail-label">Applicant Name:</span>
                        <span className="detail-val">{formData.applicantName || '—'}</span>
                      </div>
                      <div className="summary-detail-item">
                        <span className="detail-label">Mobile Number:</span>
                        <span className="detail-val">{formData.mobileNumber || '—'}</span>
                      </div>
                      <div className="summary-detail-item">
                        <span className="detail-label">Aadhaar Number:</span>
                        <span className="detail-val">{formData.aadhaarNumber ? `XXXX-XXXX-${formData.aadhaarNumber.slice(-4)}` : '—'}</span>
                      </div>
                      <div className="summary-detail-item divider"></div>
                      <div className="summary-detail-item">
                        <span className="detail-label">Deduction Fee:</span>
                        <span className="detail-val fee-text">₹{currentTabObj?.fee ?? 107}</span>
                      </div>
                      <div className="summary-detail-item">
                        <span className="detail-label">Wallet Balance:</span>
                        <span className="detail-val balance-text">₹{parseFloat(walletBalance).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="trust-guidelines-box">
                      <h6>📌 Retailer Guidelines</h6>
                      <ul>
                        <li>✓ Soft copy sent to applicant's email.</li>
                        <li>✓ Ensure mobile number is active for OTP.</li>
                        <li>✓ Instant balance deduction & transaction ID.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </form>
        )}

        {/* Pre-Filled Form 49A Official PDF Template Container */}
        <Form93PdfTemplate data={manualData} />
        <FormPanCrPdfTemplate data={correctionData} />

        {/* Form 49A Direct Edit Modal — opened from history tab Details button */}
        {selectedAppForEdit && (
          <Form49ADirectEditModal
            selectedPanAppDetails={selectedAppForEdit}
            onClose={() => setSelectedAppForEdit(null)}
            onSaveSuccess={(updatedData) => {
              setSelectedAppForEdit(prev => ({
                ...prev,
                ...updatedData,
                details: { ...(prev?.details || {}), ...updatedData }
              }));
              fetchHistory();
            }}
            handleDownloadPdf={(data) => generateForm49APdf(data.lastName ? data : selectedAppForEdit)}
          />
        )}

      </div>
    </div>
  );
};

export default PanCardView;
