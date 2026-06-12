import React from 'react';

// Karpfen (Cyprinus carpio) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Animierbare Gruppen wie bei PikeSvg: .pk-tail, .pk-dorsal, .pk-anal, .pk-pelv, .pk-pect
export default function CarpSvg({ uid = 'cp' }) {
  const bodyId = `${uid}-body`;
  const finId = `${uid}-fin`;
  const clipId = `${uid}-clip`;
  const scalesId = `${uid}-scales`;
  const bodyPath = 'M90,74 C 130,48 190,32 250,32 C 300,32 350,46 388,64 C 408,72 424,80 430,87 L 430,92 C 420,100 400,108 376,114 C 330,126 270,132 220,128 C 160,124 110,106 90,100 C 82,92 82,82 90,74 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f2e13" />
          <stop offset="30%" stopColor="#6b4d20" />
          <stop offset="55%" stopColor="#a07a33" />
          <stop offset="75%" stopColor="#c8a352" />
          <stop offset="90%" stopColor="#e2cf9a" />
          <stop offset="100%" stopColor="#efe6c8" />
        </linearGradient>
        <linearGradient id={finId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a24" />
          <stop offset="100%" stopColor="#5f3c16" />
        </linearGradient>
        <pattern id={scalesId} width="20" height="12" patternUnits="userSpaceOnUse">
          <path d="M0,0 a10,10 0 0 0 20,0" fill="none" stroke="#3a2a10" strokeWidth="0.9" opacity="0.3" />
          <path d="M-10,6 a10,10 0 0 0 20,0" fill="none" stroke="#3a2a10" strokeWidth="0.9" opacity="0.3" />
          <path d="M10,6 a10,10 0 0 0 20,0" fill="none" stroke="#3a2a10" strokeWidth="0.9" opacity="0.3" />
        </pattern>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Schwanzflosse */}
      <g className="pk-tail">
        <path d="M92,76 C 70,52 44,42 24,46 C 38,64 44,78 44,87 C 44,96 38,110 24,128 C 44,132 70,122 92,98 C 96,90 96,84 92,76 Z" fill={`url(#${finId})`} />
        <g stroke="#4a3012" strokeWidth="1" opacity="0.4" fill="none">
          <path d="M88,82 L34,52" />
          <path d="M86,87 L46,87" />
          <path d="M88,92 L34,122" />
        </g>
      </g>

      {/* lange Rückenflosse mit hohem vorderem Lappen */}
      <g className="pk-dorsal">
        <path d="M250,36 L 242,8 C 234,4 224,6 220,12 L 214,28 C 196,30 170,38 142,54 C 150,40 160,30 174,24 L 250,36 Z" fill={`url(#${finId})`} opacity="0.95" />
        <path d="M250,36 L 242,8 C 234,4 224,6 220,12 L 214,28 C 190,32 164,42 142,54 C 174,44 214,38 250,36 Z" fill={`url(#${finId})`} />
        <g stroke="#4a3012" strokeWidth="0.9" opacity="0.45" fill="none">
          <path d="M238,34 L234,10" />
          <path d="M224,34 L218,14" />
          <path d="M206,36 L200,24" />
          <path d="M184,42 L176,30" />
          <path d="M162,48 L154,40" />
        </g>
      </g>

      {/* Afterflosse */}
      <g className="pk-anal">
        <path d="M150,116 C 152,134 168,142 182,136 C 174,127 166,120 160,114 Z" fill={`url(#${finId})`} />
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        <rect x="80" y="20" width="280" height="100" fill={`url(#${scalesId})`} />
        <path d="M84,76 C 130,48 190,32 250,32 C 310,32 360,48 400,68 L 440,84 L 440,60 L 84,40 Z" fill="#241806" opacity="0.4" />
        <path d="M100,118 C 180,132 300,124 400,98 L 400,130 L 100,138 Z" fill="#f2ead0" opacity="0.4" />
        <path d="M100,66 C 170,44 260,38 350,52 C 270,42 170,52 100,74 Z" fill="#ffffff" opacity="0.14" />
        <path d="M104,88 C 180,84 290,86 360,92" stroke="#241806" strokeWidth="1.3" fill="none" opacity="0.25" />
      </g>

      {/* Bauchflosse */}
      <g className="pk-pelv">
        <path d="M244,124 C 246,140 262,148 278,142 C 268,133 258,126 252,120 Z" fill={`url(#${finId})`} />
      </g>

      {/* Brustflosse */}
      <g className="pk-pect">
        <path d="M330,108 C 334,124 352,130 368,124 C 358,114 346,107 338,103 Z" fill={`url(#${finId})`} />
      </g>

      {/* Kiemendeckel */}
      <path d="M352,58 C 342,76 342,94 354,110" stroke="#241806" strokeWidth="2.2" fill="none" opacity="0.35" />
      <path d="M366,62 C 358,78 358,92 368,106" stroke="#241806" strokeWidth="1.4" fill="none" opacity="0.2" />

      {/* unterständiges Maul mit Lippen und Barteln */}
      <path d="M430,87 C 422,90 412,93 402,95" stroke="#241806" strokeWidth="1.6" fill="none" opacity="0.5" />
      <path d="M426,90 a4,3 0 0 0 6,-2" stroke="#caa05c" strokeWidth="2" fill="none" opacity="0.8" />
      <path d="M424,93 q5,9 1,15" stroke="#6b4d20" strokeWidth="1.8" fill="none" />
      <path d="M416,94 q4,7 1,11" stroke="#6b4d20" strokeWidth="1.4" fill="none" />

      {/* Auge */}
      <circle cx="394" cy="70" r="5.4" fill="#241806" />
      <circle cx="394" cy="70" r="4.4" fill="#c8a352" />
      <circle cx="394.8" cy="70.3" r="2.4" fill="#120c04" />
      <circle cx="392.8" cy="68.6" r="0.9" fill="#ffffff" opacity="0.85" />
    </g>
  );
}
