import React, { useState, useEffect } from 'react';
import { CATEGORIES } from './categories';
import './VotePage.css';

const QUESTIONS = {
  '': { q: 'Which photo is better?', hint: 'Tap the one you like more' },
  fashion: { q: 'Which outfit looks better?', hint: 'Tap the outfit you like more' },
  selfies: { q: 'Which selfie is better?', hint: 'Tap the selfie you like more' },
  photography: { q: 'Which photo is more creative?', hint: 'Tap the photo you find more creative' }
};

const INTRO_KEY = 'duel_intro_seen';
const readIntroSeen = () => {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch (e) {
    return false;
  }
};

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
  const [category, setCategory] = useState('');
  const [daily, setDaily] = useState(null);
  const [showIntro, setShowIntro] = useState(() => !readIntroSeen());

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const auth = { Authorization: `Bearer ${token}` };

  const loadDaily = () => {
    fetch(`${API_URL}/api/daily`, { headers: auth })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDaily(d))
      .catch(() => {});
  };

  useEffect(() => {
    loadNextMatchup();
  }, [category]);

  useEffect(() => {
    loadDaily();
  }, []);

  const loadNextMatchup = async () => {
    setLoading(true);
    setVoting(false);
    setSelectedId(null);
    setStatus('');
    setAgree('');
    setEmptyCode('');

    try {
      const res = await fetch(
        `${API_URL}/api/matchup/next${category ? `?category=${category}` : ''}`,
        { headers: auth }
      );
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
        headers: { 'Content-Type': 'application/json', ...auth },
        body: JSON.stringify({
          photoAId: matchup.photoA.id,
          photoBId: matchup.photoB.id,
          winnerId,
          matchToken: matchup.matchToken
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
        // Too quick: let them try again on the same battle
        if (res.status === 429 && /quick/i.test(data.error || '')) {
          setVoting(false);
          return;
        }
        setTimeout(loadNextMatchup, 1600);
        return;
      }

      setStatus('✅ Vote recorded');
      if (data.pairVotes && data.pairVotes.total >= 3) {
        const pct = Math.round((data.pairVotes.winnerVotes / data.pairVotes.total) * 100);
        setAgree(`${pct}% of voters picked the same photo`);
      }
      loadDaily();
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
        headers: { 'Content-Type': 'application/json', ...auth },
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

  const closeIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, '1');
    } catch (e) {}
  };

  const question = QUESTIONS[category] || QUESTIONS[''];

  const intro = showIntro ? (
    <div className="intro-card">
      <div className="intro-title">👋 Welcome to Duel</div>
      <p className="intro-lead">
        Duel is a photo contest where <b>people like you decide the winner</b>. Your votes rank everyone's photos.
      </p>
      <ol className="intro-steps">
        <li><span>1</span> Two photos show up side by side</li>
        <li><span>2</span> Tap the one you think is <b>better</b>: the better selfie, outfit or photo</li>
        <li><span>3</span> Your vote pushes the winner up the <b>Top</b> ranking</li>
      </ol>
      <p className="intro-note">No wrong answers. Just pick the one you like more.</p>
      <button className="intro-btn" onClick={closeIntro}>Got it, let's vote</button>
    </div>
  ) : (
    <button className="intro-link" onClick={() => setShowIntro(true)}>ℹ️ How does this work?</button>
  );

  const filters = (
    <>
      {intro}
      {daily && (
        <div className={`daily-card ${daily.done ? 'done' : ''}`}>
          <div className="daily-top">
            <b>{daily.done ? '✅ Daily challenge complete!' : '🔥 Daily challenge'}</b>
            {daily.streak > 0 && <span>🔥 {daily.streak}-day streak</span>}
          </div>
          <div className="daily-text">
            Vote on {daily.goal} <b>{daily.categoryLabel}</b> battles today: {Math.min(daily.votes, daily.goal)}/{daily.goal}
          </div>
          <div className="daily-bar">
            <div style={{ width: `${Math.min(100, (daily.votes / daily.goal) * 100)}%` }} />
          </div>
          {category !== daily.category && !daily.done && (
            <button className="daily-play" onClick={() => setCategory(daily.category)}>
              Play today's category
            </button>
          )}
        </div>
      )}
      <div className="cat-chips vote-chips">
        <button className={`cat-chip ${category === '' ? 'active' : ''}`} onClick={() => setCategory('')}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`cat-chip ${category === c.key ? 'active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.emoji} {c.short}
          </button>
        ))}
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="page vote-page">
        {filters}
        <div className="loading">⏳ Loading battle...</div>
      </div>
    );
  }

  if (!matchup) {
    let message = '❌ Could not load photos. Check your connection and try again.';
    if (emptyCode === 'NOT_ENOUGH_PHOTOS') {
      message = category
        ? '📸 No battles in this category yet. Try another one, or upload a photo here!'
        : '📸 Not enough photos from other people yet. Upload yours and invite friends to join!';
    } else if (emptyCode === 'ALL_VOTED') {
      message = "🎉 You've voted on every battle here for now. Come back later when more photos are uploaded!";
    }
    return (
      <div className="page vote-page">
        {filters}
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
          <button className="battle-report" onClick={() => setReportTarget(photo)} disabled={voting}>
            🚩 Report
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page vote-page">
      {filters}
      <h2 className="battle-title">{question.q}</h2>
      <p className="battle-sub">Your vote helps decide who ranks higher</p>

      <div className="battle">
        {renderSide(matchup.photoA, 'A')}
        <div className="battle-vs">VS</div>
        {renderSide(matchup.photoB, 'B')}
      </div>

      <div className="battle-status">
        {status || question.hint}
        {agree && <div className="battle-agree">{agree}</div>}
      </div>

      {reportTarget && (
        <div className="modal-overlay" onClick={() => setReportTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Report this photo</h3>
            <p>Why are you reporting it?</p>
            {REPORT_REASONS.map((reason) => (
              <button key={reason} className="modal-btn" onClick={() => handleReport(reason)}>
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
