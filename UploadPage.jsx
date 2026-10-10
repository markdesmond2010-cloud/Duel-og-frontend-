import React, { useState } from 'react';

export default function UploadPage({ token, onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/p1xi439d/image/upload';
  const CLOUDINARY_UPLOAD_PRESET = 'duel_uploads'; // Create this in Cloudinary settings

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title || !image) {
      setMessageType('error');
      setMessage('Please fill in title and select an image');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', image);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      if (!cloudinaryRes.ok) throw new Error('Cloudinary upload failed');

      const cloudinaryData = await cloudinaryRes.json();
      const imageUrl = cloudinaryData.secure_url;
      const cloudinaryId = cloudinaryData.public_id;

      // Save to DUEL backend
      const res = await fetch(`${API_URL}/api/photos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          imageUrl,
          cloudinaryId
        })
      });

      if (!res.ok) throw new Error('Failed to save photo');

      setMessageType('success');
      setMessage('✅ Photo uploaded! Starting rating: 1600');

      setTimeout(() => {
        setTitle('');
        setImage(null);
        setPreview('');
        onUploadSuccess();
      }, 2000);
    } catch (err) {
      setMessageType('error');
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page upload-page">
      <div className="container">
        <div className="upload-container">
          <h2 className="page-title">📸 Upload Your Photo</h2>
          <p className="page-subtitle">Let it battle for the top ranking!</p>

          <form onSubmit={handleSubmit} className="upload-form">
            {/* Image Upload */}
            <div className="form-group">
              <label>Photo *</label>
              <div className="file-upload">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={loading}
                />
                <span>📁 Click to upload</span>
              </div>
              {preview && (
                <div className="preview-container">
                  <img src={preview} alt="Preview" className="preview-image" />
                </div>
              )}
            </div>

            {/* Photo Title */}
            <div className="form-group">
              <label htmlFor="title">Photo Title *</label>
              <input
                id="title"
                type="text"
                placeholder="e.g., Beach Sunset"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                disabled={loading}
              />
            </div>

            {/* Message */}
            {message && (
              <div className={`message ${messageType}`}>
                {message}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ Uploading...' : '✨ Upload Photo'}
            </button>
          </form>

          {/* Info Section */}
          <div className="info-section">
            <h3>🎯 How it works</h3>
            <ul>
              <li>✅ Upload your best photo</li>
              <li>📊 Starts with 1600 rating</li>
              <li>🗳️ People vote on your photo vs others</li>
              <li>📈 Rating goes up when you win</li>
              <li>🏆 Best photos rise to the top</li>
              <li>📱 Share your ranking on social media</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
