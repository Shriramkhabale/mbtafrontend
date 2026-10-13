import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './QuickLinksView.css';
import { API_URL } from '../../utils/apiClient';

const QuickLinksView = ({ 
  theme = 'light', 
  currentUser: propCurrentUser, 
  walletBalance: propWalletBalance, 
  onBalanceUpdate,
  menuKey = 'quickLinks',
  pageTitle = 'Available links',
  pageSubtitle = 'Access useful forms, portals, guidelines, and video tutorials'
}) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingLinkId, setProcessingLinkId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  const activeUser = propCurrentUser || (typeof localStorage !== 'undefined' ? localStorage.getItem('currentUser') : null);

  const getFullMediaUrl = (urlOrFile) => {
    if (!urlOrFile) return '';
    if (urlOrFile.startsWith('http://') || urlOrFile.startsWith('https://')) return urlOrFile;
    const clean = urlOrFile.startsWith('/') ? urlOrFile : `/${urlOrFile}`;
    return `${API_URL}${clean}`;
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    return ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` : null;
  };

  const isVideoItem = (item) => {
    if (!item) return false;
    if (item.videoSource === 'device') return true;
    if (item.videoFile && item.videoFile.trim() !== '') return true;
    if (menuKey === 'vedioLink') return true;
    if (item.category === 'video') return true;
    const u = (item.url || '').toLowerCase();
    return u.includes('/uploads/videos/') || u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.mov') || u.includes('youtube.com') || u.includes('youtu.be');
  };

  const openVideoOrLink = (targetItem, data = {}) => {
    const rawUrl = data.videoFile || data.url || targetItem.videoFile || targetItem.url;
    if (!rawUrl || rawUrl === '#') return;

    const fullUrl = getFullMediaUrl(rawUrl);
    const isDeviceVideo = Boolean(
      (data.videoSource === 'device' || targetItem.videoSource === 'device') ||
      data.videoFile ||
      targetItem.videoFile ||
      rawUrl.includes('/uploads/videos/') ||
      rawUrl.match(/\.(mp4|webm|mov|mkv)($|\?)/i)
    );
    const ytEmbed = getYouTubeEmbedUrl(rawUrl);

    // If it's a video item (device video or YouTube/video URL), open in modal player
    if (isVideoItem(targetItem) || isDeviceVideo || ytEmbed) {
      setActiveVideoModal({
        title: targetItem.title || 'Video Player',
        videoUrl: fullUrl,
        embedUrl: ytEmbed,
        isDevice: isDeviceVideo,
        rawUrl
      });
      return;
    }

    // Otherwise, normal web link -> open in new window
    if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(fullUrl, '_blank');
    }
  };

  useEffect(() => {
    setLoading(true);
    const queryParam = menuKey ? `?menuKey=${encodeURIComponent(menuKey)}` : '';
    fetch(`${API_URL}/api/quick-links${queryParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLinks(data.filter(item => item.isActive !== false));
        } else {
          setLinks([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching quick links:', err);
        setLinks([]);
        setLoading(false);
      });
  }, [menuKey]);

  const handleLinkClick = async (item) => {
    if (!item) return;
    const feeAmount = Number(item.fee) || 0;
    const itemId = item._id || item.id;

    // Free link -> open immediately
    if (feeAmount <= 0) {
      openVideoOrLink(item);
      return;
    }

    // Paid link requires logged-in user to deduct from wallet
    if (!activeUser) {
      return Swal.fire({
        icon: 'warning',
        title: 'Login Required',
        text: 'Please log in to your account to access this link.'
      });
    }

    const confirmRes = await Swal.fire({
      title: 'Visiting Fee Confirmation',
      html: `
        <div style="text-align: center; margin-top: 6px;">
          <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
            ${item.title}
          </div>
          <div style="background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 12px; padding: 12px; margin: 12px 0;">
            <div style="font-size: 13px; color: #9a3412; font-weight: 600;">Visiting Fee to Access:</div>
            <div style="font-size: 26px; font-weight: 900; color: #ea580c; margin-top: 4px;">
              ₹${feeAmount.toFixed(2)}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
              This amount will be deducted directly from your wallet balance.
            </div>
          </div>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: `💳 Pay ₹${feeAmount.toFixed(2)} & Visit`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#64748b',
      reverseButtons: true
    });

    if (!confirmRes.isConfirmed) return;

    setProcessingLinkId(itemId);
    try {
      const res = await fetch(`${API_URL}/api/quick-links/visit/${itemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to process visiting fee deduction.');
      }

      // Update wallet balance in Dashboard state & window event
      if (typeof onBalanceUpdate === 'function' && data.walletBalance !== undefined) {
        onBalanceUpdate(data.walletBalance);
      }
      if (typeof window !== 'undefined' && data.walletBalance !== undefined) {
        window.dispatchEvent(new CustomEvent('walletUpdated', { detail: data.walletBalance }));
      }

      // Show brief success toast
      Swal.fire({
        icon: 'success',
        title: 'Fee Paid Successfully!',
        text: `₹${feeAmount.toFixed(2)} deducted. Accessing now...`,
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });

      openVideoOrLink(item, data);
    } catch (err) {
      console.error('Error visiting quick link:', err);
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: err.message || 'Could not deduct visiting fee from wallet.'
      });
    } finally {
      setProcessingLinkId(null);
    }
  };

  const filteredLinks = links.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const title = (item.title || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    return title.includes(q) || cat.includes(q);
  });

  return (
    <div className={`quick-links-container theme-${theme}`}>
      <div className="quick-links-header">
        <h2 className="quick-links-title">{pageTitle}</h2>
        <p className="quick-links-subtitle">{pageSubtitle}</p>

        <div className="quick-links-search-wrap">
          <div className="quick-links-search-box">
            <span className="quick-links-search-icon">🔍</span>
            <input
              type="text"
              className="quick-links-search-input"
              placeholder="Search links, forms, tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="quick-links-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="quick-links-loading">
          Loading quick links...
        </div>
      ) : links.length === 0 ? (
        <div className="quick-links-empty">
          No links available right now.
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="quick-links-empty">
          No links found matching "{searchQuery}".
        </div>
      ) : (
        <div className="quick-links-grid">
          {filteredLinks.map((item) => {
            const itemId = item._id || item.id;
            const hasPhoto = Boolean(item.img && item.img.trim() !== '');
            const feeVal = Number(item.fee) || 0;
            const isProcessing = processingLinkId === itemId;

            return (
              <div
                key={itemId}
                className={`quick-link-card ${hasPhoto ? 'has-img' : 'no-img'} ${isProcessing ? 'is-loading' : ''}`}
                onClick={() => handleLinkClick(item)}
                title={feeVal > 0 ? `Pay ₹${feeVal} & Open: ${item.title}` : `Open: ${item.title}`}
              >
                {/* Fee badge on top-left */}
                {feeVal > 0 ? (
                  <span className="quick-link-fee-badge paid">
                    🔒 ₹{feeVal}
                  </span>
                ) : (
                  <span className="quick-link-fee-badge free">
                    FREE
                  </span>
                )}

                {/* Photo fully covering the entire card box */}
                {hasPhoto ? (
                  <>
                    <img
                      src={item.img}
                      alt={item.title}
                      className="quick-link-bg-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'none';
                      }}
                    />
                    <div className="quick-link-card-overlay" />
                  </>
                ) : (
                  <div className="quick-link-icon-fallback">
                    {item.icon || '🔗'}
                  </div>
                )}

                {item.category && item.category !== 'link' && (
                  <span className="quick-link-badge-type">{item.category}</span>
                )}

                <div className="quick-link-title-text">
                  {isProcessing ? '⏳ Processing...' : item.title}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoModal && (
        <div 
          className="video-player-modal-backdrop" 
          onClick={() => setActiveVideoModal(null)}
        >
          <div 
            className="video-player-modal-card" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="video-player-modal-header">
              <div className="video-player-modal-title">
                <span>🎥</span>
                <span>{activeVideoModal.title}</span>
              </div>
              <div className="video-player-modal-actions">
                <a
                  href={activeVideoModal.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="video-player-modal-btn"
                  title="Open video in new tab"
                >
                  ↗ Open in New Tab
                </a>
                <button
                  type="button"
                  className="video-player-modal-close"
                  onClick={() => setActiveVideoModal(null)}
                  title="Close player"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="video-player-modal-body">
              {activeVideoModal.embedUrl ? (
                <iframe
                  src={activeVideoModal.embedUrl}
                  title={activeVideoModal.title}
                  style={{ width: '100%', height: '480px', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeVideoModal.videoUrl}
                  controls
                  autoPlay
                  className="video-player-modal-video"
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLinksView;
