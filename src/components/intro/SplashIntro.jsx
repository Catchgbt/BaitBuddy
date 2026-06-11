import { useEffect, useState } from "react";

// Intro-Animation beim App-Start: Ein Hecht jagt einen Kunstköder (Wobbler),
// schnappt zu, dann erscheint das BaitBuddy-Logo und das Intro blendet aus.
// Reines SVG + CSS-Keyframes – keine Abhängigkeiten. Tippen überspringt.
const TOTAL_MS = 3400;   // Start des Ausblendens
const REMOVE_MS = 3950;  // Unmount

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
          background: linear-gradient(180deg, #03101e 0%, #052338 55%, #031827 100%);
          display: flex; align-items: center; justify-content: center;
          opacity: 1; transition: opacity .5s ease;
        }
        .bb-splash.bb-leave { opacity: 0; pointer-events: none; }
        .bb-splash svg { width: min(96vw, 760px); height: auto; display: block; }

        /* Hecht: Anschwimmen, Biss, Abtauchen nach rechts */
        .bb-pike-i {
          transform: translate(-640px, 36px);
          animation: bbPikeSwim 2.6s cubic-bezier(.5,.05,.6,.95) .3s forwards;
        }
        @keyframes bbPikeSwim {
          0%   { transform: translate(-640px, 36px); }
          55%  { transform: translate(-130px, 12px); }
          70%  { transform: translate(0px, 0px); }
          78%  { transform: translate(46px, 2px); }
          100% { transform: translate(800px, -50px); }
        }

        /* Maul auf/zu (Schnappen synchron zum Schwimm-Timing) */
        .bb-jawU { transform-origin: 298px 52px; animation: bbJawU 2.6s linear .3s forwards; }
        .bb-jawL { transform-origin: 298px 68px; animation: bbJawL 2.6s linear .3s forwards; }
        @keyframes bbJawU {
          0%,38% { transform: rotate(0deg); }
          58%    { transform: rotate(-14deg); }
          68%    { transform: rotate(-22deg); }
          72%    { transform: rotate(3deg); }
          76%,100% { transform: rotate(0deg); }
        }
        @keyframes bbJawL {
          0%,38% { transform: rotate(0deg); }
          58%    { transform: rotate(15deg); }
          68%    { transform: rotate(24deg); }
          72%    { transform: rotate(-3deg); }
          76%,100% { transform: rotate(0deg); }
        }

        /* Schwanzflosse wedelt */
        .bb-tail { transform-origin: 30px 60px; animation: bbTail .38s ease-in-out infinite alternate; }
        @keyframes bbTail { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }

        /* Köder: fällt ein, zappelt, verschwindet beim Biss */
        .bb-lure-i {
          transform: translateY(-360px);
          animation:
            bbLureDrop .7s ease-out forwards,
            bbLureJig 1s ease-in-out .7s infinite alternate,
            bbLureGone .14s linear 2.12s forwards;
        }
        @keyframes bbLureDrop { from { transform: translateY(-360px); } to { transform: translateY(0); } }
        @keyframes bbLureJig  { from { transform: translateY(0); } to { transform: translateY(13px); } }
        @keyframes bbLureGone { to { opacity: 0; } }

        /* Wasser-Splash beim Biss */
        .bb-burst-i { opacity: 0; animation: bbBurst .6s ease-out 2.1s forwards; }
        @keyframes bbBurst {
          0%   { opacity: 1; transform: scale(.15); }
          70%  { opacity: .9; }
          100% { opacity: 0; transform: scale(1.6); }
        }

        /* Logo */
        .bb-title { opacity: 0; animation: bbTitle .7s cubic-bezier(.2,.9,.3,1.25) 2.35s forwards; }
        .bb-title text { filter: drop-shadow(0 0 14px rgba(34,211,200,.55)); }
        @keyframes bbTitle {
          from { opacity: 0; transform: scale(.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
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
          .bb-pike-i, .bb-jawU, .bb-jawL, .bb-tail, .bb-lure-i, .bb-burst-i, .bb-bub { animation: none !important; }
          .bb-lure-i { opacity: 0; }
          .bb-pike-i { transform: translate(-2000px, 0); }
          .bb-title { animation: bbTitle .6s ease .1s forwards; }
        }
      `}</style>

      <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bbPikeBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5d8a46" />
            <stop offset="55%" stopColor="#41662f" />
            <stop offset="100%" stopColor="#2c4a20" />
          </linearGradient>
          <linearGradient id="bbLureBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd24a" />
            <stop offset="100%" stopColor="#ff7a2d" />
          </linearGradient>
        </defs>

        {/* Blubberblasen im Hintergrund */}
        {[
          [110, 640, 5, "6s", "0s"], [300, 660, 3.5, "5s", "1.2s"],
          [520, 650, 6, "7s", ".6s"], [660, 640, 4, "5.5s", "2s"],
          [740, 660, 3, "4.5s", ".3s"],
        ].map(([x, y, r, dur, del], i) => (
          <circle key={i} className="bb-bub" cx={x} cy={y} r={r}
            fill="rgba(160,210,235,.35)"
            style={{ animationDuration: dur, animationDelay: del }} />
        ))}

        {/* Köder an der Schnur (Biss-Punkt: 470,300) */}
        <g transform="translate(470,300)">
          <g className="bb-lure-i">
            <line x1="0" y1="-560" x2="0" y2="-13" stroke="rgba(200,230,255,.45)" strokeWidth="1.5" />
            {/* Wobbler */}
            <path d="M-15,0 C-11,-8 8,-10 15,-3 L17,2 C9,9 -9,8 -15,0 Z" fill="url(#bbLureBody)" />
            <path d="M-9,-5 q2,5 0,9" stroke="#2c4a20" strokeWidth="1.6" fill="none" opacity=".8" />
            <path d="M-2,-7 q2,6 0,12" stroke="#2c4a20" strokeWidth="1.6" fill="none" opacity=".8" />
            <circle cx="9" cy="-3" r="2.4" fill="#fff" />
            <circle cx="9.7" cy="-3" r="1.1" fill="#111" />
            {/* Tauchschaufel */}
            <path d="M15,2 q7,3 5,10 q-6,-2 -9,-7 Z" fill="rgba(220,240,255,.75)" />
            {/* Drilling */}
            <path d="M-2,7 C-2,16 -9,18 -11,12" stroke="#c8d4dc" strokeWidth="1.6" fill="none" />
            <path d="M2,7 C2,16 9,18 11,12" stroke="#c8d4dc" strokeWidth="1.6" fill="none" />
          </g>
        </g>

        {/* Hecht (Maulspitze trifft bei Transform 0 genau den Köder) */}
        <g transform="translate(118,240)">
          <g className="bb-pike-i">
            {/* Schwanz */}
            <g className="bb-tail">
              <path d="M30,60 L-20,20 C-31,45 -31,75 -20,100 Z" fill="#3a5c2c" />
            </g>
            {/* Rumpf */}
            <path d="M20,60 C50,22 140,14 230,26 C272,32 300,42 314,52 L314,68 C300,78 272,88 230,94 C140,106 50,98 20,60 Z"
              fill="url(#bbPikeBody)" />
            {/* heller Bauch */}
            <path d="M60,84 C130,98 230,94 300,74 L314,68 C300,78 272,88 230,94 C160,102 100,98 60,84 Z"
              fill="rgba(225,238,205,.30)" />
            {/* Hecht-Flecken */}
            {[[92,48],[122,68],[152,42],[182,76],[210,52],[238,70],[142,58],[252,46],[112,82],[200,38],[170,60]].map(([x,y],i) => (
              <ellipse key={i} cx={x} cy={y} rx="4.2" ry="2.4" fill="#d7e8b0" opacity=".45" />
            ))}
            {/* Rückenflosse (beim Hecht weit hinten) */}
            <path d="M62,30 C74,8 104,6 122,18 L98,34 Z" fill="#3f6630" />
            {/* Afterflosse */}
            <path d="M72,90 C86,110 108,112 122,100 L100,86 Z" fill="#3f6630" />
            {/* Bauchflosse */}
            <path d="M182,92 l14,16 14,-10 Z" fill="#3f6630" />
            {/* Oberkiefer mit Zähnen */}
            <g className="bb-jawU">
              <path d="M296,38 Q332,37 356,57 Q330,55 294,52 Z" fill="#4a7338" />
              <path d="M322,53 l3,5 3,-5 Z M334,55 l3,5 3,-5 Z" fill="#f4f8ee" />
            </g>
            {/* Unterkiefer mit Zähnen (beim Hecht vorstehend) */}
            <g className="bb-jawL">
              <path d="M294,82 Q332,84 360,62 Q332,66 294,68 Z" fill="#3c612e" />
              <path d="M326,66 l3,-5 3,5 Z M338,64 l3,-5 3,5 Z" fill="#f4f8ee" />
            </g>
            {/* Auge */}
            <circle cx="300" cy="46" r="5.6" fill="#ffd24a" />
            <circle cx="302" cy="46" r="2.6" fill="#101810" />
          </g>
        </g>

        {/* Splash beim Biss */}
        <g transform="translate(470,300)">
          <g className="bb-burst-i">
            <circle r="24" fill="none" stroke="rgba(200,235,255,.85)" strokeWidth="3" />
            {[[-28,-18,4],[24,-26,5],[36,-4,3],[-36,-2,3],[8,-36,4],[-12,-32,3.5],[30,12,3],[-24,14,3]].map(([x,y,r],i) => (
              <circle key={i} cx={x} cy={y} r={r} fill="rgba(190,230,255,.85)" />
            ))}
          </g>
        </g>

        {/* Logo */}
        <g className="bb-title">
          <text x="400" y="468" textAnchor="middle" fontFamily="'Inter',sans-serif"
            fontSize="46" fontWeight="800" fill="#22d3c8">BaitBuddy</text>
          <text x="400" y="496" textAnchor="middle" fontFamily="'Inter',sans-serif"
            fontSize="15" fontWeight="500" fill="#7aa0b8">Dein KI-Angelbegleiter</text>
        </g>
      </svg>

      <div className="bb-skip">Tippen zum Überspringen</div>
    </div>
  );
}
