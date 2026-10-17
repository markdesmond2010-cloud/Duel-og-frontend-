import React, { useState, useEffect } from 'react';
import { isIOS, isStandalone, pushPermission, pushSupported, enablePush } from './push';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ---------------------------------------------------------------
// Install banner: shows every time the app opens until installed
// ---------------------------------------------------------------
export function InstallPrompt({ hasNav }) {
  const [deferred, setDeferred] = useState(null);
  const [hiddenUntil, setHiddenUntil] = useState(Number(localStorage.getItem('duel_install_snooze') || 0));
  const [installed, setInstalled] = useState(isStandalone());
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const canShow = !installed && Date.now() > hiddenUntil && (deferred || isIOS());
  if (!canShow) return null;

  const snooze = () => {
    const until = Date.now() + 6 * 60 * 60 * 1000; // ask again in 6 hours
    localStorage.setItem('duel_install_snooze', String(until));
    setHiddenUntil(until);
  };

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      try {
        await deferred.userChoice;
      } catch (e) {}
      setDeferred(null);
    } else {
      setHelp(true);
    }
  };

  return (
    <>
      <div className={`install-bar ${hasNav ? 'above-nav' : ''}`}>
        <img src="/icon-192.png" alt="" />
        <div className="install-text">
          <b>Install DUEL</b>
          <small>Faster access and notifications</small>
        </div>
        <button className="install-btn" onClick={install}>Install</button>
        <button className="install-x" onClick={snooze} aria-label="Not now">✕</button>
      </div>

      {help && (
        <div className="modal-overlay" onClick={() => setHelp(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add DUEL to your Home Screen</h3>
            <p>1. Tap the <b>Share</b> button in Safari (the square with an arrow).</p>
            <p>2. Scroll down and tap <b>Add to Home Screen</b>.</p>
            <p>3. Tap <b>Add</b>. DUEL now opens like a normal app.</p>
            <button className="modal-btn" onClick={() => setHelp(false)}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------
// Little tips: one-time tip per page + one "did you know" per day
// ---------------------------------------------------------------
const PAGE_TIPS = {
  vote: '👆 Tap a photo (or its button) to vote. Every vote earns you 5 Clout ⚡',
  upload: '📸 Choose a category first, so your photo meets the right rivals.',
  leaderboard: '🏆 Switch between All time, This month and This week, and filter by category.',
  profile: '⚔️ Challenge a friend to a head-to-head duel, and invite friends to earn 100 Clout each.'
};

const DAILY_TIPS = [
  '🔥 Finish today\'s daily challenge (10 quick duels) to earn 50 Clout.',
  '⚔️ Open anyone\'s profile and tap Challenge to start a head-to-head duel.',
  '🔔 Turn on notifications so you never miss a challenge or a vote.',
  '📲 Install DUEL on your home screen for one-tap access.',
  '📤 Share your rank card from your profile and bring friends to vote.',
  '👋 Invite friends with your link. You earn 100 Clout when they join.',
  '🏅 Win duels to unlock achievements and climb from Beginner to Champion.'
];

export function Tips({ page, hasNav = true }) {
  const [tip, setTip] = useState('');

  useEffect(() => {
    let seen = {};
    try {
      seen = JSON.parse(localStorage.getItem('duel_tips_seen') || '{}');
    } catch (e) {}
    const today = Math.floor(Date.now() / 86400000);
    let text = '';

    if (PAGE_TIPS[page] && !seen[page]) {
      text = PAGE_TIPS[page];
      seen[page] = true;
      localStorage.setItem('duel_tips_seen', JSON.stringify(seen));
    } else if (page === 'vote' && localStorage.getItem('duel_daily_tip') !== String(today)) {
      text = DAILY_TIPS[today % DAILY_TIPS.length];
      localStorage.setItem('duel_daily_tip', String(today));
    }

    if (!text) {
      setTip('');
      return;
    }
    const show = setTimeout(() => setTip(text), 900);
    const hide = setTimeout(() => setTip(''), 13000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [page]);

  if (!tip) return null;
  return (
    <div className={`tip-bubble ${hasNav ? 'above-nav' : ''}`}>
      <span>{tip}</span>
      <button onClick={() => setTip('')}>Got it</button>
    </div>
  );
}

// ---------------------------------------------------------------
// "+5 Clout" toast (any page can fire: window 'duel-clout' event)
// ---------------------------------------------------------------
export function CloutToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const onClout = (e) => {
      const { amount, daily } = e.detail || {};
      if (!amount) return;
      setToast({ amount, daily, id: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), daily ? 3200 : 1800);
    };
    window.addEventListener('duel-clout', onClout);
    return () => {
      window.removeEventListener('duel-clout', onClout);
      clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;
  return (
    <div key={toast.id} className="clout-toast">
      +{toast.amount} Clout ⚡
      {toast.daily && <small>Daily challenge complete! 🎉</small>}
    </div>
  );
}

// ---------------------------------------------------------------
// Welcome pop-up with the starter Clout (Nike-style "contender" brand)
// ---------------------------------------------------------------
export function WelcomeModal({ amount, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal welcome-modal">
        <div className="welcome-emoji">🔥</div>
        <h2>Welcome, Contender.</h2>
        <p className="welcome-line">Got a photo? You're a contender.</p>
        <div className="welcome-amount">+{amount} <span>Clout ⚡</span></div>
        <p className="welcome-sub">Your starter Clout is in. Earn more every time you play:</p>
        <ul className="welcome-list">
          <li><b>+5</b> every vote you cast</li>
          <li><b>+2</b> every vote your photo gets</li>
          <li><b>+100</b> your first photo upload</li>
          <li><b>+100</b> for every friend you invite</li>
          <li><b>+50</b> finishing the daily challenge</li>
        </ul>
        <button className="modal-btn welcome-btn" onClick={onClose}>Start dueling</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Polite "turn on notifications" ask (after the 3rd vote)
// ---------------------------------------------------------------
export function PushPrompt({ token }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const check = () => {
    if (!token || !pushSupported()) return;
    if (pushPermission() !== 'default') return;
    if (isIOS() && !isStandalone()) return;
    const votes = Number(localStorage.getItem('duel_votes_cast') || 0);
    const askedAt = Number(localStorage.getItem('duel_push_asked') || 0);
    if (votes >= 3 && Date.now() - askedAt > 3 * 86400000) setOpen(true);
  };

  useEffect(() => {
    check();
    window.addEventListener('duel-clout', check);
    return () => window.removeEventListener('duel-clout', check);
  }, [token]);

  if (!open) return null;

  const later = () => {
    localStorage.setItem('duel_push_asked', String(Date.now()));
    setOpen(false);
  };

  const turnOn = async () => {
    const r = await enablePush(token);
    localStorage.setItem('duel_push_asked', String(Date.now()));
    if (r.ok) {
      setMsg('🔔 Done! We will only send useful reminders.');
      setTimeout(() => setOpen(false), 1500);
    } else {
      setMsg(r.reason === 'denied' ? 'No problem. You can turn it on later in your profile.' : 'Could not turn on notifications right now.');
      setTimeout(() => setOpen(false), 2200);
    }
  };

  return (
    <div className="modal-overlay" onClick={later}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>🔔 Never miss a moment</h3>
        <p>Get a quick, polite reminder when someone challenges you, your photo gets votes, or you unlock something.</p>
        {msg ? (
          <p className="share-note small">{msg}</p>
        ) : (
          <>
            <button className="modal-btn" onClick={turnOn} style={{ textAlign: 'center', fontWeight: 700 }}>
              Turn on notifications
            </button>
            <button className="modal-cancel" onClick={later}>Maybe later</button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Notifications sheet (the bell)
// ---------------------------------------------------------------
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function NotificationsPanel({ token, onClose, onNavigate, onChanged }) {
  const [items, setItems] = useState(null);
  const [perm, setPerm] = useState(pushPermission());
  const [note, setNote] = useState('');

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token}` };
    fetch(`${API_URL}/api/notifications`, { headers: auth })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setItems(Array.isArray(list) ? list : []);
        // Opening the bell marks everything as read (the red number goes away)
        fetch(`${API_URL}/api/notifications/read`, { method: 'POST', headers: auth })
          .then(() => onChanged && onChanged())
          .catch(() => {});
      })
      .catch(() => setItems([]));
  }, []);

  const open = (n) => {
    const link = n.link || '/';
    if (link.startsWith('/b/')) {
      window.location.href = link;
      return;
    }
    const go = new URLSearchParams(link.split('?')[1] || '').get('go');
    onNavigate(go || 'vote');
    onClose();
  };

  const turnOn = async () => {
    const r = await enablePush(token);
    setPerm(pushPermission());
    setNote(
      r.ok
        ? '🔔 Phone notifications are on.'
        : r.reason === 'denied'
        ? 'Notifications were blocked. You can allow them in your browser settings.'
        : 'Could not turn on notifications right now.'
    );
  };

  const iosNeedsInstall = isIOS() && !isStandalone();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal notif-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="notif-head">
          <h3>🔔 Notifications</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {perm === 'default' && !iosNeedsInstall && pushSupported() && (
          <button className="notif-enable" onClick={turnOn}>
            🔔 Turn on phone notifications
          </button>
        )}
        {iosNeedsInstall && (
          <p className="share-note small">To get notifications on iPhone, first add DUEL to your Home Screen (Share → Add to Home Screen).</p>
        )}
        {perm === 'denied' && (
          <p className="share-note small">Notifications are blocked for this site. Allow them in your browser settings to get reminders.</p>
        )}
        {perm === 'granted' && <p className="share-note small">🔔 Phone notifications are on.</p>}
        {note && <p className="share-note small">{note}</p>}

        {items === null && <p className="share-note">⏳ Loading...</p>}
        {items && items.length === 0 && (
          <p className="share-note">Nothing yet. Vote, upload and challenge friends to get things moving.</p>
        )}
        {items &&
          items.map((n) => (
            <button key={n.id} className={`notif-item ${n.readAt ? '' : 'unread'}`} onClick={() => open(n)}>
              <span>{n.text}</span>
              <small>{timeAgo(n.createdAt)}</small>
            </button>
          ))}
      </div>
    </div>
  );
}
