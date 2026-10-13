import React, { useState, useEffect } from 'react';
import { ChallengeModal } from './ChallengesPanel';

export default function PublicProfile({ username, loggedIn }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error
  const [me, setMe] = useState(null);
  const [challenging, setChallenging] = useState(false);
  const [sentNote, setSentNote] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/public/profile/${encodeURIComponent(username)}`)
      .then(async (r) => {
        if (r.status === 404) return setState('missing');
        if (!r.ok) throw new Error();
        setData(await r.json());
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [username]);

  useEffect(() => {
    const token = localStorage.getItem('duel_token');
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMe(d))
      .catch(() => {});
  }, []);

  const goHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="public-page">
      <div className="public-card">
        <div className="public-brand">📸 DUEL</div>
        <p className="public-tagline">Which photo wins? You decide.</p>

        {state === 'loading' && <p className="public-note">⏳ Loading...</p>}
        {state === 'missing' && <p className="public-note">😕 We couldn't find that profile.</p>}
        {state === 'error' && <p className="public-note">❌ Couldn't load this profile. Try again.</p>}

        {state === 'ready' && data && (
          <>
            <div className="public-avatar">
              {data.profileImage ? (
                <img src={data.profileImage} alt={data.displayName} />
              ) : (
                <span>{(data.displayName || '?').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <h2 className="public-name">{data.displayName}</h2>
            <p className="public-handle">@{data.username}</p>

            {data.tier && (
              <p className="public-tier">{data.tier.emoji} {data.tier.name}</p>
            )}

            <div className="public-stats">
              <div><b>{data.bestRank ? `#${data.bestRank}` : '–'}</b><small>BEST RANK</small></div>
              <div><b>{(data.totalWins ?? 0).toLocaleString()}</b><small>VOTES RECEIVED</small></div>
              <div><b>{data.winRate ?? 0}%</b><small>WIN RATE</small></div>
            </div>

            {data.achievements && data.achievements.length > 0 && (
              <div className="public-ach">
                {data.achievements.map((name) => (
                  <span key={name}>🏅 {name}</span>
                ))}
              </div>
            )}

            {data.photos.length > 0 && (
              <div className="public-photos">
                {data.photos.map((p) => (
                  <div key={p.id} className="public-photo">
                    <img src={p.imageUrl} alt={p.title} />
                    {p.rank && <span className="public-rank">#{p.rank}</span>}
                  </div>
                ))}
              </div>
            )}

            {loggedIn && me && me.username.toLowerCase() !== data.username.toLowerCase() && (
              <button className="public-cta alt" onClick={() => setChallenging(true)} style={{ marginBottom: 8 }}>
                ⚔️ Challenge @{data.username}
              </button>
            )}
            {sentNote && <p className="battle-status">{sentNote}</p>}

            <button className="public-cta" onClick={goHome}>
              {loggedIn ? '🗳️ Open DUEL' : '🔥 Join DUEL and vote'}
            </button>

            {challenging && (
              <ChallengeModal
                token={localStorage.getItem('duel_token')}
                toUsername={data.username}
                onClose={() => setChallenging(false)}
                onSent={() => setSentNote('✅ Challenge sent!')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
