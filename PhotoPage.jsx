import React, { useState, useEffect } from 'react';
import { categoryLabel } from './categories';

export default function PhotoPage({ photoId, loggedIn }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetch(`${API_URL}/api/photos/${encodeURIComponent(photoId)}/rank`)
      .then(async (r) => {
        if (r.status === 404) return setState('missing');
        if (!r.ok) throw new Error();
        const d = await r.json();
        setData(d);
        setState('ready');
        // Credit the owner if a new visitor signs up from this link
        try {
          if (!localStorage.getItem('duel_token') && d.ownerUsername) {
            localStorage.setItem('duel_ref', d.ownerUsername);
          }
        } catch (e) {}
      })
      .catch(() => setState('error'));
  }, [photoId]);

  const battles = data?.matchesPlayed || 0;
  const winRate = battles ? Math.round(((data.wins || 0) / battles) * 100) : 0;

  return (
    <div className="public-page">
      <div className="public-card">
        <div className="public-brand">📸 DUEL</div>
        <p className="public-tagline">Which photo wins? You decide.</p>

        {state === 'loading' && <p className="public-note">⏳ Loading...</p>}
        {state === 'missing' && <p className="public-note">😕 We couldn't find that photo. It may have been removed.</p>}
        {state === 'error' && <p className="public-note">❌ Couldn't load this photo. Try again.</p>}

        {state === 'ready' && data && (
          <>
            <div className="photo-page-img">
              <img src={data.imageUrl} alt={data.title} />
              {data.rank && (
                <span className="public-rank big">#{data.rank} of {data.total}</span>
              )}
            </div>
            <h2 className="public-name">{data.title}</h2>
            <p className="public-handle">
              by <a href={`/u/${data.ownerUsername}`}>@{data.ownerUsername}</a> · {categoryLabel(data.category)}
            </p>
            <p className="photo-label">{data.label}</p>

            <div className="public-stats">
              <div><b>{data.wins || 0}</b><small>VOTES RECEIVED</small></div>
              <div><b>{winRate}%</b><small>BATTLE WIN RATE</small></div>
              <div><b>{data.tier ? `${data.tier.emoji} ${data.tier.name}` : '–'}</b><small>OWNER TIER</small></div>
            </div>

            <button className="public-cta" onClick={() => (window.location.href = '/')}>
              {loggedIn ? '🗳️ Open DUEL' : '🔥 Join DUEL and vote'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
