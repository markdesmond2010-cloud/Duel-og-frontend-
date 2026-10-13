import React, { useState, useEffect, useRef } from 'react';

const W = 1080;
const H = 1350;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
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

function fitText(ctx, text, maxWidth, startSize, weight) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && size > 40) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

// Draws any card from a simple model: { label, pillBig, pillSmall, metrics[3], footer }
function drawCard(canvas, img, model) {
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
  bg.addColorStop(0, '#ff2d75');
  bg.addColorStop(0.45, '#9d2bd1');
  bg.addColorStop(1, '#2a0a52');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath(); ctx.arc(60, 120, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1040, 1180, 320, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = `900 64px ${FONT}`;
  ctx.fillText('DUEL', W / 2, 96);
  ctx.globalAlpha = 0.9;
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText('Which photo wins? You decide.', W / 2, 142);
  ctx.globalAlpha = 1;

  // Headline
  ctx.save();
  fitText(ctx, model.label, 940, 108, '900 italic');
  ctx.shadowColor = 'rgba(255,45,117,0.8)';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#fff';
  ctx.fillText(model.label, W / 2, 280);
  ctx.restore();

  // Photo
  const px = 215, py = 330, pw = 650, ph = 640;
  ctx.save();
  ctx.shadowColor = 'rgba(255,45,117,0.7)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#fff';
  roundedRect(ctx, px - 8, py - 8, pw + 16, ph + 16, 48);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundedRect(ctx, px, py, pw, ph, 40);
  ctx.clip();
  drawCover(ctx, img, px, py, pw, ph);
  ctx.restore();

  // Pill
  ctx.font = `900 76px ${FONT}`;
  const bigW = ctx.measureText(model.pillBig).width;
  ctx.font = `600 36px ${FONT}`;
  const smallW = ctx.measureText(model.pillSmall).width;
  const pillW = bigW + smallW + 90;
  const pillH = 120;
  const pillX = W / 2 - pillW / 2;
  const pillY = py + ph - 55;
  const pill = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
  pill.addColorStop(0, '#ff6b6b');
  pill.addColorStop(1, '#a855f7');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = pill;
  roundedRect(ctx, pillX, pillY, pillW, pillH, 60);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  roundedRect(ctx, pillX, pillY, pillW, pillH, 60);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = `900 76px ${FONT}`;
  ctx.fillText(model.pillBig, pillX + 45, pillY + 86);
  ctx.font = `600 36px ${FONT}`;
  ctx.fillText(model.pillSmall, pillX + 45 + bigW, pillY + 84);
  ctx.textAlign = 'center';

  // Metrics
  const xs = [210, 540, 870];
  model.metrics.forEach((m, i) => {
    ctx.fillStyle = '#fff';
    const size = fitText(ctx, m.value, 290, m.size || 62, '800');
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.fillText(m.value, xs[i], 1148);
    ctx.globalAlpha = 0.8;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(m.label, xs[i], 1190);
    ctx.globalAlpha = 1;
  });
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  [375, 705].forEach((x) => {
    ctx.beginPath(); ctx.moveTo(x, 1100); ctx.lineTo(x, 1200); ctx.stroke();
  });

  ctx.fillStyle = '#fff';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(model.footer, W / 2, 1290);
}

// battle = { id, side: 'from' | 'to' } for a challenge battle card
export default function ShareCard({ photo, user, battle, onClose }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [shareInfo, setShareInfo] = useState({ url: '', text: '' });
  const [blob, setBlob] = useState(null);
  const [note, setNote] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let cancelled = false;

    async function build() {
      try {
        if (battle) {
          const b = await fetch(`${API_URL}/api/battle/${battle.id}`).then((r) => r.json());
          const me = battle.side === 'from' ? b.from : b.to;
          const opp = battle.side === 'from' ? b.to : b.from;
          const mine = battle.side === 'from' ? b.votesFrom : b.votesTo;
          const theirs = battle.side === 'from' ? b.votesTo : b.votesFrom;
          const share = b.total ? Math.round((mine / b.total) * 100) : 0;
          const wonIt = b.ended && b.winner === battle.side;
          const label = wonIt ? 'BATTLE CHAMPION' : b.ended && b.winner === 'tie' ? 'DEAD HEAT' : mine > theirs ? '#1 IN THIS BATTLE' : 'IN A LIVE BATTLE';
          const img = await loadImage(me.imageUrl);
          if (cancelled) return;
          const url = `${window.location.origin}/b/${b.id}`;
          setShareInfo({
            url,
            text: `${label}: ${mine}–${theirs} against @${opp.username} on DUEL. Vote in my battle: ${url}`
          });
          drawCard(canvasRef.current, img, {
            label,
            pillBig: `${mine} – ${theirs}`,
            pillSmall: ' votes',
            metrics: [
              { value: String(mine), label: 'VOTES RECEIVED' },
              { value: `${share}%`, label: 'VOTE SHARE' },
              { value: `@${opp.username}`, label: 'OPPONENT', size: 44 }
            ],
            footer: 'Vote in my battle on DUEL'
          });
        } else {
          const [img, info] = await Promise.all([
            loadImage(photo.imageUrl),
            fetch(`${API_URL}/api/photos/${photo.id}/rank`).then((r) => r.json())
          ]);
          if (cancelled) return;
          const url = `${window.location.origin}/p/${photo.id}`;
          setShareInfo({
            url,
            text: info.rank
              ? `${info.label}: my photo is #${info.rank} of ${info.total} on DUEL! Vote on it and upload yours: ${url}`
              : `Vote on my photo on DUEL and upload yours: ${url}`
          });
          const battles = info.matchesPlayed || 0;
          const winRate = battles ? Math.round(((info.wins || 0) / battles) * 100) : 0;
          const tier = info.tier || { name: 'Beginner', emoji: '🌱' };
          const label = info.label || 'ON DUEL';
          const isChampion = label === 'DUEL CHAMPION';
          drawCard(canvasRef.current, img, {
            label,
            pillBig: info.rank ? `${isChampion ? '👑 ' : ''}#${info.rank}` : 'NEW',
            pillSmall: info.rank ? ` of ${info.total}` : '',
            metrics: [
              { value: String(info.wins || 0), label: 'VOTES RECEIVED' },
              { value: `${winRate}%`, label: 'BATTLE WIN RATE' },
              { value: `${tier.emoji} ${tier.name}`, label: 'TIER', size: 44 }
            ],
            footer: 'Vote on my photo on DUEL'
          });
        }
        canvasRef.current.toBlob((b) => !cancelled && setBlob(b), 'image/png');
        setStatus('ready');
      } catch (err) {
        console.error('Card error:', err);
        if (!cancelled) setStatus('error');
      }
    }

    build();
    return () => {
      cancelled = true;
    };
  }, [photo?.id, battle?.id, battle?.side]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareInfo.url);
      setNote('🔗 Link copied. Paste it anywhere.');
    } catch (e) {
      setNote(`Copy this link: ${shareInfo.url}`);
    }
  };

  const handleSave = () => {
    if (!blob) return setNote('Card is still building, try again.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'duel-card.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    setNote('⬇️ Saved to your downloads.');
  };

  const handleShare = async () => {
    setNote('');
    const file = blob ? new File([blob], 'duel-card.png', { type: 'image/png' }) : null;
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareInfo.text });
      } else if (navigator.share) {
        await navigator.share({ text: shareInfo.text, url: shareInfo.url });
      } else {
        await copyLink();
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error('Share error:', err);
      try {
        if (navigator.share) await navigator.share({ text: shareInfo.text, url: shareInfo.url });
        else await copyLink();
      } catch (e2) {
        if (!e2 || e2.name !== 'AbortError') await copyLink();
      }
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
          <p className="share-note">❌ Couldn't build the card. Check your connection and try again.</p>
        )}
        {status === 'ready' && (
          <>
            <div className="share-actions">
              <button className="share-primary" onClick={handleShare}>📤 Share</button>
              <button className="share-secondary" onClick={handleSave}>⬇️ Save</button>
            </div>
            <button className="share-link-btn" onClick={copyLink}>🔗 Copy link</button>
            {note && <p className="share-note small">{note}</p>}
          </>
        )}
        <button className="modal-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
