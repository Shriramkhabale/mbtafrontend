import React, { useState, useEffect } from 'react';
import './QuickLinksView.css';
import { API_URL } from '../../utils/apiClient';

const QuickLinksView = ({ theme = 'dark' }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/quick-links`)
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
  }, []);

  const handleLinkClick = (url) => {
    if (!url || url === '#') return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`quick-links-container theme-${theme}`}>
      <div className="quick-links-header">
        <h2 className="quick-links-title">Available links</h2>
        <p className="quick-links-subtitle">Access useful forms, portals, guidelines, and video tutorials</p>
      </div>

      {loading ? (
        <div className="quick-links-loading">
          Loading quick links...
        </div>
      ) : links.length === 0 ? (
        <div className="quick-links-empty">
          No links available right now.
        </div>
      ) : (
        <div className="quick-links-grid">
          {links.map((item) => {
            const itemId = item._id || item.id;
            const hasPhoto = Boolean(item.img && item.img.trim() !== '');

            return (
              <div
                key={itemId}
                className={`quick-link-card ${hasPhoto ? 'has-img' : 'no-img'}`}
                onClick={() => handleLinkClick(item.url)}
                title={`Open: ${item.title}`}
              >
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
                  {item.title}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QuickLinksView;
