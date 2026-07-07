import React from 'react';

// Jule – KI-Avatar der Angelexpertin im futuristischen Android-Look
// (blaues Haar, Leuchtlinien auf Haut und Anzug, offene Handflächen).
// Bewusst als SVG ohne Hintergrund umgesetzt, damit der Avatar als
// freistehendes Widget funktioniert und Kopf, Arme und Mund sich echt
// bewegen können:
//  - idle:      ruhiges Atmen, leichtes Kopfpendeln
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
  .jule-wave-bar {
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
  @keyframes juleRingPulse {
    0%   { transform: scale(0.7); opacity: 0.9; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  @keyframes juleWaveBounce {
    0%, 100% { transform: scaleY(0.35); }
    50%      { transform: scaleY(1); }
  }

  @media (prefers-reduced-motion: reduce) {
    .jule-head,
    .jule-arm-l,
    .jule-arm-r,
    .jule-mouth-open,
    .jule-dot,
    .jule-ring-1,
    .jule-ring-2,
    .jule-wave-bar {
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

export default function JuleAvatar({
  speaking = false,
  listening = false,
  size = 96,
  showHints = true,
  className = '',
  style = {},
}) {
  const stateClass = speaking ? 'jule--speaking' : listening ? 'jule--listening' : '';

  return (
    <div
      className={`${stateClass} ${className}`.trim()}
      style={{ width: size, height: size, ...style }}
    >
      <style>{JULE_AVATAR_CSS}</style>
      <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label="Jule">
        <defs>
          <linearGradient id="juleSkin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dae4ee" />
            <stop offset="100%" stopColor="#a7bacc" />
          </linearGradient>
          <linearGradient id="juleSuit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93a7ba" />
            <stop offset="100%" stopColor="#5c7186" />
          </linearGradient>
          <linearGradient id="juleHair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#41678f" />
            <stop offset="100%" stopColor="#16283f" />
          </linearGradient>
          <linearGradient id="juleWave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe3a3" />
            <stop offset="100%" stopColor="#eda93c" />
          </linearGradient>
          <radialGradient id="juleDotFill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e6fcff" />
            <stop offset="100%" stopColor="#5fd9f4" />
          </radialGradient>
        </defs>

        {/* Haare hinter Kopf und Schultern */}
        <path
          d="M100 16 C68 16 52 42 52 72 C52 99 56 124 64 142 C68 126 66 98 70 84 C76 64 124 64 130 84 C134 98 132 126 136 142 C144 124 148 99 148 72 C148 42 132 16 100 16 Z"
          fill="url(#juleHair)"
        />

        {/* Hals */}
        <path d="M92 84 C92 98 94 105 100 106 C106 105 108 98 108 84 Z" fill="url(#juleSkin)" />

        {/* Oberkörper im Anzug mit Leuchtnähten */}
        <path
          d="M62 200 C62 160 66 136 76 122 C83 112 91 108 100 108 C109 108 117 112 124 122 C134 136 138 160 138 200 Z"
          fill="url(#juleSuit)"
        />
        <path d="M100 112 L100 200" stroke="#67e3f7" strokeWidth="1.2" opacity="0.55" />
        <path d="M86 124 Q100 136 114 124" stroke="#67e3f7" strokeWidth="1.2" fill="none" opacity="0.55" />
        <path d="M74 152 Q87 159 96 157" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M126 152 Q113 159 104 157" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.4" />
        <circle className="jule-dot" cx="100" cy="124" r="1.6" fill="url(#juleDotFill)" />
        <circle className="jule-dot jule-dot--slow" cx="86" cy="124" r="1.3" fill="url(#juleDotFill)" />
        <circle className="jule-dot jule-dot--slow" cx="114" cy="124" r="1.3" fill="url(#juleDotFill)" />
        <circle className="jule-dot" cx="100" cy="157" r="1.3" fill="url(#juleDotFill)" />

        {/* Linker Arm – gestikuliert beim Sprechen, hält beim Zuhören die offene Hand hoch */}
        <g className="jule-arm-l">
          <path
            d="M78 118 Q56 132 50 152"
            stroke="url(#juleSuit)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M50 151 Q41 140 35 129"
            stroke="url(#juleSkin)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M64 126 Q53 138 51 150" stroke="#67e3f7" strokeWidth="1.1" fill="none" opacity="0.6" />
          <g transform="translate(30 122) rotate(-16)">
            <ellipse cx="0" cy="0" rx="6.2" ry="4.8" fill="url(#juleSkin)" />
            <ellipse cx="-5" cy="-4" rx="1.7" ry="4.8" transform="rotate(-30 -5 -4)" fill="url(#juleSkin)" />
            <ellipse cx="-1.5" cy="-5.5" rx="1.7" ry="5.4" transform="rotate(-10 -1.5 -5.5)" fill="url(#juleSkin)" />
            <ellipse cx="2" cy="-5.5" rx="1.7" ry="5.2" transform="rotate(6 2 -5.5)" fill="url(#juleSkin)" />
            <ellipse cx="5.5" cy="-4" rx="1.6" ry="4.4" transform="rotate(22 5.5 -4)" fill="url(#juleSkin)" />
            <ellipse cx="6.8" cy="1.5" rx="1.8" ry="3.4" transform="rotate(72 6.8 1.5)" fill="url(#juleSkin)" />
          </g>
        </g>

        {/* Rechter Arm */}
        <g className="jule-arm-r">
          <path
            d="M122 118 Q144 132 150 152"
            stroke="url(#juleSuit)"
            strokeWidth="13"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M150 151 Q159 140 165 129"
            stroke="url(#juleSkin)"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M136 126 Q147 138 149 150" stroke="#67e3f7" strokeWidth="1.1" fill="none" opacity="0.6" />
          <g transform="translate(170 122) rotate(16) scale(-1 1)">
            <ellipse cx="0" cy="0" rx="6.2" ry="4.8" fill="url(#juleSkin)" />
            <ellipse cx="-5" cy="-4" rx="1.7" ry="4.8" transform="rotate(-30 -5 -4)" fill="url(#juleSkin)" />
            <ellipse cx="-1.5" cy="-5.5" rx="1.7" ry="5.4" transform="rotate(-10 -1.5 -5.5)" fill="url(#juleSkin)" />
            <ellipse cx="2" cy="-5.5" rx="1.7" ry="5.2" transform="rotate(6 2 -5.5)" fill="url(#juleSkin)" />
            <ellipse cx="5.5" cy="-4" rx="1.6" ry="4.4" transform="rotate(22 5.5 -4)" fill="url(#juleSkin)" />
            <ellipse cx="6.8" cy="1.5" rx="1.8" ry="3.4" transform="rotate(72 6.8 1.5)" fill="url(#juleSkin)" />
          </g>
        </g>

        {/* Kopf – nickt beim Sprechen, neigt sich beim Zuhören */}
        <g className="jule-head">
          <ellipse cx="77" cy="62" rx="3.4" ry="5" fill="url(#juleSkin)" />
          <ellipse cx="123" cy="62" rx="3.4" ry="5" fill="url(#juleSkin)" />
          <ellipse cx="100" cy="60" rx="23.5" ry="27" fill="url(#juleSkin)" />

          {/* Pony mit Seitenscheitel */}
          <path
            d="M76 56 C76 34 86 24 100 24 C114 24 124 34 124 56 C122 44 116 38 108 37 C112 42 113 46 113 49 C106 40 92 40 84 49 C80 52 78 54 76 56 Z"
            fill="url(#juleHair)"
          />
          <path d="M76 54 C74 62 74 72 77 82 C75 70 75 60 76 54 Z" fill="url(#juleHair)" />
          <path d="M124 54 C126 62 126 72 123 82 C125 70 125 60 124 54 Z" fill="url(#juleHair)" />

          {/* Leuchtlinien im Gesicht */}
          <path d="M81 50 L84.5 56 L83.5 64" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M119 50 L115.5 56 L116.5 64" stroke="#67e3f7" strokeWidth="1" fill="none" opacity="0.6" />
          <circle className="jule-dot" cx="83.5" cy="64.5" r="1.1" fill="url(#juleDotFill)" />
          <circle className="jule-dot jule-dot--slow" cx="116.5" cy="64.5" r="1.1" fill="url(#juleDotFill)" />
          <circle className="jule-dot jule-dot--slow" cx="100" cy="33" r="1.1" fill="url(#juleDotFill)" />

          {/* Augenbrauen */}
          <path d="M86 51 Q91 48.5 96 51" stroke="#2c4258" strokeWidth="1.7" fill="none" strokeLinecap="round" />
          <path d="M104 51 Q109 48.5 114 51" stroke="#2c4258" strokeWidth="1.7" fill="none" strokeLinecap="round" />

          {/* Augen */}
          <g>
            <ellipse cx="91" cy="58" rx="4" ry="4.4" fill="#ffffff" />
            <circle cx="91.4" cy="58.2" r="2.5" fill="#56b7e6" />
            <circle cx="91.4" cy="58.2" r="1.2" fill="#10222f" />
            <circle cx="90.3" cy="57.1" r="0.7" fill="#ffffff" />
          </g>
          <g>
            <ellipse cx="109" cy="58" rx="4" ry="4.4" fill="#ffffff" />
            <circle cx="108.6" cy="58.2" r="2.5" fill="#56b7e6" />
            <circle cx="108.6" cy="58.2" r="1.2" fill="#10222f" />
            <circle cx="107.5" cy="57.1" r="0.7" fill="#ffffff" />
          </g>

          {/* Nase */}
          <path d="M99.4 63 Q98.6 67.5 100 68.8 Q101.4 67.5 100.6 63" stroke="#8ba1b5" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* Mund – geschlossenes Lächeln (Ruhe/Zuhören) */}
          {!speaking && (
            <path d="M91 76.5 Q100 82.5 109 76.5" stroke="#a56a7c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
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

        {/* Zuhör-Hinweis: pulsierender Ring mit Ohr-Symbol über der linken Hand */}
        {showHints && listening && !speaking && (
          <g transform="translate(30 92)">
            <circle className="jule-ring" r="16" fill="none" stroke="#3fe0d0" strokeWidth="1.4" opacity="0.35" />
            <circle className="jule-ring jule-ring-1" r="16" fill="none" stroke="#3fe0d0" strokeWidth="1.6" />
            <circle className="jule-ring jule-ring-2" r="11" fill="none" stroke="#63e8f5" strokeWidth="1.4" />
            <circle r="8" fill="#0e2a33" opacity="0.55" />
            <path
              d="M-2.5 3.5 C-5 1 -5 -3.5 -1.5 -5.5 C1.5 -7 4.5 -5 4.5 -2 C4.5 0.5 2.5 1 2 3 C1.6 4.8 -0.5 5.5 -2.5 3.5"
              fill="none"
              stroke="#c7f8f2"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path d="M-6.5 -1.5 L-5 -1.5 M-8 1 L-6 1" stroke="#c7f8f2" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        )}

        {/* Sprech-Hinweis: goldene Stimm-Welle neben der rechten Hand */}
        {showHints && speaking && (
          <g transform="translate(168 92)">
            {WAVE_BARS.map((bar) => (
              <rect
                key={bar.x}
                className="jule-wave-bar"
                x={bar.x - 1.5}
                y={-bar.h / 2}
                width="3"
                height={bar.h}
                rx="1.5"
                fill="url(#juleWave)"
                style={{ animationDelay: `${bar.delay}s` }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
