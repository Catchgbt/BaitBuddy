import React from 'react';
import PikeSvg, { PIKE_BASE_CSS } from '@/components/fish/PikeSvg';

// Unterwasser-Szene für die Landingpage: Tiefenverlauf wie in einem See,
// Lichtstrahlen von der Oberfläche, aufsteigende Blasen und zwei Hechte,
// die ruhig durch das Bild schwimmen. Rein dekorativ (pointer-events: none).
const BUBBLES = [
  // [left %, Größe px, Dauer s, Delay s, seitliche Drift px]
  [5, 5, 14, -2, 18], [11, 3, 18, -9, -14], [18, 7, 12, -5, 24],
  [26, 4, 16, -12, -20], [33, 6, 13, -1, 12], [41, 3, 19, -7, -10],
  [48, 8, 11, -4, 28], [55, 4, 17, -14, -16], [62, 5, 14, -8, 14],
  [69, 3, 20, -3, -22], [75, 6, 12, -10, 18], [81, 4, 16, -6, -12],
  [87, 7, 13, -11, 20], [93, 3, 18, -1, -18], [38, 5, 15, -15, 10],
  [58, 6, 21, -17, -8],
];

export default function WaterScene() {
  return (
    <div className="bb-water-scene" aria-hidden="true">
      <style>{`
        .bb-water-scene {
          position: fixed; inset: 0; z-index: 0;
          overflow: hidden; pointer-events: none;
          background: linear-gradient(180deg, #0c3b58 0%, #07293f 38%, #041a2b 70%, #020f1a 100%);
          perspective: 900px;
        }

        /* Wasseroberfläche (Licht von oben) */
        .bb-surface {
          position: absolute; left: 0; right: 0; top: 0; height: 22vh;
          background: linear-gradient(180deg, rgba(125,205,240,.22) 0%, rgba(125,205,240,.06) 55%, transparent 100%);
        }

        /* Lichtstrahlen */
        .bb-ray {
          position: absolute; top: -15vh; height: 140vh;
          background: linear-gradient(180deg, rgba(150,210,240,.17) 0%, rgba(150,210,240,.05) 45%, transparent 75%);
          filter: blur(14px); transform-origin: top center; mix-blend-mode: screen;
          animation: bbRaySway ease-in-out infinite alternate;
        }
        @keyframes bbRaySway {
          from { transform: rotate(calc(var(--tilt) - 3deg)) translateX(-1.5vw); }
          to   { transform: rotate(calc(var(--tilt) + 3deg)) translateX(1.5vw); }
        }

        /* wandernde Lichtflecken im Wasser */
        .bb-caustic {
          position: absolute; border-radius: 50%;
          filter: blur(70px); mix-blend-mode: screen;
          animation: bbCausticDrift ease-in-out infinite alternate;
        }
        @keyframes bbCausticDrift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(4vw, 3vh) scale(1.12); }
        }

        /* aufsteigende Blasen */
        .bb-bubble {
          position: absolute; bottom: -24px; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.5), rgba(190,225,245,.16) 60%, transparent 72%);
          animation: bbBubbleUp linear infinite;
        }
        @keyframes bbBubbleUp {
          0%   { transform: translate(0, 0); opacity: 0; }
          8%   { opacity: .55; }
          92%  { opacity: .35; }
          100% { transform: translate(var(--drift), -112vh); opacity: 0; }
        }

        /* Hechte: ziehen ruhige Bahnen durchs Bild und wenden sichtbar */
        .bb-pike-roam {
          position: absolute; top: 0; left: 0;
          will-change: transform;
          animation: linear infinite;
        }
        .bb-pike-near {
          width: clamp(230px, 33vw, 430px);
          animation-name: bbRoamNear; animation-duration: 80s;
          filter: drop-shadow(0 14px 22px rgba(1, 12, 22, .45));
        }
        .bb-pike-far {
          width: clamp(110px, 14vw, 190px);
          animation-name: bbRoamFar; animation-duration: 120s;
          opacity: .45; filter: blur(1.4px) brightness(.62) saturate(.75);
        }
        @keyframes bbRoamNear {
          0%   { transform: translate(-45vw, 16vh) rotateY(0deg); }
          20%  { transform: translate(72vw, 24vh) rotateY(0deg); }
          24%  { transform: translate(78vw, 31vh) rotateY(180deg); }
          46%  { transform: translate(-45vw, 58vh) rotateY(180deg); }
          50%  { transform: translate(-45vw, 36vh) rotateY(360deg); }
          71%  { transform: translate(70vw, 41vh) rotateY(360deg); }
          75%  { transform: translate(76vw, 13vh) rotateY(540deg); }
          97%  { transform: translate(-45vw, 17vh) rotateY(540deg); }
          100% { transform: translate(-45vw, 16vh) rotateY(540deg); }
        }
        @keyframes bbRoamFar {
          0%   { transform: translate(110vw, 64vh) rotateY(180deg); }
          40%  { transform: translate(-40vw, 71vh) rotateY(180deg); }
          45%  { transform: translate(-40vw, 76vh) rotateY(360deg); }
          95%  { transform: translate(110vw, 68vh) rotateY(360deg); }
          100% { transform: translate(110vw, 64vh) rotateY(360deg); }
        }

        /* sanftes Auf und Ab beim Schwimmen */
        .bb-pike-bob { animation: bbPikeBob 6.5s ease-in-out infinite alternate; }
        .bb-pike-far .bb-pike-bob { animation-duration: 8.5s; }
        @keyframes bbPikeBob {
          from { transform: translateY(-9px) rotate(-1.6deg); }
          to   { transform: translateY(9px) rotate(1.6deg); }
        }

        ${PIKE_BASE_CSS}
        .bb-pike-near .pk-tail { animation-duration: 1.4s; }
        .bb-pike-far .pk-tail { animation-duration: 2.1s; }

        /* Vignette für Tiefenwirkung */
        .bb-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 35%, transparent 55%, rgba(1, 10, 18, .55) 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .bb-water-scene * { animation: none !important; }
          .bb-pike-near { transform: translate(8vw, 58vh); }
          .bb-pike-far { transform: translate(60vw, 72vh) rotateY(180deg); }
          .bb-bubble { display: none; }
        }
      `}</style>

      <div className="bb-surface" />

      <div className="bb-ray" style={{ left: '12%', width: '9vw', '--tilt': '14deg', animationDuration: '17s' }} />
      <div className="bb-ray" style={{ left: '34%', width: '14vw', '--tilt': '10deg', opacity: .8, animationDuration: '23s', animationDelay: '-6s' }} />
      <div className="bb-ray" style={{ left: '58%', width: '8vw', '--tilt': '17deg', opacity: .65, animationDuration: '19s', animationDelay: '-11s' }} />
      <div className="bb-ray" style={{ left: '78%', width: '12vw', '--tilt': '8deg', opacity: .5, animationDuration: '27s', animationDelay: '-3s' }} />

      <div className="bb-caustic" style={{ width: '55vw', height: '38vh', left: '8%', top: '6%', background: 'radial-gradient(ellipse, rgba(56,180,220,.20), transparent 65%)', animationDuration: '26s' }} />
      <div className="bb-caustic" style={{ width: '48vw', height: '34vh', right: '4%', top: '30%', background: 'radial-gradient(ellipse, rgba(34,150,200,.14), transparent 65%)', animationDuration: '34s', animationDelay: '-12s' }} />

      {/* Hecht in der Tiefe (unscharf, dunkler) */}
      <div className="bb-pike-roam bb-pike-far">
        <div className="bb-pike-bob">
          <svg viewBox="0 0 460 170" xmlns="http://www.w3.org/2000/svg">
            <PikeSvg uid="pk-far" />
          </svg>
        </div>
      </div>

      {BUBBLES.map(([left, size, dur, delay, drift], i) => (
        <span
          key={i}
          className="bb-bubble"
          style={{
            left: `${left}%`, width: size, height: size,
            animationDuration: `${dur}s`, animationDelay: `${delay}s`,
            '--drift': `${drift}px`,
          }}
        />
      ))}

      {/* Hecht im Vordergrund */}
      <div className="bb-pike-roam bb-pike-near">
        <div className="bb-pike-bob">
          <svg viewBox="0 0 460 170" xmlns="http://www.w3.org/2000/svg">
            <PikeSvg uid="pk-near" />
          </svg>
        </div>
      </div>

      <div className="bb-vignette" />
    </div>
  );
}
