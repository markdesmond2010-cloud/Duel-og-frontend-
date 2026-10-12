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
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState('');
  const [agree, setAgree] = useState('');
  const [reportTarget, setReportTarget] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadNextMatchup();
  }, []);

  const loadNextMatchup = async () => {
    setLoading(true);
    setVoting(false);
    setSelectedId(null);
    setStatus('');
    setAgree('');
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
      setStatus('❌ Error loading photos. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (winnerId) => {
    if (voting) return;
    setVoting(true);
    setSelectedId(winnerId);

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
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSelectedId(null);
        setStatus(
          res.status === 409
            ? 'ℹ️ You already voted on this battle.'
            : `❌ ${data.error || 'Vote failed'}`
        );
        setTimeout(loadNextMatchup, 1600);
        return;
      }

      setStatus('✅ Vote recorded');
      if (data.pairVotes && data.pairVotes.total >= 3) {
        const pct = Math.round((data.pairVotes.winnerVotes / data.pairVotes.total) * 100);
        setAgree(`${pct}% of voters picked the same photo`);
      }
      setTimeout(loadNextMatchup, 1700);
    } catch (err) {
      setSelectedId(null);
      setStatus('❌ Error voting. Try again.');
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
      setStatus('🚩 Thanks, we will review that photo.');
      setVoting(true);
      setTimeout(loadNextMatchup, 1500);
    } catch (err) {
      setStatus('❌ Could not send report. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="page vote-page">
        <div className="loading">⏳ Loading battle...</div>
      </div>
    );
  }

  if (!matchup) {
    let message = '❌ Could not load photos. Check your connection and try again.';
    if (emptyCode === 'NOT_ENOUGH_PHOTOS') {
      message = '📸 Not enough photos from other people yet. Upload yours and invite friends to join!';
    } else if (emptyCode === 'ALL_VOTED') {
      message = "🎉 You've voted on every battle for now. Come back later when more photos are uploaded!";
    }
    return (
      <div className="page vote-page">
        <div className="error">{message}</div>
        {status && <div className="battle-status">{status}</div>}
        <button className="btn-secondary" style={{ marginTop: 16 }} onClick={loadNextMatchup}>
          🔄 Try again
        </button>
      </div>
    );
  }

  const renderSide = (photo, letter) => {
    const picked = selectedId === photo.id;
    const dimmed = selectedId && !picked;
    return (
      <div className={`battle-side ${picked ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}>
        <div className="battle-photo" onClick={() => handleVote(photo.id)}>
          <img src={photo.imageUrl} alt={`Photo ${letter}`} />
          {picked && <span className="pick-badge">✓ Your pick</span>}
        </div>
        <div className="battle-meta">
          <div className="battle-user">@{photo.uploader?.username || photo.uploader?.displayName}</div>
          <button
            className={`battle-vote-btn battle-vote-${letter.toLowerCase()}`}
            onClick={() => handleVote(photo.id)}
            disabled={voting}
          >
            Vote for this photo
          </button>
          <button
            className="battle-report"
            onClick={() => setReportTarget(photo)}
            disabled={voting}
          >
            🚩 Report
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page vote-page">
      <h2 className="battle-title">CHOOSE THE WINNER</h2>

      <div className="battle">
        {renderSide(matchup.photoA, 'A')}
        <div className="battle-vs">VS</div>
        {renderSide(matchup.photoB, 'B')}
      </div>

      <div className="battle-status">
        {status || 'Tap a photo to vote'}
        {agree && <div className="battle-agree">{agree}</div>}
      </div>

      {reportTarget && (
        <div className="modal-overlay" onClick={() => setReportTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report this photo</h3>
            <p>Why are you reporting it?</p>
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
