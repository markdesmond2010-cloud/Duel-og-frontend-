import React, { useState, useEffect } from 'react';
import ShareCard from './ShareCard';

export default function ProfilePage({ token, user, onLogout, onPhotosChanged, onProfileUpdated }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [cardPhoto, setCardPhoto] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bestRank, setBestRank] = useState(null);
  const [ach, setAch] = useState(null);

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

  // Best rank comes from the public profile endpoint
  useEffect(() => {
    if (!user?.username) return;
    fetch(`${API_URL}/api/public/profile/${encodeURIComponent(user.username)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBestRank(d ? d.bestRank : null))
      .catch(() => {});
  }, [user?.username, photos.length]);

  // Tier + achievements (computed on the server)
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/achievements`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setAch(d))
      .catch(() => {});
  }, [token, photos.length]);

  const totalWins = photos.reduce((sum, p) => sum + (p.wins || 0), 0);
  const totalBattles = photos.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);
  const winRate = totalBattles ? Math.round((totalWins / totalBattles) * 100) : 0;

  const setProfilePicture = async (photoId) => {
    try {
      const res = await fetch(`${API_URL}/api/profile/picture`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ photoId })
      });
      if (!res.ok) throw new Error('Update failed');
      setPickerOpen(false);
      setMessage('✅ Profile picture updated');
      setTimeout(() => setMessage(''), 2000);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      setMessage('❌ Could not update profile picture');
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (!window.confirm(`Delete "${photo.title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`${API_URL}/api/photos/${photo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete failed');

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setMessage('🗑️ Photo deleted');
      setTimeout(() => setMessage(''), 2000);
      if (onPhotosChanged) onPhotosChanged();
    } catch (err) {
      setMessage('❌ Could not delete photo');
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
        body: JSON.stringify({ displayName, bio, username })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }

      setMessage('✅ Profile updated!');
      setEditing(false);
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setMessage(''), 2000);
    } catch (err) {
      setMessage(`❌ ${err.message || 'Failed to update profile'}`);
    } finally {
      setSaving(false);
    }
  };

  const shareLink = `${window.location.origin}/u/${user?.username || ''}`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on DUEL',
        text: 'Which photo wins? Upload your best shot and let the crowd rank it.',
        url: shareLink
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareLink);
      setMessage('🔗 Invite link copied!');
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
          <button className="change-pic-btn" onClick={() => setPickerOpen(true)}>
            📷 Change profile picture
          </button>

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
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="Username"
                maxLength={20}
                autoCapitalize="none"
              />
              <p className="username-hint">
                Your link: {window.location.host}/u/{username || 'username'}
              </p>
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

          <div className="profile-summary">
            <div><b>{bestRank ? `#${bestRank}` : '–'}</b><small>BEST RANK</small></div>
            <div><b>{totalBattles}</b><small>BATTLES</small></div>
            <div><b>{totalWins}</b><small>WINS</small></div>
            <div><b>{winRate}%</b><small>WIN RATE</small></div>
          </div>

          <button className="btn-share" onClick={handleShare}>
            👋 Invite friends
          </button>
          <p className="invite-count">
            {user?.invitedCount > 0
              ? `🎉 ${user.invitedCount} friend${user.invitedCount === 1 ? '' : 's'} joined with your link`
              : 'Share your link to bring friends in'}
          </p>
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
                    <p className="photo-grid-rating">Rating: {Math.round(photo.rating)}</p>
                    <p className="photo-grid-record">
                      Record: {photo.wins} {photo.wins === 1 ? 'win' : 'wins'} · {photo.losses} {photo.losses === 1 ? 'loss' : 'losses'}
                    </p>
                    <button
                      className="photo-share-btn"
                      onClick={() => setCardPhoto(photo)}
                    >
                      📤 Share
                    </button>
                    <button
                      className="photo-delete-btn"
                      onClick={() => handleDeletePhoto(photo)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {ach && (
          <div className="tier-box">
            <div className="tier-line">
              {ach.tier.emoji} <b>{ach.tier.name}</b>
              <span> · {ach.tier.wins} {ach.tier.wins === 1 ? 'win' : 'wins'}</span>
            </div>
            {ach.tier.nextMin ? (
              <>
                <div className="tier-bar">
                  <div
                    className="tier-fill"
                    style={{
                      width: `${Math.min(100, ((ach.tier.wins - ach.tier.min) / (ach.tier.nextMin - ach.tier.min)) * 100)}%`
                    }}
                  />
                </div>
                <small>{ach.tier.nextMin - ach.tier.wins} more wins to reach {ach.tier.nextName}</small>
              </>
            ) : (
              <small>You've reached the top tier!</small>
            )}
            <p className="tier-note">
              Your tier grows with every vote you receive:{' '}
              {ach.tiers.map((t) => `${t.name} ${t.min}+`).join(' · ')}
            </p>

            <h4 className="ach-title">🏅 Achievements</h4>
            <div className="ach-list">
              {ach.achievements.map((a) => (
                <div key={a.id} className={`ach ${a.earned ? 'earned' : ''}`}>
                  <div>
                    <b>{a.name}</b>
                    <small>{a.description}</small>
                  </div>
                  <span>{a.earned ? '✓' : `${a.current}/${a.target}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pickerOpen && (
          <div className="modal-overlay" onClick={() => setPickerOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Choose your profile picture</h3>
              {photos.length === 0 ? (
                <p>Upload a photo first, then you can use it here.</p>
              ) : (
                <>
                  <p>Pick one of your uploaded photos.</p>
                  <div className="pic-picker">
                    {photos.map((ph) => (
                      <button key={ph.id} className="pic-option" onClick={() => setProfilePicture(ph.id)}>
                        <img src={ph.imageUrl} alt={ph.title} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button className="modal-btn" onClick={() => setProfilePicture(null)}>
                Use a letter avatar instead
              </button>
              <button className="modal-cancel" onClick={() => setPickerOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {cardPhoto && (
          <ShareCard photo={cardPhoto} user={user} onClose={() => setCardPhoto(null)} />
        )}

        {/* Logout */}
        <button className="btn-logout-full" onClick={onLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}
