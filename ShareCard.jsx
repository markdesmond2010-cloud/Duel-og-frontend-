import React, { useState, useEffect, useRef } from 'react';

const W = 1080;
const H = 1350;

export function tierFor(rating, matches) {
  if (!matches) return { name: 'Unranked', emoji: '🆕' };
  if (rating >= 1670) return { name: 'Diamond', emoji: '💎' };
  if (rating >= 1630) return { name: 'Gold', emoji: '🥇' };
  if (rating >= 1600) return { name: 'Silver', emoji: '🥈' };
  return { name: 'Rookie', emoji: '🌱' };
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });
}

export default function ShareCard({ photo, user, onClose }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [stats, setStats] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const inviteUrl = `${window.location.origin}/?ref=${user?.username || ''}`;

  useEffect(() => {
    let cancelled = false;

    async function build() {
      try {
        const [img, info] = await Promise.all([
          loadImage(photo.imageUrl),
          fetch(`${API_URL}/api/photos/${photo.id}/rank`).then((r) => r.json())
        ]);
        if (cancelled) return;
        setStats(info);
        draw(img, info);
        setStatus('ready');
      } catch (err) {
        console.error('Card error:', err);
        if (!cancelled) setStatus('error');
      }
    }

    function draw(img, info) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const font = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

      // Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#ff6b6b');
      bg.addColorStop(1, '#cc5de8');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Wordmark
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `800 56px ${font}`;
      ctx.fillText('📸 DUEL', W / 2, 100);

      // Photo
      const px = 100, py = 150, pw = 880, ph = 800;
      ctx.save();
      roundedRect(ctx, px, py, pw, ph, 48);
      ctx.clip();
      drawCover(ctx, img, px, py, pw, ph);
      ctx.restore();

      // Rank + tier row
      const tier = tierFor(info.rating, info.matchesPlayed);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      if (info.rank) {
        ctx.font = `800 150px ${font}`;
        ctx.fillText(`#${info.rank}`, px, 1110);
        const rankW = ctx.measureText(`#${info.rank}`).width;
        ctx.font = `600 40px ${font}`;
        ctx.globalAlpha = 0.9;
        ctx.fillText(`of ${info.total} photos`, px + rankW + 24, 1110);
        ctx.globalAlpha = 1;
      } else {
        ctx.font = `800 110px ${font}`;
        ctx.fillText('NEW', px, 1100);
        ctx.font = `600 40px ${font}`;
        ctx.globalAlpha = 0.9;
        ctx.fillText('Waiting for votes', px + 330, 1100);
        ctx.globalAlpha = 1;
      }

      // Tier pill (right side)
      const label = `${tier.emoji} ${tier.name}`;
      ctx.font = `700 40px ${font}`;
      const tw = ctx.measureText(label).width + 56;
      ctx.fillStyle = '#fff';
      roundedRect(ctx, px + pw - tw, 1040, tw, 76, 38);
      ctx.fill();
      ctx.fillStyle = '#9c36b5';
      ctx.fillText(label, px + pw - tw + 28, 1092);

      // Title + one stats line
      ctx.fillStyle = '#fff';
      ctx.font = `700 46px ${font}`;
      let title = photo.title || '';
      while (ctx.measureText(title).width > pw && title.length > 3) title = title.slice(0, -2);
      if (title !== photo.title) title = title.trim() + '…';
      ctx.fillText(title, px, 1180);

      const total = (info.wins || 0) + (info.losses || 0);
      const winRate = total ? Math.round((info.wins / total) * 100) : 0;
      ctx.globalAlpha = 0.9;
      ctx.font = `500 36px ${font}`;
      const line = info.matchesPlayed
        ? `Rating ${Math.round(info.rating)}  ·  ${winRate}% win rate  ·  ${info.matchesPlayed} duels`
        : 'Vote on my photo and help it get ranked';
      ctx.fillText(line, px, 1232);
      ctx.globalAlpha = 1;

      // Footer
      ctx.textAlign = 'center';
      ctx.font = `700 38px ${font}`;
      ctx.fillText('Which photo wins? You decide.', W / 2, 1296);
      ctx.globalAlpha = 0.85;
      ctx.font = `500 28px ${font}`;
      ctx.fillText(window.location.host, W / 2, 1334);
      ctx.globalAlpha = 1;
    }

    build();
    return () => {
      cancelled = true;
    };
  }, [photo.id]);

  const getBlob = () =>
    new Promise((resolve, reject) => {
      canvasRef.current.toBlob((b) => (b ? resolve(b) : reject(new Error('No image'))), 'image/png');
    });

  const shareText = stats?.rank
    ? `My photo "${photo.title}" is #${stats.rank} on DUEL! Vote on it and upload yours: ${inviteUrl}`
    : `Vote on my photo "${photo.title}" on DUEL and upload yours: ${inviteUrl}`;

  const handleShare = async () => {
    try {
      const blob = await getBlob();
      const file = new File([blob], 'duel-rank.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
      } else if (navigator.share) {
        await navigator.share({ text: shareText, url: inviteUrl });
      } else {
        await handleSave();
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return; // user closed the share sheet
      console.error(err);
      setStatus('error');
    }
  };

  const handleSave = async () => {
    try {
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'duel-rank.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="share-canvas"
          style={{ display: status === 'ready' ? 'block' : 'none' }}
        />
        {status === 'loading' && <p className="share-note">⏳ Building your card...</p>}
        {status === 'error' && (
          <p className="share-note">
            ❌ Couldn't build the card. Check your connection and try again.
          </p>
        )}
        {status === 'ready' && (
          <div className="share-actions">
            <button className="share-primary" onClick={handleShare}>📤 Share</button>
            <button className="share-secondary" onClick={handleSave}>⬇️ Save image</button>
          </div>
        )}
        <button className="modal-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
