import React from 'react';

// Weiblicher Angler-Avatar mit Angelhut
// Koordinatenraum: 0–200 (x) × 0–240 (y)
// Animierbare Gruppen:
//   .fe-head         Kopf mit subtiler Atmungs-Animation
//   .fe-mouth        Mund (öffnet/schließt bei Sprechen)
//   .fe-eyes         Augen (für Ausdruckswechsel)

export const FEMALE_FISHER_CSS = `
  .fe-fisher { }
  .fe-head {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: feBreathing 3s ease-in-out infinite;
  }
  .fe-mouth {
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }
  .fe-mouth-talking {
    animation: feMouthTalk 0.5s ease-in-out infinite;
  }
  .fe-eyes { }

  @keyframes feBreathing {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-2px) scale(1.02); }
  }

  @keyframes feMouthTalk {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.3); }
  }

  @keyframes feHeadNod {
    0% { transform: rotateX(0deg); }
    25% { transform: rotateX(-4deg); }
    50% { transform: rotateX(0deg); }
    75% { transform: rotateX(4deg); }
    100% { transform: rotateX(0deg); }
  }

  .fe-head-nodding {
    animation: feHeadNod 0.8s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .fe-head, .fe-mouth-talking, .fe-head-nodding { animation: none; }
  }
`;

export default function FemaleFisherSvg({ uid = 'fe', isTalking = false, isNodding = false }) {
  const hatGradId = `${uid}-hat-grad`;
  const skinGradId = `${uid}-skin-grad`;
  const hairGradId = `${uid}-hair-grad`;

  const headClass = `fe-head ${isNodding ? 'fe-head-nodding' : ''}`;
  const mouthClass = `fe-mouth ${isTalking ? 'fe-mouth-talking' : ''}`;

  return (
    <svg viewBox="0 0 200 240" width="100" height="120">
      <defs>
        {/* Hautfarbe Gradient */}
        <linearGradient id={skinGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4c9a8" />
          <stop offset="50%" stopColor="#e8b89a" />
          <stop offset="100%" stopColor="#dba88a" />
        </linearGradient>

        {/* Haarfarbe Gradient (Braun) */}
        <linearGradient id={hairGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b4423" />
          <stop offset="50%" stopColor="#8b5a2b" />
          <stop offset="100%" stopColor="#6b4423" />
        </linearGradient>

        {/* Angelhut Gradient (Beige/Braun) */}
        <linearGradient id={hatGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="50%" stopColor="#c99858" />
          <stop offset="100%" stopColor="#b88a48" />
        </linearGradient>
      </defs>

      <g className="fe-fisher">
        {/* Angelhut */}
        <ellipse cx="100" cy="20" rx="65" ry="18" fill={`url(#${hatGradId})`} />
        {/* Hutrand */}
        <path
          d="M 40 25 Q 35 35 40 45 L 160 45 Q 165 35 160 25"
          fill={`url(#${hatGradId})`}
          opacity="0.9"
        />
        {/* Hutband */}
        <rect x="50" y="32" width="100" height="6" fill="#8b4513" opacity="0.7" rx="2" />
        {/* Hutband Schnalle */}
        <rect x="155" y="31" width="8" height="8" fill="#c4a747" rx="1" />

        {/* Kopf */}
        <g className={headClass}>
          {/* Haare */}
          <path
            d="M 50 55 Q 40 65 45 95 Q 50 110 75 115 L 125 115 Q 150 110 155 95 Q 160 65 150 55 Z"
            fill={`url(#${hairGradId})`}
          />

          {/* Gesicht/Kopf */}
          <ellipse cx="100" cy="85" rx="45" ry="50" fill={`url(#${skinGradId})`} />

          {/* Ohren */}
          <ellipse cx="57" cy="80" rx="8" ry="12" fill={`url(#${skinGradId})`} />
          <ellipse cx="143" cy="80" rx="8" ry="12" fill={`url(#${skinGradId})`} />
          <ellipse cx="60" cy="82" rx="4" ry="7" fill="#e8a080" opacity="0.6" />
          <ellipse cx="140" cy="82" rx="4" ry="7" fill="#e8a080" opacity="0.6" />

          {/* Augen */}
          <g className="fe-eyes">
            {/* Linkes Auge */}
            <ellipse cx="80" cy="75" rx="6" ry="8" fill="#ffffff" />
            <circle cx="80" cy="76" r="4" fill="#6b4423" />
            <circle cx="81" cy="75" r="2" fill="#000000" />
            <circle cx="82" cy="74" r="1" fill="#ffffff" opacity="0.8" />

            {/* Rechtes Auge */}
            <ellipse cx="120" cy="75" rx="6" ry="8" fill="#ffffff" />
            <circle cx="120" cy="76" r="4" fill="#6b4423" />
            <circle cx="121" cy="75" r="2" fill="#000000" />
            <circle cx="122" cy="74" r="1" fill="#ffffff" opacity="0.8" />

            {/* Augenbrauen */}
            <path d="M 72 68 Q 80 65 88 68" stroke="#6b4423" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 112 68 Q 120 65 128 68" stroke="#6b4423" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </g>

          {/* Nase */}
          <path
            d="M 100 75 L 98 92 L 102 92 Z"
            fill={`url(#${skinGradId})`}
            opacity="0.8"
          />
          <path d="M 95 92 L 100 94 L 105 92" stroke="#d4a574" strokeWidth="0.8" fill="none" opacity="0.5" />

          {/* Mund */}
          <g className={mouthClass}>
            {/* Lippen */}
            <ellipse cx="100" cy="105" rx="10" ry="6" fill="#c47b8a" />
            <path d="M 90 105 Q 100 110 110 105" stroke="#a85970" strokeWidth="0.8" fill="none" />
          </g>

          {/* Wangen */}
          <ellipse cx="65" cy="90" rx="8" ry="5" fill="#e8a080" opacity="0.4" />
          <ellipse cx="135" cy="90" rx="8" ry="5" fill="#e8a080" opacity="0.4" />
        </g>

        {/* Körper */}
        <ellipse cx="100" cy="160" rx="35" ry="45" fill={`url(#${skinGradId})`} opacity="0.9" />

        {/* Jacke/Shirt */}
        <path
          d="M 65 125 Q 65 140 75 160 L 75 190 L 125 190 L 125 160 Q 135 140 135 125 Z"
          fill="#3a6b4e"
          opacity="0.85"
        />
        {/* Jacken-Kontrast */}
        <path
          d="M 100 130 L 100 190"
          stroke="#2a4a38"
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* Arme */}
        {/* Linker Arm */}
        <ellipse cx="45" cy="145" rx="12" ry="28" fill={`url(#${skinGradId})`} transform="rotate(-25 45 145)" />
        {/* Rechter Arm */}
        <ellipse cx="155" cy="145" rx="12" ry="28" fill={`url(#${skinGradId})`} transform="rotate(25 155 145)" />

        {/* Hände */}
        <circle cx="28" cy="165" r="10" fill={`url(#${skinGradId})`} />
        <circle cx="172" cy="165" r="10" fill={`url(#${skinGradId})`} />

        {/* Einfache Finger-Andeutung */}
        <g stroke={`url(#${skinGradId})`} strokeWidth="1" opacity="0.6">
          <line x1="22" y1="162" x2="18" y2="155" />
          <line x1="28" y1="158" x2="28" y2="150" />
          <line x1="34" y1="162" x2="38" y2="155" />
        </g>
        <g stroke={`url(#${skinGradId})`} strokeWidth="1" opacity="0.6">
          <line x1="166" y1="162" x2="162" y2="155" />
          <line x1="172" y1="158" x2="172" y2="150" />
          <line x1="178" y1="162" x2="182" y2="155" />
        </g>
      </g>
    </svg>
  );
}
