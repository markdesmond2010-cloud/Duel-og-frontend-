import React, { useState, useEffect } from 'react';

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState(localStorage.getItem('duel_ref') ? 'signup' : 'login'); // 'login' or 'signup'
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Live numbers for the intro (public endpoint, also wakes the server up)
  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'login' 
        ? '/api/auth/login' 
        : '/api/auth/signup';

      const payload = mode === 'login'
        ? { email: formData.email, password: formData.password }
        : { ...formData, ref: localStorage.getItem('duel_ref') || undefined };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Auth failed');
      }

      const { token, user } = await res.json();
      onLogin(token, user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      // Get Google auth URL
      const res = await fetch(`${API_URL}/api/auth/google-url`);
      const { url } = await res.json();
      
      // Redirect to Google
      window.location.href = url;
    } catch (err) {
      setError('Google auth failed');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>📸 DUEL</h1>
          <h2 className="auth-tagline">Which photo wins? You decide.</h2>
          <p className="auth-sub">Upload your best shot. Let the crowd rank it.</p>
        </div>

        <div className="how-it-works">
          <div className="how-step"><span>📤</span><b>Upload</b><small>your best shot</small></div>
          <div className="how-step"><span>🗳️</span><b>Duel</b><small>people pick winners</small></div>
          <div className="how-step"><span>🏆</span><b>Rank up</b><small>climb the board</small></div>
        </div>

        {stats && stats.totalPhotos > 0 && (
          <div className="auth-stats">
            🔥 {stats.totalPhotos} photos · {stats.totalUsers} players · {stats.totalMatches || 0} duels
          </div>
        )}

        <div className="auth-form">
          <div className="mode-toggle">
            <button 
              className={`mode-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button 
              className={`mode-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => setMode('signup')}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleEmailAuth}>
            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="myname"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    name="displayName"
                    placeholder="My Name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Loading...' : mode === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="divider">OR</div>

          <button 
            className="btn-google"
            onClick={handleGoogleAuth}
            disabled={loading}
          >
            🔐 Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
