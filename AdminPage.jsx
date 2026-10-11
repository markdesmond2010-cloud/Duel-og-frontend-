import React, { useState, useEffect } from 'react';

export default function AdminPage({ token, onPhotosChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/reports`, { headers });
      const data = await res.json();
      setItems(res.ok && Array.isArray(data) ? data : []);
      if (!res.ok) setMessage(`❌ ${data.error || 'Could not load reports'}`);
    } catch (err) {
      setMessage('❌ Could not load reports');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async (item) => {
    if (!window.confirm(`Remove "${item.title}" permanently?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/photos/${item.photoId}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.photoId !== item.photoId));
      setMessage('🗑️ Photo removed');
      if (onPhotosChanged) onPhotosChanged();
    } catch (err) {
      setMessage('❌ Could not remove photo');
    }
  };

  const dismiss = async (item) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/reports/${item.photoId}/dismiss`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.photoId !== item.photoId));
      setMessage('✅ Reports dismissed, photo kept');
    } catch (err) {
      setMessage('❌ Could not dismiss reports');
    }
  };

  return (
    <div className="page admin-page">
      <h2 className="page-title">🛡️ Reported photos</h2>
      {message && <div className="result-message">{message}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">✅ No reported photos. All clear!</div>
      ) : (
        items.map((item) => (
          <div key={item.photoId} className="admin-card">
            <img src={item.imageUrl} alt={item.title} />
            <div className="admin-card-body">
              <h3>{item.title}</h3>
              <p>by {item.uploaderName} ({item.uploaderEmail})</p>
              <p><strong>{item.reportCount}</strong> report(s)</p>
              <ul>
                {item.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="admin-actions">
                <button className="admin-remove" onClick={() => removePhoto(item)}>
                  🗑️ Remove photo
                </button>
                <button className="admin-keep" onClick={() => dismiss(item)}>
                  ✅ Keep photo
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
