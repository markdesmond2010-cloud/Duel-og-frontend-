const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  window.navigator.standalone === true;

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// 'unsupported' | 'default' | 'granted' | 'denied'
export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported');

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    return null;
  }
}

function b64ToUint8(b64) {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function saveSubscription(token, sub) {
  return fetch(`${API_URL}/api/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON() })
  });
}

// Ask permission and subscribe this phone (must be called from a tap)
export async function enablePush(token) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: 'denied' };

  try {
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await fetch(`${API_URL}/api/push/key`).then((r) => r.json());
    if (!publicKey) return { ok: false, reason: 'server' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: b64ToUint8(publicKey)
      });
    }
    const res = await saveSubscription(token, sub);
    return { ok: res.ok, reason: res.ok ? '' : 'save' };
  } catch (e) {
    return { ok: false, reason: 'error' };
  }
}

// If this phone already allowed notifications, link it to the account that just logged in
export async function syncPush(token) {
  if (pushPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await saveSubscription(token, sub);
  } catch (e) {}
}
