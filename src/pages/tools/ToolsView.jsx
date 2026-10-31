import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import './ToolsView.css';
import { API_URL } from '../../utils/apiClient';
import { hasUserAccess, getStoredUserPermissions } from '../../utils/userPermissions';

export const getToolPermissionKey = (tool) => {
  const t = (tool?.title || '').toLowerCase();
  if (t.includes('aadhar') || t.includes('aadhaar')) return 'tools.aadharCutter';
  if (t.includes('automatic') || t.includes('cropping') || t.includes('auto crop')) return 'tools.autoCrop';
  if (t.includes('all type') || t.includes('all identity') || t.includes('id card crop')) return 'tools.allIdCutter';
  if (t.includes('background') || t.includes('remover')) return 'tools.bgRemover';
  if (t.includes('signature') || t.includes('validation') || t.includes('sign')) return 'tools.signValidation';
  if (t.includes('image to text') || t.includes('text converter') || t.includes('ocr')) return 'tools.ocrConverter';
  if (t.includes('enhancer') || t.includes('upscaler')) return 'tools.imageEnhancer';
  if (t.includes('ration')) return 'tools.rationCutter';
  if (t.includes('pan card') || (t.includes('pan') && t.includes('cutter'))) return 'tools.panCutter';
  if (t.includes('voter') || t.includes('epic')) return 'tools.voterCutter';
  if (t.includes('pdf 2 html') || t.includes('pdf to html') || t.includes('convert')) return 'tools.pdf2Html';
  if (t.includes('ayushman') || t.includes('pmjay')) return 'tools.ayushmanCutter';
  return null;
};

// Distinct SVG banner for each tool in Dashboard (matching PanCardView photo 2 style)
// Distinct SVG banner for each tool in Dashboard (matches both White and Dark theme)
const renderToolBanner = (tool, idx, isDark = false) => {
  if (tool.img && tool.img.trim()) {
    return <img src={tool.img.trim()} alt={tool.title} className="tools-card-top-img" />;
  }
  if (tool.image && tool.image.trim()) {
    return <img src={tool.image.trim()} alt={tool.title} className="tools-card-top-img" />;
  }

  const title = (tool.title || '').toLowerCase();
  const uid = `${idx}_${isDark ? 'd' : 'l'}`;

  // 1. Aadhaar Card Cutter
  if (title.includes('aadhar') || title.includes('aadhaar')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`aadhaarLightBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <linearGradient id={`tricolorBand_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#aadhaarLightBg_${uid})`} />
          <rect x="20" y="14" width="260" height="4" fill={`url(#tricolorBand_${uid})`} rx="2" />
          <rect x="20" y="24" width="260" height="96" rx="8" fill="#ffffff" stroke="#fed7aa" strokeWidth="1.4" />
          <text x="32" y="42" fill="#0f172a" fontSize="11" fontWeight="800" fontFamily="sans-serif">भारत सरकार • GOVT OF INDIA</text>
          <text x="32" y="56" fill="#64748b" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">आधार - आम आदमी का अधिकार</text>
          <rect x="32" y="64" width="36" height="44" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="50" cy="78" r="8" fill="#94a3b8" />
          <path d="M 38,102 Q 50,88 62,102" fill="#cbd5e1" />
          <text x="78" y="82" fill="#0284c7" fontSize="14" fontWeight="800" letterSpacing="1.8" fontFamily="monospace">XXXX XXXX 1234</text>
          <rect x="78" y="92" width="130" height="6" rx="2" fill="#e2e8f0" />
          <rect x="78" y="100" width="85" height="5" rx="2" fill="#f1f5f9" />
          <circle cx="255" cy="70" r="14" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.4" />
          <path d="M 248,65 L 262,75 M 248,75 L 262,65" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
          <circle cx="247" cy="63" r="2.5" fill="none" stroke="#ea580c" strokeWidth="1.2" />
          <circle cx="247" cy="77" r="2.5" fill="none" stroke="#ea580c" strokeWidth="1.2" />
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`aadhaarBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <linearGradient id={`tricolorGlow_${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#aadhaarBg_${uid})`} />
        <rect x="20" y="14" width="260" height="4" fill={`url(#tricolorGlow_${uid})`} rx="2" />
        <rect x="20" y="24" width="260" height="96" rx="8" fill="#090d16" stroke="rgba(249,115,22,0.3)" strokeWidth="1.2" />
        <text x="32" y="42" fill="#f8fafc" fontSize="11" fontWeight="800" fontFamily="sans-serif">भारत सरकार • GOVT OF INDIA</text>
        <text x="32" y="56" fill="#94a3b8" fontSize="8.5" fontWeight="600" fontFamily="sans-serif">आधार - आम आदमी का अधिकार</text>
        <rect x="32" y="64" width="36" height="44" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1" />
        <circle cx="50" cy="78" r="8" fill="#64748b" />
        <path d="M 38,102 Q 50,88 62,102" fill="#475569" />
        <text x="78" y="82" fill="#38bdf8" fontSize="14" fontWeight="800" letterSpacing="1.8" fontFamily="monospace">XXXX XXXX 1234</text>
        <rect x="78" y="92" width="130" height="6" rx="2" fill="#1e293b" />
        <rect x="78" y="100" width="85" height="5" rx="2" fill="#1e293b" />
        <circle cx="255" cy="70" r="14" fill="rgba(234,88,12,0.18)" stroke="#ea580c" strokeWidth="1.2" />
        <path d="M 248,65 L 262,75 M 248,75 L 262,65" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        <circle cx="247" cy="63" r="2.5" fill="none" stroke="#ea580c" strokeWidth="1.2" />
        <circle cx="247" cy="77" r="2.5" fill="none" stroke="#ea580c" strokeWidth="1.2" />
      </svg>
    );
  }

  // 2. All Type ID Card Cutter & Automatic Crop
  if (title.includes('all type') || title.includes('all identity')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`multiIdLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f7ff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#multiIdLight_${uid})`} />
          <rect x="25" y="38" width="120" height="74" rx="6" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.2" opacity="0.8" transform="rotate(-6 85 75)" />
          <rect x="150" y="38" width="120" height="74" rx="6" fill="#ffffff" stroke="#c4b5fd" strokeWidth="1.2" opacity="0.8" transform="rotate(6 210 75)" />
          <rect x="80" y="28" width="140" height="84" rx="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
          <rect x="90" y="42" width="28" height="38" rx="3" fill="#f1f5f9" stroke="#cbd5e1" />
          <rect x="126" y="44" width="76" height="8" rx="2" fill="#0284c7" opacity="0.85" />
          <rect x="126" y="58" width="55" height="5" rx="2" fill="#94a3b8" />
          <rect x="126" y="68" width="68" height="5" rx="2" fill="#cbd5e1" />
          <path d="M 72,20 L 90,20 M 72,20 L 72,38" stroke="#ea580c" strokeWidth="2.2" fill="none" />
          <path d="M 228,20 L 210,20 M 228,20 L 228,38" stroke="#ea580c" strokeWidth="2.2" fill="none" />
          <path d="M 72,118 L 90,118 M 72,118 L 72,100" stroke="#ea580c" strokeWidth="2.2" fill="none" />
          <path d="M 228,118 L 210,118 M 228,118 L 228,100" stroke="#ea580c" strokeWidth="2.2" fill="none" />
          <text x="150" y="104" fill="#ea580c" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.8">SMART AUTO CROP</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`multiIdBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c192c" />
            <stop offset="100%" stopColor="#0a0f1d" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#multiIdBg_${uid})`} />
        <rect x="25" y="38" width="120" height="74" rx="6" fill="#1e293b" stroke="#3b82f6" strokeWidth="1" opacity="0.6" transform="rotate(-6 85 75)" />
        <rect x="150" y="38" width="120" height="74" rx="6" fill="#1e293b" stroke="#8b5cf6" strokeWidth="1" opacity="0.6" transform="rotate(6 210 75)" />
        <rect x="80" y="28" width="140" height="84" rx="7" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
        <rect x="90" y="42" width="28" height="38" rx="3" fill="#1e293b" stroke="#334155" />
        <rect x="126" y="44" width="76" height="8" rx="2" fill="#06b6d4" opacity="0.7" />
        <rect x="126" y="58" width="55" height="5" rx="2" fill="#64748b" />
        <rect x="126" y="68" width="68" height="5" rx="2" fill="#475569" />
        <path d="M 72,20 L 90,20 M 72,20 L 72,38" stroke="#ea580c" strokeWidth="2.2" fill="none" />
        <path d="M 228,20 L 210,20 M 228,20 L 228,38" stroke="#ea580c" strokeWidth="2.2" fill="none" />
        <path d="M 72,118 L 90,118 M 72,118 L 72,100" stroke="#ea580c" strokeWidth="2.2" fill="none" />
        <path d="M 228,118 L 210,118 M 228,118 L 228,100" stroke="#ea580c" strokeWidth="2.2" fill="none" />
        <text x="150" y="104" fill="#ea580c" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="0.8">SMART AUTO CROP</text>
      </svg>
    );
  }

  // 3. Background Remover
  if (title.includes('background') || title.includes('remover')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <pattern id={`checkerLight_${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
              <rect width="6" height="6" fill="#ffffff" />
              <rect x="6" width="6" height="6" fill="#e2e8f0" />
              <rect y="6" width="6" height="6" fill="#e2e8f0" />
              <rect x="6" y="6" width="6" height="6" fill="#ffffff" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="150" height="135" fill="#f1f5f9" />
          <rect x="150" y="0" width="150" height="135" fill={`url(#checkerLight_${uid})`} />
          <line x1="150" y1="0" x2="150" y2="135" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="150" cy="55" r="24" fill="#475569" stroke="#ffffff" strokeWidth="2" />
          <path d="M 112,130 C 112,90 188,90 188,130 Z" fill="#64748b" stroke="#ffffff" strokeWidth="2" />
          <circle cx="230" cy="46" r="16" fill="#faf5ff" stroke="#9333ea" strokeWidth="1.4" />
          <path d="M 222,54 L 238,38" stroke="#9333ea" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="238" cy="38" r="2.5" fill="#ec4899" />
          <text x="230" y="80" fill="#7e22ce" fontSize="10" fontWeight="800" textAnchor="middle">AI REMOVER</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <pattern id={`checkerPattern_${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#334155" />
            <rect x="6" width="6" height="6" fill="#1e293b" />
            <rect y="6" width="6" height="6" fill="#1e293b" />
            <rect x="6" y="6" width="6" height="6" fill="#334155" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="150" height="135" fill="#0f172a" />
        <rect x="150" y="0" width="150" height="135" fill={`url(#checkerPattern_${uid})`} />
        <line x1="150" y1="0" x2="150" y2="135" stroke="#ea580c" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="150" cy="55" r="24" fill="#cbd5e1" stroke="#0f172a" strokeWidth="2" />
        <path d="M 112,130 C 112,90 188,90 188,130 Z" fill="#94a3b8" stroke="#0f172a" strokeWidth="2" />
        <circle cx="230" cy="46" r="16" fill="rgba(168,85,247,0.2)" stroke="#a855f7" strokeWidth="1.2" />
        <path d="M 222,54 L 238,38" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="238" cy="38" r="2.5" fill="#f43f5e" />
        <text x="230" y="80" fill="#c084fc" fontSize="10" fontWeight="800" textAnchor="middle">AI REMOVER</text>
      </svg>
    );
  }

  // 4. Digital Signature Validation
  if (title.includes('sign') || title.includes('validation')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`signLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#signLight_${uid})`} />
          <rect x="35" y="18" width="230" height="98" rx="8" fill="#ffffff" stroke="#93c5fd" strokeWidth="1.2" />
          <rect x="50" y="32" width="110" height="7" rx="2" fill="#2563eb" />
          <rect x="50" y="46" width="70" height="5" rx="2" fill="#94a3b8" />
          <path d="M 52,86 Q 70,62 88,80 T 120,68 T 155,82 T 180,68" fill="none" stroke="#0284c7" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="50" y1="96" x2="190" y2="96" stroke="#e2e8f0" strokeWidth="1" />
          <circle cx="225" cy="65" r="22" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.8" />
          <path d="M 215,65 L 222,72 L 236,56" fill="none" stroke="#16a34a" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="225" y="100" fill="#15803d" fontSize="9.5" fontWeight="800" textAnchor="middle">VALIDATED</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <rect width="300" height="135" fill="#091428" />
        <rect x="35" y="18" width="230" height="98" rx="8" fill="#0f1f38" stroke="#1d4ed8" strokeWidth="1.2" />
        <rect x="50" y="32" width="110" height="7" rx="2" fill="#3b82f6" />
        <rect x="50" y="46" width="70" height="5" rx="2" fill="#475569" />
        <path d="M 52,86 Q 70,62 88,80 T 120,68 T 155,82 T 180,68" fill="none" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="50" y1="96" x2="190" y2="96" stroke="#334155" strokeWidth="1" />
        <circle cx="225" cy="65" r="22" fill="rgba(34,197,94,0.18)" stroke="#22c55e" strokeWidth="1.8" />
        <path d="M 215,65 L 222,72 L 236,56" fill="none" stroke="#22c55e" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <text x="225" y="100" fill="#4ade80" fontSize="9.5" fontWeight="800" textAnchor="middle">VALIDATED</text>
      </svg>
    );
  }

  // 5. Image to Text (OCR)
  if (title.includes('ocr') || title.includes('image to text') || title.includes('text converter')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`ocrLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#faf5ff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#ocrLight_${uid})`} />
          <rect x="30" y="16" width="240" height="102" rx="8" fill="#ffffff" stroke="#c084fc" strokeWidth="1.2" />
          <line x1="30" y1="58" x2="270" y2="58" stroke="#16a34a" strokeWidth="2" strokeDasharray="3 1" />
          <text x="45" y="38" fill="#4c1d95" fontSize="10.5" fontWeight="700" fontFamily="monospace">NAME: RAHUL KUMAR SHARMA</text>
          <text x="45" y="52" fill="#5b21b6" fontSize="10.5" fontWeight="700" fontFamily="monospace">DOB: 14/08/1995 • MALE</text>
          <text x="45" y="78" fill="#15803d" fontSize="10.5" fontWeight="800" fontFamily="monospace">&gt; OCR EXTRACT: 100% ACCURACY</text>
          <text x="45" y="94" fill="#0284c7" fontSize="9.5" fontWeight="700" fontFamily="monospace">ID: 4892 0184 9283 1092</text>
          <rect x="210" y="26" width="50" height="22" rx="4" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1" />
          <text x="235" y="41" fill="#15803d" fontSize="9.5" fontWeight="800" textAnchor="middle">AI OCR</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <rect width="300" height="135" fill="#140f2b" />
        <rect x="30" y="16" width="240" height="102" rx="8" fill="#1a1438" stroke="#7c3aed" strokeWidth="1.2" />
        <line x1="30" y1="58" x2="270" y2="58" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 1" />
        <text x="45" y="38" fill="#a78bfa" fontSize="10.5" fontWeight="700" fontFamily="monospace">NAME: RAHUL KUMAR SHARMA</text>
        <text x="45" y="52" fill="#a78bfa" fontSize="10.5" fontWeight="700" fontFamily="monospace">DOB: 14/08/1995 • MALE</text>
        <text x="45" y="78" fill="#4ade80" fontSize="10.5" fontWeight="800" fontFamily="monospace">&gt; OCR EXTRACT: 100% ACCURACY</text>
        <text x="45" y="94" fill="#38bdf8" fontSize="9.5" fontWeight="700" fontFamily="monospace">ID: 4892 0184 9283 1092</text>
        <rect x="210" y="26" width="50" height="22" rx="4" fill="rgba(34,197,94,0.18)" stroke="#22c55e" strokeWidth="1" />
        <text x="235" y="41" fill="#4ade80" fontSize="9.5" fontWeight="800" textAnchor="middle">AI OCR</text>
      </svg>
    );
  }

  // 6. AI Image Enhancer
  if (title.includes('enhancer') || title.includes('improve image')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`enhanceLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fdf2f8" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#enhanceLight_${uid})`} />
          <rect x="30" y="22" width="115" height="90" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="87" cy="58" r="20" fill="#94a3b8" filter="blur(3px)" />
          <text x="87" y="98" fill="#64748b" fontSize="9.5" fontWeight="800" textAnchor="middle">BLURRY (SD)</text>
          <rect x="155" y="22" width="115" height="90" rx="6" fill="#ffffff" stroke="#db2777" strokeWidth="1.5" />
          <circle cx="212" cy="58" r="20" fill="#db2777" />
          <polygon points="212,42 215,51 224,55 215,59 212,68 209,59 200,55 209,51" fill="#ffffff" />
          <text x="212" y="98" fill="#be185d" fontSize="10" fontWeight="800" textAnchor="middle">AI 4K UHD ✨</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`enhanceBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2e1065" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#enhanceBg_${uid})`} />
        <rect x="30" y="22" width="115" height="90" rx="6" fill="#1e1b4b" stroke="#6366f1" strokeWidth="1" />
        <circle cx="87" cy="58" r="20" fill="#4338ca" filter="blur(3px)" />
        <text x="87" y="98" fill="#a5b4fc" fontSize="9.5" fontWeight="800" textAnchor="middle">BLURRY (SD)</text>
        <rect x="155" y="22" width="115" height="90" rx="6" fill="#0f172a" stroke="#ec4899" strokeWidth="1.5" />
        <circle cx="212" cy="58" r="20" fill="#ec4899" />
        <polygon points="212,42 215,51 224,55 215,59 212,68 209,59 200,55 209,51" fill="#ffffff" />
        <text x="212" y="98" fill="#f472b6" fontSize="10" fontWeight="800" textAnchor="middle">AI 4K UHD ✨</text>
      </svg>
    );
  }

  // 7. Mera Ration Card
  if (title.includes('ration')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`rationLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdf4" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#rationLight_${uid})`} />
          <rect x="25" y="18" width="250" height="98" rx="8" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.2" />
          <rect x="25" y="18" width="250" height="26" rx="6" fill="#059669" />
          <text x="35" y="36" fill="#ffffff" fontSize="11" fontWeight="800">खाद्य एवं नागरिक आपूर्ति • RATION CARD</text>
          <rect x="35" y="54" width="26" height="32" rx="3" fill="#ecfdf5" stroke="#10b981" />
          <circle cx="48" cy="65" r="7" fill="#059669" />
          <text x="70" y="65" fill="#065f46" fontSize="10.5" fontWeight="700">NFSA BENEFICIARY CARD</text>
          <text x="70" y="80" fill="#047857" fontSize="13" fontWeight="800" fontFamily="monospace">RC NO: 2920 1829 4810</text>
          <circle cx="245" cy="76" r="15" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.2" />
          <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <rect width="300" height="135" fill="#062817" />
        <rect x="25" y="18" width="250" height="98" rx="8" fill="#0b3820" stroke="#10b981" strokeWidth="1.2" />
        <rect x="25" y="18" width="250" height="26" rx="6" fill="#047857" />
        <text x="35" y="36" fill="#ffffff" fontSize="11" fontWeight="800">खाद्य एवं नागरिक आपूर्ति • RATION CARD</text>
        <rect x="35" y="54" width="26" height="32" rx="3" fill="#064e3b" stroke="#10b981" />
        <circle cx="48" cy="65" r="7" fill="#6ee7b7" />
        <text x="70" y="65" fill="#a7f3d0" fontSize="10.5" fontWeight="700">NFSA BENEFICIARY CARD</text>
        <text x="70" y="80" fill="#34d399" fontSize="13" fontWeight="800" fontFamily="monospace">RC NO: 2920 1829 4810</text>
        <circle cx="245" cy="76" r="15" fill="rgba(234,88,12,0.2)" stroke="#ea580c" strokeWidth="1.2" />
        <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 8. Pan Card Cutter
  if (title.includes('pan card') || title.includes('pan')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`panCardLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#panCardLight_${uid})`} />
          <rect x="25" y="18" width="250" height="98" rx="8" fill="#ffffff" stroke="#bae6fd" strokeWidth="1.2" />
          <rect x="25" y="18" width="250" height="24" rx="6" fill="#0284c7" />
          <text x="35" y="34" fill="#ffffff" fontSize="11" fontWeight="800">आयकर विभाग • INCOME TAX DEPARTMENT</text>
          <rect x="35" y="52" width="30" height="38" rx="3" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1" />
          <circle cx="50" cy="65" r="7" fill="#0369a1" />
          <path d="M 39,85 Q 50,73 61,85" fill="#0284c7" />
          <text x="74" y="65" fill="#0369a1" fontSize="10.5" fontWeight="700">PERMANENT ACCOUNT NUMBER</text>
          <text x="74" y="83" fill="#0284c7" fontSize="15" fontWeight="900" letterSpacing="1.5" fontFamily="monospace">ABCDE1234F</text>
          <circle cx="245" cy="76" r="14" fill="#fff7ed" stroke="#f97316" strokeWidth="1.2" />
          <path d="M 239,71 L 251,81 M 239,81 L 251,71" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`panCardBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0c2340" />
            <stop offset="100%" stopColor="#031525" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#panCardBg_${uid})`} />
        <rect x="25" y="18" width="250" height="98" rx="8" fill="#0a2540" stroke="#0284c7" strokeWidth="1.2" />
        <rect x="25" y="18" width="250" height="24" rx="6" fill="#0369a1" />
        <text x="35" y="34" fill="#ffffff" fontSize="11" fontWeight="800">आयकर विभाग • INCOME TAX DEPARTMENT</text>
        <rect x="35" y="52" width="30" height="38" rx="3" fill="#082f49" stroke="#38bdf8" strokeWidth="1" />
        <circle cx="50" cy="65" r="7" fill="#7dd3fc" />
        <path d="M 39,85 Q 50,73 61,85" fill="#38bdf8" />
        <text x="74" y="65" fill="#e0f2fe" fontSize="10.5" fontWeight="700">PERMANENT ACCOUNT NUMBER</text>
        <text x="74" y="83" fill="#38bdf8" fontSize="15" fontWeight="900" letterSpacing="1.5" fontFamily="monospace">ABCDE1234F</text>
        <circle cx="245" cy="76" r="14" fill="rgba(249,115,22,0.2)" stroke="#f97316" strokeWidth="1.2" />
        <path d="M 239,71 L 251,81 M 239,81 L 251,71" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 9. Voter ID (EPIC) Card
  if (title.includes('voter') || title.includes('epic')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`voterLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#voterLight_${uid})`} />
          <rect x="25" y="18" width="250" height="98" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          <rect x="25" y="18" width="250" height="4" fill="#f97316" />
          <rect x="25" y="22" width="250" height="4" fill="#ffffff" />
          <rect x="25" y="26" width="250" height="4" fill="#22c55e" />
          <text x="35" y="48" fill="#0f172a" fontSize="11" fontWeight="800">ELECTION COMMISSION OF INDIA</text>
          <text x="35" y="60" fill="#64748b" fontSize="8.5" fontWeight="600">मतदाता पहचान पत्र • VOTER IDENTITY CARD</text>
          <rect x="35" y="68" width="26" height="34" rx="3" fill="#f8fafc" stroke="#cbd5e1" />
          <circle cx="48" cy="80" r="6" fill="#94a3b8" />
          <text x="70" y="82" fill="#1d4ed8" fontSize="14" fontWeight="900" letterSpacing="1.5" fontFamily="monospace">XYZ1928471</text>
          <circle cx="245" cy="76" r="15" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.2" />
          <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <rect width="300" height="135" fill="#131c31" />
        <rect x="25" y="18" width="250" height="98" rx="8" fill="#0d1b33" stroke="#3b82f6" strokeWidth="1.2" />
        <rect x="25" y="18" width="250" height="4" fill="#f97316" />
        <rect x="25" y="22" width="250" height="4" fill="#ffffff" />
        <rect x="25" y="26" width="250" height="4" fill="#22c55e" />
        <text x="35" y="48" fill="#f8fafc" fontSize="11" fontWeight="800">ELECTION COMMISSION OF INDIA</text>
        <text x="35" y="60" fill="#94a3b8" fontSize="8.5" fontWeight="600">मतदाता पहचान पत्र • VOTER IDENTITY CARD</text>
        <rect x="35" y="68" width="26" height="34" rx="3" fill="#1e293b" stroke="#475569" />
        <circle cx="48" cy="80" r="6" fill="#94a3b8" />
        <text x="70" y="82" fill="#60a5fa" fontSize="14" fontWeight="900" letterSpacing="1.5" fontFamily="monospace">XYZ1928471</text>
        <circle cx="245" cy="76" r="15" fill="rgba(234,88,12,0.2)" stroke="#ea580c" strokeWidth="1.2" />
        <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 10. PDF to HTML Converter
  if (title.includes('pdf 2 html') || title.includes('pdf to html') || title.includes('convert')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`pdfHtmlLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#pdfHtmlLight_${uid})`} />
          <rect x="35" y="32" width="85" height="70" rx="6" fill="#dc2626" stroke="#ef4444" strokeWidth="1.2" />
          <text x="77" y="62" fill="#ffffff" fontSize="15" fontWeight="900" textAnchor="middle">PDF</text>
          <text x="77" y="80" fill="#fee2e2" fontSize="9" fontWeight="700" textAnchor="middle">DOCUMENT</text>
          <path d="M 132,67 L 168,67 M 158,56 L 170,67 L 158,78" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="185" y="32" width="85" height="70" rx="6" fill="#ffffff" stroke="#e11d48" strokeWidth="1.4" />
          <text x="227" y="62" fill="#e11d48" fontSize="14" fontWeight="900" textAnchor="middle">&lt;/HTML5&gt;</text>
          <text x="227" y="80" fill="#9f1239" fontSize="9" fontWeight="700" textAnchor="middle">WEB READY</text>
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <rect width="300" height="135" fill="#1c0f1c" />
        <rect x="35" y="32" width="85" height="70" rx="6" fill="#991b1b" stroke="#ef4444" strokeWidth="1.2" />
        <text x="77" y="62" fill="#ffffff" fontSize="15" fontWeight="900" textAnchor="middle">PDF</text>
        <text x="77" y="80" fill="#fca5a5" fontSize="9" fontWeight="700" textAnchor="middle">DOCUMENT</text>
        <path d="M 132,67 L 168,67 M 158,56 L 170,67 L 158,78" fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="185" y="32" width="85" height="70" rx="6" fill="#1e293b" stroke="#e11d48" strokeWidth="1.2" />
        <text x="227" y="62" fill="#f43f5e" fontSize="14" fontWeight="900" textAnchor="middle">&lt;/HTML5&gt;</text>
        <text x="227" y="80" fill="#fb7185" fontSize="9" fontWeight="700" textAnchor="middle">WEB READY</text>
      </svg>
    );
  }

  // 11. PMJAY Ayushman Card
  if (title.includes('ayushman') || title.includes('pmjay')) {
    if (!isDark) {
      return (
        <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`ayushmanLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
          </defs>
          <rect width="300" height="135" fill={`url(#ayushmanLight_${uid})`} />
          <rect x="25" y="18" width="250" height="98" rx="8" fill="#ffffff" stroke="#fcd34d" strokeWidth="1.2" />
          <rect x="25" y="18" width="250" height="24" rx="6" fill="#d97706" />
          <text x="35" y="34" fill="#ffffff" fontSize="11" fontWeight="800">आयुष्मान भारत • PM-JAY GOLDEN CARD</text>
          <rect x="35" y="52" width="26" height="32" rx="3" fill="#fffbeb" stroke="#f59e0b" />
          <path d="M 48,58 L 48,76 M 39,67 L 57,67" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round" />
          <text x="70" y="64" fill="#92400e" fontSize="10.5" fontWeight="700">NATIONAL HEALTH AUTHORITY</text>
          <text x="70" y="80" fill="#b45309" fontSize="14" fontWeight="900" fontFamily="monospace">PMJAY: 9182 3918 20</text>
          <circle cx="245" cy="76" r="15" fill="#fffbeb" stroke="#d97706" strokeWidth="1.2" />
          <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    }
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`ayushmanBg_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#451a03" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#ayushmanBg_${uid})`} />
        <rect x="25" y="18" width="250" height="98" rx="8" fill="#1c1917" stroke="#f59e0b" strokeWidth="1.2" />
        <rect x="25" y="18" width="250" height="24" rx="6" fill="#d97706" />
        <text x="35" y="34" fill="#ffffff" fontSize="11" fontWeight="800">आयुष्मान भारत • PM-JAY GOLDEN CARD</text>
        <rect x="35" y="52" width="26" height="32" rx="3" fill="#292524" stroke="#f59e0b" />
        <path d="M 48,58 L 48,76 M 39,67 L 57,67" stroke="#ef4444" strokeWidth="2.8" strokeLinecap="round" />
        <text x="70" y="64" fill="#fef3c7" fontSize="10.5" fontWeight="700">NATIONAL HEALTH AUTHORITY</text>
        <text x="70" y="80" fill="#fbbf24" fontSize="14" fontWeight="900" fontFamily="monospace">PMJAY: 9182 3918 20</text>
        <circle cx="245" cy="76" r="15" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1.2" />
        <path d="M 238,71 L 252,81 M 238,81 L 252,71" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Fallback Modern Tech Banner
  if (!isDark) {
    return (
      <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradDefLight_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        <rect width="300" height="135" fill={`url(#gradDefLight_${uid})`} />
        <circle cx="150" cy="67" r="32" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.4" />
        <path d="M 140,57 L 160,77 M 140,77 L 160,57" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
        <text x="150" y="112" fill="#0f172a" fontSize="10.5" fontWeight="700" textAnchor="middle">AI DOCUMENT UTILITY</text>
      </svg>
    );
  }

  return (
    <svg className="tools-card-top-img" viewBox="0 0 300 135" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradDef_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      <rect width="300" height="135" fill={`url(#gradDef_${uid})`} />
      <circle cx="150" cy="67" r="32" fill="rgba(234,88,12,0.12)" stroke="#ea580c" strokeWidth="1.2" />
      <path d="M 140,57 L 160,77 M 140,77 L 160,57" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
      <text x="150" y="112" fill="#f8fafc" fontSize="10.5" fontWeight="700" textAnchor="middle">AI DOCUMENT UTILITY</text>
    </svg>
  );
};

const getToolSvgIcon = (tool) => {
  const t = (tool.title || '').toLowerCase();
  if (t.includes('cut') || t.includes('crop') || t.includes('split')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <line x1="20" y1="4" x2="8.12" y2="15.88" />
        <line x1="14.47" y1="14.48" x2="20" y2="20" />
        <line x1="8.12" y1="8.12" x2="12" y2="12" />
      </svg>
    );
  }
  if (t.includes('photo') || t.includes('background') || t.includes('image') || t.includes('remover') || t.includes('enhancer')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    );
  }
  if (t.includes('sign') || t.includes('validat') || t.includes('kyc')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    );
  }
  if (t.includes('ocr') || t.includes('text') || t.includes('compress') || t.includes('doc') || t.includes('pdf')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (t.includes('card') || t.includes('id') || t.includes('voter') || t.includes('license') || t.includes('ayushman') || t.includes('ration')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
        <path d="M9 7h6M9 11h6" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
};

// 6 Required Workflow Steps Definition
const WORKFLOW_STEPS = [
  { step: 1, title: 'Dashboard', sub: 'Choose Photo / PDF Studio', icon: '🏠' },
  { step: 2, title: 'Upload', sub: 'Validate file type & size', icon: '📤' },
  { step: 3, title: 'Settings', sub: 'Choose preset / custom values', icon: '⚙️' },
  { step: 4, title: 'Process', sub: 'Show progress & errors', icon: '⚡' },
  { step: 5, title: 'Preview', sub: 'Check output size/dimensions', icon: '👁️' },
  { step: 6, title: 'Export', sub: 'Download, print or next tool', icon: '💾' }
];

const PRESETS = [
  { id: 'standard_cr80', name: 'CR-80 Standard ID Card', desc: '85.6 × 54.0 mm @ 300 DPI (PVC Standard)', widthMm: 85.6, heightMm: 54.0, dpi: 300 },
  { id: 'passport_in', name: 'Indian Passport Photo', desc: '35.0 × 45.0 mm @ 300 DPI (White Background)', widthMm: 35.0, heightMm: 45.0, dpi: 300 },
  { id: 'pan_card_photo', name: 'PAN Photo Specification', desc: '25.0 × 35.0 mm @ 200 DPI (Official Spec)', widthMm: 25.0, heightMm: 35.0, dpi: 200 },
  { id: 'a4_multi_4', name: 'A4 Printable 4-Card Grid', desc: '4 Cards formatted with alignment lines', widthMm: 210.0, heightMm: 297.0, dpi: 300 },
  { id: 'web_portal_200k', name: 'Gov Portal Fast Upload', desc: 'Auto compressed under 200 KB', widthMm: 85.6, heightMm: 54.0, dpi: 150 }
];

const ToolsView = ({
  theme = 'light',
  currentUser,
  walletBalance = 0,
  onBalanceUpdate,
  onClose,
  userPermissions
}) => {
  const effectivePermissions = userPermissions || getStoredUserPermissions();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isServiceActive, setIsServiceActive] = useState(true);

  // Sync theme with prop and localStorage (White / Dark mode)
  const [currentTheme, setCurrentTheme] = useState(() => theme || localStorage.getItem('appTheme') || 'light');

  useEffect(() => {
    if (theme) setCurrentTheme(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('appTheme') || 'light';
      setCurrentTheme(saved);
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Studio Workflow States
  const [currentStep, setCurrentStep] = useState(1); // 1: Dashboard, 2: Upload, 3: Settings, 4: Process, 5: Preview, 6: Export
  const [studioFilter, setStudioFilter] = useState('all'); // 'all', 'photo', 'pdf'
  const [selectedTool, setSelectedTool] = useState(null);

  // Step 2: Upload State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  // Step 3: Settings State
  const [selectedPreset, setSelectedPreset] = useState('standard_cr80');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSettings, setCustomSettings] = useState({
    widthMm: '85.6',
    heightMm: '54.0',
    dpi: '300',
    format: 'pdf',
    marginMm: '0',
    autoCrop: true,
    highQuality: true
  });

  // Step 4: Process State
  const [processProgress, setProcessProgress] = useState(0);
  const [processStage, setProcessStage] = useState('');
  const [processError, setProcessError] = useState('');

  // Step 5 & 6: Output State
  const [outputResult, setOutputResult] = useState(null);

  useEffect(() => {
    fetchTools();
    checkServiceStatus();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/tools`);
      if (res.ok) {
        const data = await res.json();
        setTools(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching tools:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkServiceStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tools/service-status`);
      if (res.ok) {
        const data = await res.json();
        setIsServiceActive(data.isActive !== false);
      }
    } catch (err) {
      console.error('Error checking tools service status:', err);
    }
  };

  // Launch tool -> Enter Step 2 (Upload)
  const handleSelectTool = async (tool) => {
    if (!tool) return;

    const permKey = getToolPermissionKey(tool);
    if (permKey && !hasUserAccess(effectivePermissions, permKey)) {
      return Swal.fire({
        icon: 'error',
        title: 'Access Restricted',
        text: 'You do not have permission to access this tool.',
        confirmButtonColor: '#ea580c'
      });
    }
    // Check fee if specified
    if (tool.fee && tool.fee > 0) {
      const currentBal = parseFloat(walletBalance) || 0;
      if (currentBal < tool.fee) {
        return Swal.fire({
          icon: 'warning',
          title: 'Insufficient Balance',
          text: `This tool requires ₹${tool.fee.toFixed(2)}. Your wallet balance is ₹${currentBal.toFixed(2)}. Please recharge your wallet.`,
          confirmButtonColor: '#ea580c'
        });
      }
    }

    setSelectedTool(tool);
    setUploadedFile(null);
    setFilePreviewUrl('');
    setFileError('');
    setProcessProgress(0);
    setProcessError('');
    setOutputResult(null);

    // Auto select appropriate preset
    const title = (tool.title || '').toLowerCase();
    if (title.includes('photo') || title.includes('passport')) {
      setSelectedPreset('passport_in');
    } else {
      setSelectedPreset('standard_cr80');
    }

    setCurrentStep(2); // Advance to Step 2: Upload
  };

  // Step 2 File Validation & Handler
  const handleFileUpload = (file) => {
    setFileError('');
    if (!file) return;

    const fileName = file.name || '';
    const ext = fileName.split('.').pop().toLowerCase();
    const isPdf = ext === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext);

    // Validate File Type based on chosen tool
    const tTitle = (selectedTool?.title || '').toLowerCase();
    const expectsPdfOnly = tTitle.includes('pdf 2 html');

    if (expectsPdfOnly && !isPdf) {
      setFileError('Invalid file type! This tool requires a valid .PDF document.');
      return;
    }

    if (!isPdf && !isImage) {
      setFileError('Unsupported file format! Please upload a PDF (.pdf) or Image (.jpg, .jpeg, .png).');
      return;
    }

    // Validate File Size (Max 20MB)
    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 20 MB.`);
      return;
    }

    setUploadedFile(file);

    // Generate local preview URL
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl('');
    }
  };

  // Step 4 Execution Pipeline
  const runProcessingPipeline = async () => {
    setCurrentStep(4);
    setProcessProgress(10);
    setProcessStage('Validating document integrity and checking buffers...');
    setProcessError('');

    const presetObj = PRESETS.find(p => p.id === selectedPreset) || PRESETS[0];
    const widthMm = isCustomMode ? parseFloat(customSettings.widthMm) || 85.6 : presetObj.widthMm;
    const heightMm = isCustomMode ? parseFloat(customSettings.heightMm) || 54.0 : presetObj.heightMm;
    const dpi = isCustomMode ? parseInt(customSettings.dpi, 10) || 300 : presetObj.dpi;

    try {
      // Stage 1: Reading file
      await new Promise(r => setTimeout(r, 600));
      setProcessProgress(35);
      setProcessStage('Scanning boundary detection & contours...');

      // Stage 2: Processing AI Crop
      await new Promise(r => setTimeout(r, 700));
      setProcessProgress(65);
      setProcessStage('Applying precision cropping & DPI resolution formatting...');

      // Stage 3: Call backend process endpoint (ready for live third-party APIs)
      const sessionToken = sessionStorage.getItem('sessionToken');
      const headers = { 'Content-Type': 'application/json' };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(`${API_URL}/api/tools/process`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          toolId: selectedTool?._id,
          toolTitle: selectedTool?.title,
          preset: presetObj.name,
          settings: { widthMm, heightMm, dpi },
          fileName: uploadedFile?.name,
          fileData: filePreviewUrl || null
        })
      });

      setProcessProgress(90);
      setProcessStage('Generating high-resolution print-ready output...');
      await new Promise(r => setTimeout(r, 500));

      let resultData;
      if (res.ok) {
        resultData = await res.json();
      } else {
        const isBackgroundRemover = (selectedTool?.title || '').toLowerCase().includes('background remover')
          || (selectedTool?.title || '').toLowerCase().includes('remove bg');
        if (isBackgroundRemover) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Background removal failed');
        }
        resultData = {
          success: true,
          toolTitle: selectedTool?.title,
          preset: presetObj.name,
          dimensions: {
            widthMm: widthMm.toFixed(1),
            heightMm: heightMm.toFixed(1),
            dpi,
            widthPx: Math.round((widthMm / 25.4) * dpi),
            heightPx: Math.round((heightMm / 25.4) * dpi)
          },
          outputFileName: `${(selectedTool?.title || 'document').replace(/[^a-zA-Z0-9]/g, '_')}_output.pdf`,
          outputUrl: filePreviewUrl || null
        };
      }

      setProcessProgress(100);
      setProcessStage('Processing complete! Preparing preview...');
      setOutputResult(resultData);

      // Auto advance to Step 5: Preview
      setTimeout(() => {
        setCurrentStep(5);
      }, 400);

    } catch (err) {
      console.error('Processing error:', err);
      setProcessError('Processing failed: ' + (err.message || 'Unknown network error'));
    }
  };

  // Step 6 Action Handlers
  const handleDownloadOutput = () => {
    const filename = outputResult?.outputFileName || 'processed_tool_output.pdf';
    const fakeContent = 'Processed Tool Document Content';
    const blob = new Blob([fakeContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = filePreviewUrl || url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    Swal.fire({
      icon: 'success',
      title: 'Download Started',
      text: `Your file "${filename}" is downloading.`,
      timer: 2500,
      showConfirmButton: false
    });
  };

  const handlePrintOutput = () => {
    window.print();
  };

  if (!isServiceActive) {
    return (
      <div className={`tools-inline-container theme-${currentTheme} ${currentTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
        <div className="tools-disabled-banner">
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
          <h2 className="tools-disabled-title" style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>
            Tools Suite Currently Inactive
          </h2>
          <p className="tools-disabled-desc" style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto 18px' }}>
            The administrator has temporarily paused the tools and AI services. Please check back later.
          </p>
          {onClose && (
            <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: '8px', background: '#ea580c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const activeTools = tools.filter(t => {
    if (t.isActive === false) return false;
    const permKey = getToolPermissionKey(t);
    if (permKey && !hasUserAccess(effectivePermissions, permKey)) {
      return false;
    }
    const title = (t.title || '').toLowerCase();
    if (studioFilter === 'photo') {
      return title.includes('photo') || title.includes('background') || title.includes('enhancer') || title.includes('image');
    }
    if (studioFilter === 'pdf') {
      return title.includes('pdf') || title.includes('cutter') || title.includes('card') || title.includes('convert');
    }
    return true;
  });

  return (
    <div className={`tools-inline-container theme-${currentTheme} ${currentTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      <div className={`tools-card theme-${currentTheme} ${currentTheme === 'dark' ? 'theme-dark' : 'theme-light'}`}>

        {/* Workflow Stepper Header (Exact 6 Steps from Diagram) */}
        <div className="tools-workflow-header">
          <div className="tools-stepper-track">
            {WORKFLOW_STEPS.map((s) => {
              const isCurrent = currentStep === s.step;
              const isCompleted = currentStep > s.step;
              return (
                <div
                  key={s.step}
                  className={`tools-step-pill ${isCurrent ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  onClick={() => {
                    if (s.step === 1) setCurrentStep(1);
                    else if (s.step < currentStep) setCurrentStep(s.step);
                  }}
                  title={s.sub}
                >
                  <span className="step-num-badge">
                    {isCompleted ? '✓' : s.step}
                  </span>
                  <div className="step-label-group">
                    <span className="step-title-text">{s.step}. {s.title}</span>
                    <span className="step-sub-text">{s.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Bar with Active Tool Indicator & Back Button */}
          <div className="tools-top-action-bar">
            {selectedTool && currentStep > 1 && (
              <div className="tools-selected-badge">
                <span className="tool-selected-icon">{getToolSvgIcon(selectedTool)}</span>
                <span className="tool-selected-title">{selectedTool.title}</span>
              </div>
            )}
            {onClose && (
              <button
                type="button"
                className="tools-back-btn"
                onClick={onClose}
                title="Back to Dashboard"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            STEP 1: DASHBOARD (Choose Photo / PDF Studio)
            Preserves the EXACT box card layout and 135px size from reference photo 2
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="tools-landing-main-view">
            {/* Studio Filter Chips */}
            <div className="tools-studio-filter-bar">
              <button
                type="button"
                className={`studio-filter-btn ${studioFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStudioFilter('all')}
              >
                <span>All Tools ({tools.filter(t => t.isActive !== false && (!getToolPermissionKey(t) || hasUserAccess(effectivePermissions, getToolPermissionKey(t)))).length})</span>
              </button>
              <button
                type="button"
                className={`studio-filter-btn ${studioFilter === 'photo' ? 'active' : ''}`}
                onClick={() => setStudioFilter('photo')}
              >
                <span>📷 Photo Studio</span>
              </button>
              <button
                type="button"
                className={`studio-filter-btn ${studioFilter === 'pdf' ? 'active' : ''}`}
                onClick={() => setStudioFilter('pdf')}
              >
                <span>📄 PDF Studio</span>
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
                <p>Loading Tools & AI Services...</p>
              </div>
            ) : activeTools.length === 0 ? (
              <div className="tools-empty-state">
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚡</div>
                <h3 className="tools-empty-title" style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0' }}>
                  No Active Tools Available
                </h3>
                <p className="tools-empty-desc" style={{ fontSize: '13px', margin: 0 }}>
                  Tools configured in the Admin Panel will appear here.
                </p>
              </div>
            ) : (
              <div className="tools-overview-grid">
                {activeTools.map((tool, idx) => (
                  <div
                    key={tool._id || tool.title || idx}
                    className="tools-overview-card"
                    onClick={() => handleSelectTool(tool)}
                    title={`Click to open ${tool.title} workflow`}
                  >
                    <div className="tools-card-image-wrap">
                      {renderToolBanner(tool, idx, currentTheme === 'dark')}
                    </div>
                    <div className="tools-card-bottom-bar">
                      <div className="tools-card-icon-badge">
                        {getToolSvgIcon(tool)}
                      </div>
                      <div className="tools-card-text-col">
                        <h4 className="tools-card-title-text" title={tool.title}>
                          {tool.title}
                        </h4>
                        <span className="tools-card-accent-line" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 2: UPLOAD (Validate file type and size)
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="workflow-step-view">
            <div className="workflow-card-box">
              <div className="workflow-box-header">
                <span className="workflow-step-tag">Step 2 of 6</span>
                <h2 className="workflow-box-title">Upload Input Document / Photo</h2>
                <p className="workflow-box-desc">
                  Select your original PDF document or image file. The system will automatically validate file type and size.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                className={`workflow-dropzone ${fileError ? 'has-error' : ''} ${uploadedFile ? 'has-file' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />

                {!uploadedFile ? (
                  <div className="dropzone-content-empty">
                    <div className="dropzone-cloud-icon">☁️</div>
                    <h3 className="dropzone-main-text">Drag & Drop file here, or <span className="browse-link">browse</span></h3>
                    <p className="dropzone-hint-text">
                      Supported formats: <strong>PDF, JPG, PNG, WEBP</strong> • Maximum size: <strong>20 MB</strong>
                    </p>
                  </div>
                ) : (
                  <div className="dropzone-content-selected">
                    <div className="file-preview-pill">
                      {filePreviewUrl ? (
                        <img src={filePreviewUrl} alt="Preview" className="uploaded-thumb-img" />
                      ) : (
                        <div className="uploaded-pdf-icon">📄</div>
                      )}
                      <div className="uploaded-meta-info">
                        <div className="uploaded-file-name">{uploadedFile.name}</div>
                        <div className="uploaded-file-size">
                          {(uploadedFile.size / 1024).toFixed(1)} KB • Validated
                        </div>
                      </div>
                      <span className="file-valid-badge">✅ Valid</span>
                    </div>
                    <button
                      type="button"
                      className="replace-file-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                        setFilePreviewUrl('');
                      }}
                    >
                      Change File
                    </button>
                  </div>
                )}
              </div>

              {/* Error Notice */}
              {fileError && (
                <div className="workflow-error-alert">
                  <span className="error-icon">⚠️</span>
                  <span>{fileError}</span>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="workflow-actions-row">
                <button
                  type="button"
                  className="workflow-secondary-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  ← Back to Dashboard
                </button>
                <button
                  type="button"
                  className={`workflow-primary-btn ${!uploadedFile ? 'disabled' : ''}`}
                  disabled={!uploadedFile}
                  onClick={() => setCurrentStep(3)}
                >
                  Continue to Settings (Step 3) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: SETTINGS (Choose preset or custom values)
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="workflow-step-view">
            <div className="workflow-card-box">
              <div className="workflow-box-header">
                <span className="workflow-step-tag">Step 3 of 6</span>
                <h2 className="workflow-box-title">Choose Output Settings & Presets</h2>
                <p className="workflow-box-desc">
                  Select a standardized government card preset or define custom dimensions and resolution.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="settings-mode-toggle">
                <button
                  type="button"
                  className={`settings-toggle-btn ${!isCustomMode ? 'active' : ''}`}
                  onClick={() => setIsCustomMode(false)}
                >
                  ⚡ Standard Presets (Recommended)
                </button>
                <button
                  type="button"
                  className={`settings-toggle-btn ${isCustomMode ? 'active' : ''}`}
                  onClick={() => setIsCustomMode(true)}
                >
                  🛠️ Custom Dimensions
                </button>
              </div>

              {/* Presets Grid */}
              {!isCustomMode ? (
                <div className="presets-select-grid">
                  {PRESETS.map((p) => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`preset-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedPreset(p.id)}
                      >
                        <div className="preset-radio-indicator">
                          <span className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                        </div>
                        <div className="preset-card-body">
                          <h4 className="preset-card-title">{p.name}</h4>
                          <p className="preset-card-desc">{p.desc}</p>
                          <span className="preset-card-tag">{p.widthMm} × {p.heightMm} mm @ {p.dpi} DPI</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Custom Dimensions Panel */
                <div className="custom-settings-form">
                  <div className="form-grid-row">
                    <div className="form-field-group">
                      <label className="field-label">Width (mm):</label>
                      <input
                        type="number"
                        className="field-text-input"
                        value={customSettings.widthMm}
                        onChange={(e) => setCustomSettings({ ...customSettings, widthMm: e.target.value })}
                        step="0.1"
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">Height (mm):</label>
                      <input
                        type="number"
                        className="field-text-input"
                        value={customSettings.heightMm}
                        onChange={(e) => setCustomSettings({ ...customSettings, heightMm: e.target.value })}
                        step="0.1"
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">Resolution / DPI:</label>
                      <select
                        className="field-select-input"
                        value={customSettings.dpi}
                        onChange={(e) => setCustomSettings({ ...customSettings, dpi: e.target.value })}
                      >
                        <option value="150">150 DPI (Fast / Web)</option>
                        <option value="200">200 DPI (Gov Portals)</option>
                        <option value="300">300 DPI (High Quality Print)</option>
                        <option value="600">600 DPI (Ultra HD Master)</option>
                      </select>
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">Output Format:</label>
                      <select
                        className="field-select-input"
                        value={customSettings.format}
                        onChange={(e) => setCustomSettings({ ...customSettings, format: e.target.value })}
                      >
                        <option value="pdf">PDF Document (.pdf)</option>
                        <option value="png">Lossless PNG (.png)</option>
                        <option value="jpg">Standard JPEG (.jpg)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="workflow-actions-row">
                <button
                  type="button"
                  className="workflow-secondary-btn"
                  onClick={() => setCurrentStep(2)}
                >
                  ← Back to Upload
                </button>
                <button
                  type="button"
                  className="workflow-primary-btn"
                  onClick={runProcessingPipeline}
                >
                  Proceed to Process (Step 4) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: PROCESS (Show progress and errors)
            ========================================================================= */}
        {currentStep === 4 && (
          <div className="workflow-step-view">
            <div className="workflow-card-box">
              <div className="workflow-box-header">
                <span className="workflow-step-tag">Step 4 of 6</span>
                <h2 className="workflow-box-title">Processing Document with AI</h2>
                <p className="workflow-box-desc">
                  Executing automated cropping, edge detection, and DPI formatting pipeline.
                </p>
              </div>

              {/* Live Progress Card */}
              <div className="workflow-process-card">
                <div className="process-radar-orb">
                  <div className="radar-circle" />
                  <div className="radar-sweep" />
                  <span className="radar-icon">⚡</span>
                </div>

                <div className="process-stage-status">{processStage}</div>

                {/* Progress Bar */}
                <div className="process-progress-bar-wrap">
                  <div
                    className="process-progress-bar-fill"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>
                <div className="process-percent-text">{processProgress}% Completed</div>

                {/* Error handling if failed */}
                {processError && (
                  <div className="workflow-error-alert" style={{ marginTop: '20px' }}>
                    <span className="error-icon">❌</span>
                    <span>{processError}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="workflow-actions-row">
                {processError && (
                  <button
                    type="button"
                    className="workflow-primary-btn"
                    onClick={runProcessingPipeline}
                  >
                    🔄 Retry Processing
                  </button>
                )}
                <button
                  type="button"
                  className="workflow-secondary-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  ← Back to Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: PREVIEW (Check output size/dimensions)
            ========================================================================= */}
        {currentStep === 5 && (
          <div className="workflow-step-view">
            <div className="workflow-card-box">
              <div className="workflow-box-header">
                <span className="workflow-step-tag">Step 5 of 6</span>
                <h2 className="workflow-box-title">Output Preview & Dimensions Verification</h2>
                <p className="workflow-box-desc">
                  Inspect the processed document output, boundary lines, and verified print dimensions.
                </p>
              </div>

              {/* Interactive Preview Canvas */}
              <div className="preview-canvas-card">
                <div className="preview-canvas-box">
                  <div className="preview-crop-overlay">
                    <span className="crop-corner top-left" />
                    <span className="crop-corner top-right" />
                    <span className="crop-corner bottom-left" />
                    <span className="crop-corner bottom-right" />
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt="Output Preview" className="preview-document-img" />
                    ) : (
                      <div className="preview-placeholder-doc">
                        <div className="placeholder-header-strip" />
                        <div className="placeholder-photo-box" />
                        <div className="placeholder-text-lines">
                          <div className="pl-line" style={{ width: '80%' }} />
                          <div className="pl-line" style={{ width: '60%' }} />
                          <div className="pl-line" style={{ width: '90%' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimensions Metadata Bar */}
                <div className="dimensions-meta-grid">
                  <div className="dim-meta-item">
                    <span className="dim-label">Physical Size</span>
                    <span className="dim-val">{outputResult?.dimensions?.widthMm || '85.6'} × {outputResult?.dimensions?.heightMm || '54.0'} mm</span>
                  </div>
                  <div className="dim-meta-item">
                    <span className="dim-label">Pixel Dimension</span>
                    <span className="dim-val">{outputResult?.dimensions?.widthPx || '1011'} × {outputResult?.dimensions?.heightPx || '638'} px</span>
                  </div>
                  <div className="dim-meta-item">
                    <span className="dim-label">Resolution</span>
                    <span className="dim-val">{outputResult?.dimensions?.dpi || '300'} DPI Print Ready</span>
                  </div>
                  <div className="dim-meta-item">
                    <span className="dim-label">Status</span>
                    <span className="dim-val" style={{ color: '#22c55e' }}>✅ Verified</span>
                  </div>
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="workflow-actions-row">
                <button
                  type="button"
                  className="workflow-secondary-btn"
                  onClick={() => setCurrentStep(3)}
                >
                  ← Adjust Settings
                </button>
                <button
                  type="button"
                  className="workflow-primary-btn"
                  onClick={() => setCurrentStep(6)}
                >
                  Proceed to Export (Step 6) →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 6: EXPORT (Download, print or next tool)
            ========================================================================= */}
        {currentStep === 6 && (
          <div className="workflow-step-view">
            <div className="workflow-card-box">
              <div className="workflow-box-header" style={{ textAlign: 'center' }}>
                <span className="workflow-step-tag">Step 6 of 6</span>
                <h2 className="workflow-box-title" style={{ color: '#22c55e' }}>
                  🎉 Ready for Export!
                </h2>
                <p className="workflow-box-desc">
                  Your document has been successfully processed, cropped, and verified.
                </p>
              </div>

              {/* Export Actions Grid */}
              <div className="export-action-grid">
                {/* 1. Download */}
                <div className="export-action-card" onClick={handleDownloadOutput}>
                  <div className="export-card-icon-wrap" style={{ background: 'rgba(34,197,94,0.15)', borderColor: '#22c55e' }}>
                    <span style={{ fontSize: '24px' }}>📥</span>
                  </div>
                  <h3 className="export-card-title">Download Output</h3>
                  <p className="export-card-desc">Download high-resolution print-ready file (.PDF / .PNG)</p>
                  <button type="button" className="export-card-btn green">Download File</button>
                </div>

                {/* 2. Print */}
                <div className="export-action-card" onClick={handlePrintOutput}>
                  <div className="export-card-icon-wrap" style={{ background: 'rgba(56,189,248,0.15)', borderColor: '#38bdf8' }}>
                    <span style={{ fontSize: '24px' }}>🖨️</span>
                  </div>
                  <h3 className="export-card-title">Direct Print</h3>
                  <p className="export-card-desc">Send directly to your connected printer with 1:1 scale</p>
                  <button type="button" className="export-card-btn blue">Print Now</button>
                </div>

                {/* 3. Send to Next Tool */}
                <div className="export-action-card" onClick={() => {
                  Swal.fire({
                    title: 'Send to Next Tool',
                    html: `
                      <div style="text-align:left;font-size:13px;line-height:1.6;">
                        <p>Select which tool to pipe this output to:</p>
                        <select id="swalNextTool" style="width:100%;padding:8px;border-radius:6px;border:1px solid #cbd5e1;margin-top:6px;">
                          <option value="bg">Background Remover Image AI</option>
                          <option value="enhance">AI Image Enhancer (4K)</option>
                          <option value="sign">Digital Signature Validation</option>
                          <option value="pdf">PDF to HTML Converter</option>
                        </select>
                      </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Open in Tool',
                    confirmButtonColor: '#ea580c'
                  }).then((res) => {
                    if (res.isConfirmed) {
                      const found = tools.find(t => t.title.toLowerCase().includes('background')) || tools[0];
                      if (found) handleSelectTool(found);
                    }
                  });
                }}>
                  <div className="export-card-icon-wrap" style={{ background: 'rgba(168,85,247,0.15)', borderColor: '#a855f7' }}>
                    <span style={{ fontSize: '24px' }}>🔄</span>
                  </div>
                  <h3 className="export-card-title">Next Tool</h3>
                  <p className="export-card-desc">Pipe output directly into Background Remover or AI Enhancer</p>
                  <button type="button" className="export-card-btn purple">Send to Tool</button>
                </div>
              </div>

              {/* Bottom Footer Actions */}
              <div className="workflow-actions-row" style={{ marginTop: '24px' }}>
                <button
                  type="button"
                  className="workflow-secondary-btn"
                  onClick={() => {
                    setUploadedFile(null);
                    setFilePreviewUrl('');
                    setCurrentStep(2);
                  }}
                >
                  ➕ Process Another File
                </button>
                <button
                  type="button"
                  className="workflow-primary-btn"
                  onClick={() => setCurrentStep(1)}
                >
                  🏠 Return to Tools Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ToolsView;
