import React from 'react';

// KI-Buddy – freundlicher Fisch-Avatar des Angel-Assistenten. Passt perfekt zur
// Angel-App und wirkt einladend. Dargestellt als stilisierter Fisch in Inline-SVG
// (keine Foto-Datei, kein zusätzlicher Netzwerk-Request). Der Zustand wird über
// einen pulsierenden Leucht-Ring dargestellt:
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

  // Mund wechselt zwischen freundlich (idle/listening) und offen (speaking)
  const mouth = speaking
    ? <ellipse cx="50" cy="60" rx="6" ry="5" fill="#ff6b35" />
    : <path d="M45 58 Q50 62 55 58" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" fill="none" />;

  return (
    <div
      className={`buddy-avatar ${stateClass} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    >
      <style>{BUDDY_AVATAR_CSS}</style>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="KI-Buddy Fisch"
        className="buddy-avatar-svg"
        focusable="false"
      >
        <defs>
          <radialGradient id="fishBg" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1e5a8e" />
            <stop offset="100%" stopColor="#0d2e4a" />
          </radialGradient>
          <linearGradient id="fishBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff9d3d" />
            <stop offset="50%" stopColor="#ffb84d" />
            <stop offset="100%" stopColor="#ff8c3d" />
          </linearGradient>
          <linearGradient id="fishBelly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd966" />
            <stop offset="100%" stopColor="#ffb84d" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="50" fill="url(#fishBg)" />

        {/* Fisch-Körper */}
        <ellipse cx="50" cy="50" rx="28" ry="24" fill="url(#fishBody)" />

        {/* Bauch */}
        <ellipse cx="50" cy="54" rx="22" ry="14" fill="url(#fishBelly)" />

        {/* Schwanzflosse */}
        <path d="M 22 48 L 8 35 L 10 48 L 8 61 Z" fill="#ff8c3d" />
        <path d="M 22 48 L 12 42 L 14 48 L 12 54 Z" fill="#ffb84d" opacity="0.7" />

        {/* Rückenflosse */}
        <path d="M 45 28 L 50 18 L 55 28 Z" fill="#ff8c3d" />

        {/* Bauchflossen */}
        <ellipse cx="35" cy="62" rx="5" ry="8" fill="#ffb84d" opacity="0.8" transform="rotate(-30 35 62)" />
        <ellipse cx="65" cy="62" rx="5" ry="8" fill="#ffb84d" opacity="0.8" transform="rotate(30 65 62)" />

        {/* Kiemen-Details */}
        <path d="M 32 48 Q 28 45 26 48 Q 28 51 32 48" stroke="#ff7c3d" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M 32 52 Q 28 55 26 52 Q 28 49 32 52" stroke="#ff7c3d" strokeWidth="1.5" fill="none" opacity="0.6" />

        {/* Augen */}
        <circle cx="42" cy="45" r="4" fill="#1a1a1a" />
        <circle cx="42" cy="43" r="1.5" fill="#ffffff" opacity="0.8" />
        <circle cx="58" cy="45" r="4" fill="#1a1a1a" />
        <circle cx="58" cy="43" r="1.5" fill="#ffffff" opacity="0.8" />

        {/* Mund */}
        {mouth}

        {/* Schuppen-Details */}
        <circle cx="55" cy="48" r="2.5" fill="#ff7c3d" opacity="0.5" />
        <circle cx="60" cy="50" r="2.5" fill="#ff7c3d" opacity="0.5" />
        <circle cx="48" cy="52" r="2.5" fill="#ff7c3d" opacity="0.5" />
      </svg>
    </div>
  );
}
