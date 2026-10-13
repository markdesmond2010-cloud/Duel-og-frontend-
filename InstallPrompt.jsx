import React, { useEffect, useState } from 'react';
import './InstallPrompt.css';

// Chrome fires this once, early. Keep it at module level so we never miss it.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

const DISMISS_KEY = 'duel_install_dismissed';
const DISMISS_DAYS = 7;

const recentlyDismissed = () => {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return t && Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch (e) {
    return false;
  }
};
const isStandalone = () =>
  (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
  window.navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function InstallPrompt({ aboveNav = false, paused = false }) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [, refresh] = useState(0);

  useEffect(() => {
    const fn = () => refresh((n) => n + 1);
    listeners.add(fn);
    const t = setTimeout(() => setReady(true), 4000); // let the page settle first
    return () => {
      listeners.delete(fn);
      clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
  };

  const install = async () => {
    const p = deferredPrompt;
    if (!p) return;
    deferredPrompt = null; // a prompt can only be used once
    p.prompt();
    try {
      const choice = await p.userChoice;
      if (choice.outcome !== 'accepted') dismiss();
    } catch (e) {}
    notify();
  };

  const native = !!deferredPrompt;
  const ios = isIOS();
  if (!ready || paused || dismissed || isStandalone() || !(native || ios)) return null;

  return (
    <div className={`install-card ${aboveNav ? 'above-nav' : ''}`} role="dialog" aria-label="Install Duel">
      <div className="install-icon">D</div>
      <div className="install-body">
        <b>Install Duel</b>
        {native ? (
          <span>Add it to your home screen and open it in one tap, like an app.</span>
        ) : (
          <span>
            Tap{' '}
            <svg className="install-share" viewBox="0 0 24 24" aria-label="Share">
              <path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>{' '}
            Share, then <b>Add to Home Screen</b>.
          </span>
        )}
      </div>
      <div className="install-actions">
        {native && (
          <button className="install-yes" onClick={install}>
            Install
          </button>
        )}
        <button className="install-no" onClick={dismiss}>
          {native ? 'Not now' : 'Got it'}
        </button>
      </div>
    </div>
  );
}
