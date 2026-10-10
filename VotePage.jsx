import React, { useState, useEffect } from 'react';

export default function VotePage({ token }) {
  const [matchup, setMatchup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [result, setResult] = useState('');
  const [voteCount, setVoteCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    loadNextMatchup();
  }, []);

  const loadNextMatchup = async () => {
    setLoading(true);
    setResult('');
    setVoteCount(0);

    try {
      const res = await fetch(`${API_URL}/api/matchup/next`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMatchup(data);
    } catch (err) {
      setResult('❌ Error loading photos. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (winnerId) => {
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

      if (!res.ok) throw new Error('Vote failed');

      const data = await res.json();
      const winner = winnerId === matchup.photoA.id ? matchup.photoA : matchup.photoB;

      setResult(`🎉 ${winner.title} wins!`);
      setVoteCount(voteCount + 1);

      setTimeout(() => {
        loadNextMatchup();
      }, 1500);
    } catch (err) {
      setResult('❌ Error voting. Try again.');
      setVoting(false);
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
    return (
      <div className="page vote-page">
        <div className="error">❌ No photos yet. Upload some to get started!</div>
      </div>
    );
  }

  return (
    <div className="page vote-page">
      <h2 className="page-title">🗳️ Which is better?</h2>

      <div className="vote-container">
        {/* Photo A */}
        <div className="photo-card">
          <div 
            className="photo-image-container"
            onClick={() => handleVote(matchup.photoA.id)}
          >
            <img 
              src={matchup.photoA.imageUrl}
              alt={matchup.photoA.title}
              className="photo-image"
            />
            <div className="photo-overlay">
              <span className="vote-hint">Click to Vote</span>
            </div>
          </div>

          <div className="photo-info">
            <h3>{matchup.photoA.title}</h3>
            <p className="uploader">by {matchup.photoA.uploader.displayName}</p>
            <div className="stats-row">
              <span className="stat-badge">Rating: {Math.round(matchup.photoA.rating)}</span>
              <span className="stat-badge">{matchup.photoA.wins}W</span>
            </div>
            <button 
              className="btn-vote btn-vote-a"
              onClick={() => handleVote(matchup.photoA.id)}
              disabled={voting}
            >
              ✨ Vote A
            </button>
          </div>
        </div>

        {/* VS */}
        <div className="vs-divider">VS</div>

        {/* Photo B */}
        <div className="photo-card">
          <div 
            className="photo-image-container"
            onClick={() => handleVote(matchup.photoB.id)}
          >
            <img 
              src={matchup.photoB.imageUrl}
              alt={matchup.photoB.title}
              className="photo-image"
            />
            <div className="photo-overlay">
              <span className="vote-hint">Click to Vote</span>
            </div>
          </div>

          <div className="photo-info">
            <h3>{matchup.photoB.title}</h3>
            <p className="uploader">by {matchup.photoB.uploader.displayName}</p>
            <div className="stats-row">
              <span className="stat-badge">Rating: {Math.round(matchup.photoB.rating)}</span>
              <span className="stat-badge">{matchup.photoB.wins}W</span>
            </div>
            <button 
              className="btn-vote btn-vote-b"
              onClick={() => handleVote(matchup.photoB.id)}
              disabled={voting}
            >
              ✨ Vote B
            </button>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="result-message">
          {result}
        </div>
      )}

      {/* Vote Count */}
      {voteCount > 0 && (
        <div className="vote-count">
          🗳️ Votes cast: {voteCount}
        </div>
      )}
    </div>
  );
}
