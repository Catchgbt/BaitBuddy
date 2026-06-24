import React from 'react';

// Bachforelle (Salmo trutta fario) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Animierbare Gruppen wie bei PikeSvg: .pk-tail, .pk-dorsal, .pk-anal, .pk-pelv, .pk-pect
export default function TroutSvg({ uid = 'tr' }) {
  const bodyId = `${uid}-body`;
  const finId = `${uid}-fin`;
  const clipId = `${uid}-clip`;
  const bodyPath = 'M60,78 C 110,58 180,50 250,52 C 310,54 360,62 400,74 C 416,80 426,84 430,86 L 430,90 C 420,96 404,100 386,104 C 340,112 280,116 220,114 C 150,112 90,100 60,92 C 54,86 54,84 60,78 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f3d1c" />
          <stop offset="35%" stopColor="#9c7c3a" />
          <stop offset="65%" stopColor="#d9c084" />
          <stop offset="88%" stopColor="#eee3bc" />
          <stop offset="100%" stopColor="#f6f1dd" />
        </linearGradient>
        <linearGradient id={finId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a8854a" />
          <stop offset="100%" stopColor="#6e5526" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Schwanzflosse (fast gerade Hinterkante) */}
      <g className="pk-tail">
        <path d="M62,78 C 42,62 26,58 14,62 L 24,85 L 14,110 C 26,114 42,108 62,92 C 66,86 66,84 62,78 Z" fill={`url(#${finId})`} />
        <g stroke="#52401c" strokeWidth="0.9" opacity="0.4" fill="none">
          <path d="M58,80 L22,66" />
          <path d="M57,85 L26,85" />
          <path d="M58,90 L22,106" />
        </g>
      </g>

      <g className="pk-dorsal">
        {/* Rückenflosse */}
        <path d="M230,52 C 226,32 206,28 194,36 L 184,52 Z" fill={`url(#${finId})`} />
        <g stroke="#52401c" strokeWidth="0.9" opacity="0.4" fill="none">
          <path d="M222,50 L216,34" />
          <path d="M208,50 L200,38" />
        </g>
        {/* Fettflosse (typisch Salmonide) */}
        <path d="M126,64 C 124,54 114,52 110,58 L 108,66 Z" fill={`url(#${finId})`} opacity="0.9" />
      </g>

      {/* Afterflosse */}
      <g className="pk-anal">
        <path d="M148,108 C 150,124 164,130 178,125 C 170,117 162,111 156,106 Z" fill={`url(#${finId})`} />
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        <path d="M54,80 C 110,58 180,50 250,52 C 316,54 368,64 408,78 L 440,86 L 440,60 L 54,48 Z" fill="#2c2008" opacity="0.42" />
        <path d="M80,72 C 150,56 260,54 370,70 C 280,62 160,64 80,80 Z" fill="#ffffff" opacity="0.10" />
        <path d="M90,104 C 180,114 300,108 390,92 L 390,120 L 90,124 Z" fill="#f6f0d8" opacity="0.4" />
        {/* schwarze Tupfen */}
        <g fill="#241c08" opacity="0.65">
          <circle cx="110" cy="72" r="1.8" /><circle cx="132" cy="64" r="2.2" /><circle cx="158" cy="74" r="1.6" />
          <circle cx="182" cy="62" r="2" /><circle cx="206" cy="72" r="1.7" /><circle cx="234" cy="63" r="2.2" />
          <circle cx="262" cy="71" r="1.8" /><circle cx="290" cy="64" r="2" /><circle cx="318" cy="72" r="1.7" />
          <circle cx="344" cy="67" r="1.9" /><circle cx="368" cy="74" r="1.6" /><circle cx="390" cy="79" r="1.5" />
          <circle cx="146" cy="86" r="1.6" /><circle cx="222" cy="88" r="1.6" /><circle cx="300" cy="84" r="1.7" />
          <circle cx="352" cy="86" r="1.5" /><circle cx="120" cy="96" r="1.4" /><circle cx="250" cy="98" r="1.4" />
        </g>
        {/* rote Tupfen mit hellem Hof */}
        <g>
          <circle cx="124" cy="84" r="3.2" fill="#f3e7c0" opacity="0.55" /><circle cx="124" cy="84" r="1.7" fill="#b43a24" />
          <circle cx="170" cy="90" r="3.2" fill="#f3e7c0" opacity="0.55" /><circle cx="170" cy="90" r="1.7" fill="#b43a24" />
          <circle cx="212" cy="84" r="3.2" fill="#f3e7c0" opacity="0.55" /><circle cx="212" cy="84" r="1.7" fill="#b43a24" />
          <circle cx="258" cy="90" r="3.2" fill="#f3e7c0" opacity="0.55" /><circle cx="258" cy="90" r="1.7" fill="#b43a24" />
          <circle cx="304" cy="86" r="3.2" fill="#f3e7c0" opacity="0.55" /><circle cx="304" cy="86" r="1.7" fill="#b43a24" />
          <circle cx="346" cy="90" r="3" fill="#f3e7c0" opacity="0.55" /><circle cx="346" cy="90" r="1.6" fill="#b43a24" />
        </g>
      </g>

      {/* Bauchflosse */}
      <g className="pk-pelv">
        <path d="M236,112 C 238,126 252,133 266,128 C 257,120 248,114 242,109 Z" fill={`url(#${finId})`} />
      </g>

      {/* Brustflosse */}
      <g className="pk-pect">
        <path d="M346,98 C 350,112 366,118 380,113 C 372,105 360,99 352,95 Z" fill={`url(#${finId})`} opacity="0.9" />
      </g>

      {/* Kiemendeckel mit Tupfen */}
      <path d="M356,64 C 348,78 348,92 358,104" stroke="#2c2008" strokeWidth="2" fill="none" opacity="0.35" />
      <circle cx="368" cy="92" r="1.6" fill="#241c08" opacity="0.6" />
      <circle cx="362" cy="76" r="1.4" fill="#241c08" opacity="0.6" />

      {/* Maul */}
      <path d="M430,88 C 418,92 404,95 392,96" stroke="#2c2008" strokeWidth="1.6" fill="none" opacity="0.5" />

      {/* Auge */}
      <circle cx="398" cy="76" r="5.2" fill="#241c08" />
      <circle cx="398" cy="76" r="4.3" fill="#caa64e" />
      <circle cx="398.8" cy="76.3" r="2.4" fill="#0e0a04" />
      <circle cx="396.8" cy="74.6" r="0.9" fill="#ffffff" opacity="0.85" />
    </g>
  );
}
