import React from 'react';

// Buddy-Fisch mit integrierter Sprechblase
// Ein freundlicher, animierter Fisch als KI-Buddy Avatar
// Koordinatenraum: 0–280 (x) × 0–200 (y)

export const BUDDY_FISH_CSS = `
  .bf-fish { }

  /* Fisch-Body Animation - subtile Atmung */
  .bf-body {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: bfBreathing 3s ease-in-out infinite;
  }

  /* Tail-Animation */
  .bf-tail {
    transform-box: fill-box;
    transform-origin: 8% 50%;
    animation: bfTailWag 1.5s ease-in-out infinite alternate;
  }

  .bf-tail-talking {
    animation: bfTailWagFast 0.8s ease-in-out infinite alternate;
  }

  /* Fins Animation */
  .bf-fin-dorsal {
    transform-box: fill-box;
    transform-origin: 45% 100%;
    animation: bfFinSway 2.8s ease-in-out infinite alternate;
  }

  .bf-fin-pect {
    transform-box: fill-box;
    transform-origin: 30% 50%;
    animation: bfFinFlutter 2.2s ease-in-out infinite alternate;
  }

  /* Eye Animation - happy/thinking */
  .bf-eye {
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  .bf-eye-blinking {
    animation: bfBlink 3s ease-in-out infinite;
  }

  /* Mouth Animation - talking */
  .bf-mouth {
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  .bf-mouth-talking {
    animation: bfMouthTalk 0.4s ease-in-out infinite;
  }

  /* Bubble Animation */
  .bf-bubble {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: bfBubbleFloat 0.8s ease-in-out infinite;
  }

  .bf-bubble-text {
    animation: bfBubbleTextFade 2s ease-in-out infinite;
  }

  @keyframes bfBreathing {
    0%, 100% { transform: translateY(0px) scaleX(1); }
    50% { transform: translateY(-1.5px) scaleX(1.03); }
  }

  @keyframes bfTailWag {
    from { transform: rotateZ(-3deg); }
    to { transform: rotateZ(3deg); }
  }

  @keyframes bfTailWagFast {
    from { transform: rotateZ(-5deg); }
    to { transform: rotateZ(5deg); }
  }

  @keyframes bfFinSway {
    from { transform: rotateZ(-2deg); }
    to { transform: rotateZ(2deg); }
  }

  @keyframes bfFinFlutter {
    from { transform: rotateZ(-4deg); }
    to { transform: rotateZ(4deg); }
  }

  @keyframes bfBlink {
    0%, 10%, 12%, 100% { transform: scaleY(1); }
    11% { transform: scaleY(0.1); }
  }

  @keyframes bfMouthTalk {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.4); }
  }

  @keyframes bfBubbleFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-3px); }
  }

  @keyframes bfBubbleTextFade {
    0%, 10% { opacity: 0; }
    20%, 80% { opacity: 1; }
    90%, 100% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bf-body, .bf-tail, .bf-fin-dorsal, .bf-fin-pect,
    .bf-eye-blinking, .bf-mouth-talking, .bf-bubble,
    .bf-bubble-text { animation: none; }
  }
`;

export default function FemaleFisherSvg({
  uid = 'bf',
  isTalking = false,
  isNodding = false,
  showBubble = false
}) {
  const bodyGradId = `${uid}-body-grad`;
  const scaleGradId = `${uid}-scale-grad`;
  const finGradId = `${uid}-fin-grad`;
  const tailGradId = `${uid}-tail-grad`;
  const bubbleGradId = `${uid}-bubble-grad`;

  const bodyClass = `bf-body ${isNodding ? 'bf-body-nod' : ''}`;
  const tailClass = `bf-tail ${isTalking ? 'bf-tail-talking' : ''}`;
  const mouthClass = `bf-mouth ${isTalking ? 'bf-mouth-talking' : ''}`;
  const eyeClass = `bf-eye bf-eye-blinking`;

  return (
    <svg viewBox="0 0 280 200" width="110" height="95">
      <defs>
        {/* Body Gradient - Silberblau */}
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a90e2" />
          <stop offset="50%" stopColor="#357abd" />
          <stop offset="100%" stopColor="#1a4d7a" />
        </linearGradient>

        {/* Scale Pattern Gradient */}
        <linearGradient id={scaleGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5ba3f5" />
          <stop offset="50%" stopColor="#9ecbff" />
          <stop offset="100%" stopColor="#5ba3f5" />
        </linearGradient>

        {/* Fin Gradient */}
        <linearGradient id={finGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6eb3ff" />
          <stop offset="100%" stopColor="#2d5fa3" />
        </linearGradient>

        {/* Tail Gradient */}
        <linearGradient id={tailGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#357abd" />
          <stop offset="50%" stopColor="#4a90e2" />
          <stop offset="100%" stopColor="#2d5fa3" />
        </linearGradient>

        {/* Bubble Gradient */}
        <linearGradient id={bubbleGradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
          <stop offset="100%" stopColor="rgba(74,144,226,0.1)" />
        </linearGradient>
      </defs>

      <g className="bf-fish">
        {/* Main Body */}
        <g className={bodyClass}>
          {/* Back (Rücken) */}
          <path
            d="M 50,60 Q 85,45 130,42 Q 160,40 200,48 Q 220,52 240,62 Q 220,55 200,53 Q 160,48 130,50 Q 85,53 50,68 Z"
            fill="url(#bodyGradId)"
            opacity="0.4"
          />

          {/* Main Body Shape */}
          <ellipse cx="115" cy="85" rx="70" ry="38" fill={`url(#${bodyGradId})`} />

          {/* Belly (Bauch) - heller */}
          <ellipse cx="115" cy="98" rx="65" ry="20" fill="#b8d7ff" opacity="0.5" />

          {/* Scale Pattern */}
          <g fill={`url(#${scaleGradId})`} opacity="0.6">
            <circle cx="65" cy="70" r="5" />
            <circle cx="80" cy="65" r="5" />
            <circle cx="95" cy="62" r="5" />
            <circle cx="110" cy="60" r="5" />
            <circle cx="125" cy="60" r="5" />
            <circle cx="140" cy="62" r="5" />
            <circle cx="155" cy="65" r="5" />
            <circle cx="170" cy="70" r="5" />

            <circle cx="60" cy="85" r="4.5" />
            <circle cx="75" cy="83" r="4.5" />
            <circle cx="90" cy="82" r="4.5" />
            <circle cx="105" cy="81" r="4.5" />
            <circle cx="120" cy="81" r="4.5" />
            <circle cx="135" cy="81" r="4.5" />
            <circle cx="150" cy="83" r="4.5" />
            <circle cx="165" cy="85" r="4.5" />
          </g>

          {/* Kiemen (Gills) */}
          <path
            d="M 150,70 C 148,80 148,95 150,105"
            stroke="#357abd"
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M 158,72 C 156,82 156,97 158,107"
            stroke="#357abd"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* Dorsal Fin (Rückenflosse) */}
        <g className="bf-fin-dorsal">
          <path
            d="M 110,60 L 120,35 L 125,60 Z"
            fill={`url(#${finGradId})`}
            opacity="0.9"
          />
          <path
            d="M 115,55 L 120,38 L 122,55"
            stroke="#ffffff"
            strokeWidth="0.5"
            fill="none"
            opacity="0.4"
          />
        </g>

        {/* Pectoral Fin (Brustflosse) */}
        <g className="bf-fin-pect">
          <path
            d="M 80,90 Q 70,100 65,105 Q 70,100 80,95 Z"
            fill={`url(#${finGradId})`}
            opacity="0.85"
          />
          <path
            d="M 78,92 L 67,103"
            stroke="#ffffff"
            strokeWidth="0.5"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* Tail (Schwanz) */}
        <g className={tailClass}>
          <path
            d="M 185,75 L 240,55 L 245,85 L 240,115 L 185,95 Z"
            fill={`url(#${tailGradId})`}
          />
          <path
            d="M 240,70 L 250,60 L 245,85 L 250,110 L 240,100 Z"
            fill={`url(#${tailGradId})`}
            opacity="0.7"
          />
          {/* Tail Lines */}
          <g stroke="#1a4d7a" strokeWidth="0.8" opacity="0.4" fill="none">
            <line x1="205" y1="70" x2="240" y2="60" />
            <line x1="210" y1="65" x2="245" y2="55" />
            <line x1="210" y1="105" x2="245" y2="115" />
            <line x1="205" y1="100" x2="240" y2="110" />
          </g>
        </g>

        {/* Head Section */}
        <g>
          {/* Mouth (Mund) */}
          <g className={mouthClass}>
            <ellipse cx="35" cy="88" rx="6" ry="5" fill="#1a3a5a" />
            <path
              d="M 32,88 Q 35,92 38,88"
              stroke="#ffffff"
              strokeWidth="0.5"
              fill="none"
              opacity="0.6"
            />
          </g>

          {/* Eye */}
          <g className={eyeClass}>
            <circle cx="50" cy="72" r="6" fill="#ffffff" />
            <circle cx="50" cy="72" r="4.5" fill="#4a90e2" />
            <circle cx="51" cy="71" r="2.5" fill="#000000" />
            <circle cx="52" cy="70" r="1" fill="#ffffff" opacity="0.8" />
          </g>

          {/* Light Reflection on Head */}
          <ellipse cx="45" cy="68" rx="4" ry="2.5" fill="#ffffff" opacity="0.3" />
        </g>

        {/* Optional: Sprechblase mit Bubble-Punkte */}
        {showBubble && (
          <>
            {/* Kleine Bubbles die aus dem Mund kommen */}
            <g className="bf-bubble" style={{ animationDelay: '0s' }}>
              <circle cx="28" cy="80" r="3" fill={`url(#${bubbleGradId})`} />
              <circle cx="28" cy="80" r="2.8" fill="none" stroke="#6eb3ff" strokeWidth="0.5" opacity="0.6" />
            </g>
            <g className="bf-bubble" style={{ animationDelay: '0.3s' }}>
              <circle cx="22" cy="75" r="2" fill={`url(#${bubbleGradId})`} />
              <circle cx="22" cy="75" r="1.8" fill="none" stroke="#6eb3ff" strokeWidth="0.4" opacity="0.6" />
            </g>
            <g className="bf-bubble" style={{ animationDelay: '0.6s' }}>
              <circle cx="18" cy="68" r="1.5" fill={`url(#${bubbleGradId})`} />
              <circle cx="18" cy="68" r="1.3" fill="none" stroke="#6eb3ff" strokeWidth="0.3" opacity="0.6" />
            </g>
          </>
        )}
      </g>
    </svg>
  );
}

