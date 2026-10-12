import React, { useState, useEffect } from 'react';

export default function LandingPage({ onJoin }) {
  const [battle, setBattle] = useState(null);
  const [trending, setTrending] = useState([]);
  const [champions, setChampions] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const get = (path) =>
      fetch(`${API_URL}${path}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    Promise.all([get('/api/public/battle'), get('/api/public/trending'), get('/api/leaderboard')]).then(
      ([b, t, l]) => {
        setBattle(b && b.photoA ? b : null);
        setTrending(Array.isArray(t) ? t : []);
        setChampions(Array.isArray(l) ? l.slice(0, 3) : []);
        setLoaded(true);
      }
    );
  }, []);

  const voteGate = () => onJoin('signup', 'Sign up free to cast your vote 🗳️');

  const side = (photo, letter) => (
    <div className="battle-side">
      <div className="battle-photo" onClick={voteGate}>
        <img src={photo.imageUrl} alt={`Photo ${letter}`} />
      </div>
      <div className="battle-meta">
        <div className="battle-user">@{photo.uploader?.username}</div>
        <button className={`battle-vote-btn battle-vote-${letter.toLowerCase()}`} onClick={voteGate}>
          Vote for this photo
        </button>
      </div>
    </div>
  );

  return (
    <div className="landing">
      <div className="landing-top">
        <span className="landing-brand">📸 DUEL</span>
        <button className="landing-signin" onClick={() => onJoin('login')}>Sign in</button>
      </div>

      <h1 className="landing-headline">Which photo wins? You decide.</h1>
      <p className="landing-sub">Two photos. One winner. Your vote decides.</p>

      {battle ? (
        <>
          <div className="battle landing-battle">
            {side(battle.photoA, 'A')}
            <div className="battle-vs">VS</div>
            {side(battle.photoB, 'B')}
          </div>
          <p className="landing-hint">Tap a photo to vote</p>
        </>
      ) : (
        loaded && (
          <div className="landing-empty">
            📸 No battles yet. Be the first to upload a photo!
          </div>
        )
      )}

      {trending.length > 0 && (
        <section className="landing-section">
          <h3>🔥 Trending duels</h3>
          <div className="trend-list">
            {trending.map((t, i) => (
              <div key={i} className="trend-item" onClick={voteGate}>
                <img src={t.photoA.imageUrl} alt="" />
                <span className="trend-vs">VS</span>
                <img src={t.photoB.imageUrl} alt="" />
                <span className="trend-votes">{t.votes} {t.votes === 1 ? 'vote' : 'votes'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {champions.length > 0 && (
        <section className="landing-section">
          <h3>🏆 Current top photos</h3>
          <div className="champ-row">
            {champions.map((c, i) => (
              <div key={c.id} className="champ-item">
                <div className="champ-img">
                  <img src={c.imageUrl} alt="" />
                  <span className="champ-rank">#{i + 1}</span>
                </div>
                <small>@{c.username}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <button className="landing-cta" onClick={() => onJoin('signup', 'Create your account to upload your photo 📸')}>
        📸 Upload your photo
      </button>
    </div>
  );
}
