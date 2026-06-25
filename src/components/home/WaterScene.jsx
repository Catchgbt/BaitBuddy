import React, { useState, useEffect, memo, useId } from 'react';

// Unterwasser-Szene (app-weiter Hintergrund): Tiefenverlauf wie in einem See,
// Lichtstrahlen von der Oberfläche mit gelegentlichen hellen Einstrahlungen,
// viele aufsteigende, seitlich pendelnde Blasen, Schwebeteilchen und
// Süßwasserfische, die ruhig durch das Bild ziehen. Sobald ein Fisch das Bild
// verlassen hat, schwimmt die nächste Art herein (Karpfen → Barsch → Forelle
// → Hecht → Zander → Wels → …). Rein dekorativ (pointer-events: none).
//
// Echte, freigestellte Fischfotos (Wikimedia Commons; Barsch/Forelle/Hecht/Zander
// Public Domain, Karpfen & Wels CC-BY-SA mit Namensnennung im Impressum — Quellen
// & Lizenzen siehe public/fish/CREDITS.md). Alle Motive blicken nach rechts; beim
// Schwimmen nach links spiegelt .bb-fish-flip. WebP mit Alpha, je Datei < 80 KB.
const FISH_SPECIES = [
  { id: 'carp', name: 'Karpfen', size: 1.0, image: '/fish/carp.webp' },
  { id: 'perch', name: 'Barsch', size: 0.6, image: '/fish/perch.webp' },
  { id: 'trout', name: 'Forelle', size: 0.75, image: '/fish/trout.webp' },
  { id: 'pike', name: 'Hecht', size: 1.05, image: '/fish/pike.webp' },
  { id: 'zander', name: 'Zander', size: 0.85, image: '/fish/zander.webp' },
  { id: 'catfish', name: 'Wels', size: 1.3, image: '/fish/catfish.webp' },
];

// Deterministisch „gewürfelte“ Blasen: gut verteilt, sofort gefüllt (negative
// Delays), kleine Blasen steigen langsamer und pendeln schneller.
const BUBBLES = Array.from({ length: 44 }, (_, i) => ({
  left: (i * 97 + 13) % 100,
  size: 2 + ((i * 53 + 7) % 12),
  dur: 9 + ((i * 31 + 5) % 14),
  delay: -((i * 67 + 11) % 22),
  drift: ((i * 41 + 3) % 56) - 28,
  sway: 4 + ((i * 29) % 10),
  swayDur: 1.4 + (((i * 13) % 18) / 10),
}));

// Feine Schwebeteilchen, die langsam durchs Wasser driften.
const MOTES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 53 + 29) % 100,
  top: 8 + ((i * 37 + 17) % 84),
  size: 1.5 + ((i * 19) % 3),
  dur: 22 + ((i * 23) % 20),
  delay: -((i * 47) % 30),
  mx: ((i * 31) % 120) - 60,
  my: ((i * 43) % 80) - 40,
}));

const randBetween = (a, b) => a + Math.random() * (b - a);

// Caustic-Lichtnetz: feTurbulence erzeugt ein organisches Rauschen, feColorMatrix
// färbt es wasserblau und hebt nur die hellen Spitzen in den Alpha-Kanal (tanzende
// Lichtflecken). Inline-SVG (nicht als Data-URI-Bild!) wird zuverlässig gerendert;
// das Muster wird einmal berechnet und nur per CSS-Transform bewegt — daher günstig.
function CausticLayer({ baseFrequency, numOctaves = 2, alpha, seed, blur, opacity, dur, delay = '0s', reverse = false }) {
  const fid = useId();
  return (
    <svg
      className="bb-caustic-net"
      preserveAspectRatio="xMidYMid slice"
      style={{
        filter: `blur(${blur}px) contrast(1.15)`,
        opacity,
        animationDuration: dur,
        animationDelay: delay,
        animationDirection: reverse ? 'reverse' : 'normal',
      }}
    >
      <filter id={fid} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="turbulence" baseFrequency={baseFrequency} numOctaves={numOctaves} seed={seed} stitchTiles="stitch" />
        <feColorMatrix values={`0 0 0 0 0.66  0 0 0 0 0.9  0 0 0 0 1  ${alpha}`} />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${fid})`} />
    </svg>
  );
}

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
  const { id, size, image } = FISH_SPECIES[idx];

  // Schwanzschlag-Frequenz: kleine Fische schlagen schneller, große langsamer;
  // Tiefen-Fische (far) wirken träger. Steuert Undulation + Vortriebs-Schub.
  const beat = (near ? 1.05 : 1.5) * (0.72 + 0.5 * size);

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
        '--beat': `${beat}s`,
        animationDuration: `${dur}s`,
        animationDelay: `${delay}s`,
      }}
      onAnimationEnd={(e) => { if (e.animationName === 'bbSwimAcross') next(); }}
    >
      {/* flip = Schwimmrichtung; thrust = Vortriebs-Schub aus dem Schwanzschlag;
          bob = Steigen/Sinken + Nicken; undulate = Körperwelle (Schwanz schwingt) */}
      <div className="bb-fish-flip" style={{ transform: dir === -1 ? 'scaleX(-1)' : 'none' }}>
        <div className="bb-fish-thrust">
          <div className="bb-fish-bob">
            <div className="bb-fish-undulate">
              <img
                src={image}
                alt={id}
                loading="lazy"
                decoding="async"
                draggable="false"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaterScene() {
  // Animationen anhalten, wenn der Tab nicht sichtbar ist. Der dekorative
  // Hintergrund (Caustics, Blasen, Fische) braucht im Hintergrund keine
  // GPU/CPU-Zeit – das spart Akku und verhindert unnötige Compositing-Last.
  const [paused, setPaused] = useState(() => typeof document !== 'undefined' && document.hidden);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className={`bb-water-scene${paused ? ' bb-paused' : ''}`} aria-hidden="true">
      <style>{`
        .bb-water-scene {
          position: fixed; inset: 0; z-index: 0;
          overflow: hidden; pointer-events: none;
          background: linear-gradient(180deg,
            #0e4467 0%, #0a3a59 18%, #07293f 42%,
            #04202f 62%, #031624 80%, #020f1a 100%);
        }

        /* Wasseroberfläche (Licht von oben) */
        .bb-surface {
          position: absolute; left: 0; right: 0; top: 0; height: 22vh;
          background: linear-gradient(180deg, rgba(125,205,240,.24) 0%, rgba(125,205,240,.07) 55%, transparent 100%);
        }

        /* wanderndes Glitzern direkt unter der Oberfläche */
        .bb-shimmer {
          position: absolute; top: 0; left: -50%; width: 200%; height: 9vh;
          background: repeating-linear-gradient(100deg,
            transparent 0 40px, rgba(160,215,245,.06) 40px 80px);
          mix-blend-mode: screen; filter: blur(6px);
          animation: bbShimmer 16s linear infinite;
        }
        @keyframes bbShimmer {
          from { transform: translateX(0); }
          to   { transform: translateX(20%); }
        }

        /* Lichtstrahlen (permanent, sanft schwingend) */
        .bb-ray {
          position: absolute; top: -15vh; height: 140vh;
          background: linear-gradient(180deg, rgba(155,212,242,.22) 0%, rgba(150,210,240,.07) 45%, transparent 78%);
          filter: blur(14px); transform-origin: top center; mix-blend-mode: screen;
          animation: bbRaySway ease-in-out infinite alternate;
        }
        @keyframes bbRaySway {
          from { transform: rotate(calc(var(--tilt) - 3deg)) translateX(-1.5vw); }
          to   { transform: rotate(calc(var(--tilt) + 3deg)) translateX(1.5vw); }
        }

        /* gelegentliche helle Lichteinstrahlung (blitzt ab und zu auf) */
        .bb-rayflash {
          position: absolute; top: -15vh; height: 150vh; opacity: 0;
          background: linear-gradient(180deg, rgba(195,235,255,.32) 0%, rgba(170,220,245,.10) 50%, transparent 78%);
          filter: blur(10px); transform-origin: top center; mix-blend-mode: screen;
          animation: bbRayFlash linear infinite;
        }
        @keyframes bbRayFlash {
          0%, 58% { opacity: 0; transform: rotate(calc(var(--tilt) - 2deg)); }
          66%     { opacity: .55; }
          72%     { opacity: .65; transform: rotate(var(--tilt)); }
          80%     { opacity: .22; }
          88%, 100% { opacity: 0; transform: rotate(calc(var(--tilt) + 2deg)); }
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

        /* tanzendes Wasserlicht (Caustics): zwei prozedurale Rausch-Layer, die
           langsam gegeneinander driften — oben am hellsten, nach unten ausgeblendet */
        .bb-caustic-net {
          position: absolute; left: -12%; top: -8%; width: 124%; height: 80vh;
          mix-blend-mode: screen; will-change: transform; transform-origin: center;
          -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.5) 50%, transparent 90%);
          mask-image: linear-gradient(180deg, rgba(0,0,0,.95) 0%, rgba(0,0,0,.5) 50%, transparent 90%);
          animation: bbCausticNet ease-in-out infinite;
        }
        @keyframes bbCausticNet {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-3vw, 1.6vh) scale(1.08); }
          100% { transform: translate(2.2vw, -1vh) scale(1); }
        }

        /* aufsteigende Blasen: außen Aufstieg, innen seitliches Pendeln */
        .bb-bubble {
          position: absolute; bottom: -24px;
          animation: bbBubbleUp linear infinite;
        }
        .bb-bubble-core {
          display: block; width: 100%; height: 100%; border-radius: 50%;
          background: radial-gradient(circle at 35% 30%,
            rgba(255,255,255,.6), rgba(190,225,245,.22) 55%,
            rgba(190,225,245,.06) 75%, transparent 82%);
          animation: bbBubbleSway ease-in-out infinite alternate;
        }
        @keyframes bbBubbleUp {
          0%   { transform: translate(0, 0); opacity: 0; }
          8%   { opacity: .6; }
          92%  { opacity: .35; }
          100% { transform: translate(var(--drift), -112vh); opacity: 0; }
        }
        @keyframes bbBubbleSway {
          from { transform: translateX(calc(var(--sway) * -1)); }
          to   { transform: translateX(var(--sway)); }
        }

        /* feine Schwebeteilchen */
        .bb-mote {
          position: absolute; border-radius: 50%;
          background: rgba(200,230,245,.28);
          animation: bbMoteDrift linear infinite;
        }
        @keyframes bbMoteDrift {
          0%   { transform: translate(0, 0); opacity: 0; }
          12%  { opacity: .45; }
          88%  { opacity: .25; }
          100% { transform: translate(var(--mx), var(--my)); opacity: 0; }
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

        /* Steigen/Sinken + leichtes Nicken (Nase folgt der Vertikalbewegung) */
        .bb-fish-bob { animation: bbFishBob 6s ease-in-out infinite alternate; }
        .bb-fish-far .bb-fish-bob { animation-duration: 8s; }
        @keyframes bbFishBob {
          0%   { transform: translateY(-10px) rotate(-1.8deg); }
          100% { transform: translateY(10px) rotate(1.8deg); }
        }

        /* Vortriebs-Schub: kurzer Vorwärtsruck pro Schwanzschlag, dann Gleiten.
           Periode = --beat (Schlagfrequenz). Bewegung im Körper-Koordinatensystem
           (innerhalb .bb-fish-flip), also relativ zur Schwimmrichtung nach vorn. */
        .bb-fish-thrust { animation: bbFishThrust var(--beat, 1.2s) cubic-bezier(.36,.66,.4,1) infinite; }
        @keyframes bbFishThrust {
          0%   { transform: translateX(-0.5%); }
          28%  { transform: translateX(0.55%); }
          100% { transform: translateX(-0.5%); }
        }

        /* Körperundulation: skewY mit Drehpunkt am Kopf (rechts) — der Kopf bleibt
           ruhig, die Welle läuft nach hinten, der Schwanz schwingt am stärksten.
           Halbe Schlagperiode für den Rückschwung. */
        .bb-fish-undulate {
          transform-origin: 100% 50%;
          animation: bbFishUndulate var(--beat, 1.2s) ease-in-out infinite;
        }
        @keyframes bbFishUndulate {
          0%   { transform: skewY(1.5deg); }
          50%  { transform: skewY(-1.5deg); }
          100% { transform: skewY(1.5deg); }
        }
        .bb-fish-far .bb-fish-undulate { animation-name: bbFishUndulateFar; }
        @keyframes bbFishUndulateFar {
          0% { transform: skewY(1deg); } 50% { transform: skewY(-1deg); } 100% { transform: skewY(1deg); }
        }

        /* Vignette für Tiefenwirkung */
        .bb-vignette {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 35%, transparent 55%, rgba(1, 10, 18, .55) 100%);
        }

        /* Tab im Hintergrund: alle Animationen anhalten (Akku/Compositing sparen) */
        .bb-water-scene.bb-paused * { animation-play-state: paused !important; }

        @media (prefers-reduced-motion: reduce) {
          .bb-water-scene * { animation: none !important; }
          .bb-fish-far { display: none; }
          .bb-bubble, .bb-mote { display: none; }
        }
      `}</style>

      <div className="bb-surface" />
      <div className="bb-shimmer" />

      <div className="bb-ray" style={{ left: '12%', width: '9vw', '--tilt': '14deg', animationDuration: '17s' }} />
      <div className="bb-ray" style={{ left: '34%', width: '14vw', '--tilt': '10deg', opacity: .8, animationDuration: '23s', animationDelay: '-6s' }} />
      <div className="bb-ray" style={{ left: '58%', width: '8vw', '--tilt': '17deg', opacity: .65, animationDuration: '19s', animationDelay: '-11s' }} />
      <div className="bb-ray" style={{ left: '78%', width: '12vw', '--tilt': '8deg', opacity: .5, animationDuration: '27s', animationDelay: '-3s' }} />

      {/* ab und zu aufblitzende Einstrahlungen */}
      <div className="bb-rayflash" style={{ left: '22%', width: '16vw', '--tilt': '12deg', animationDuration: '26s' }} />
      <div className="bb-rayflash" style={{ left: '63%', width: '20vw', '--tilt': '7deg', animationDuration: '37s', animationDelay: '-14s' }} />

      <div className="bb-caustic" style={{ width: '55vw', height: '38vh', left: '8%', top: '6%', background: 'radial-gradient(ellipse, rgba(56,180,220,.20), transparent 65%)', animationDuration: '26s' }} />
      <div className="bb-caustic" style={{ width: '48vw', height: '34vh', right: '4%', top: '30%', background: 'radial-gradient(ellipse, rgba(34,150,200,.14), transparent 65%)', animationDuration: '34s', animationDelay: '-12s' }} />
      <div className="bb-caustic" style={{ width: '40vw', height: '28vh', left: '30%', top: '55%', background: 'radial-gradient(ellipse, rgba(30,130,180,.10), transparent 65%)', animationDuration: '40s', animationDelay: '-20s' }} />

      {/* tanzendes Wasserlicht – zwei gegenläufige Caustic-Layer (oben am hellsten) */}
      <CausticLayer baseFrequency="0.012" alpha="1.3 1.3 1.3 0 -0.85" seed={8} blur={4} opacity={0.42} dur="19s" />
      <CausticLayer baseFrequency="0.008" alpha="1.1 1.1 1.1 0 -0.6" seed={23} blur={6} opacity={0.28} dur="27s" delay="-8s" reverse />

      {MOTES.map((m, i) => (
        <span
          key={`m${i}`}
          className="bb-mote"
          style={{
            left: `${m.left}%`, top: `${m.top}%`,
            width: m.size, height: m.size,
            animationDuration: `${m.dur}s`, animationDelay: `${m.delay}s`,
            '--mx': `${m.mx}px`, '--my': `${m.my}px`,
          }}
        />
      ))}

      {/* Fisch in der Tiefe (unscharf, dunkler) – startet mit dem Zander */}
      <RoamingFish layer="far" startIndex={4} startDir={-1} />

      {BUBBLES.map((b, i) => (
        <span
          key={`b${i}`}
          className="bb-bubble"
          style={{
            left: `${b.left}%`, width: b.size, height: b.size,
            animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s`,
            '--drift': `${b.drift}px`, '--sway': `${b.sway}px`,
          }}
        >
          <span className="bb-bubble-core" style={{ animationDuration: `${b.swayDur}s` }} />
        </span>
      ))}

      {/* Fisch im Vordergrund – startet mit dem Karpfen */}
      <RoamingFish layer="near" startIndex={0} startDir={1} />

      <div className="bb-vignette" />
    </div>
  );
}

// WaterScene ist statisch (keine Props) und wird in einem häufig re-rendernden
// Layout eingebettet. memo verhindert unnötige Re-Renders des Hintergrunds.
export default memo(WaterScene);
