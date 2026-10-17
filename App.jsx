import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './AuthPage';
import VotePage from './VotePage';
import UploadPage from './UploadPage';
import LeaderboardPage from './LeaderboardPage';
import ProfilePage from './ProfilePage';
import AdminPage from './AdminPage';
import PublicProfile from './PublicProfile';
import LandingPage from './LandingPage';
import PhotoPage from './PhotoPage';
import BattlePage from './BattlePage';
import { InstallPrompt, Tips, NotificationsPanel, WelcomeModal, CloutToast, PushPrompt } from './Engage';
import { registerSW, syncPush } from './push';

// Public profile links look like /u/<username>
const profileMatch = window.location.pathname.match(/^\/u\/([^/]+)\/?$/);

// Photo and battle links look like /p/<photoId> and /b/<battleId>
const photoMatch = window.location.pathname.match(/^\/p\/([^/]+)\/?$/);
const battleMatch = window.location.pathname.match(/^\/b\/([^/]+)\/?$/);

// Remember who invited this visitor (?ref=username or /u/username) until they sign up
try {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref') || (profileMatch ? decodeURIComponent(profileMatch[1]) : null);
  if (ref && !localStorage.getItem('duel_token')) localStorage.setItem('duel_ref', ref);
} catch (e) {}

function MainApp() {
  const [currentPage, setCurrentPage] = useState('auth');
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'auth'
  const [authMode, setAuthMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('duel_token'));
  const [stats, setStats] = useState({ totalPhotos: 0, totalUsers: 0 });
  const [showNotifs, setShowNotifs] = useState(false);
  const [welcome, setWelcome] = useState(0);
  const [dailyOpen, setDailyOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Finish Google sign-in when Google redirects back with ?code=
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (window.location.pathname === '/auth/google/callback' && code) {
      fetch(`${API_URL}/api/auth/google-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, ref: localStorage.getItem('duel_ref') || undefined })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.token) handleLogin(data.token, data.user);
        })
        .catch((err) => console.error('Google login failed:', err))
        .finally(() => window.history.replaceState({}, '', '/'));
    }
  }, []);

  // Check if user is already logged in
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      const go = new URLSearchParams(window.location.search).get('go');
      setCurrentPage(['vote', 'upload', 'leaderboard', 'profile'].includes(go) ? go : 'vote');
      if (go) window.history.replaceState({}, '', '/');
      syncPush(token);
    }
    fetchStats();
  }, [token]);

  // Keep the red dots fresh while the app is open
  useEffect(() => {
    if (!token) return;
    const tick = () => {
      fetchCurrentUser();
      fetchDaily();
    };
    const id = setInterval(tick, 60000);
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token]);

  // Keep the photo counter fresh when switching pages
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchCurrentUser();
      fetchDaily();
    }
  }, [currentPage]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        if (userData.welcomeBonus > 0) setWelcome(userData.welcomeBonus);
      } else if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchDaily = async () => {
    try {
      const res = await fetch(`${API_URL}/api/daily`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setDailyOpen(!d.done);
      }
    } catch (err) {}
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleLogin = (authToken, userData) => {
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('duel_token', authToken);
    localStorage.removeItem('duel_ref');
    setCurrentPage('vote');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('duel_token');
    setCurrentPage('auth');
    setAuthView('landing');
  };

  if (!token) {
    if (authView === 'landing') {
      return (
        <>
          <LandingPage
            onJoin={(mode, notice) => {
              setAuthMode(mode || 'login');
              setAuthNotice(notice || '');
              setAuthView('auth');
            }}
          />
          <InstallPrompt hasNav={false} />
        </>
      );
    }
    return (
      <>
        <AuthPage
          onLogin={handleLogin}
          initialMode={authMode}
          notice={authNotice}
          onBack={() => setAuthView('landing')}
        />
        <InstallPrompt hasNav={false} />
      </>
    );
  }

  return (
    <div className="app">
      {/* Header (compact) */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">📸 DUEL</h1>
          <div className="header-right">
            <span className="clout-chip" title="Your Clout">⚡ {user?.clout ?? 0}</span>
            <button className="bell-btn" onClick={() => setShowNotifs(true)} aria-label="Notifications">
              🔔
              {user?.unreadNotifications > 0 && (
                <i className="bell-badge">{user.unreadNotifications > 9 ? '9+' : user.unreadNotifications}</i>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {currentPage === 'vote' && <VotePage token={token} />}
        {currentPage === 'upload' && <UploadPage token={token} onUploadSuccess={() => setCurrentPage('vote')} />}
        {currentPage === 'leaderboard' && <LeaderboardPage />}
        {currentPage === 'profile' && <ProfilePage token={token} user={user} onLogout={logout} onPhotosChanged={fetchStats} onProfileUpdated={fetchCurrentUser} />}
        {currentPage === 'admin' && user?.isAdmin && <AdminPage token={token} onPhotosChanged={fetchStats} />}
      </main>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        <button
          className={`bn-btn ${currentPage === 'vote' ? 'active' : ''}`}
          onClick={() => setCurrentPage('vote')}
        >
          <span>🗳️</span>Vote
          {dailyOpen && <i className="bn-dot" />}
        </button>
        <button
          className={`bn-btn ${currentPage === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentPage('upload')}
        >
          <span>📸</span>Upload
        </button>
        <button
          className={`bn-btn ${currentPage === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('leaderboard')}
        >
          <span>🏆</span>Top
        </button>
        <button
          className={`bn-btn ${currentPage === 'profile' ? 'active' : ''}`}
          onClick={() => setCurrentPage('profile')}
        >
          <span>👤</span>Profile
          {user?.pendingChallenges > 0 && <i className="bn-dot" />}
        </button>
        {user?.isAdmin && (
          <button
            className={`bn-btn ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentPage('admin')}
          >
            <span>🛡️</span>Admin
          </button>
        )}
      </nav>

      <Tips page={currentPage} hasNav />
      <CloutToast />
      <PushPrompt token={token} />
      <InstallPrompt hasNav />

      {showNotifs && (
        <NotificationsPanel
          token={token}
          onClose={() => setShowNotifs(false)}
          onNavigate={setCurrentPage}
          onChanged={fetchCurrentUser}
        />
      )}

      {welcome > 0 && <WelcomeModal amount={welcome} onClose={() => setWelcome(0)} />}
    </div>
  );
}

export default function App() {
  // Lets the phone install DUEL and receive notifications
  useEffect(() => {
    registerSW();
  }, []);

  if (photoMatch) {
    return (
      <>
        <PhotoPage
          photoId={decodeURIComponent(photoMatch[1])}
          loggedIn={!!localStorage.getItem('duel_token')}
        />
        <InstallPrompt hasNav={false} />
      </>
    );
  }
  if (battleMatch) {
    return (
      <>
        <BattlePage battleId={decodeURIComponent(battleMatch[1])} />
        <InstallPrompt hasNav={false} />
      </>
    );
  }
  if (profileMatch) {
    return (
      <>
        <PublicProfile
          username={decodeURIComponent(profileMatch[1])}
          loggedIn={!!localStorage.getItem('duel_token')}
        />
        <InstallPrompt hasNav={false} />
      </>
    );
  }
  return <MainApp />;
}
