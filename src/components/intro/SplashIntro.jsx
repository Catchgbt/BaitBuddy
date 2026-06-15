import { useEffect, useState } from "react";
import PikeSvg, { PIKE_BASE_CSS } from "@/components/fish/PikeSvg";

// Intro-Animation beim App-Start: Ein Hecht zieht ruhig an, beschleunigt,
// schnappt sich den Köder und gleitet ab – danach erscheint das BaitBuddy-Logo.
// Reines SVG + CSS-Keyframes, keine Abhängigkeiten. Tippen überspringt.
const TOTAL_MS = 3500;   // Start des Ausblendens
const REMOVE_MS = 4050;  // Unmount

export default function SplashIntro() {
  const reduced = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), reduced ? 1200 : TOTAL_MS);
    const t2 = setTimeout(() => setGone(true), reduced ? 1750 : REMOVE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [reduced]);

  if (gone) return null;

  const skip = () => { setLeaving(true); setTimeout(() => setGone(true), 450); };

  return (
    <div
      onClick={skip}
      className={`bb-splash${leaving ? " bb-leave" : ""}`}
      role="presentation"
      aria-hidden="true"
    >
      <style>{`
        .bb-splash {
          position: fixed; inset: 0; z-index: 99999; cursor: pointer;
          background: linear-gradient(180deg, #0c3b58 0%, #07293f 45%, #041a2b 78%, #020f1a 100%);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          opacity: 1; transition: opacity .5s ease;
        }
        .bb-splash.bb-leave { opacity: 0; pointer-events: none; }
        .bb-splash svg.bb-stage {
          position: absolute; inset: 0; width: 100%; height: 100%;
          display: block; overflow: visible;
        }

        /* Lichtstrahlen von der Oberfläche */
        .bb-splash-ray {
          position: absolute; top: -15vh; height: 140vh; pointer-events: none;
          background: linear-gradient(180deg, rgba(150,210,240,.16) 0%, rgba(150,210,240,.05) 45%, transparent 75%);
          filter: blur(14px); transform-origin: top center; mix-blend-mode: screen;
          animation: bbSplashRay ease-in-out infinite alternate;
        }
        @keyframes bbSplashRay {
          from { transform: rotate(calc(var(--tilt) - 3deg)); }
          to   { transform: rotate(calc(var(--tilt) + 3deg)); }
        }

        ${PIKE_BASE_CSS}
        .bb-splash .pk-tail { animation-duration: .6s; }

        /* Hecht: ruhiges Anschwimmen, kurzer Stoß, Abgleiten nach rechts unten */
        .bb-pike-i {
          transform: translate(-820px, 60px);
          animation: bbPikeSwim 2.7s .25s forwards;
        }
        @keyframes bbPikeSwim {
          0%   { transform: translate(-820px, 60px); animation-timing-function: ease-out; }
          45%  { transform: translate(-300px, 28px); animation-timing-function: ease-in-out; }
          62%  { transform: translate(-120px, 12px); animation-timing-function: cubic-bezier(.7,0,.9,.4); }
          70%  { transform: translate(0px, 0px); animation-timing-function: ease-out; }
          76%  { transform: translate(44px, 4px); animation-timing-function: cubic-bezier(.4,0,.7,1); }
          100% { transform: translate(1100px, 40px); }
        }

        /* leichtes Wiegen des Körpers beim Schwimmen */
        .bb-pike-flex { animation: bbPikeFlex 1.1s ease-in-out infinite alternate; }
        @keyframes bbPikeFlex { from { transform: rotate(-1.2deg); } to { transform: rotate(1.2deg); } }

        /* Maul öffnet sich kurz vor dem Stoß und schnappt zu */
        .bb-splash .pk-jaw-upper { animation: bbJawU 2.7s linear .25s forwards; }
        .bb-splash .pk-jaw-lower { animation: bbJawL 2.7s linear .25s forwards; }
        @keyframes bbJawU {
          0%, 55%   { transform: rotate(0deg); }
          63%       { transform: rotate(-11deg); }
          69%       { transform: rotate(-15deg); }
          73%       { transform: rotate(2deg); }
          78%, 100% { transform: rotate(0deg); }
        }
        @keyframes bbJawL {
          0%, 55%   { transform: rotate(0deg); }
          63%       { transform: rotate(13deg); }
          69%       { transform: rotate(18deg); }
          73%       { transform: rotate(-2deg); }
          78%, 100% { transform: rotate(0deg); }
        }

        /* Köder: sinkt ein, zupft, verschwindet beim Biss */
        .bb-lure-i {
          transform: translateY(-360px);
          animation:
            bbLureDrop .8s ease-out forwards,
            bbLureJig 1.1s ease-in-out .8s infinite alternate,
            bbLureGone .1s linear 2.12s forwards;
        }
        @keyframes bbLureDrop { from { transform: translateY(-360px); } to { transform: translateY(0); } }
        @keyframes bbLureJig  { from { transform: translateY(0); } to { transform: translateY(11px); } }
        @keyframes bbLureGone { to { opacity: 0; } }

        /* dezenter Wirbel beim Biss */
        .bb-burst-i { opacity: 0; animation: bbBurst .55s ease-out 2.14s forwards; }
        @keyframes bbBurst {
          0%   { opacity: .9; transform: scale(.2); }
          70%  { opacity: .5; }
          100% { opacity: 0; transform: scale(1.4); }
        }

        /* Logo */
        .bb-title { opacity: 0; animation: bbTitle .7s cubic-bezier(.2,.8,.3,1.1) 2.45s forwards; }
        .bb-title .bb-title-main { filter: drop-shadow(0 0 10px rgba(34,211,200,.35)); }
        @keyframes bbTitle {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Blubberblasen */
        .bb-bub { animation: bbRise linear infinite; }
        @keyframes bbRise {
          from { transform: translateY(0); opacity: .25; }
          to   { transform: translateY(-660px); opacity: 0; }
        }

        .bb-skip {
          position: absolute; bottom: 18px; left: 0; right: 0;
          text-align: center; font-size: 11px; color: rgba(140,170,190,.55);
          letter-spacing: .5px; font-family: 'Inter', sans-serif;
        }

        @media (prefers-reduced-motion: reduce) {
          .bb-pike-i, .bb-pike-flex, .bb-splash .pk-jaw-upper, .bb-splash .pk-jaw-lower,
          .bb-lure-i, .bb-burst-i, .bb-bub, .bb-splash-ray { animation: none !important; }
          .bb-lure-i { opacity: 0; }
          .bb-pike-i { transform: translate(-2000px, 0); }
          .bb-title { animation: bbTitle .6s ease .1s forwards; }
        }
      `}</style>

      <div className="bb-splash-ray" style={{ left: '18%', width: '10vw', '--tilt': '12deg', animationDuration: '15s' }} />
      <div className="bb-splash-ray" style={{ left: '55%', width: '14vw', '--tilt': '8deg', opacity: .7, animationDuration: '21s', animationDelay: '-7s' }} />

      <svg className="bb-stage" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bbLureBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f8fb" />
            <stop offset="55%" stopColor="#c8d6df" />
            <stop offset="100%" stopColor="#93a7b4" />
          </linearGradient>
        </defs>

        {/* Blubberblasen im Hintergrund */}
        {[
          [110, 640, 4, "7s", "0s"], [300, 660, 3, "6s", "1.2s"],
          [520, 650, 5, "8s", ".6s"], [660, 640, 3.5, "6.5s", "2s"],
          [740, 660, 2.5, "5.5s", ".3s"],
        ].map(([x, y, r, dur, del], i) => (
          <circle key={i} className="bb-bub" cx={x} cy={y} r={r}
            fill="rgba(160,210,235,.3)"
            style={{ animationDuration: dur, animationDelay: del }} />
        ))}

        {/* Köder an der Schnur (Biss-Punkt: 470,300) */}
        <g transform="translate(470,300)">
          <g className="bb-lure-i">
            <line x1="0" y1="-560" x2="0" y2="-8" stroke="rgba(220,240,255,.3)" strokeWidth="1" />
            {/* schlanker Silber-Wobbler */}
            <path d="M-16,0 C -12,-6 6,-7 14,-2 L 16,1 C 8,6 -10,6 -16,0 Z" fill="url(#bbLureBody)" />
            <path d="M-16,0 C -12,-6 6,-7 14,-2 C 4,-5 -8,-4 -16,0 Z" fill="#3a4d5a" opacity=".75" />
            <path d="M11,-1 l3,2 -4,1 Z" fill="#c0392b" opacity=".8" />
            <circle cx="9" cy="-2.6" r="1.7" fill="#fff" />
            <circle cx="9.6" cy="-2.6" r="0.8" fill="#111" />
            {/* Tauchschaufel */}
            <path d="M16,1 q6,2 5,8 q-6,-2 -8,-6 Z" fill="rgba(220,240,255,.55)" />
            {/* Drillinge */}
            <path d="M-4,5 C-4,12 -10,14 -12,9" stroke="#aebcc6" strokeWidth="1.2" fill="none" />
            <path d="M-1,5 C-1,12 5,14 7,9" stroke="#aebcc6" strokeWidth="1.2" fill="none" />
          </g>
        </g>

        {/* Hecht – Maulspitze trifft bei Transform 0 genau den Köder */}
        <g transform="translate(5,212) scale(1.05)">
          <g className="bb-pike-i">
            <g className="bb-pike-flex">
              <PikeSvg uid="pk-splash" />
            </g>
          </g>
        </g>

        {/* Wasserwirbel beim Biss */}
        <g transform="translate(470,300)">
          <g className="bb-burst-i">
            <circle r="20" fill="none" stroke="rgba(190,225,250,.7)" strokeWidth="2" />
            <circle r="11" fill="none" stroke="rgba(190,225,250,.4)" strokeWidth="1.4" />
            {[[-24,-14,2.6],[20,-22,3],[30,-2,2],[-30,0,2],[6,-30,2.6],[-10,-26,2.2]].map(([x,y,r],i) => (
              <circle key={i} cx={x} cy={y} r={r} fill="rgba(190,228,250,.65)" />
            ))}
          </g>
        </g>

        {/* Logo */}
        <g className="bb-title">
          <text className="bb-title-main" x="400" y="468" textAnchor="middle" fontFamily="'Inter',sans-serif"
            fontSize="44" fontWeight="800" letterSpacing="1" fill="#22d3c8">BaitBuddy</text>
          <text x="400" y="498" textAnchor="middle" fontFamily="'Inter',sans-serif"
            fontSize="15" fontWeight="500" letterSpacing="2" fill="#8fb3c7">Dein KI-Angelbegleiter</text>
        </g>
      </svg>

      <div className="bb-skip">Tippen zum Überspringen</div>
    </div>
  );
}
