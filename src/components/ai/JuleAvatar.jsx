import React, { useId } from 'react';

// Jule – KI-Avatar der Angelexpertin im futuristischen Android-Look
// (blaues Haar, Leuchtlinien auf Haut und Anzug, offene Handflächen).
// Bewusst als SVG ohne Hintergrund umgesetzt, damit der Avatar als
// freistehendes Widget funktioniert und Kopf, Arme und Mund sich echt
// bewegen können:
//  - idle:      ruhiges Atmen, leichtes Kopfpendeln, pulsierende Leuchtpunkte
//  - listening: Kopf neigt sich zur linken Hand, über der offenen
//               Handfläche pulsiert ein Zuhör-Ring mit Ohr-Symbol
//  - speaking:  Kopf nickt, beide Arme gestikulieren, der Mund animiert,
//               neben der rechten Hand läuft eine goldene Stimm-Welle
export const JULE_AVATAR_CSS = `
  .jule-head,
  .jule-arm-l,
  .jule-arm-r,
  .jule-mouth-open,
  .jule-ring,
  .jule-wave-bar,
  .jule-spark {
    transform-box: fill-box;
  }

  .jule-head {
    transform-origin: 50% 92%;
    animation: juleHeadIdle 5s ease-in-out infinite;
  }
  .jule--speaking .jule-head {
    animation: juleHeadTalk 1.15s ease-in-out infinite;
  }
  .jule--listening .jule-head {
    animation: juleHeadListen 2.4s ease-in-out infinite;
  }

  .jule-arm-l {
    transform-origin: 92% 8%;
    animation: juleArmIdleL 5s ease-in-out infinite;
  }
  .jule-arm-r {
    transform-origin: 8% 8%;
    animation: juleArmIdleR 5s ease-in-out infinite;
  }
  .jule--speaking .jule-arm-l {
    animation: juleArmTalkL 1.3s ease-in-out infinite;
  }
  .jule--speaking .jule-arm-r {
    animation: juleArmTalkR 1.3s ease-in-out infinite;
  }
  .jule--listening .jule-arm-l {
    animation: juleArmListenL 1.8s ease-in-out infinite;
  }
  .jule--listening .jule-arm-r {
    animation: juleArmIdleR 3s ease-in-out infinite;
  }

  .jule-mouth-open {
    transform-origin: center;
    animation: juleMouthTalk 0.26s ease-in-out infinite;
  }

  .jule-dot {
    animation: juleDotGlow 2.6s ease-in-out infinite;
  }
  .jule-dot--slow {
    animation-duration: 3.4s;
    animation-delay: 0.8s;
  }

  .jule-aura {
    animation: juleAuraBreath 5s ease-in-out infinite;
  }

  .jule-ring {
    transform-origin: center;
  }
  .jule-ring-1 {
    animation: juleRingPulse 1.6s ease-out infinite;
  }
  .jule-ring-2 {
    animation: juleRingPulse 1.6s ease-out infinite 0.55s;
  }

  .jule-wave-bar {
    transform-origin: center;
    animation: juleWaveBounce 0.9s ease-in-out infinite;
  }

  .jule-spark {
    transform-origin: center;
    animation: juleSpark 1.4s ease-in-out infinite;
  }

  @keyframes juleHeadIdle {
    0%, 100% { transform: rotate(0deg); }
    30%      { transform: rotate(-1.6deg); }
    70%      { transform: rotate(1.2deg); }
  }
  @keyframes juleHeadTalk {
    0%, 100% { transform: rotate(0deg) translateY(0); }
    30%      { transform: rotate(-2.4deg) translateY(1px); }
    65%      { transform: rotate(2deg) translateY(-0.6px); }
  }
  @keyframes juleHeadListen {
    0%, 100% { transform: rotate(-3deg); }
    50%      { transform: rotate(-6.5deg); }
  }
  @keyframes juleArmIdleL {
    0%, 100% { transform: rotate(0deg); }
    50%      { transform: rotate(2deg); }
  }
  @keyframes juleArmIdleR {
    0%, 100% { transform: rotate(0deg); }
    50%      { transform: rotate(-2deg); }
  }
  @keyframes juleArmTalkL {
    0%, 100% { transform: rotate(0deg); }
    40%      { transform: rotate(7deg); }
    75%      { transform: rotate(-2.5deg); }
  }
  @keyframes juleArmTalkR {
    0%, 100% { transform: rotate(0deg); }
    40%      { transform: rotate(-7deg); }
    75%      { transform: rotate(2.5deg); }
  }
  @keyframes juleArmListenL {
    0%, 100% { transform: rotate(5deg); }
    50%      { transform: rotate(9deg); }
  }
  @keyframes juleMouthTalk {
    0%, 100% { transform: scaleY(0.3); }
    50%      { transform: scaleY(1); }
  }
  @keyframes juleDotGlow {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }
  @keyframes juleAuraBreath {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 1; }
  }
  @keyframes juleRingPulse {
    0%   { transform: scale(0.7); opacity: 0.9; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  @keyframes juleWaveBounce {
    0%, 100% { transform: scaleY(0.35); }
    50%      { transform: scaleY(1); }
  }
  @keyframes juleSpark {
    0%, 100% { opacity: 0.15; transform: scale(0.55); }
    50%      { opacity: 1; transform: scale(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .jule-head,
    .jule-arm-l,
    .jule-arm-r,
    .jule-mouth-open,
    .jule-dot,
    .jule-aura,
    .jule-ring-1,
    .jule-ring-2,
    .jule-wave-bar,
    .jule-spark {
      animation: none;
    }
  }
`;

const WAVE_BARS = [
  { x: -12, h: 8, delay: 0 },
  { x: -8, h: 13, delay: 0.12 },
  { x: -4, h: 19, delay: 0.24 },
  { x: 0, h: 23, delay: 0.36 },
  { x: 4, h: 17, delay: 0.48 },
  { x: 8, h: 12, delay: 0.6 },
  { x: 12, h: 8, delay: 0.72 },
];

// Fingergeometrie der offenen Handfläche (wird links gespiegelt wiederverwendet)
function OpenPalm({ skin }) {
  return (
    <>
      <ellipse cx="0" cy="0" rx="6.2" ry="4.8" fill={skin} />
      <ellipse cx="-5" cy="-4" rx="1.7" ry="4.8" transform="rotate(-30 -5 -4)" fill={skin} />
      <ellipse cx="-1.5" cy="-5.5" rx="1.7" ry="5.4" transform="rotate(-10 -1.5 -5.5)" fill={skin} />
      <ellipse cx="2" cy="-5.5" rx="1.7" ry="5.2" transform="rotate(6 2 -5.5)" fill={skin} />
      <ellipse cx="5.5" cy="-4" rx="1.6" ry="4.4" transform="rotate(22 5.5 -4)" fill={skin} />
      <ellipse cx="6.8" cy="1.5" rx="1.8" ry="3.4" transform="rotate(72 6.8 1.5)" fill={skin} />
      <ellipse cx="0.4" cy="0.6" rx="3.4" ry="2.4" fill="#8ea6ba" opacity="0.28" />
    </>
  );
}

export default function JuleAvatar({
  speaking = false,
  listening = false,
  size = 96,
  showHints = true,
  className = '',
  style = {},
}) {
  const stateClass = speaking ? 'jule--speaking' : listening ? 'jule--listening' : '';
  // Eindeutige IDs pro Instanz, damit mehrere gleichzeitig gemountete Avatare
  // (z. B. Widget + Chat-Header) sich die Verläufe/Filter nicht streitig machen.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name) => `jule-${uid}-${name}`;
  const ref = (name) => `url(#${id(name)})`;

  return (
    <div
      className={`${stateClass} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    >
      <style>{JULE_AVATAR_CSS}</style>
      <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="Jule">
        <defs>
          <linearGradient id={id('skin')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef4fa" />
            <stop offset="55%" stopColor="#ccd9e6" />
            <stop offset="100%" stopColor="#9db2c6" />
          </linearGradient>
          <radialGradient id={id('faceSheen')} cx="38%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id('hair')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4d7fb4" />
            <stop offset="45%" stopColor="#2c5581" />
            <stop offset="100%" stopColor="#101f35" />
          </linearGradient>
          <linearGradient id={id('hairSheen')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fc2ef" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#8fc2ef" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id('suit')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#aabfd3" />
            <stop offset="50%" stopColor="#75899e" />
            <stop offset="100%" stopColor="#48596d" />
          </linearGradient>
          <linearGradient id={id('wave')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff3c9" />
            <stop offset="50%" stopColor="#ffd06e" />
            <stop offset="100%" stopColor="#e09a2a" />
          </linearGradient>
          <radialGradient id={id('dot')} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#5fd9f4" />
          </radialGradient>
          <radialGradient id={id('iris')} cx="42%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#a5ddf5" />
            <stop offset="55%" stopColor="#3f8dc2" />
            <stop offset="100%" stopColor="#153a55" />
          </radialGradient>
          <linearGradient id={id('lip')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c47e93" />
            <stop offset="100%" stopColor="#96566c" />
          </linearGradient>
          <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3fe0d0" />
            <stop offset="100%" stopColor="#7df2ff" />
          </linearGradient>
          <radialGradient id={id('aura')} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#4fd8f0" stopOpacity="0.16" />
            <stop offset="60%" stopColor="#4fd8f0" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#4fd8f0" stopOpacity="0" />
          </radialGradient>
          <filter id={id('glow')} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={id('glowSoft')} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Holografischer Lichtschein hinter der Figur */}
        <ellipse className="jule-aura" cx="100" cy="108" rx="80" ry="88" fill={ref('aura')} />

        {/* Haare hinter Kopf und Schultern – mit Lichtsträhnen und Leuchtfäden */}
        <g>
          <path
            d="M100 16 C68 16 52 42 52 72 C52 100 53 128 60 146 C66 132 66 98 70 84 C76 64 124 64 130 84 C134 98 134 132 140 146 C147 128 148 100 148 72 C148 42 132 16 100 16 Z"
            fill={ref('hair')}
          />
          <path d="M62 58 C57 82 58 112 65 136" stroke="#5d8fc4" strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" />
          <path d="M138 58 C143 82 142 112 135 136" stroke="#5d8fc4" strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" />
          <path d="M70 44 C64 66 64 96 69 120" stroke="#3d6a99" strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round" />
          <path d="M130 44 C136 66 136 96 131 120" stroke="#3d6a99" strokeWidth="1.6" fill="none" opacity="0.6" strokeLinecap="round" />
          <g filter={ref('glow')} opacity="0.5">
            <path d="M58 66 C56 88 58 112 63 130" stroke="#67e3f7" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <path d="M142 66 C144 88 142 112 137 130" stroke="#67e3f7" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          </g>
        </g>

        {/* Hals mit Schattenkante unter dem Kinn */}
        <path d="M92 84 C92 98 94 105 100 106 C106 105 108 98 108 84 Z" fill={ref('skin')} />
        <path d="M92.5 84 C93 90 95 94 100 95 C105 94 107 90 107.5 84 Z" fill="#7f97ab" opacity="0.45" />

        {/* Oberkörper im taillierten Anzug – Schultern, Rim-Light, Leuchtnähte und Energie-Knoten */}
        <g>
          <path
            d="M100 108 C91 108 83 111 77 117 C70 124 68 133 72 142 C77 151 81 157 82 164 C81.5 177 78 189 76 200 L124 200 C122 189 118.5 177 118 164 C119 157 123 151 128 142 C132 133 130 124 123 117 C117 111 109 108 100 108 Z"
            fill={ref('suit')}
          />
          <path d="M89 141 Q100 148 111 141" stroke="#3a4b5f" strokeWidth="1.3" fill="none" opacity="0.25" strokeLinecap="round" />
          <path d="M78 119 C72 126 70 134 73.5 142 C78 151 82 158 83 164 C82.5 177 79.5 189 77.5 198" stroke="#d7e6f2" strokeWidth="1.4" fill="none" opacity="0.35" strokeLinecap="round" />
          <path d="M122 119 C128 126 130 134 126.5 142 C122 151 118 158 117 164 C117.5 177 120.5 189 122.5 198" stroke="#2c3b4d" strokeWidth="1.3" fill="none" opacity="0.35" strokeLinecap="round" />
          <g filter={ref('glow')}>
            <path d="M100 112 L100 200" stroke="#67e3f7" strokeWidth="1.2" opacity="0.65" />
            <path d="M86 124 Q100 136 114 124" stroke="#67e3f7" strokeWidth="1.2" fill="none" opacity="0.65" />
            <path d="M88 114 Q94 119 100 120 Q106 119 112 114" stroke="#67e3f7" strokeWidth="0.9" fill="none" opacity="0.5" />
            <path d="M83 153 Q90 159 96 157" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.45" />
            <path d="M117 153 Q110 159 104 157" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.45" />
            <path d="M81 178 Q100 187 119 178" stroke="#67e3f7" strokeWidth="0.9" fill="none" opacity="0.35" />
          </g>
          <g filter={ref('glowSoft')}>
            <circle className="jule-dot" cx="100" cy="124" r="1.9" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="86" cy="124" r="1.4" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="114" cy="124" r="1.4" fill={ref('dot')} />
            <circle className="jule-dot" cx="100" cy="157" r="1.4" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="100" cy="182" r="1.2" fill={ref('dot')} />
          </g>
        </g>

        {/* Linker Arm – gestikuliert beim Sprechen, hält beim Zuhören die offene Hand hoch */}
        <g className="jule-arm-l">
          <path
            d="M81 120 Q57 133 50 152"
            stroke={ref('suit')}
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M79 116.5 Q58 128 51 144" stroke="#d7e6f2" strokeWidth="1.3" fill="none" opacity="0.35" strokeLinecap="round" />
          <path
            d="M50 151 Q41 140 35 129"
            stroke={ref('skin')}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M64 126 Q53 138 51 150" stroke="#67e3f7" strokeWidth="1.1" fill="none" opacity="0.7" filter={ref('glow')} />
          <g transform="translate(30 122) rotate(-16)">
            <OpenPalm skin={ref('skin')} />
          </g>
        </g>

        {/* Rechter Arm */}
        <g className="jule-arm-r">
          <path
            d="M119 120 Q143 133 150 152"
            stroke={ref('suit')}
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M121 116.5 Q142 128 149 144" stroke="#d7e6f2" strokeWidth="1.3" fill="none" opacity="0.35" strokeLinecap="round" />
          <path
            d="M150 151 Q159 140 165 129"
            stroke={ref('skin')}
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M136 126 Q147 138 149 150" stroke="#67e3f7" strokeWidth="1.1" fill="none" opacity="0.7" filter={ref('glow')} />
          <g transform="translate(170 122) rotate(16) scale(-1 1)">
            <OpenPalm skin={ref('skin')} />
          </g>
        </g>

        {/* Kopf – nickt beim Sprechen, neigt sich beim Zuhören */}
        <g className="jule-head">
          <ellipse cx="77" cy="62" rx="3.4" ry="5" fill={ref('skin')} />
          <ellipse cx="123" cy="62" rx="3.4" ry="5" fill={ref('skin')} />
          <ellipse cx="100" cy="60" rx="23.5" ry="27" fill={ref('skin')} />
          <ellipse cx="100" cy="60" rx="23.5" ry="27" fill={ref('faceSheen')} />

          {/* Pony mit Seitenscheitel und Lichtsträhne */}
          <path
            d="M76 56 C76 34 86 24 100 24 C114 24 124 34 124 56 C122 44 116 38 108 37 C112 42 113 46 113 49 C106 40 92 40 84 49 C80 52 78 54 76 56 Z"
            fill={ref('hair')}
          />
          <path d="M76 54 C74 62 74 72 77 82 C75 70 75 60 76 54 Z" fill={ref('hair')} />
          <path d="M124 54 C126 62 126 72 123 82 C125 70 125 60 124 54 Z" fill={ref('hair')} />
          <path d="M84 31 C90 26.5 100 25.5 108 29" stroke={ref('hairSheen')} strokeWidth="2" fill="none" opacity="0.8" strokeLinecap="round" />
          <path d="M86 40 C92 35 102 34 110 38" stroke={ref('hairSheen')} strokeWidth="1.1" fill="none" opacity="0.5" strokeLinecap="round" />

          {/* Leuchtbahnen im Gesicht wie feine Schaltkreise */}
          <g filter={ref('glow')}>
            <path d="M92 31 Q100 28.5 108 31" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.7" />
            <path d="M81 50 L84.5 56 L83.5 64" stroke="#67e3f7" strokeWidth="1.2" fill="none" opacity="0.85" />
            <path d="M119 50 L115.5 56 L116.5 64" stroke="#67e3f7" strokeWidth="1.2" fill="none" opacity="0.85" />
            <path d="M83.5 64 Q86 70 90 72.5" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.65" />
            <path d="M116.5 64 Q114 70 110 72.5" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.65" />
          </g>
          <g filter={ref('glowSoft')}>
            <circle className="jule-dot" cx="83.5" cy="64.5" r="1.2" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="116.5" cy="64.5" r="1.2" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="100" cy="33" r="1.2" fill={ref('dot')} />
            <circle className="jule-dot" cx="92" cy="31" r="0.9" fill={ref('dot')} />
            <circle className="jule-dot jule-dot--slow" cx="108" cy="31" r="0.9" fill={ref('dot')} />
          </g>

          {/* Augenbrauen */}
          <path d="M86 51 Q91 48.5 96 51" stroke="#2c4258" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M104 51 Q109 48.5 114 51" stroke="#2c4258" strokeWidth="1.7" fill="none" strokeLinecap="round" />

          {/* Augen mit Lidschatten, Wimpernkante, Iris-Verlauf und Glanzlichtern */}
          <g>
            <path d="M86.5 55.5 Q91 52.5 95.5 55.5" stroke="#a4b8ca" strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" />
            <ellipse cx="91" cy="58" rx="4" ry="4.4" fill="#ffffff" />
            <circle cx="91.4" cy="58.2" r="2.6" fill={ref('iris')} />
            <circle cx="91.4" cy="58.2" r="1.2" fill="#0c1c28" />
            <circle cx="90.3" cy="57.1" r="0.75" fill="#ffffff" />
            <circle cx="92.5" cy="59.2" r="0.4" fill="#ffffff" opacity="0.7" />
            <path d="M87 56.4 Q91 53.7 95 56.4" stroke="#23384c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M86.8 56.6 L85.6 55.6" stroke="#23384c" strokeWidth="1" strokeLinecap="round" />
          </g>
          <g>
            <path d="M104.5 55.5 Q109 52.5 113.5 55.5" stroke="#a4b8ca" strokeWidth="2.2" fill="none" opacity="0.5" strokeLinecap="round" />
            <ellipse cx="109" cy="58" rx="4" ry="4.4" fill="#ffffff" />
            <circle cx="108.6" cy="58.2" r="2.6" fill={ref('iris')} />
            <circle cx="108.6" cy="58.2" r="1.2" fill="#0c1c28" />
            <circle cx="107.5" cy="57.1" r="0.75" fill="#ffffff" />
            <circle cx="109.7" cy="59.2" r="0.4" fill="#ffffff" opacity="0.7" />
            <path d="M105 56.4 Q109 53.7 113 56.4" stroke="#23384c" strokeWidth="1.3" fill="none" strokeLinecap="round" />
            <path d="M113.2 56.6 L114.4 55.6" stroke="#23384c" strokeWidth="1" strokeLinecap="round" />
          </g>

          {/* Nase */}
          <path d="M99.4 63 Q98.6 67.5 100 68.8 Q101.4 67.5 100.6 63" stroke="#8ba1b5" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* Wangen */}
          <ellipse cx="85" cy="68" rx="3.6" ry="2" fill="#d78c9b" opacity="0.22" />
          <ellipse cx="115" cy="68" rx="3.6" ry="2" fill="#d78c9b" opacity="0.22" />

          {/* Mund – geschlossenes Lächeln (Ruhe/Zuhören) */}
          {!speaking && (
            <g>
              <path d="M91 76.5 Q100 82.5 109 76.5" stroke={ref('lip')} strokeWidth="2.4" fill="none" strokeLinecap="round" />
              <path d="M95 80.2 Q100 82.4 105 80.2" stroke="#e8b6c1" strokeWidth="1.1" fill="none" opacity="0.4" strokeLinecap="round" />
            </g>
          )}

          {/* Mund – offen und animiert (spricht) */}
          {speaking && (
            <g className="jule-mouth-open">
              <ellipse cx="100" cy="78" rx="5.6" ry="4.2" fill="#5c2334" />
              <ellipse cx="100" cy="76.4" rx="4.2" ry="1.3" fill="#ffffff" />
              <ellipse cx="100" cy="80.4" rx="2.8" ry="1.5" fill="#d16a84" />
            </g>
          )}
        </g>

        {/* Zuhör-Hinweis: leuchtender Ring mit Ohr-Symbol über der linken Hand */}
        {showHints && listening && !speaking && (
          <g transform="translate(30 92)">
            <circle className="jule-ring" r="16" fill="none" stroke={ref('ring')} strokeWidth="1.4" opacity="0.35" />
            <g filter={ref('glow')}>
              <circle className="jule-ring jule-ring-1" r="16" fill="none" stroke={ref('ring')} strokeWidth="1.6" />
              <circle className="jule-ring jule-ring-2" r="11" fill="none" stroke="#63e8f5" strokeWidth="1.4" />
            </g>
            <circle r="8.5" fill="#06222c" opacity="0.72" />
            <circle r="8.5" fill="none" stroke="#63e8f5" strokeWidth="0.5" opacity="0.5" />
            <g filter={ref('glow')}>
              <path
                d="M-2.5 3.5 C-5 1 -5 -3.5 -1.5 -5.5 C1.5 -7 4.5 -5 4.5 -2 C4.5 0.5 2.5 1 2 3 C1.6 4.8 -0.5 5.5 -2.5 3.5"
                fill="none"
                stroke="#d9fbf6"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M-6.5 -1.5 L-5 -1.5 M-8 1 L-6 1" stroke="#d9fbf6" strokeWidth="1.1" strokeLinecap="round" />
            </g>
            <circle className="jule-spark" cx="13" cy="-9" r="1" fill="#7df2ff" />
            <circle className="jule-spark" cx="-12" cy="10" r="0.8" fill="#7df2ff" style={{ animationDelay: '0.5s' }} />
            <circle className="jule-spark" cx="4" cy="15" r="0.7" fill="#7df2ff" style={{ animationDelay: '0.9s' }} />
          </g>
        )}

        {/* Sprech-Hinweis: goldene Stimm-Welle mit Funkeln neben der rechten Hand */}
        {showHints && speaking && (
          <g transform="translate(168 92)">
            <g filter={ref('glow')}>
              {WAVE_BARS.map((bar) => (
                <rect
                  key={bar.x}
                  className="jule-wave-bar"
                  x={bar.x - 1.5}
                  y={-bar.h / 2}
                  width="3"
                  height={bar.h}
                  rx="1.5"
                  fill={ref('wave')}
                  style={{ animationDelay: `${bar.delay}s` }}
                />
              ))}
            </g>
            <circle className="jule-spark" cx="-15" cy="-13" r="1" fill="#ffe3a3" />
            <circle className="jule-spark" cx="16" cy="-8" r="0.9" fill="#ffe3a3" style={{ animationDelay: '0.4s' }} />
            <circle className="jule-spark" cx="10" cy="13" r="0.7" fill="#ffe3a3" style={{ animationDelay: '0.8s' }} />
            <circle className="jule-spark" cx="-9" cy="12" r="0.8" fill="#ffe3a3" style={{ animationDelay: '1.1s' }} />
          </g>
        )}
      </svg>
    </div>
  );
}
