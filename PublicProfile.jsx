import React, { useState, useEffect } from 'react';

export default function PublicProfile({ username, loggedIn }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error

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

            <div className="public-stats">
              <div><b>{data.bestRank ? `#${data.bestRank}` : '–'}</b><small>BEST RANK</small></div>
              <div><b>{data.totalVotes.toLocaleString()}</b><small>TOTAL VOTES</small></div>
              <div><b>{data.photoCount}</b><small>PHOTOS</small></div>
            </div>

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

            <button className="public-cta" onClick={goHome}>
              {loggedIn ? '🗳️ Open DUEL' : '🔥 Join DUEL and vote'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
