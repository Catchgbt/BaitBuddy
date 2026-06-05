import React, { useState, useEffect, useRef } from 'react';

export default function PrecisionCast({ onGameEnd }) {
  const [gameState, setGameState] = useState('idle');
  const [power, setPower] = useState(0);
  const [angle, setAngle] = useState(45);
  const [score, setScore] = useState(0);
  const [casts, setCasts] = useState(0);
  const [projectile, setProjectile] = useState(null);
  const [targets, setTargets] = useState([]);
  const powerInterval = useRef(null);

  const MAX_CASTS = 5;
  const GAME_WIDTH = 600;
  const GAME_HEIGHT = 400;

  useEffect(() => {
    const newTargets = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: 150 + i * 150,
      y: 100 + Math.random() * 150,
      radius: 30 + Math.random() * 20,
      points: Math.floor((50 - (30 + Math.random() * 20)) * 2)
    }));
    setTargets(newTargets);
  }, [casts]);

  const startAiming = () => {
    setGameState('aiming');
    setPower(0);
    
    powerInterval.current = setInterval(() => {
      setPower(p => {
        if (p >= 100) return 0;
        return p + 2;
      });
    }, 50);
  };

  const cast = () => {
    if (gameState !== 'aiming') return;
    
    clearInterval(powerInterval.current);
    setGameState('casting');

    const radians = (angle * Math.PI) / 180;
    const velocity = power / 10;
    const vx = velocity * Math.cos(radians);
    const vy = -velocity * Math.sin(radians);

    let x = 50;
    let y = GAME_HEIGHT - 50;
    let currentVy = vy;
    const gravity = 0.3;

    const positions = [];
    while (y < GAME_HEIGHT && x < GAME_WIDTH) {
      x += vx;
      y += currentVy;
      currentVy += gravity;
      positions.push({ x, y });
    }

    setProjectile({ positions, current: 0 });
    animateProjectile(positions);
  };

  const animateProjectile = (positions) => {
    let index = 0;
    const animInterval = setInterval(() => {
      if (index >= positions.length) {
        clearInterval(animInterval);
        checkHit(positions[positions.length - 1]);
        return;
      }

      setProjectile({ positions, current: index });
      
      const currentPos = positions[index];
      targets.forEach(target => {
        const distance = Math.sqrt(
          Math.pow(currentPos.x - target.x, 2) + 
          Math.pow(currentPos.y - target.y, 2)
        );
        
        if (distance < target.radius) {
          clearInterval(animInterval);
          handleHit(target);
        }
      });

      index++;
    }, 16);
  };

  const handleHit = (target) => {
    setScore(s => s + target.points);
    setTargets(t => t.filter(tg => tg.id !== target.id));
    finishCast();
  };

  const checkHit = (finalPos) => {
    let hit = false;
    targets.forEach(target => {
      const distance = Math.sqrt(
        Math.pow(finalPos.x - target.x, 2) + 
        Math.pow(finalPos.y - target.y, 2)
      );
      
      if (distance < target.radius) {
        handleHit(target);
        hit = true;
      }
    });

    if (!hit) {
      finishCast();
    }
  };

  const finishCast = () => {
    setTimeout(() => {
      setCasts(c => c + 1);
      setProjectile(null);
      setGameState('idle');
      
      if (casts + 1 >= MAX_CASTS) {
        endGame();
      }
    }, 500);
  };

  const endGame = () => {
    setGameState('ended');
    onGameEnd(score);
  };

  const reset = () => {
    setGameState('idle');
    setScore(0);
    setCasts(0);
    setProjectile(null);
    setPower(0);
    setAngle(45);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex justify-between p-4 bg-gray-900/60 rounded-t-xl border border-cyan-500/20">
        <div>
          <span className="text-gray-400 text-sm">Würfe: </span>
          <span className="text-white text-xl font-bold">{casts}/{MAX_CASTS}</span>
        </div>
        <div>
          <span className="text-gray-400 text-sm">Punkte: </span>
          <span className="text-cyan-400 text-xl font-bold">{score}</span>
        </div>
      </div>

      <div className="relative w-full h-96 bg-gradient-to-b from-sky-300 to-blue-400 border-x border-cyan-500/20 overflow-hidden">
        {/* Water */}
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-b from-blue-500 to-blue-700"></div>

        {/* Player */}
        <div className="absolute bottom-[30%] left-12 w-10 h-10 bg-amber-700 rounded-full z-10">
          <div 
            className="absolute bottom-0 left-1/2 w-1 h-16 bg-amber-800 origin-bottom transition-transform duration-300"
            style={{ transform: `translateX(-50%) rotate(${-angle}deg)` }}
          ></div>
        </div>

        {/* Targets */}
        {targets.map(target => (
          <div
            key={target.id}
            className="absolute rounded-full bg-gradient-to-br from-red-400 to-red-600 border-4 border-white/50 flex items-center justify-center animate-bounce z-[5]"
            style={{
              left: target.x - target.radius,
              top: target.y - target.radius,
              width: target.radius * 2,
              height: target.radius * 2,
              animationDuration: `${2 + Math.random()}s`
            }}
          >
            <span className="text-white font-bold text-lg drop-shadow-lg">{target.points}</span>
          </div>
        ))}

        {/* Projectile */}
        {projectile && (
          <div
            className="absolute w-3 h-3 bg-orange-500 rounded-full shadow-lg shadow-orange-500/50 z-[15]"
            style={{
              left: projectile.positions[projectile.current]?.x - 5,
              top: projectile.positions[projectile.current]?.y - 5,
            }}
          ></div>
        )}
      </div>

      <div className="p-5 bg-gray-900/60 rounded-b-xl border border-cyan-500/20 border-t-0 space-y-4">
        {gameState === 'idle' && casts < MAX_CASTS && (
          <>
            <div>
              <label className="block text-gray-400 text-sm mb-2 font-semibold">
                Winkel: {angle}°
              </label>
              <input
                type="range"
                min="15"
                max="75"
                value={angle}
                onChange={(e) => setAngle(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <button 
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white text-lg font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={startAiming}
            >
              Werfen vorbereiten
            </button>
          </>
        )}

        {gameState === 'aiming' && (
          <>
            <div>
              <label className="block text-gray-400 text-sm mb-2 font-semibold">
                Kraft: {power}%
              </label>
              <div className="w-full h-6 bg-gray-700 rounded-full overflow-hidden border border-cyan-500/30">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-cyan-500 to-yellow-500 transition-all duration-[50ms]"
                  style={{ width: `${power}%` }}
                ></div>
              </div>
            </div>
            <button 
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse"
              onClick={cast}
            >
              JETZT WERFEN!
            </button>
          </>
        )}

        {gameState === 'casting' && (
          <div className="text-center text-cyan-400 text-lg font-semibold py-4">
            Wurf läuft...
          </div>
        )}

        {gameState === 'ended' && (
          <div className="text-center space-y-4">
            <h3 className="text-cyan-400 text-2xl font-bold">Spiel beendet!</h3>
            <p className="text-gray-300 text-lg">Endscore: {score} Punkte</p>
            <button 
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white font-bold rounded-xl transition-all hover:scale-[1.02]"
              onClick={reset}
            >
              Nochmal spielen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}