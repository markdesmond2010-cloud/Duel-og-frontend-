import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeLeft(endsAt) {
  const ms = endsAt - Date.now();
  if (ms <= 0) return 'Ended';
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h left`;
}

export function PhotoPickerModal({ title, photos, onPick, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {photos.length === 0 ? (
          <p>Upload a photo first, then you can use it here.</p>
        ) : (
          <div className="pic-picker">
            {photos.map((ph) => (
              <button key={ph.id} className="pic-option" onClick={() => onPick(ph.id)}>
                <img src={ph.imageUrl} alt={ph.title} />
              </button>
            ))}
          </div>
        )}
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// Challenge someone to a head-to-head duel
export function ChallengeModal({ token, toUsername, onClose, onSent }) {
  const [username, setUsername] = useState(toUsername || '');
  const [photos, setPhotos] = useState([]);
  const [photoId, setPhotoId] = useState(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token}` };
    fetch(`${API_URL}/api/auth/me`, { headers: auth })
      .then((r) => r.json())
      .then((me) => fetch(`${API_URL}/api/users/${me.id}/photos`))
      .then((r) => r.json())
      .then((list) => setPhotos(Array.isArray(list) ? list : []))
      .catch(() => {});
  }, []);

  const send = async () => {
    if (!username.trim() || !photoId) {
      setMsg('Enter a username and pick one of your photos.');
      return;
    }
    setSending(true);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUsername: username.trim(), photoId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send the challenge');
      if (onSent) onSent();
      onClose();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
    setSending(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>⚔️ Challenge to a duel</h3>
        <input
          className="challenge-input"
          type="text"
          placeholder="@username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, ''))}
          autoCapitalize="none"
        />
        <p>Pick the photo you'll fight with:</p>
        {photos.length === 0 ? (
          <p>Upload a photo first.</p>
        ) : (
          <div className="pic-picker">
            {photos.map((ph) => (
              <button
                key={ph.id}
                className={`pic-option ${photoId === ph.id ? 'chosen' : ''}`}
                onClick={() => setPhotoId(ph.id)}
              >
                <img src={ph.imageUrl} alt={ph.title} />
              </button>
            ))}
          </div>
        )}
        {msg && <p className="share-note small">{msg}</p>}
        <button className="modal-btn" onClick={send} disabled={sending}>
          {sending ? 'Sending...' : '⚔️ Send challenge'}
        </button>
        <button className="modal-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

export default function ChallengesPanel({ token, photos, onChanged }) {
  const [items, setItems] = useState([]);
  const [acceptFor, setAcceptFor] = useState(null);
  const [newChallenge, setNewChallenge] = useState(false);
  const [msg, setMsg] = useState('');

  const auth = { Authorization: `Bearer ${token}` };

  const load = () => {
    fetch(`${API_URL}/api/challenges`, { headers: auth })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (path, body) => {
    try {
      const res = await fetch(`${API_URL}/api/challenges/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify(body || {})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      load();
      if (onChanged) onChanged();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const shareBattle = async (id, a, b) => {
    const url = `${window.location.origin}/b/${id}`;
    const text = `Who wins? @${a} vs @${b} on DUEL. Cast your vote: ${url}`;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(url);
        setMsg('🔗 Battle link copied');
      }
    } catch (e) {}
  };

  const incoming = items.filter((c) => c.role === 'to' && c.status === 'pending');
  const outgoing = items.filter((c) => c.role === 'from' && c.status === 'pending');
  const battles = items.filter((c) => c.status === 'accepted');

  return (
    <div className="tier-box">
      <h4 className="ach-title" style={{ marginTop: 0 }}>⚔️ Challenges</h4>
      <button className="modal-btn" onClick={() => setNewChallenge(true)}>
        ⚔️ Challenge someone
      </button>
      {msg && <p className="share-note small">{msg}</p>}

      {incoming.length > 0 && (
        <div className="chal-group">
          <b>Challenges for you</b>
          {incoming.map((c) => (
            <div key={c.id} className="chal-item">
              <img src={c.from.imageUrl} alt="" />
              <div className="chal-text">
                <b>@{c.from.username}</b> challenged you
                <div className="chal-actions">
                  <button className="chal-accept" onClick={() => setAcceptFor(c.id)}>Accept</button>
                  <button className="chal-decline" onClick={() => act(`${c.id}/decline`)}>Decline</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="chal-group">
          <b>Waiting for a reply</b>
          {outgoing.map((c) => (
            <div key={c.id} className="chal-item">
              <img src={c.from.imageUrl} alt="" />
              <div className="chal-text">
                You challenged <b>@{c.to.username}</b>
                <div className="chal-actions">
                  <button className="chal-decline" onClick={() => act(`${c.id}/cancel`)}>Cancel</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {battles.length > 0 && (
        <div className="chal-group">
          <b>Battles</b>
          {battles.map((c) => (
            <div key={c.id} className="chal-item">
              <img src={c.from.imageUrl} alt="" />
              <img src={c.to.imageUrl} alt="" />
              <div className="chal-text">
                @{c.from.username} vs @{c.to.username}
                <div className="chal-score">
                  {c.votesFrom} – {c.votesTo} · {c.ended ? (c.winner === 'tie' ? 'Tie' : `@${c[c.winner].username} won`) : timeLeft(c.endsAt)}
                </div>
                <div className="chal-actions">
                  <button className="chal-accept" onClick={() => (window.location.href = `/b/${c.id}`)}>Open</button>
                  <button className="chal-decline" onClick={() => shareBattle(c.id, c.from.username, c.to.username)}>Share</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {incoming.length + outgoing.length + battles.length === 0 && (
        <p className="tier-note">No challenges yet. Challenge a friend and let the crowd decide!</p>
      )}

      {acceptFor && (
        <PhotoPickerModal
          title="Pick your photo for this duel"
          photos={photos}
          onPick={(photoId) => {
            const id = acceptFor;
            setAcceptFor(null);
            act(`${id}/accept`, { photoId });
          }}
          onClose={() => setAcceptFor(null)}
        />
      )}

      {newChallenge && (
        <ChallengeModal
          token={token}
          onClose={() => setNewChallenge(false)}
          onSent={() => {
            setMsg('✅ Challenge sent!');
            load();
          }}
        />
      )}
    </div>
  );
}
