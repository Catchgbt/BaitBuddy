import React from 'react';

// Flussbarsch (Perca fluviatilis) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Animierbare Gruppen wie bei PikeSvg: .pk-tail, .pk-dorsal, .pk-anal, .pk-pelv, .pk-pect
export default function PerchSvg({ uid = 'pc' }) {
  const bodyId = `${uid}-body`;
  const finRId = `${uid}-finr`;
  const clipId = `${uid}-clip`;
  const bodyPath = 'M96,80 C 120,52 170,38 240,38 C 300,38 350,52 390,68 C 408,75 420,80 426,85 L 426,89 C 414,96 398,102 378,107 C 330,118 260,122 200,116 C 150,111 112,98 96,96 C 88,89 90,86 96,80 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2e4423" />
          <stop offset="35%" stopColor="#5a7a3e" />
          <stop offset="65%" stopColor="#94a45e" />
          <stop offset="88%" stopColor="#d9dcb8" />
          <stop offset="100%" stopColor="#efeede" />
        </linearGradient>
        <linearGradient id={finRId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4583a" />
          <stop offset="100%" stopColor="#9c3520" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Schwanzflosse (rötlich) */}
      <g className="pk-tail">
        <path d="M98,82 C 78,62 56,54 38,58 C 50,72 55,82 55,88 C 55,94 50,104 38,118 C 56,122 78,114 98,94 C 102,88 102,86 98,82 Z" fill={`url(#${finRId})`} />
        <g stroke="#6e2415" strokeWidth="0.9" opacity="0.4" fill="none">
          <path d="M94,86 L46,62" />
          <path d="M93,88 L56,88" />
          <path d="M94,91 L46,112" />
        </g>
      </g>

      <g className="pk-dorsal">
        {/* 1. Rückenflosse: stachelig mit dunklem Fleck */}
        <path d="M254,42 L 248,18 L 241,34 L 234,14 L 227,32 L 220,16 L 213,32 L 206,20 L 199,34 L 192,24 L 184,36 L 176,28 L 168,44 C 196,38 226,38 254,42 Z" fill="#55683f" opacity="0.85" />
        <ellipse cx="178" cy="36" rx="5.5" ry="4.5" fill="#16200f" opacity="0.55" />
        <g stroke="#2c3a20" strokeWidth="1" opacity="0.5" fill="none">
          <path d="M247,40 L245,20" />
          <path d="M233,38 L231,18" />
          <path d="M219,38 L217,20" />
          <path d="M205,38 L203,24" />
          <path d="M191,40 L189,28" />
        </g>
        {/* 2. Rückenflosse (weich) */}
        <path d="M160,46 C 152,32 136,30 126,38 L 116,54 Z" fill="#55683f" opacity="0.7" />
      </g>

      {/* Afterflosse (rötlich) */}
      <g className="pk-anal">
        <path d="M168,114 C 170,130 184,138 198,132 C 190,123 182,116 176,110 Z" fill={`url(#${finRId})`} />
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        <path d="M90,80 C 120,52 170,38 240,38 C 300,38 354,54 396,72 L 436,86 L 436,60 L 90,46 Z" fill="#13200c" opacity="0.4" />
        {/* Querbinden (oben breit, unten spitz auslaufend) */}
        <g fill="#16240e" opacity="0.4">
          <path d="M140,48 C 148,50 156,50 162,48 C 160,70 154,90 146,102 C 146,84 144,64 140,48 Z" />
          <path d="M180,41 C 188,43 196,43 202,41 C 200,66 194,90 186,106 C 186,84 184,62 180,41 Z" />
          <path d="M220,38 C 228,40 236,40 242,38 C 240,66 234,94 226,112 C 226,88 224,62 220,38 Z" />
          <path d="M260,40 C 268,42 276,42 282,40 C 280,66 274,92 266,108 C 266,86 264,62 260,40 Z" />
          <path d="M300,46 C 308,48 314,48 320,46 C 318,68 312,88 305,102 C 305,82 303,64 300,46 Z" />
          <path d="M336,55 C 342,57 348,57 353,55 C 351,72 346,86 340,96 C 340,82 338,68 336,55 Z" />
        </g>
        <path d="M104,70 C 170,46 260,42 350,58 C 270,48 170,58 104,80 Z" fill="#ffffff" opacity="0.13" />
        <path d="M110,100 C 190,114 300,108 392,86 L 392,120 L 110,126 Z" fill="#f4f4e4" opacity="0.35" />
      </g>

      {/* Bauchflosse (rötlich) */}
      <g className="pk-pelv">
        <path d="M240,118 C 242,134 258,142 274,136 C 264,126 254,120 248,114 Z" fill={`url(#${finRId})`} />
      </g>

      {/* Brustflosse (blass) */}
      <g className="pk-pect">
        <path d="M338,102 C 341,114 355,120 369,116 C 361,108 350,102 343,98 Z" fill="#c9b25e" opacity="0.55" />
      </g>

      {/* Kiemendeckel mit Dorn */}
      <path d="M348,60 C 339,76 339,92 350,106" stroke="#13200c" strokeWidth="2.2" fill="none" opacity="0.4" />
      <path d="M352,92 l10,4 -8,5 Z" fill="#94a45e" opacity="0.9" />

      {/* Maul */}
      <path d="M426,87 C 414,91 400,94 388,96" stroke="#13200c" strokeWidth="1.6" fill="none" opacity="0.5" />

      {/* Auge */}
      <circle cx="386" cy="74" r="5.8" fill="#1a240f" />
      <circle cx="386" cy="74" r="4.8" fill="#c89b3c" />
      <circle cx="386.8" cy="74.3" r="2.6" fill="#100b04" />
      <circle cx="384.6" cy="72.5" r="1" fill="#ffffff" opacity="0.85" />
    </g>
  );
}
