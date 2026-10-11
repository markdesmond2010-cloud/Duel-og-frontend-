import React, { useState, useEffect } from 'react';

export default function ProfilePage({ token, user, onLogout }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (user?.id) {
      loadPhotos();
    }
  }, [user]);

  const loadPhotos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}/photos`);
      const data = await res.json();
      setPhotos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName, bio })
      });

      if (!res.ok) throw new Error('Update failed');

      setMessage('✅ Profile updated!');
      setEditing(false);
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage('❌ Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const shareLink = `${window.location.origin}/user/${user?.id}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${user.displayName}'s DUEL Profile`,
        url: shareLink
      });
    } else {
      navigator.clipboard.writeText(shareLink);
      setMessage('🔗 Link copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  return (
    <div className="page profile-page">
      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.displayName} className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {user?.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}

          {!editing ? (
            <>
              <h2>{user?.displayName}</h2>
              <p className="username">@{user?.username}</p>
              {user?.bio && <p className="bio">{user.bio}</p>}
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            </>
          ) : (
            <div className="edit-form">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display Name"
                maxLength={50}
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio (optional)"
                maxLength={150}
                rows={2}
              />
              <div className="edit-actions">
                <button 
                  className="btn-primary" 
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? '⏳ Saving...' : '✅ Save'}
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && <div className="profile-message">{message}</div>}

          <button className="btn-share" onClick={handleShare}>
            📱 Share My Profile
          </button>
        </div>

        {/* User's Photos */}
        <div className="profile-photos">
          <h3>My Photos ({photos.length})</h3>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : photos.length === 0 ? (
            <div className="empty-state-small">
              No photos yet. Upload your first one!
            </div>
          ) : (
            <div className="photos-grid">
              {photos.map(photo => (
                <div key={photo.id} className="photo-grid-item">
                  <img src={photo.imageUrl} alt={photo.title} />
                  <div className="photo-grid-info">
                    <p className="photo-grid-title">{photo.title}</p>
                    <p className="photo-grid-rating">⭐ {Math.round(photo.rating)}</p>
                    <p className="photo-grid-record">{photo.wins}W - {photo.losses}L</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button className="btn-logout-full" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
