import React from 'react';

// Sabrina – illustrierter Avatar der KI-Angelexpertin.
// Bewusst als SVG umgesetzt, damit sich der Mund beim Sprechen echt bewegen
// kann (ein Foto könnte das nicht). Die Augen bleiben ruhig offen – es gibt
// KEINE Blinzel-Animation; nur der Mund animiert, während `speaking` true ist.
export const SABRINA_AVATAR_CSS = `
  @keyframes sabrinaTalk {
    0%, 100% { transform: scaleY(0.28); }
    50%      { transform: scaleY(1); }
  }
  .sabrina-mouth-open {
    transform-box: fill-box;
    transform-origin: center;
    animation: sabrinaTalk 0.26s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .sabrina-mouth-open { animation: none; }
  }
`;

export default function SabrinaAvatar({ speaking = false, size = 96, className = '', style = {} }) {
  return (
    <div className={className} style={{ width: size, height: size, ...style }}>
      <style>{SABRINA_AVATAR_CSS}</style>
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="Sabrina">
        <defs>
          <radialGradient id="sabrinaBg" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#2a4a6a" />
            <stop offset="100%" stopColor="#12233a" />
          </radialGradient>
          <linearGradient id="sabrinaHair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8a5a34" />
            <stop offset="100%" stopColor="#5e3a1f" />
          </linearGradient>
        </defs>

        {/* Hintergrund */}
        <circle cx="50" cy="50" r="49" fill="url(#sabrinaBg)" />

        {/* Haare hinter dem Kopf */}
        <path d="M22 52 C20 26 34 14 50 14 C66 14 80 26 78 52 C78 66 74 78 70 84 L64 74 C70 62 70 44 66 38 C60 30 40 30 34 38 C30 44 30 62 36 74 L30 84 C26 78 22 66 22 52 Z" fill="url(#sabrinaHair)" />

        {/* Gesicht */}
        <ellipse cx="50" cy="52" rx="24" ry="27" fill="#f4c9a3" />

        {/* Pony / Haaransatz */}
        <path d="M27 44 C28 28 40 20 50 20 C60 20 72 28 73 44 C66 34 58 33 50 33 C42 33 34 34 27 44 Z" fill="url(#sabrinaHair)" />

        {/* Wangenröte */}
        <ellipse cx="38" cy="60" rx="4.5" ry="3" fill="#f0a98a" opacity="0.55" />
        <ellipse cx="62" cy="60" rx="4.5" ry="3" fill="#f0a98a" opacity="0.55" />

        {/* Augenbrauen */}
        <path d="M35 45 Q40 42 45 45" stroke="#6e4423" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M55 45 Q60 42 65 45" stroke="#6e4423" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        {/* Augen (immer offen, kein Blinzeln) */}
        <g>
          <ellipse cx="40" cy="50" rx="4.2" ry="4.6" fill="#ffffff" />
          <circle cx="40.5" cy="50.3" r="2.5" fill="#5b3a1e" />
          <circle cx="40.5" cy="50.3" r="1.2" fill="#1a1008" />
          <circle cx="39.4" cy="49.2" r="0.8" fill="#ffffff" />
        </g>
        <g>
          <ellipse cx="60" cy="50" rx="4.2" ry="4.6" fill="#ffffff" />
          <circle cx="59.5" cy="50.3" r="2.5" fill="#5b3a1e" />
          <circle cx="59.5" cy="50.3" r="1.2" fill="#1a1008" />
          <circle cx="58.4" cy="49.2" r="0.8" fill="#ffffff" />
        </g>

        {/* Nase */}
        <path d="M49 55 Q47.5 60 50 61.5 Q52.5 60 51 55" stroke="#d69b76" strokeWidth="1.3" fill="none" strokeLinecap="round" />

        {/* Mund – geschlossenes Lächeln (Ruhezustand) */}
        {!speaking && (
          <path d="M42 67 Q50 73 58 67" stroke="#c14a63" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        )}

        {/* Mund – offen und animiert (spricht) */}
        {speaking && (
          <g className="sabrina-mouth-open">
            <ellipse cx="50" cy="68" rx="6.5" ry="5" fill="#7a2338" />
            <ellipse cx="50" cy="66.2" rx="5" ry="1.6" fill="#ffffff" />
            <ellipse cx="50" cy="71" rx="3.4" ry="1.8" fill="#e06a86" />
          </g>
        )}
      </svg>
    </div>
  );
}
