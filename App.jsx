import React, { useState, useEffect } from 'react';
import './App.css';
import AuthPage from './AuthPage';
import VotePage from './VotePage';
import UploadPage from './UploadPage';
import LeaderboardPage from './LeaderboardPage';
import ProfilePage from './ProfilePage';
import AdminPage from './AdminPage';

// Remember who invited this visitor (?ref=username) until they sign up
try {
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref) localStorage.setItem('duel_ref', ref);
} catch (e) {}

export default function App() {
  const [currentPage, setCurrentPage] = useState('auth');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('duel_token'));
  const [stats, setStats] = useState({ totalPhotos: 0, totalUsers: 0 });

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
    if (token) fetchStats();
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
  };

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <h1 className="logo">📸 DUEL</h1>
            <nav className="nav">
              <button 
                className={`nav-btn ${currentPage === 'vote' ? 'active' : ''}`}
                onClick={() => setCurrentPage('vote')}
              >
                🗳️ Vote
              </button>
              <button 
                className={`nav-btn ${currentPage === 'upload' ? 'active' : ''}`}
                onClick={() => setCurrentPage('upload')}
              >
                📸 Upload
              </button>
              <button 
                className={`nav-btn ${currentPage === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setCurrentPage('leaderboard')}
              >
                🏆 Top
              </button>
              <button 
                className={`nav-btn ${currentPage === 'profile' ? 'active' : ''}`}
                onClick={() => setCurrentPage('profile')}
              >
                👤 {user?.displayName || user?.username}
              </button>
              {user?.isAdmin && (
                <button
                  className={`nav-btn ${currentPage === 'admin' ? 'active' : ''}`}
                  onClick={() => setCurrentPage('admin')}
                >
                  🛡️ Admin
                </button>
              )}
            </nav>
            <div className="stats">
              <span>📊 {stats.totalPhotos} photos</span>
              <button onClick={logout} className="btn-logout">Logout</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {currentPage === 'vote' && <VotePage token={token} />}
        {currentPage === 'upload' && <UploadPage token={token} onUploadSuccess={() => setCurrentPage('vote')} />}
        {currentPage === 'leaderboard' && <LeaderboardPage />}
        {currentPage === 'profile' && <ProfilePage token={token} user={user} onLogout={logout} onPhotosChanged={fetchStats} />}
        {currentPage === 'admin' && user?.isAdmin && <AdminPage token={token} onPhotosChanged={fetchStats} />}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>🎯 Vote on photos. Get ranked. Share your results.</p>
      </footer>
    </div>
  );
}
