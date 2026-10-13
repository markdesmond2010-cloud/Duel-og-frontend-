import React, { useState, useEffect } from 'react';
import ShareCard from './ShareCard';

function timeLeft(endsAt) {
  const ms = endsAt - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`;
}

export default function BattlePage({ battleId }) {
  const [battle, setBattle] = useState(null);
  const [state, setState] = useState('loading');
  const [perm, setPerm] = useState(null); // vote-token response
  const [me, setMe] = useState(null);
  const [message, setMessage] = useState('');
  const [voting, setVoting] = useState(false);
  const [cardSide, setCardSide] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('duel_token');
  const auth = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const r = await fetch(`${API_URL}/api/battle/${encodeURIComponent(battleId)}`);
      if (r.status === 404) return setState('missing');
      if (!r.ok) throw new Error();
      const b = await r.json();
      setBattle(b);
      setState('ready');

      if (token) {
        const [meRes, permRes] = await Promise.all([
          fetch(`${API_URL}/api/auth/me`, { headers: auth }),
          fetch(`${API_URL}/api/battle/${encodeURIComponent(battleId)}/vote-token`, { headers: auth })
        ]);
        if (meRes.ok) setMe(await meRes.json());
        if (permRes.ok) setPerm(await permRes.json());
      } else {
        try {
          localStorage.setItem('duel_ref', b.from.username);
        } catch (e) {}
      }
    } catch (err) {
      setState('error');
    }
  };

  useEffect(() => {
    load();
  }, [battleId]);

  const vote = async (winnerId) => {
    if (!perm || !perm.canVote || voting) return;
    setVoting(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/matchup/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          photoAId: perm.photoAId,
          photoBId: perm.photoBId,
          winnerId,
          matchToken: perm.matchToken
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(`❌ ${data.error || 'Vote failed'}`);
        setVoting(false);
        if (!/quick/i.test(data.error || '')) load();
        return;
      }
      setMessage('✅ Vote recorded');
      await load();
    } catch (err) {
      setMessage('❌ Could not vote. Try again.');
    }
    setVoting(false);
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/b/${battleId}`;
    const text = `Who wins? @${battle.from.username} vs @${battle.to.username} on DUEL. Cast your vote: ${url}`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(url);
        setMessage('🔗 Link copied');
      }
    } catch (e) {}
  };

  const mySide = battle && me ? (battle.from.userId === me.id ? 'from' : battle.to.userId === me.id ? 'to' : null) : null;
  const myPhoto = mySide ? battle[mySide] : null;
  const myVotes = mySide === 'from' ? battle?.votesFrom : battle?.votesTo;
  const theirVotes = mySide === 'from' ? battle?.votesTo : battle?.votesFrom;
  const canShareCard = mySide && (battle.ended ? battle.winner === mySide : myVotes > theirVotes);

  const side = (s, key, votes) => {
    const pct = battle.total ? Math.round((votes / battle.total) * 100) : 0;
    const leading = battle.winner === key || (!battle.ended && votes > (key === 'from' ? battle.votesTo : battle.votesFrom));
    return (
      <div className={`battle-side ${leading ? 'selected' : ''}`}>
        <div className="battle-photo">
          <img src={s.imageUrl} alt={s.title} />
          {battle.winner === key && <span className="pick-badge">🏆 Winner</span>}
        </div>
        <div className="battle-meta">
          <div className="battle-user">@{s.username}</div>
          <div className="battle-pct">{pct}%</div>
          <small>{votes} {votes === 1 ? 'vote' : 'votes'}</small>
          {perm && perm.canVote && (
            <button
              className={`battle-vote-btn battle-vote-${key === 'from' ? 'a' : 'b'}`}
              onClick={() => vote(s.photoId)}
              disabled={voting}
              style={{ marginTop: 6 }}
            >
              Vote for this photo
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="public-page">
      <div className="public-card" style={{ maxWidth: 560 }}>
        <div className="public-brand">📸 DUEL</div>
        <p className="public-tagline">⚔️ Head-to-head battle</p>

        {state === 'loading' && <p className="public-note">⏳ Loading battle...</p>}
        {state === 'missing' && <p className="public-note">😕 We couldn't find that battle.</p>}
        {state === 'error' && <p className="public-note">❌ Couldn't load this battle. Try again.</p>}

        {state === 'ready' && battle && (
          <>
            <p className="battle-time">
              {battle.ended
                ? battle.winner === 'tie'
                  ? '🤝 Ended in a tie'
                  : `🏆 @${battle[battle.winner].username} won`
                : `⏳ ${timeLeft(battle.endsAt)}`}
            </p>

            <div className="battle landing-battle">
              {side(battle.from, 'from', battle.votesFrom)}
              <div className="battle-vs">VS</div>
              {side(battle.to, 'to', battle.votesTo)}
            </div>

            {message && <p className="battle-status">{message}</p>}

            {!token && (
              <button className="public-cta" onClick={() => (window.location.href = '/')}>
                🔥 Join DUEL to vote
              </button>
            )}
            {token && perm && !perm.canVote && (
              <p className="battle-status">
                {perm.reason === 'own' && "This is your battle. Share it so others vote!"}
                {perm.reason === 'voted' && '✅ You voted in this battle.'}
                {perm.reason === 'ended' && 'Voting has closed.'}
              </p>
            )}

            <button className="public-cta alt" onClick={shareLink}>🔗 Share this battle</button>
            {canShareCard && (
              <button className="public-cta" onClick={() => setCardSide(mySide)} style={{ marginTop: 8 }}>
                📤 Share my {battle.ended ? 'winning ' : ''}card
              </button>
            )}
            {token && (
              <button className="public-cta alt" onClick={() => (window.location.href = '/')} style={{ marginTop: 8 }}>
                🗳️ Open DUEL
              </button>
            )}
          </>
        )}
      </div>

      {cardSide && myPhoto && (
        <ShareCard
          photo={{ id: myPhoto.photoId, imageUrl: myPhoto.imageUrl, title: myPhoto.title }}
          user={me}
          battle={{ id: battleId, side: cardSide }}
          onClose={() => setCardSide(null)}
        />
      )}
    </div>
  );
}
