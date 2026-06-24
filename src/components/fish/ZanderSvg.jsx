import React from 'react';

// Zander (Sander lucioperca) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Animierbare Gruppen wie bei PikeSvg: .pk-tail, .pk-dorsal, .pk-anal, .pk-pelv, .pk-pect
export default function ZanderSvg({ uid = 'zd' }) {
  const bodyId = `${uid}-body`;
  const finId = `${uid}-fin`;
  const clipId = `${uid}-clip`;
  const bodyPath = 'M70,76 C 110,60 170,52 240,52 C 300,52 350,60 392,70 C 412,75 428,80 436,85 L 436,89 C 424,94 408,98 388,101 C 340,109 280,114 220,112 C 150,110 95,100 70,94 C 63,87 63,82 70,76 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3438" />
          <stop offset="35%" stopColor="#5c6a72" />
          <stop offset="65%" stopColor="#93a2aa" />
          <stop offset="88%" stopColor="#d4dde2" />
          <stop offset="100%" stopColor="#eef3f5" />
        </linearGradient>
        <linearGradient id={finId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6e7d85" />
          <stop offset="100%" stopColor="#3a464c" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Schwanzflosse mit Punktreihen */}
      <g className="pk-tail">
        <path d="M72,78 C 54,58 32,50 16,54 C 28,68 33,78 33,85 C 33,92 28,102 16,116 C 32,120 54,112 72,92 C 76,86 76,84 72,78 Z" fill={`url(#${finId})`} />
        <g fill="#1e262a" opacity="0.5">
          <circle cx="40" cy="68" r="1.4" /><circle cx="30" cy="84" r="1.4" /><circle cx="38" cy="100" r="1.4" />
          <circle cx="52" cy="74" r="1.3" /><circle cx="52" cy="96" r="1.3" />
        </g>
      </g>

      <g className="pk-dorsal">
        {/* 1. Rückenflosse: stachelig, geschlossene Membran, Punktreihen */}
        <path d="M298,57 L 290,28 L 283,42 L 276,26 L 269,40 L 262,26 L 255,40 L 248,28 L 241,42 L 234,32 L 227,44 L 220,36 L 212,54 C 240,48 270,50 298,57 Z" fill="#6e7d85" opacity="0.75" />
        <g fill="#252e33" opacity="0.7">
          <circle cx="284" cy="44" r="1.5" /><circle cx="268" cy="40" r="1.5" /><circle cx="252" cy="40" r="1.5" /><circle cx="236" cy="42" r="1.5" />
          <circle cx="280" cy="52" r="1.4" /><circle cx="262" cy="48" r="1.4" /><circle cx="244" cy="48" r="1.4" /><circle cx="228" cy="50" r="1.4" />
        </g>
        {/* 2. Rückenflosse */}
        <path d="M198,55 C 190,38 166,36 152,46 L 140,58 Z" fill="#6e7d85" opacity="0.7" />
        <g fill="#252e33" opacity="0.6">
          <circle cx="184" cy="48" r="1.4" /><circle cx="168" cy="46" r="1.4" /><circle cx="156" cy="50" r="1.4" />
        </g>
      </g>

      {/* Afterflosse */}
      <g className="pk-anal">
        <path d="M160,108 C 162,124 178,132 192,126 C 184,117 176,111 170,106 Z" fill={`url(#${finId})`} opacity="0.9" />
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        <path d="M64,78 C 110,60 170,52 240,52 C 304,52 358,62 400,74 L 446,86 L 446,60 L 64,46 Z" fill="#171d20" opacity="0.42" />
        {/* Querbinden (oben, verwaschen) */}
        <g fill="#1c2428" opacity="0.35">
          <path d="M120,60 C 126,72 126,82 122,90 L 134,88 C 138,80 138,70 132,58 Z" />
          <path d="M158,55 C 164,69 164,81 160,90 L 172,88 C 176,78 176,66 170,53 Z" />
          <path d="M196,53 C 202,68 202,82 198,92 L 210,90 C 214,80 214,66 208,52 Z" />
          <path d="M234,52 C 240,68 240,82 236,93 L 248,91 C 252,80 252,66 246,52 Z" />
          <path d="M272,54 C 278,68 278,82 274,92 L 286,90 C 290,80 290,67 284,53 Z" />
          <path d="M310,57 C 316,70 316,82 312,91 L 324,89 C 328,80 328,68 322,56 Z" />
          <path d="M348,62 C 352,72 352,82 349,89 L 360,87 C 364,79 364,70 358,61 Z" />
        </g>
        <path d="M84,72 C 150,58 260,56 380,72 C 290,64 160,66 84,80 Z" fill="#ffffff" opacity="0.16" />
        <path d="M90,102 C 180,112 300,106 396,90 L 396,118 L 90,122 Z" fill="#eef3f5" opacity="0.4" />
        <path d="M88,84 C 170,80 280,82 350,90" stroke="#171d20" strokeWidth="1.2" fill="none" opacity="0.25" />
      </g>

      {/* Bauchflosse */}
      <g className="pk-pelv">
        <path d="M250,110 C 252,124 266,131 280,126 C 271,118 262,112 256,107 Z" fill={`url(#${finId})`} opacity="0.9" />
      </g>

      {/* Brustflosse */}
      <g className="pk-pect">
        <path d="M340,98 C 344,112 360,119 375,114 C 366,105 354,99 346,95 Z" fill={`url(#${finId})`} opacity="0.85" />
      </g>

      {/* Kiemendeckel */}
      <path d="M334,62 C 326,77 326,92 336,104" stroke="#171d20" strokeWidth="2.2" fill="none" opacity="0.4" />
      <path d="M348,66 C 342,78 342,90 350,100" stroke="#171d20" strokeWidth="1.4" fill="none" opacity="0.22" />

      {/* Maul mit kleinen Fangzähnen */}
      <path d="M436,87 C 420,91 402,94 386,96" stroke="#171d20" strokeWidth="1.6" fill="none" opacity="0.55" />
      <g fill="#f0f4f4" opacity="0.8">
        <path d="M414,92.6 l1.6,3 1.6,-3 Z" />
        <path d="M424,90.8 l1.6,3 1.6,-3 Z" />
      </g>

      {/* Glasauge */}
      <circle cx="392" cy="74" r="6.4" fill="#1e262a" />
      <circle cx="392" cy="74" r="5.4" fill="#aebfc8" />
      <circle cx="392" cy="74" r="3.4" fill="#3c474d" />
      <circle cx="393" cy="74.4" r="2.2" fill="#0d1113" />
      <circle cx="390.2" cy="71.8" r="1.5" fill="#ffffff" opacity="0.9" />
    </g>
  );
}
