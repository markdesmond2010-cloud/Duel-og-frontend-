import React from 'react';
import './Tour.css';

// Each step can move the app to a page and highlight one bottom tab.
export const TOUR_STEPS = [
  {
    page: 'vote',
    tab: null,
    title: 'Welcome to Duel',
    text: 'Duel is a photo contest where people like you decide the winner. Take a quick tour to see how it works.'
  },
  {
    page: 'vote',
    tab: 'vote',
    title: 'Vote',
    text: 'Two photos show up side by side. Tap the one you think is better. Your votes decide who ranks higher.'
  },
  {
    page: 'upload',
    tab: 'upload',
    title: 'Upload',
    text: 'Add your own photo to enter the contest. Pick a category: Fashion, Selfies or Photography.'
  },
  {
    page: 'leaderboard',
    tab: 'leaderboard',
    title: 'Top',
    text: 'See the highest ranked photos. Win more battles to climb the list.'
  },
  {
    page: 'profile',
    tab: 'profile',
    title: 'Profile',
    text: 'See your photos and stats here, and use Invite friends to share your link.'
  },
  {
    page: 'vote',
    tab: null,
    title: "You're ready",
    text: 'Start by voting on a few battles. Complete the daily challenge to build your streak.'
  }
];

export default function Tour({ step, onNext, onBack, onClose }) {
  const s = TOUR_STEPS[step];
  if (!s) return null;
  const first = step === 0;
  const last = step === TOUR_STEPS.length - 1;

  return (
    <>
      <div className="tour-backdrop" />
      <div
        className={`tour-card ${s.tab ? 'tour-card-bottom' : 'tour-card-center'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Duel tour"
      >
        <button className="tour-x" onClick={onClose} aria-label="Close tour">✕</button>
        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <i key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
          ))}
        </div>
        <h3>{s.title}</h3>
        <p>{s.text}</p>
        <div className="tour-actions">
          {first ? (
            <button className="tour-back" onClick={onClose}>Skip</button>
          ) : (
            <button className="tour-back" onClick={onBack}>Back</button>
          )}
          <button className="tour-next" onClick={last ? onClose : onNext}>
            {first ? 'Start tour' : last ? "Let's go" : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
