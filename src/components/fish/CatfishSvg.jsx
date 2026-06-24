import React from 'react';

// Wels (Silurus glanis) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Animierbare Gruppen wie bei PikeSvg: .pk-tail, .pk-anal, .pk-pect;
// zusätzlich .pk-barbel für die lange Oberbartel.
export default function CatfishSvg({ uid = 'ws' }) {
  const bodyId = `${uid}-body`;
  const clipId = `${uid}-clip`;
  const bodyPath = 'M40,80 C 100,66 180,58 260,58 C 330,58 390,62 420,72 C 436,78 442,82 442,88 L 442,92 C 434,102 414,110 386,114 C 320,121 240,120 160,112 C 100,106 60,96 40,94 C 35,90 35,84 40,80 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f3a30" />
          <stop offset="35%" stopColor="#4a5947" />
          <stop offset="68%" stopColor="#75806a" />
          <stop offset="100%" stopColor="#c9cdb4" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* kleine, runde Schwanzflosse */}
      <g className="pk-tail">
        <path d="M42,80 C 28,66 14,62 6,68 C 12,80 12,94 6,108 C 14,114 28,110 42,94 C 45,89 45,85 42,80 Z" fill="#3a4438" />
      </g>

      {/* langer Afterflossen-Saum */}
      <g className="pk-anal">
        <path d="M64,99 C 130,111 220,117 305,113 C 290,119 240,123 180,121 C 130,119 90,112 70,104 C 67,102 65,100 64,99 Z" fill="#333d31" opacity="0.8" />
      </g>

      {/* winzige Rückenflosse */}
      <g className="pk-dorsal">
        <path d="M336,60 C 334,49 326,47 320,52 L 318,60 Z" fill="#3a4438" />
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        <path d="M34,82 C 100,66 180,58 260,58 C 334,58 396,64 426,76 L 452,88 L 452,60 L 34,48 Z" fill="#161d16" opacity="0.45" />
        {/* Marmorierung */}
        <g fill="#1c2620" opacity="0.4">
          <ellipse cx="110" cy="78" rx="14" ry="6" transform="rotate(-8 110 78)" />
          <ellipse cx="160" cy="68" rx="16" ry="7" transform="rotate(6 160 68)" />
          <ellipse cx="205" cy="84" rx="13" ry="6" transform="rotate(-10 205 84)" />
          <ellipse cx="250" cy="70" rx="17" ry="7" transform="rotate(5 250 70)" />
          <ellipse cx="295" cy="86" rx="14" ry="6" transform="rotate(-6 295 86)" />
          <ellipse cx="340" cy="74" rx="15" ry="7" transform="rotate(8 340 74)" />
          <ellipse cx="380" cy="88" rx="12" ry="5" transform="rotate(-7 380 88)" />
          <ellipse cx="135" cy="94" rx="10" ry="4.5" transform="rotate(7 135 94)" />
          <ellipse cx="225" cy="100" rx="11" ry="4.5" transform="rotate(-5 225 100)" />
          <ellipse cx="315" cy="102" rx="10" ry="4" transform="rotate(6 315 102)" />
        </g>
        <g fill="#9aa388" opacity="0.25">
          <ellipse cx="140" cy="80" rx="6" ry="2.6" /><ellipse cx="230" cy="78" rx="7" ry="3" />
          <ellipse cx="320" cy="82" rx="6" ry="2.6" /><ellipse cx="185" cy="92" rx="5" ry="2.2" />
        </g>
        <path d="M60,70 C 150,58 280,56 400,70 C 300,62 160,64 60,78 Z" fill="#ffffff" opacity="0.12" />
        <path d="M80,104 C 180,116 300,114 410,96 L 410,124 L 80,128 Z" fill="#d6d9c2" opacity="0.4" />
      </g>

      {/* Brustflosse (rund) */}
      <g className="pk-pect">
        <path d="M372,108 C 376,121 392,127 407,121 C 398,112 386,106 378,103 Z" fill="#3a4438" />
      </g>

      {/* Kiemendeckel-Andeutung */}
      <path d="M384,68 C 376,82 376,96 386,108" stroke="#161d16" strokeWidth="2" fill="none" opacity="0.3" />

      {/* breites Maul */}
      <path d="M442,90 C 426,96 408,100 392,102" stroke="#161d16" strokeWidth="2" fill="none" opacity="0.55" />

      {/* Barteln: 1 lange oben (schwingend), 2 kurze unten */}
      <g className="pk-barbel">
        <path d="M436,82 C 454,88 464,102 458,122" stroke="#2c3529" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
      <path d="M416,102 q4,12 -2,18" stroke="#2c3529" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M400,105 q3,10 -2,14" stroke="#2c3529" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* kleines Auge */}
      <circle cx="408" cy="78" r="3.2" fill="#11160f" />
      <circle cx="408" cy="78" r="2.4" fill="#8a8a55" />
      <circle cx="408.5" cy="78.2" r="1.4" fill="#0b0e08" />
    </g>
  );
}
