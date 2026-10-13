import React, { useState, useEffect } from 'react';
import { CATEGORIES, categoryLabel } from './categories';

const SCOPES = [
  { key: 'all', label: 'All time' },
  { key: 'season', label: 'This month' },
  { key: 'week', label: 'This week' }
];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [scope, setScope] = useState('all');
  const [category, setCategory] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    setLoading(true);
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [scope, category]);

  const loadLeaderboard = async () => {
    try {
      const params = new URLSearchParams();
      if (scope !== 'all') params.set('scope', scope);
      if (category) params.set('category', category);
      const res = await fetch(`${API_URL}/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const monthName = new Date().toLocaleString('en', { month: 'long' });
  const scopeNote =
    scope === 'season'
      ? `Season: ${monthName}. Ranked by votes received this month. A new season starts every month.`
      : scope === 'week'
      ? 'Recent winners: ranked by votes received in the last 7 days.'
      : 'Ranked by rating. New photos are marked NEW until they have 5 battles.';

  const filters = (
    <>
      <div className="cat-chips lb-chips">
        {SCOPES.map((s) => (
          <button
            key={s.key}
            className={`cat-chip ${scope === s.key ? 'active' : ''}`}
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="cat-chips lb-chips">
        <button className={`cat-chip ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`cat-chip ${category === c.key ? 'active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.emoji} {c.short}
          </button>
        ))}
      </div>
      <p className="lb-note">{scopeNote}</p>
    </>
  );

  if (loading) {
    return (
      <div className="page leaderboard-page">
        <h2 className="page-title">🏆 Top Photos</h2>
        {filters}
        <div className="loading">⏳ Loading rankings...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="page leaderboard-page">
        <h2 className="page-title">🏆 Top Photos</h2>
        {filters}
        <div className="empty-state">📋 No ranked photos here yet. Vote and upload to get things moving!</div>
      </div>
    );
  }

  const metric = (p) => (scope === 'all' ? Math.round(p.rating) : `${p.wins} ${p.wins === 1 ? 'vote' : 'votes'}`);

  return (
    <div className="page leaderboard-page">
      <h2 className="page-title">🏆 Top Photos</h2>
      {filters}

      {/* Podium */}
      <div className="podium">
        {leaderboard.length >= 2 && (
          <div className="podium-place second">
            <div className="medal">🥈</div>
            <img src={leaderboard[1].imageUrl} alt={leaderboard[1].title} />
            <h4>{leaderboard[1].title}</h4>
            <p>{metric(leaderboard[1])}</p>
          </div>
        )}
        <div className="podium-place first">
          <div className="medal">🥇</div>
          <img src={leaderboard[0].imageUrl} alt={leaderboard[0].title} />
          <h4>{leaderboard[0].title}</h4>
          <p>{metric(leaderboard[0])}</p>
        </div>
        {leaderboard.length >= 3 && (
          <div className="podium-place third">
            <div className="medal">🥉</div>
            <img src={leaderboard[2].imageUrl} alt={leaderboard[2].title} />
            <h4>{leaderboard[2].title}</h4>
            <p>{metric(leaderboard[2])}</p>
          </div>
        )}
      </div>

      {/* Rankings Table */}
      <div className="rankings-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Photo</th>
              <th>{scope === 'all' ? 'Rating' : 'Votes'}</th>
              <th>Battles</th>
              <th>Win Rate</th>
              <th>Uploader</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((photo, idx) => (
              <tr
                key={photo.id}
                className={`ranking-row ${idx < 3 ? 'top-3' : ''}`}
                onClick={() => setSelectedPhoto(photo)}
                style={{ cursor: 'pointer' }}
              >
                <td>#{photo.rank}</td>
                <td>
                  <img src={photo.imageUrl} alt={photo.title} className="thumbnail" />
                  <span>{photo.title}</span>
                  {photo.provisional && <em className="new-tag">NEW</em>}
                </td>
                <td className="rating">{scope === 'all' ? Math.round(photo.rating) : photo.wins}</td>
                <td>{photo.matchesPlayed}</td>
                <td>{photo.winRate}%</td>
                <td>{photo.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPhoto(null)}>✕</button>

            <img src={selectedPhoto.imageUrl} alt={selectedPhoto.title} className="modal-image" />

            <div className="modal-info">
              <h2>#{selectedPhoto.rank} - {selectedPhoto.title}</h2>
              <p className="modal-uploader">
                by {selectedPhoto.displayName} · {categoryLabel(selectedPhoto.category)}
              </p>

              <div className="modal-stats">
                <div className="stat-item">
                  <span>Rating</span>
                  <span className="stat-value">{Math.round(selectedPhoto.rating)}</span>
                </div>
                <div className="stat-item">
                  <span>Battles</span>
                  <span className="stat-value">{selectedPhoto.matchesPlayed}</span>
                </div>
                <div className="stat-item">
                  <span>Votes</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>{selectedPhoto.wins}</span>
                </div>
                <div className="stat-item">
                  <span>Win Rate</span>
                  <span className="stat-value">{selectedPhoto.winRate}%</span>
                </div>
              </div>

              <button
                className="btn-share"
                onClick={() => {
                  window.location.href = `/p/${selectedPhoto.id}`;
                }}
              >
                🔗 Open photo page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
