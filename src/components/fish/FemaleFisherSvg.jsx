import React from 'react';

// Karpfen-Avatar - Kompakter, animierter Karpfen als Buddy
// Koordinatenraum: 0–200 (x) × 0–120 (y)

export const BUDDY_FISH_CSS = `
  .bf-fish { }

  /* Body Animation - subtile Atmung */
  .bf-body {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: bfBreathing 2.5s ease-in-out infinite;
  }

  /* Tail Animation */
  .bf-tail {
    transform-box: fill-box;
    transform-origin: 5% 50%;
    animation: bfTailWag 1.2s ease-in-out infinite alternate;
  }

  .bf-tail-talking {
    animation: bfTailWagFast 0.6s ease-in-out infinite alternate;
  }

  /* Fins */
  .bf-fin-dorsal {
    transform-box: fill-box;
    transform-origin: 45% 100%;
    animation: bfFinSway 2.2s ease-in-out infinite alternate;
  }

  .bf-fin-pect {
    transform-box: fill-box;
    transform-origin: 30% 50%;
    animation: bfFinFlutter 1.8s ease-in-out infinite alternate;
  }

  /* Mouth Animation */
  .bf-mouth {
    transform-box: fill-box;
    transform-origin: 50% 50%;
  }

  .bf-mouth-talking {
    animation: bfMouthTalk 0.3s ease-in-out infinite;
  }

  @keyframes bfBreathing {
    0%, 100% { transform: translateY(0px) scaleX(1); }
    50% { transform: translateY(-1px) scaleX(1.02); }
  }

  @keyframes bfTailWag {
    from { transform: rotateZ(-2deg); }
    to { transform: rotateZ(2deg); }
  }

  @keyframes bfTailWagFast {
    from { transform: rotateZ(-3deg); }
    to { transform: rotateZ(3deg); }
  }

  @keyframes bfFinSway {
    from { transform: rotateZ(-1deg); }
    to { transform: rotateZ(1deg); }
  }

  @keyframes bfFinFlutter {
    from { transform: rotateZ(-2deg); }
    to { transform: rotateZ(2deg); }
  }

  @keyframes bfMouthTalk {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.3); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bf-body, .bf-tail, .bf-fin-dorsal, .bf-fin-pect, .bf-mouth-talking {
      animation: none;
    }
  }
`;

export default function FemaleFisherSvg({
  uid = 'bf',
  isTalking = false,
  isNodding = false,
  showBubble = false
}) {
  const bodyGradId = `${uid}-body-grad`;
  const finGradId = `${uid}-fin-grad`;
  const tailGradId = `${uid}-tail-grad`;

  const bodyClass = `bf-body`;
  const tailClass = `bf-tail ${isTalking ? 'bf-tail-talking' : ''}`;
  const mouthClass = `bf-mouth ${isTalking ? 'bf-mouth-talking' : ''}`;

  return (
    <svg viewBox="0 0 200 120" width="65" height="40">
      <defs>
        {/* Karpfen-Farben: Gold/Braun */}
        <linearGradient id={bodyGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6914" />
          <stop offset="50%" stopColor="#c9a84a" />
          <stop offset="100%" stopColor="#a0824a" />
        </linearGradient>

        <linearGradient id={finGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a5a24" />
          <stop offset="100%" stopColor="#5f3c16" />
        </linearGradient>

        <linearGradient id={tailGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a0824a" />
          <stop offset="50%" stopColor="#c9a84a" />
          <stop offset="100%" stopColor="#8b6914" />
        </linearGradient>
      </defs>

      <g className="bf-fish">
        {/* Karpfen Body */}
        <g className={bodyClass}>
          {/* Rückenlinie */}
          <path
            d="M 20,35 Q 45,25 90,25 Q 130,25 160,35"
            stroke="#6b4914"
            strokeWidth="1.5"
            fill="none"
            opacity="0.4"
          />

          {/* Hauptkörper - Ellipse */}
          <ellipse cx="85" cy="55" rx="50" ry="28" fill={`url(#${bodyGradId})`} />

          {/* Bauchseite - heller */}
          <ellipse cx="85" cy="65" rx="45" ry="15" fill="#e2cf9a" opacity="0.4" />

          {/* Schuppen-Andeutung */}
          <g fill="none" stroke="#6b4914" strokeWidth="0.6" opacity="0.3">
            <circle cx="50" cy="48" r="3" />
            <circle cx="65" cy="44" r="3" />
            <circle cx="80" cy="42" r="3" />
            <circle cx="95" cy="42" r="3" />
            <circle cx="110" cy="44" r="3" />
            <circle cx="125" cy="48" r="3" />

            <circle cx="45" cy="62" r="2.5" />
            <circle cx="60" cy="60" r="2.5" />
            <circle cx="75" cy="59" r="2.5" />
            <circle cx="90" cy="59" r="2.5" />
            <circle cx="105" cy="60" r="2.5" />
            <circle cx="120" cy="62" r="2.5" />
          </g>

          {/* Kiemen */}
          <path
            d="M 130,45 C 128,55 128,65 130,72"
            stroke="#8b6914"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </g>

        {/* Schwanzflosse */}
        <g className={tailClass}>
          <path
            d="M 30,48 L 5,35 L 8,55 L 5,75 L 30,62 Z"
            fill={`url(#${tailGradId})`}
            opacity="0.9"
          />
          {/* Tail Details */}
          <g stroke="#6b4914" strokeWidth="0.5" opacity="0.3" fill="none">
            <line x1="18" y1="40" x2="8" y2="32" />
            <line x1="18" y1="62" x2="8" y2="70" />
          </g>
        </g>

        {/* Rückenflosse */}
        <g className="bf-fin-dorsal">
          <path
            d="M 80,32 L 75,18 L 70,32 Z"
            fill={`url(#${finGradId})`}
            opacity="0.85"
          />
        </g>

        {/* Brustflosse */}
        <g className="bf-fin-pect">
          <path
            d="M 60,62 Q 50,70 45,75 Q 50,70 60,68 Z"
            fill={`url(#${finGradId})`}
            opacity="0.8"
          />
        </g>

        {/* Kopf & Auge */}
        <g>
          {/* Auge */}
          <circle cx="145" cy="48" r="3.5" fill="#ffffff" />
          <circle cx="145" cy="48" r="2.5" fill="#8b6914" />
          <circle cx="146" cy="47" r="1" fill="#000000" />
          <circle cx="146.5" cy="46.5" r="0.5" fill="#ffffff" opacity="0.8" />

          {/* Mund */}
          <g className={mouthClass}>
            <ellipse cx="155" cy="58" rx="2.5" ry="2" fill="#4a3012" />
          </g>

          {/* Lichtreflex */}
          <ellipse cx="140" cy="45" rx="2" ry="1.5" fill="#ffffff" opacity="0.4" />
        </g>
      </g>
    </svg>
  );
}


