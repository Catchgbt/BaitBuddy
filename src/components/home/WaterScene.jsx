import React, { useState } from 'react';
import PikeSvg, { PIKE_BASE_CSS } from '@/components/fish/PikeSvg';
import CarpSvg from '@/components/fish/CarpSvg';
import PerchSvg from '@/components/fish/PerchSvg';
import TroutSvg from '@/components/fish/TroutSvg';
import ZanderSvg from '@/components/fish/ZanderSvg';
import CatfishSvg from '@/components/fish/CatfishSvg';

// Unterwasser-Szene für die Landingpage: Tiefenverlauf wie in einem See,
// Lichtstrahlen von der Oberfläche, aufsteigende Blasen und Süßwasserfische,
// die ruhig durch das Bild ziehen. Sobald ein Fisch das Bild verlassen hat,
// schwimmt die nächste Art herein (Karpfen → Barsch → Forelle → Hecht →
// Zander → Wels → …). Rein dekorativ (pointer-events: none).
const FISH_SPECIES = [
  { id: 'carp', Component: CarpSvg, size: 1.0 },
  { id: 'perch', Component: PerchSvg, size: 0.6 },
  { id: 'trout', Component: TroutSvg, size: 0.75 },
  { id: 'pike', Component: PikeSvg, size: 1.05 },
  { id: 'zander', Component: ZanderSvg, size: 0.85 },
  { id: 'catfish', Component: CatfishSvg, size: 1.3 },
];

const BUBBLES = [
  // [left %, Größe px, Dauer s, Delay s, seitliche Drift px]
  [5, 5, 14, -2, 18], [11, 3, 18, -9, -14], [18, 7, 12, -5, 24],
  [26, 4, 16, -12, -20], [33, 6, 13, -1, 12], [41, 3, 19, -7, -10],
  [48, 8, 11, -4, 28], [55, 4, 17, -14, -16], [62, 5, 14, -8, 14],
  [69, 3, 20, -3, -22], [75, 6, 12, -10, 18], [81, 4, 16, -6, -12],
  [87, 7, 13, -11, 20], [93, 3, 18, -1, -18], [38, 5, 15, -15, 10],
  [58, 6, 21, -17, -8],
];

const randBetween = (a, b) => a + Math.random() * (b - a);

// Ein Fisch zieht einmal quer durchs Bild; nach jeder Querung wird auf die
// nächste Art gewechselt und Richtung, Höhe, Tempo neu gewürfelt.
function RoamingFish({ layer, startIndex = 0, startDir = 1 }) {
  const near = layer === 'near';
  const topRange = near ? [8, 58] : [55, 78];
  const durRange = near ? [26, 40] : [48, 70];

  const [run, setRun] = useState(() => ({
    idx: startIndex,
    count: 0,
    dir: startDir,
    top: randBetween(...topRange),
    dur: randBetween(...durRange),
    delay: near ? 0 : randBetween(2, 8),
  }));

  const next = () => setRun(r => ({
    idx: (r.idx + 1) % FISH_SPECIES.length,
    count: r.count + 1,
    dir: -r.dir,
    top: randBetween(...topRange),
    dur: randBetween(...durRange),
    delay: randBetween(1.5, 5),
  }));

  const { idx, count, dir, top, dur, delay } = run;
  const { id, Component, size } = FISH_SPECIES[idx];

  return (
    <div
      key={count}
      className={`bb-fish-run ${near ? 'bb-fish-near' : 'bb-fish-far'}`}
      style={{
        top: `${top}vh`,
        width: near
          ? `calc(clamp(220px, 30vw, 400px) * ${size})`
          : `calc(clamp(100px, 13vw, 180px) * ${size})`,
        '--from': dir === 1 ? 'calc(-100% - 4vw)' : 'calc(100vw + 4vw)',
        '--to': dir === 1 ? 'calc(100vw + 4vw)' : 'calc(-100% - 4vw)',
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
      }}
      onAnimationEnd={(e) => { if (e.animationName === 'bbSwimAcross') next(); }}
    >
      <div className="bb-fish-flip" style={{ transform: dir === -1 ? 'scaleX(-1)' : 'none' }}>
        <div className="bb-fish-bob">
          <svg viewBox="0 0 460 170" xmlns="http://www.w3.org/2000/svg">
            <Component uid={`${layer}-${id}`} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function WaterScene() {
  return (
    <div className="bb-water-scene" aria-hidden="true">
      <style>{`
        .bb-water-scene {
          position: fixed; inset: 0; z-index: 0;
          overflow: hidden; pointer-events: none;
          background: linear-gradient(180deg, #0c3b58 0%, #07293f 38%, #041a2b 70%, #020f1a 100%);
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

        /* Fische: eine Querung pro Art, Wechsel erfolgt außerhalb des Bildes */
        .bb-fish-run {
          position: absolute; left: 0;
          will-change: transform;
          animation: bbSwimAcross linear both;
        }
        @keyframes bbSwimAcross {
          from { transform: translateX(var(--from)); }
          to   { transform: translateX(var(--to)); }
        }
        .bb-fish-near { filter: drop-shadow(0 14px 22px rgba(1, 12, 22, .45)); }
        .bb-fish-far { opacity: .45; filter: blur(1.4px) brightness(.62) saturate(.75); }

        /* sanftes Auf und Ab beim Schwimmen */
        .bb-fish-bob { animation: bbFishBob 6.5s ease-in-out infinite alternate; }
        .bb-fish-far .bb-fish-bob { animation-duration: 8.5s; }
        @keyframes bbFishBob {
          from { transform: translateY(-9px) rotate(-1.6deg); }
          to   { transform: translateY(9px) rotate(1.6deg); }
        }

        ${PIKE_BASE_CSS}
        .bb-fish-near .pk-tail { animation-duration: 1.4s; }
        .bb-fish-far .pk-tail { animation-duration: 2.1s; }

        /* Vignette für Tiefenwirkung */
        .bb-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 35%, transparent 55%, rgba(1, 10, 18, .55) 100%);
        }

        @media (prefers-reduced-motion: reduce) {
          .bb-water-scene * { animation: none !important; }
          .bb-fish-far { display: none; }
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

      {/* Fisch in der Tiefe (unscharf, dunkler) – startet mit dem Zander */}
      <RoamingFish layer="far" startIndex={4} startDir={-1} />

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

      {/* Fisch im Vordergrund – startet mit dem Karpfen */}
      <RoamingFish layer="near" startIndex={0} startDir={1} />

      <div className="bb-vignette" />
    </div>
  );
}
