import React, { useState, useEffect } from 'react';

const REPORT_REASONS = [
  'Inappropriate or explicit',
  'Not their photo / stolen',
  'Spam or fake',
  'Other'
];

export default function VotePage({ token }) {
  const [matchup, setMatchup] = useState(null);
  const [emptyCode, setEmptyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [result, setResult] = useState('');
  const [voteCount, setVoteCount] = useState(0);
  const [reportTarget, setReportTarget] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadNextMatchup();
  }, []);

  const loadNextMatchup = async () => {
    setLoading(true);
    setVoting(false);
    setResult('');
    setEmptyCode('');

    try {
      const res = await fetch(`${API_URL}/api/matchup/next`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.photoA && data.photoB) {
        setMatchup(data);
      } else {
        setMatchup(null);
        setEmptyCode(data.code || 'NOT_ENOUGH_PHOTOS');
      }
    } catch (err) {
      setMatchup(null);
      setResult('❌ Error loading photos. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (winnerId) => {
    if (voting) return;
    setVoting(true);

    try {
      const res = await fetch(`${API_URL}/api/matchup/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          photoAId: matchup.photoA.id,
          photoBId: matchup.photoB.id,
          winnerId
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setResult(`❌ ${err.error || 'Vote failed'}`);
        setTimeout(loadNextMatchup, 1500);
        return;
      }

      const winner = winnerId === matchup.photoA.id ? matchup.photoA : matchup.photoB;
      setResult(`🎉 ${winner.title} wins!`);
      setVoteCount((c) => c + 1);
      setTimeout(loadNextMatchup, 1500);
    } catch (err) {
      setResult('❌ Error voting. Try again.');
      setVoting(false);
    }
  };

  const handleReport = async (reason) => {
    const photo = reportTarget;
    setReportTarget(null);
    if (!photo) return;

    try {
      const res = await fetch(`${API_URL}/api/photos/${photo.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (!res.ok) throw new Error('Report failed');
      setResult('🚩 Thanks, we will review that photo.');
      setVoting(true);
      setTimeout(loadNextMatchup, 1500);
    } catch (err) {
      setResult('❌ Could not send report. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="page vote-page">
        <div className="loading">⏳ Loading photos...</div>
      </div>
    );
  }

  if (!matchup) {
    let message = '❌ Could not load photos. Check your connection and try again.';
    if (emptyCode === 'NOT_ENOUGH_PHOTOS') {
      message = '📸 Not enough photos from other people yet. Upload yours and invite friends to join!';
    } else if (emptyCode === 'ALL_VOTED') {
      message = "🎉 You've voted on every pair for now. Come back later when more photos are uploaded!";
    }
    return (
      <div className="page vote-page">
        <div className="error">{message}</div>
        {result && <div className="result-message">{result}</div>}
        <button className="btn-secondary" style={{ marginTop: 16 }} onClick={loadNextMatchup}>
          🔄 Try again
        </button>
      </div>
    );
  }

  const renderCard = (photo, letter) => (
    <div className="photo-card">
      <div
        className="photo-image-container"
        onClick={() => handleVote(photo.id)}
      >
        <img src={photo.imageUrl} alt={photo.title} className="photo-image" />
        <div className="photo-overlay">
          <span className="vote-hint">Click to Vote</span>
        </div>
      </div>

      <div className="photo-info">
        <h3>{photo.title}</h3>
        <p className="uploader">by {photo.uploader?.displayName}</p>
        <div className="stats-row">
          <span className="stat-badge">Rating: {Math.round(photo.rating)}</span>
          <span className="stat-badge">{photo.wins}W</span>
        </div>
        <button
          className={`btn-vote btn-vote-${letter.toLowerCase()}`}
          onClick={() => handleVote(photo.id)}
          disabled={voting}
        >
          ✨ Vote {letter}
        </button>
        <button
          className="report-btn"
          onClick={() => setReportTarget(photo)}
          disabled={voting}
        >
          🚩 Report
        </button>
      </div>
    </div>
  );

  return (
    <div className="page vote-page">
      <h2 className="page-title">🗳️ Which is better?</h2>

      <div className="vote-container">
        {renderCard(matchup.photoA, 'A')}
        <div className="vs-divider">VS</div>
        {renderCard(matchup.photoB, 'B')}
      </div>

      {result && <div className="result-message">{result}</div>}

      {voteCount > 0 && (
        <div className="vote-count">🗳️ Votes cast: {voteCount}</div>
      )}

      {reportTarget && (
        <div className="modal-overlay" onClick={() => setReportTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report "{reportTarget.title}"</h3>
            <p>Why are you reporting this photo?</p>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                className="modal-btn"
                onClick={() => handleReport(reason)}
              >
                {reason}
              </button>
            ))}
            <button className="modal-cancel" onClick={() => setReportTarget(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
