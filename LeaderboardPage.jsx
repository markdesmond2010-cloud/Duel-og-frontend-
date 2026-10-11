import React, { useState, useEffect } from 'react';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leaderboard`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page leaderboard-page">
        <div className="loading">⏳ Loading rankings...</div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="page leaderboard-page">
        <div className="empty-state">📋 No photos yet. Upload to see rankings!</div>
      </div>
    );
  }

  return (
    <div className="page leaderboard-page">
      <h2 className="page-title">🏆 Top Photos</h2>

      {/* Podium */}
      {leaderboard.length >= 1 && (
        <div className="podium">
          {leaderboard.length >= 2 && (
            <div className="podium-place second">
              <div className="medal">🥈</div>
              <img src={leaderboard[1].imageUrl} alt={leaderboard[1].title} />
              <h4>{leaderboard[1].title}</h4>
              <p>{Math.round(leaderboard[1].rating)}</p>
            </div>
          )}

          <div className="podium-place first">
            <div className="medal">🥇</div>
            <img src={leaderboard[0].imageUrl} alt={leaderboard[0].title} />
            <h4>{leaderboard[0].title}</h4>
            <p>{Math.round(leaderboard[0].rating)}</p>
          </div>

          {leaderboard.length >= 3 && (
            <div className="podium-place third">
              <div className="medal">🥉</div>
              <img src={leaderboard[2].imageUrl} alt={leaderboard[2].title} />
              <h4>{leaderboard[2].title}</h4>
              <p>{Math.round(leaderboard[2].rating)}</p>
            </div>
          )}
        </div>
      )}

      {/* Rankings Table */}
      <div className="rankings-table">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Photo</th>
              <th>Rating</th>
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
                  <img 
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="thumbnail"
                  />
                  <span>{photo.title}</span>
                </td>
                <td className="rating">{Math.round(photo.rating)}</td>
                <td>{photo.matchesPlayed}</td>
                <td>{photo.winRate}%</td>
                <td>{photo.displayName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Photo Details Modal */}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={() => setSelectedPhoto(null)}
            >
              ✕
            </button>

            <img 
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              className="modal-image"
            />

            <div className="modal-info">
              <h2>#{selectedPhoto.rank} - {selectedPhoto.title}</h2>
              <p className="modal-uploader">by {selectedPhoto.displayName}</p>

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
                  <span>Wins</span>
                  <span className="stat-value" style={{ color: '#10b981' }}>{selectedPhoto.wins}</span>
                </div>
                <div className="stat-item">
                  <span>Win Rate</span>
                  <span className="stat-value">{selectedPhoto.winRate}%</span>
                </div>
              </div>

              <button className="btn-share">📱 Share Result</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
