import React from 'react';
import CarpSvg from '@/components/fish/CarpSvg';

// KI-Buddy-Avatar: verwendet denselben hochwertigen Karpfen wie der Hintergrund
// (CarpSvg, Koordinatenraum 0–460 × 0–170, blickt nach rechts) und setzt ihn in
// eine schwimmende "Wassertropfen"-Linse. Die Flossen-Animationen (.pk-tail,
// .pk-dorsal, …) kommen aus PIKE_BASE_CSS, das von WaterScene global injiziert
// wird; hier kommen nur die Buddy-spezifischen Animationen dazu.
export const BUDDY_FISH_CSS = `
  /* sanftes Schwimm-Wippen des ganzen Karpfens */
  .bf-swim { transform-box: fill-box; transform-origin: 50% 50%; animation: bfSwimBob 5s ease-in-out infinite; }
  .bf-swim-active { animation-duration: 2.4s; }
  @keyframes bfSwimBob {
    0%, 100% { transform: translateY(0) rotate(-1.2deg); }
    50%      { transform: translateY(-3px) rotate(1.2deg); }
  }

  /* aufsteigende Luftblasen am Maul (nur sichtbar wenn Buddy "spricht"/zuhört) */
  .bf-bubble { transform-box: fill-box; opacity: 0; animation: bfBubbleRise 2.2s ease-in-out infinite; }
  @keyframes bfBubbleRise {
    0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
    20%  { opacity: 0.9; }
    80%  { opacity: 0.5; }
    100% { transform: translate(6px, -34px) scale(1.15); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bf-swim, .bf-bubble { animation: none; }
  }
`;

export default function FemaleFisherSvg({
  uid = 'bf',
  isTalking = false,
  isNodding = false,
  showBubble = false,
}) {
  const active = isTalking || isNodding;
  const haloId = `${uid}-halo`;
  const lensId = `${uid}-lens`;

  return (
    <svg
      viewBox="0 0 240 100"
      width="100%"
      height="100%"
      role="img"
      aria-label="KI-Buddy Karpfen"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* sanfter Lichthof hinter dem Fisch (Tiefe/Glanz) */}
        <radialGradient id={haloId} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#dff3ff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#bfe6ff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#bfe6ff" stopOpacity="0" />
        </radialGradient>
        {/* Glasreflex oben (Wassertropfen-Look) */}
        <linearGradient id={lensId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Lichthof */}
      <ellipse cx="120" cy="52" rx="116" ry="46" fill={`url(#${haloId})`} />

      {/* Der echte Karpfen, skaliert in die Linse */}
      <g
        className={`bf-swim ${active ? 'bf-swim-active' : ''}`}
        transform="translate(-2,8) scale(0.53)"
        style={{ filter: 'drop-shadow(0 6px 10px rgba(2, 18, 32, 0.45))' }}
      >
        <CarpSvg uid={`buddy-${uid}`} />
      </g>

      {/* Glasreflex-Sheen oben */}
      <ellipse cx="110" cy="26" rx="92" ry="18" fill={`url(#${lensId})`} opacity="0.8" />

      {/* aufsteigende Luftblasen am Maul (rechts oben), nur beim Sprechen/Zuhören */}
      {showBubble && (
        <g fill="#eaf7ff" stroke="#bfe6ff" strokeWidth="0.8">
          <circle className="bf-bubble" style={{ animationDelay: '0s' }} cx="206" cy="42" r="3.2" />
          <circle className="bf-bubble" style={{ animationDelay: '0.5s' }} cx="214" cy="46" r="2.2" />
          <circle className="bf-bubble" style={{ animationDelay: '1s' }} cx="200" cy="40" r="1.8" />
        </g>
      )}
    </svg>
  );
}
