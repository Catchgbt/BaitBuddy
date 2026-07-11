import React from 'react';

// KI-Buddy – neutraler Avatar des Angel-Assistenten. Bewusst geschlechtsneutral
// gehalten: ein freundliches Roboter-Gesicht als Inline-SVG (keine Foto-Datei,
// kein zusätzlicher Netzwerk-Request). Der Zustand wird über einen pulsierenden
// Leucht-Ring dargestellt:
//  - idle:      ruhiger, sanfter Grund-Schein
//  - listening: türkiser Ring pulsiert (hört zu)
//  - speaking:  goldener Ring pulsiert (spricht)
export const BUDDY_AVATAR_CSS = `
  .buddy-avatar {
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(80, 180, 230, 0.28);
    animation: buddyAvatarIdle 5s ease-in-out infinite;
  }
  .buddy-avatar--listening {
    box-shadow: 0 0 0 3px rgba(63, 224, 208, 0.55), 0 0 20px rgba(63, 224, 208, 0.7);
    animation: buddyAvatarListen 1.4s ease-in-out infinite;
  }
  .buddy-avatar--speaking {
    box-shadow: 0 0 0 3px rgba(255, 208, 110, 0.55), 0 0 20px rgba(255, 208, 110, 0.7);
    animation: buddyAvatarSpeak 1.1s ease-in-out infinite;
  }
  .buddy-avatar-svg {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    display: block;
  }

  @keyframes buddyAvatarIdle {
    0%, 100% { box-shadow: 0 0 12px rgba(80, 180, 230, 0.22); }
    50%      { box-shadow: 0 0 16px rgba(80, 180, 230, 0.4); }
  }
  @keyframes buddyAvatarListen {
    0%, 100% { box-shadow: 0 0 0 2px rgba(63, 224, 208, 0.45), 0 0 14px rgba(63, 224, 208, 0.55); }
    50%      { box-shadow: 0 0 0 4px rgba(63, 224, 208, 0.65), 0 0 26px rgba(63, 224, 208, 0.85); }
  }
  @keyframes buddyAvatarSpeak {
    0%, 100% { box-shadow: 0 0 0 2px rgba(255, 208, 110, 0.45), 0 0 14px rgba(255, 208, 110, 0.55); }
    50%      { box-shadow: 0 0 0 4px rgba(255, 208, 110, 0.7), 0 0 26px rgba(255, 208, 110, 0.9); }
  }

  @media (prefers-reduced-motion: reduce) {
    .buddy-avatar,
    .buddy-avatar--listening,
    .buddy-avatar--speaking {
      animation: none;
    }
  }
`;

export default function BuddyAvatar({
  speaking = false,
  listening = false,
  size = 96,
  // eslint-disable-next-line no-unused-vars
  showHints = true,
  className = '',
  style = {},
}) {
  const stateClass = speaking
    ? 'buddy-avatar--speaking'
    : listening
      ? 'buddy-avatar--listening'
      : '';

  // Mund wechselt zwischen ruhigem Lächeln (idle/listening) und offener
  // Sprech-Form, damit der Zustand auch ohne Farbring erkennbar bleibt.
  const mouth = speaking
    ? <ellipse cx="50" cy="57" rx="8" ry="4.5" fill="#3fe0d0" />
    : <path d="M41 56 Q50 62 59 56" stroke="#3fe0d0" strokeWidth="3.5" strokeLinecap="round" fill="none" />;

  return (
    <div
      className={`buddy-avatar ${stateClass} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    >
      <style>{BUDDY_AVATAR_CSS}</style>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="KI-Buddy"
        className="buddy-avatar-svg"
        focusable="false"
      >
        <defs>
          <radialGradient id="buddyBg" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#3b82c4" />
            <stop offset="100%" stopColor="#123a63" />
          </radialGradient>
          <linearGradient id="buddyHead" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8f4fc" />
            <stop offset="100%" stopColor="#b9d9ef" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="50" fill="url(#buddyBg)" />

        {/* Antenne */}
        <line x1="50" y1="14" x2="50" y2="22" stroke="#7fd4e8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="11" r="4" fill="#3fe0d0" />

        {/* Kopf */}
        <rect x="22" y="22" width="56" height="52" rx="18" fill="url(#buddyHead)" />

        {/* Seitliche Sensoren */}
        <rect x="14" y="40" width="6" height="16" rx="3" fill="#7fd4e8" />
        <rect x="80" y="40" width="6" height="16" rx="3" fill="#7fd4e8" />

        {/* Gesichts-Panel */}
        <rect x="30" y="32" width="40" height="34" rx="12" fill="#0e3050" />

        {/* Augen */}
        <circle cx="41" cy="46" r="5" fill="#3fe0d0" />
        <circle cx="59" cy="46" r="5" fill="#3fe0d0" />

        {/* Mund */}
        {mouth}
      </svg>
    </div>
  );
}
