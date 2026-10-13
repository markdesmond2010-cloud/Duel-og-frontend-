import React, { useState, useEffect } from 'react';

export default function AdminPage({ token, onPhotosChanged }) {
  const [tab, setTab] = useState('reports');
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (tab === 'reports') loadReports();
    else loadAnalytics();
  }, [tab]);

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

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data);
    } catch (err) {
      setMessage('❌ Could not load analytics');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async (item) => {
    if (!window.confirm(`Remove "${item.title}" permanently?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/photos/${item.photoId}`, { method: 'DELETE', headers });
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
      const res = await fetch(`${API_URL}/api/admin/reports/${item.photoId}/dismiss`, { method: 'POST', headers });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.photoId !== item.photoId));
      setMessage('✅ Reports dismissed, photo kept');
    } catch (err) {
      setMessage('❌ Could not dismiss reports');
    }
  };

  const ban = async (item) => {
    if (!window.confirm(`Ban @${item.uploaderUsername} and remove ALL their photos?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(item.uploaderUsername)}/ban`, {
        method: 'POST',
        headers
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ban failed');
      setItems((prev) => prev.filter((i) => i.uploaderUsername !== item.uploaderUsername));
      setMessage(`🚫 @${item.uploaderUsername} was banned`);
      if (onPhotosChanged) onPhotosChanged();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const maxVotes = stats ? Math.max(1, ...stats.dailyVotes.map((d) => d.votes)) : 1;

  return (
    <div className="page admin-page">
      <h2 className="page-title">🛡️ Admin</h2>

      <div className="cat-chips lb-chips">
        <button className={`cat-chip ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          🚩 Reports
        </button>
        <button className={`cat-chip ${tab === 'analytics' ? 'active' : ''}`} onClick={() => setTab('analytics')}>
          📊 Analytics
        </button>
      </div>

      {message && <div className="result-message">{message}</div>}
      {loading && <div className="loading">Loading...</div>}

      {!loading && tab === 'reports' && (
        items.length === 0 ? (
          <div className="empty-state">✅ No reported photos. All clear!</div>
        ) : (
          items.map((item) => (
            <div key={item.photoId} className="admin-card">
              <img src={item.imageUrl} alt={item.title} />
              <div className="admin-card-body">
                <h3>{item.title}</h3>
                <p>by @{item.uploaderUsername} ({item.uploaderEmail})</p>
                <p><strong>{item.reportCount}</strong> report(s)</p>
                <ul>
                  {item.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <div className="admin-actions">
                  <button className="admin-remove" onClick={() => removePhoto(item)}>🗑️ Remove photo</button>
                  <button className="admin-keep" onClick={() => dismiss(item)}>✅ Keep photo</button>
                </div>
                <button className="admin-ban" onClick={() => ban(item)}>🚫 Ban @{item.uploaderUsername}</button>
              </div>
            </div>
          ))
        )
      )}

      {!loading && tab === 'analytics' && stats && (
        <>
          <div className="an-grid">
            <div><b>{stats.users}</b><small>USERS (+{stats.newUsers7d} this week)</small></div>
            <div><b>{stats.photos}</b><small>PHOTOS (+{stats.newPhotos7d} this week)</small></div>
            <div><b>{stats.votes}</b><small>VOTES TOTAL</small></div>
            <div><b>{stats.votes24h}</b><small>VOTES (24H)</small></div>
            <div><b>{stats.votes7d}</b><small>VOTES (7 DAYS)</small></div>
            <div><b>{stats.activeVoters7d}</b><small>ACTIVE VOTERS (7D)</small></div>
            <div><b>{stats.openReports}</b><small>OPEN REPORTS</small></div>
            <div><b>{stats.referredSignups}</b><small>SIGN-UPS VIA INVITES</small></div>
          </div>

          <div className="tier-box">
            <h4 className="ach-title" style={{ marginTop: 0 }}>Votes per day</h4>
            <div className="an-bars">
              {stats.dailyVotes.map((d, i) => (
                <div key={i} className="an-bar">
                  <div style={{ height: `${(d.votes / maxVotes) * 100}%` }} />
                  <small>{d.day}</small>
                  <em>{d.votes}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="tier-box">
            <h4 className="ach-title" style={{ marginTop: 0 }}>Top inviters</h4>
            {stats.topReferrers.length === 0 ? (
              <p className="tier-note">No invited sign-ups yet.</p>
            ) : (
              stats.topReferrers.map((r) => (
                <div key={r.username} className="an-row"><span>@{r.username}</span><b>{r.n}</b></div>
              ))
            )}
          </div>

          <div className="tier-box">
            <h4 className="ach-title" style={{ marginTop: 0 }}>⚠️ Possible vote boosting</h4>
            <p className="tier-note">Accounts that gave 15+ votes to one person in 7 days.</p>
            {stats.possibleBoosting.length === 0 ? (
              <p className="tier-note">Nothing suspicious.</p>
            ) : (
              stats.possibleBoosting.map((b, i) => (
                <div key={i} className="an-row"><span>@{b.voter} → @{b.owner}</span><b>{b.n}</b></div>
              ))
            )}
            <p className="tier-note" style={{ marginTop: 12 }}>New accounts (under 24h) with 40+ votes:</p>
            {stats.newAccountHeavyVoting.length === 0 ? (
              <p className="tier-note">None.</p>
            ) : (
              stats.newAccountHeavyVoting.map((b) => (
                <div key={b.username} className="an-row"><span>@{b.username}</span><b>{b.n}</b></div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
