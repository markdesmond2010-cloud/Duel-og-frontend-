import React, { useState, useEffect } from 'react';
import './App.css';
import './Nav.css';
import Tour, { TOUR_STEPS } from './Tour';
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


// Clean line icons for the bottom navigation (inherit the tab colour)
const NAV_ICONS = {
  vote: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </>
  ),
  top: (
    <>
      <path d="M8 4h8v5a4 4 0 01-8 0V4z" />
      <path d="M8 6H5v1a3 3 0 003 3M16 6h3v1a3 3 0 01-3 3M12 13v4M9 20h6M10 17h4" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  admin: <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
};

function NavIcon({ name }) {
  return (
    <span>
      <svg viewBox="0 0 24 24" aria-hidden="true">{NAV_ICONS[name]}</svg>
    </span>
  );
}

function MainApp() {
  const [currentPage, setCurrentPage] = useState('auth');
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'auth'
  const [authMode, setAuthMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('duel_token'));
  const [stats, setStats] = useState({ totalPhotos: 0, totalUsers: 0 });
  const [tourStep, setTourStep] = useState(null); // null = tour closed

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
      setCurrentPage('vote');
    }
    fetchStats();
  }, [token]);

  // Keep the photo counter fresh when switching pages
  useEffect(() => {
    if (token) {
      fetchStats();
      fetchCurrentUser();
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
      } else {
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
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

  // First-time tour: show once per account on this device
  const tourKey = user?.id ? `duel_tour_done_${user.id}` : null;
  useEffect(() => {
    if (!tourKey) return;
    let seen = false;
    try {
      seen = localStorage.getItem(tourKey) === '1';
    } catch (e) {}
    if (!seen) setTourStep(0);
  }, [tourKey]);

  // Move to the page each tour step talks about
  useEffect(() => {
    if (tourStep !== null && TOUR_STEPS[tourStep]) setCurrentPage(TOUR_STEPS[tourStep].page);
  }, [tourStep]);

  const closeTour = () => {
    setTourStep(null);
    setCurrentPage('vote');
    if (tourKey) {
      try {
        localStorage.setItem(tourKey, '1');
      } catch (e) {}
    }
  };
  const tourTab = tourStep !== null ? TOUR_STEPS[tourStep]?.tab : null;

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
        <LandingPage
          onJoin={(mode, notice) => {
            setAuthMode(mode || 'login');
            setAuthNotice(notice || '');
            setAuthView('auth');
          }}
        />
      );
    }
    return (
      <AuthPage
        onLogin={handleLogin}
        initialMode={authMode}
        notice={authNotice}
        onBack={() => setAuthView('landing')}
      />
    );
  }

  return (
    <div className="app">
      {/* Header (compact) */}
      <header className="header">
        <div className="header-content">
          <h1 className="logo">📸 DUEL</h1>
          <button className="tour-help" onClick={() => setTourStep(0)} aria-label="How Duel works">?</button>
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
      <nav className={`bottom-nav ${tourStep !== null ? 'tour-active' : ''}`}>
        <button
          className={`bn-btn ${currentPage === 'vote' ? 'active' : ''} ${tourTab === 'vote' ? 'tour-spot' : ''}`}
          onClick={() => setCurrentPage('vote')}
        >
          <NavIcon name="vote" />Vote
        </button>
        <button
          className={`bn-btn ${currentPage === 'upload' ? 'active' : ''} ${tourTab === 'upload' ? 'tour-spot' : ''}`}
          onClick={() => setCurrentPage('upload')}
        >
          <NavIcon name="upload" />Upload
        </button>
        <button
          className={`bn-btn ${currentPage === 'leaderboard' ? 'active' : ''} ${tourTab === 'leaderboard' ? 'tour-spot' : ''}`}
          onClick={() => setCurrentPage('leaderboard')}
        >
          <NavIcon name="top" />Top
        </button>
        <button
          className={`bn-btn ${currentPage === 'profile' ? 'active' : ''} ${tourTab === 'profile' ? 'tour-spot' : ''}`}
          onClick={() => setCurrentPage('profile')}
        >
          <NavIcon name="profile" />Profile
          {user?.pendingChallenges > 0 && <i className="bn-dot" />}
        </button>
        {user?.isAdmin && (
          <button
            className={`bn-btn ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentPage('admin')}
          >
            <NavIcon name="admin" />Admin
          </button>
        )}
      </nav>

      {tourStep !== null && (
        <Tour
          step={tourStep}
          onNext={() => setTourStep((n) => Math.min(n + 1, TOUR_STEPS.length - 1))}
          onBack={() => setTourStep((n) => Math.max(n - 1, 0))}
          onClose={closeTour}
        />
      )}
    </div>
  );
}

export default function App() {
  if (photoMatch) {
    return (
      <PhotoPage
        photoId={decodeURIComponent(photoMatch[1])}
        loggedIn={!!localStorage.getItem('duel_token')}
      />
    );
  }
  if (battleMatch) {
    return <BattlePage battleId={decodeURIComponent(battleMatch[1])} />;
  }
  if (profileMatch) {
    return (
      <PublicProfile
        username={decodeURIComponent(profileMatch[1])}
        loggedIn={!!localStorage.getItem('duel_token')}
      />
    );
  }
  return <MainApp />;
}
