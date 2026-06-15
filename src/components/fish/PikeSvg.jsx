import React from 'react';

// Realistischer Hecht (Esox lucius) als SVG-Gruppe.
// Koordinatenraum: 0–460 (x) × 0–170 (y), Fisch blickt nach rechts.
// Wichtige Ankerpunkte: Maulspitze ≈ (443, 84), Körpermitte ≈ (230, 85).
//
// Animierbare Gruppen (per CSS-Klasse, transform-box: fill-box):
//   .pk-tail       Schwanzflosse        (Origin: Schwanzwurzel, 92% 50%)
//   .pk-dorsal     Rückenflosse         (Origin: 20% 100%)
//   .pk-anal       Afterflosse          (Origin: 20% 0%)
//   .pk-pect       Brustflosse          (Origin: 15% 10%)
//   .pk-pelv       Bauchflosse          (Origin: 20% 0%)
//   .pk-jaw-upper  Oberkiefer           (Origin: 2% 65%)
//   .pk-jaw-lower  Unterkiefer          (Origin: 2% 30%)
//
// `uid` muss pro Instanz eindeutig sein (Gradient-/Clip-IDs sind dokumentweit global).
export const PIKE_BASE_CSS = `
  .pk-tail { transform-box: fill-box; transform-origin: 92% 50%; animation: pkTailBeat 1.5s ease-in-out infinite alternate; }
  .pk-dorsal { transform-box: fill-box; transform-origin: 20% 100%; animation: pkFinSway 2.8s ease-in-out infinite alternate; }
  .pk-anal { transform-box: fill-box; transform-origin: 20% 0%; animation: pkFinSway 2.8s ease-in-out -1.1s infinite alternate; }
  .pk-pect { transform-box: fill-box; transform-origin: 15% 10%; animation: pkPectSway 2.2s ease-in-out infinite alternate; }
  .pk-pelv { transform-box: fill-box; transform-origin: 20% 0%; animation: pkPectSway 2.6s ease-in-out -0.6s infinite alternate; }
  .pk-jaw-upper { transform-box: fill-box; transform-origin: 2% 65%; }
  .pk-jaw-lower { transform-box: fill-box; transform-origin: 2% 30%; }
  .pk-barbel { transform-box: fill-box; transform-origin: 0% 0%; animation: pkBarbelSway 2.8s ease-in-out infinite alternate; }
  @keyframes pkTailBeat { from { transform: rotate(-6deg); } to { transform: rotate(6deg); } }
  @keyframes pkFinSway { from { transform: rotate(-2deg); } to { transform: rotate(2deg); } }
  @keyframes pkPectSway { from { transform: rotate(-7deg); } to { transform: rotate(7deg); } }
  @keyframes pkBarbelSway { from { transform: rotate(-5deg); } to { transform: rotate(6deg); } }
  @media (prefers-reduced-motion: reduce) {
    .pk-tail, .pk-dorsal, .pk-anal, .pk-pect, .pk-pelv, .pk-barbel { animation: none; }
  }
`;

export default function PikeSvg({ uid = 'pk' }) {
  const bodyId = `${uid}-body`;
  const finId = `${uid}-fin`;
  const clipId = `${uid}-clip`;
  const bodyPath = 'M76,74 C 100,62 150,54 210,52 C 270,51 320,56 352,62 C 380,67 415,74 442,81 L 443,87 C 420,92 396,96 368,99 C 330,106 290,111 240,114 C 180,116 120,112 80,100 C 72,92 72,80 76,74 Z';

  return (
    <g className="pk-fish">
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22381b" />
          <stop offset="30%" stopColor="#3d5c2b" />
          <stop offset="55%" stopColor="#587538" />
          <stop offset="74%" stopColor="#8a9e5c" />
          <stop offset="90%" stopColor="#cfd9ae" />
          <stop offset="100%" stopColor="#ecefdb" />
        </linearGradient>
        <linearGradient id={finId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6f8244" />
          <stop offset="100%" stopColor="#394e22" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Schwanzflosse – kräftiger, asymmetrisch wie echte Hechte */}
      <g className="pk-tail">
        <path d="M78,76 C 58,56 34,48 16,54 C 28,68 33,78 33,85 C 33,92 28,102 16,118 C 34,124 58,116 78,94 C 82,88 82,82 78,76 Z" fill={`url(#${finId})`} />
        <path d="M78,76 C 60,58 40,50 22,56 C 32,70 36,80 36,85 C 36,90 32,100 22,115 C 40,122 60,114 78,94" fill="#5a7a42" opacity="0.5" />
        <g stroke="#26371a" strokeWidth="1" opacity="0.5" fill="none">
          <path d="M74,80 L24,58" />
          <path d="M73,84 L30,72" />
          <path d="M72,86 L30,86" />
          <path d="M73,89 L30,99" />
          <path d="M74,92 L24,113" />
        </g>
        <g fill="#1c2a12" opacity="0.4">
          <ellipse cx="40" cy="66" rx="2.8" ry="1.8" />
          <ellipse cx="30" cy="80" rx="2.4" ry="1.6" />
          <ellipse cx="34" cy="98" rx="2.8" ry="1.8" />
          <ellipse cx="48" cy="108" rx="2.4" ry="1.6" />
          <ellipse cx="52" cy="60" rx="2.2" ry="1.5" />
          <ellipse cx="44" cy="89" rx="2" ry="1.4" />
        </g>
      </g>

      {/* Rückenflosse (beim Hecht weit hinten) – größer & detaillierter */}
      <g className="pk-dorsal">
        <path d="M98,63 C 104,40 138,30 166,38 C 158,50 146,57 126,61 Z" fill={`url(#${finId})`} />
        <path d="M100,61 C 108,42 140,32 165,39 C 160,48 152,55 132,59 Z" fill="#7a9650" opacity="0.4" />
        <g stroke="#26371a" strokeWidth="1" opacity="0.5" fill="none">
          <path d="M108,60 L116,40" />
          <path d="M122,59 L136,35" />
          <path d="M136,57 L156,38" />
          <path d="M148,58 L166,40" />
        </g>
      </g>

      {/* Afterflosse – kräftiger ausgeprägt */}
      <g className="pk-anal">
        <path d="M104,108 C 110,132 144,142 170,134 C 162,122 148,114 130,110 Z" fill={`url(#${finId})`} />
        <path d="M106,110 C 112,134 146,144 170,136 C 164,125 152,116 132,111 Z" fill="#7a9650" opacity="0.4" />
        <g stroke="#26371a" strokeWidth="1" opacity="0.5" fill="none">
          <path d="M114,110 L122,130" />
          <path d="M128,112 L144,136" />
          <path d="M142,112 L160,132" />
          <path d="M154,113 L170,133" />
        </g>
      </g>

      {/* Rumpf */}
      <path d={bodyPath} fill={`url(#${bodyId})`} />

      <g clipPath={`url(#${clipId})`}>
        {/* dunkler Rücken – intensiver */}
        <path d="M70,76 C 100,60 150,52 210,50 C 270,49 330,55 360,61 C 400,68 430,76 448,82 L 448,70 L 70,50 Z" fill="#0a1105" opacity="0.52" />
        {/* Rücken-Musterung */}
        <path d="M90,68 C 150,58 240,56 340,62 C 280,64 160,70 90,78 Z" fill="#1a2f10" opacity="0.35" />
        {/* Lichtreflex auf der oberen Flanke – stärker */}
        <path d="M84,72 C 150,60 260,58 370,70 C 280,66 150,68 84,80 Z" fill="#ffffff" opacity="0.18" />
        {/* heller Bauch */}
        <path d="M100,116 C 180,120 300,114 380,100 L 380,120 L 100,124 Z" fill="#f4f6e8" opacity="0.42" />
        {/* Seitenlinie – kräftiger */}
        <path d="M88,84 C 170,80 280,82 344,90" stroke="#0d1808" strokeWidth="1.5" fill="none" opacity="0.42" />
        {/* Kiemenschatten – realistischer */}
        <path d="M316,58 C 310,76 310,94 320,108 L 334,106 C 324,92 324,74 330,60 Z" fill="#070f04" opacity="0.28" />
        <path d="M324,66 C 318,78 318,90 326,102" stroke="#0a1204" strokeWidth="1.2" fill="none" opacity="0.35" />

        {/* helle Fleckenreihen – intensiver (typische Hecht-Zeichnung) */}
        <g fill="#e8ead8">
          <ellipse cx="96" cy="74" rx="3.8" ry="2" opacity="0.54" transform="rotate(-6 96 74)" />
          <ellipse cx="116" cy="68" rx="4.4" ry="2.2" opacity="0.62" transform="rotate(4 116 68)" />
          <ellipse cx="138" cy="73" rx="3.6" ry="1.9" opacity="0.52" />
          <ellipse cx="160" cy="66" rx="4.6" ry="2.3" opacity="0.58" transform="rotate(-5 160 66)" />
          <ellipse cx="184" cy="71" rx="4" ry="2" opacity="0.54" />
          <ellipse cx="208" cy="64" rx="4.4" ry="2.2" opacity="0.62" transform="rotate(6 208 64)" />
          <ellipse cx="232" cy="70" rx="3.8" ry="2" opacity="0.52" />
          <ellipse cx="256" cy="65" rx="4.6" ry="2.3" opacity="0.56" transform="rotate(-4 256 65)" />
          <ellipse cx="282" cy="70" rx="4" ry="2" opacity="0.54" />
          <ellipse cx="306" cy="66" rx="4.2" ry="2.1" opacity="0.56" />
          <ellipse cx="330" cy="71" rx="3.6" ry="1.9" opacity="0.50" transform="rotate(5 330 71)" />
          <ellipse cx="352" cy="68" rx="3.2" ry="1.8" opacity="0.46" />

          <ellipse cx="104" cy="88" rx="4.4" ry="2.2" opacity="0.56" transform="rotate(5 104 88)" />
          <ellipse cx="128" cy="92" rx="3.8" ry="2" opacity="0.52" />
          <ellipse cx="152" cy="85" rx="4.6" ry="2.3" opacity="0.58" transform="rotate(-6 152 85)" />
          <ellipse cx="176" cy="91" rx="3.8" ry="2" opacity="0.52" />
          <ellipse cx="202" cy="86" rx="4.4" ry="2.2" opacity="0.56" transform="rotate(4 202 86)" />
          <ellipse cx="228" cy="92" rx="4" ry="2" opacity="0.54" />
          <ellipse cx="254" cy="87" rx="4.4" ry="2.2" opacity="0.56" transform="rotate(-5 254 87)" />
          <ellipse cx="280" cy="92" rx="3.8" ry="2" opacity="0.52" />
          <ellipse cx="304" cy="88" rx="4" ry="2" opacity="0.54" transform="rotate(4 304 88)" />
          <ellipse cx="328" cy="92" rx="3.4" ry="1.8" opacity="0.48" />

          <ellipse cx="114" cy="102" rx="3.8" ry="2" opacity="0.50" transform="rotate(-4 114 102)" />
          <ellipse cx="140" cy="105" rx="4" ry="2" opacity="0.52" />
          <ellipse cx="168" cy="102" rx="4.2" ry="2.1" opacity="0.54" transform="rotate(5 168 102)" />
          <ellipse cx="196" cy="105" rx="3.8" ry="2" opacity="0.50" />
          <ellipse cx="224" cy="104" rx="4.2" ry="2.1" opacity="0.52" transform="rotate(-5 224 104)" />
          <ellipse cx="252" cy="103" rx="3.8" ry="2" opacity="0.50" />
          <ellipse cx="278" cy="101" rx="3.6" ry="1.9" opacity="0.48" transform="rotate(4 278 101)" />
          <ellipse cx="302" cy="99" rx="3.4" ry="1.8" opacity="0.46" />
        </g>

        {/* Kopfschattierung */}
        <path d="M340,58 C 380,64 420,73 448,81 L 448,70 C 420,64 380,58 340,54 Z" fill="#101c0a" opacity="0.3" />
      </g>

      {/* Bauchflosse */}
      <g className="pk-pelv">
        <path d="M242,113 C 244,127 260,135 274,131 C 266,122 256,116 250,112 Z" fill={`url(#${finId})`} opacity="0.95" />
      </g>

      {/* Brustflosse */}
      <g className="pk-pect">
        <path d="M328,100 C 332,114 348,122 364,117 C 356,108 344,101 336,97 Z" fill={`url(#${finId})`} opacity="0.95" />
      </g>

      {/* Kiemendeckel */}
      <path d="M322,63 C 314,78 314,92 324,103" stroke="#101c0a" strokeWidth="2.2" fill="none" opacity="0.4" />
      <path d="M338,66 C 332,78 332,90 340,100" stroke="#101c0a" strokeWidth="1.4" fill="none" opacity="0.22" />

      {/* Maulinneres + Zähne (realistischer beim Biss) */}
      <g>
        <path d="M368,81 L 438,84 L 368,92 Z" fill="#1a0d06" opacity="0.9" />
        <path d="M380,85 Q 410,84 435,86" stroke="#0d0805" strokeWidth="0.8" fill="none" opacity="0.6" />
        <g fill="#f5f8e8" opacity="0.88">
          <path d="M398,82.5 l1.8,3.4 1.8,-3.4 Z" />
          <path d="M410,83 l1.8,3.4 1.8,-3.4 Z" />
          <path d="M422,83.4 l1.8,3.4 1.8,-3.4 Z" />
          <path d="M430,83.8 l1.6,3 1.6,-3 Z" />
          <path d="M394,90.5 l1.8,-3.4 1.8,3.4 Z" />
          <path d="M406,90 l1.8,-3.4 1.8,3.4 Z" />
          <path d="M418,89.4 l1.8,-3.4 1.8,3.4 Z" />
          <path d="M429,88.6 l1.6,-3 1.6,3 Z" />
        </g>
      </g>

      {/* Oberkiefer – realistischer & detailliert */}
      <g className="pk-jaw-upper">
        <path d="M366,73 C 396,70 420,73 436,78 L 442,81 L 442,84.5 C 420,86.5 392,86.5 366,84.5 Z" fill="#3f5c2d" />
        <path d="M368,74 C 396,71 418,74 435,79 L 440,82 C 420,84 394,84 368,82 Z" fill="#506d39" opacity="0.4" />
        <path d="M366,73 C 396,70 420,73 436,78 L 442,81 C 424,79.5 396,77.5 366,77.5 Z" fill="#0a1504" opacity="0.45" />
        <path d="M442,84 C 418,86.2 392,86.2 366,84.2" stroke="#081100" strokeWidth="1.4" fill="none" opacity="0.65" />
        <ellipse cx="416" cy="76.5" rx="1.6" ry="1" fill="#0d1608" opacity="0.68" />
      </g>

      {/* Unterkiefer – kräftiger ausgeprägt */}
      <g className="pk-jaw-lower">
        <path d="M366,84 C 394,87 420,87 437,83.5 C 441,82.5 446,80.5 445.5,83.5 C 442,90 418,97 392,98.5 C 380,98.5 370,94 366,92 Z" fill="#556a3c" />
        <path d="M368,86 C 392,89 418,89 440,85 C 443,84 447,82 446,85 C 443,91 422,97 396,98 C 384,98 374,95 368,92 Z" fill="#6d824e" opacity="0.35" />
        <path d="M372,94 C 392,98 418,96 441,87 C 438,93 416,99 392,99.5 C 384,99.5 376,97 372,94.5 Z" fill="#e5ead0" opacity="0.55" />
      </g>

      {/* Wangenzeichnung */}
      <ellipse cx="350" cy="78" rx="3" ry="1.6" fill="#dde9b4" opacity="0.3" />
      <ellipse cx="356" cy="90" rx="2.6" ry="1.4" fill="#dde9b4" opacity="0.26" />

      {/* Auge – realistischer */}
      <circle cx="372" cy="71.5" r="6.5" fill="#0d1608" opacity="0.8" />
      <circle cx="372" cy="71.5" r="5.8" fill="#d4a840" />
      <circle cx="372" cy="71.5" r="4.2" fill="#9d7828" />
      <circle cx="373.5" cy="72" r="2.8" fill="#020a01" opacity="0.9" />
      <circle cx="371" cy="69.8" r="1.2" fill="#ffffff" opacity="0.9" />
      <circle cx="373.8" cy="72.5" r="0.6" fill="#ffffff" opacity="0.5" />
    </g>
  );
}
