import React, { useEffect, useRef, useState, useCallback } from "react";

export default function KIFangberatungCatchGBT({ onStart, onStop, isActive }) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const hiddenCanvasRef = useRef(null);
  const buddyRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState(null);
  const [spots, setSpots] = useState([]);
  const [frozen, setFrozen] = useState(false);
  const [buddyPos, setBuddyPos] = useState({ x: 20, y: 20 });
  const [draggingBuddy, setDraggingBuddy] = useState(false);

  const ANALYZE_WIDTH = 220;
  const ANALYZE_HEIGHT = 160;
  const ANALYZE_INTERVAL_MS = 900;

  const startCamera = async () => {
    if (onStart) {
      try {
        await onStart();
      } catch (error) {
        console.error("Start callback failed:", error);
        return;
      }
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(media);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (e) {
      console.error(e);
      alert(
        "Kamera konnte nicht aktiviert werden. Bitte Berechtigungen prüfen."
      );
      if (onStop) {
        onStop();
      }
    }
  };

  const stopCamera = () => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    } catch {}
    setStream(null);
    setIsCameraOn(false);
    setIsAnalyzing(false);
    
    if (onStop) {
      onStop();
    }
  };

  useEffect(
    () => () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (isCameraOn && onStop) {
        onStop();
      }
    },
    [stream, isCameraOn, onStop]
  );

  const fitOverlayToVideo = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    const rect = video.getBoundingClientRect();
    overlay.width = Math.floor(rect.width);
    overlay.height = Math.floor(rect.height);
  };

  const drawOverlay = useCallback((list = spots) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const grad = ctx.createRadialGradient(
      overlay.width / 2,
      overlay.height / 2,
      overlay.height / 3,
      overlay.width / 2,
      overlay.height / 2,
      overlay.height
    );
    grad.addColorStop(0, "rgba(15,23,42,0)");
    grad.addColorStop(1, "rgba(15,23,42,0.8)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, overlay.width, overlay.height);

    list.forEach(({ x, y, id, score }) => {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(192, 38, 211, 0.3)";
      ctx.fill();
      ctx.strokeStyle = "rgba(217, 70, 239, 0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(id, x, y);
    });
  }, [spots]);

  useEffect(() => {
    const onResize = () => {
      fitOverlayToVideo();
      drawOverlay(spots);
    };
    window.addEventListener("resize", onResize);
    const id = setInterval(onResize, 600);
    return () => {
      window.removeEventListener("resize", onResize);
      clearInterval(id);
    };
  }, [spots, drawOverlay]);

  const tryAnalyzeFrame = useCallback(() => {
    const video = videoRef.current;
    const hidden = hiddenCanvasRef.current;
    if (!video || !hidden) return;

    hidden.width = ANALYZE_WIDTH;
    hidden.height = ANALYZE_HEIGHT;
    const hctx = hidden.getContext("2d", { willReadFrequently: true });
    hctx.drawImage(video, 0, 0, ANALYZE_WIDTH, ANALYZE_HEIGHT);
    const img = hctx.getImageData(0, 0, ANALYZE_WIDTH, ANALYZE_HEIGHT);
    const data = img.data;

    const cands = [];
    for (let y = 0; y < ANALYZE_HEIGHT; y += 2) {
      for (let x = 0; x < ANALYZE_WIDTH; x += 2) {
        const i = (y * ANALYZE_WIDTH + x) * 4;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2],
          a = data[i + 3];
        if (a < 200) continue;
        const avg = (r + g + b) / 3;
        const blueDom = b > avg * 1.1 && b > r * 1.05 && b > g * 1.05;
        if (!blueDom) continue;
        const nx = Math.min(x + 1, ANALYZE_WIDTH - 1);
        const ny = Math.min(y + 1, ANALYZE_HEIGHT - 1);
        const iR = (y * ANALYZE_WIDTH + nx) * 4;
        const iD = (ny * ANALYZE_WIDTH + x) * 4;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const lumR =
          0.2126 * data[iR] + 0.7152 * data[iR + 1] + 0.0722 * data[iR + 2];
        const lumD =
          0.2126 * data[iD] + 0.7152 * data[iD + 1] + 0.0722 * data[iD + 2];
        const grad = Math.abs(lum - lumR) + Math.abs(lum - lumD);
        const score = grad + (b - avg) * 0.25;
        if (score > 10) cands.push({ x, y, score });
      }
    }

    cands.sort((a, b) => b.score - a.score);
    const picked = [];
    const minDist = 22;
    for (const c of cands) {
      if (picked.length >= 5) break;
      if (
        picked.every((p) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2 > minDist ** 2)
      )
        picked.push(c);
    }

    const overlay = overlayRef.current;
    if (!overlay) return;
    const scaleX = overlay.width / ANALYZE_WIDTH;
    const scaleY = overlay.height / ANALYZE_HEIGHT;
    const mapped = picked.map((p, i) => ({
      id: `S${i + 1}`,
      x: Math.round(p.x * scaleX),
      y: Math.round(p.y * scaleY),
      score: Math.round(p.score),
    }));

    setSpots(mapped);
    drawOverlay(mapped);
  }, [drawOverlay]);

  useEffect(() => {
    if (!isAnalyzing || !isCameraOn) return;
    let raf = 0;
    let last = 0;
    const step = (ts) => {
      if (ts - last >= ANALYZE_INTERVAL_MS) {
        last = ts;
        tryAnalyzeFrame();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isAnalyzing, isCameraOn, tryAnalyzeFrame]);

  const handleBuddyMove = (e) => {
    if (!draggingBuddy) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setBuddyPos({ x, y });
  };

  return (
    <div className="bg-gray-900/50 p-4 rounded-xl space-y-4">
      <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Kamera- und Analyse-Steuerungen">
        {!isCameraOn ? (
          <button
            onClick={startCamera}
            onKeyPress={(e) => e.key === 'Enter' && startCamera()}
            aria-label="Kamera starten"
            className="px-4 py-2 min-h-[44px] min-w-[44px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 active:scale-95"
          >
            Kamera starten
          </button>
        ) : (
          <button
            onClick={stopCamera}
            onKeyPress={(e) => e.key === 'Enter' && stopCamera()}
            aria-label="Kamera stoppen"
            className="px-4 py-2 min-h-[44px] min-w-[44px] bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95"
          >
            Kamera stoppen
          </button>
        )}
        {isCameraOn && (
          <>
            <button
              onClick={() => setIsAnalyzing(!isAnalyzing)}
              onKeyPress={(e) => e.key === 'Enter' && setIsAnalyzing(!isAnalyzing)}
              aria-label={isAnalyzing ? "Analyse stoppen" : "Analyse starten"}
              aria-pressed={isAnalyzing}
              className={`px-4 py-2 min-h-[44px] min-w-[44px] text-white rounded-lg shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 ${
                isAnalyzing
                  ? "bg-fuchsia-600 hover:bg-fuchsia-700 focus-visible:ring-fuchsia-400"
                  : "bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-400"
              }`}
            >
              {isAnalyzing ? "Analyse stoppen" : "Analyse starten"}
            </button>
            <button
              onClick={() => setFrozen(!frozen)}
              onKeyPress={(e) => e.key === 'Enter' && setFrozen(!frozen)}
              aria-label={frozen ? "Live-Ansicht aktivieren" : "Bild einfrieren"}
              aria-pressed={frozen}
              className={`px-4 py-2 min-h-[44px] min-w-[44px] text-white rounded-lg shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 ${
                frozen
                  ? "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-400"
                  : "bg-gray-600 hover:bg-gray-700 focus-visible:ring-gray-400"
              }`}
            >
              {frozen ? "Live" : "Einfrieren"}
            </button>
          </>
        )}
      </div>

      <div
        className="relative w-full max-w-2xl mx-auto aspect-video bg-gray-950 rounded-xl overflow-hidden shadow-lg border border-fuchsia-800/30"
        onMouseMove={handleBuddyMove}
        onMouseUp={() => setDraggingBuddy(false)}
        onMouseLeave={() => setDraggingBuddy(false)}
        role="region"
        aria-label="Live Kamera-Feed mit KI-Fanganalyse und drehbarem KI-Buddy"
      >
        <video
          ref={videoRef}
          className={`w-full h-full object-cover transition-opacity ${
            isCameraOn ? "opacity-100" : "opacity-0"
          }`}
          playsInline
          muted
          style={{ objectFit: frozen ? "contain" : "cover" }}
        />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          role="img"
          aria-label="Analyseergebnis-Overlay zeigt erkannte Fanghotspots mit Score-Werten"
        />

        {isCameraOn && (
          <div
            ref={buddyRef}
            className="absolute w-20 h-20 text-center cursor-move select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
            role="img"
            tabIndex="0"
            style={{
              left: buddyPos.x - 40,
              top: buddyPos.y - 40,
              touchAction: "none",
            }}
            onMouseDown={() => setDraggingBuddy(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') setBuddyPos(prev => ({ ...prev, y: Math.max(0, prev.y - 10) }));
              if (e.key === 'ArrowDown') setBuddyPos(prev => ({ ...prev, y: Math.min(500, prev.y + 10) }));
              if (e.key === 'ArrowLeft') setBuddyPos(prev => ({ ...prev, x: Math.max(0, prev.x - 10) }));
              if (e.key === 'ArrowRight') setBuddyPos(prev => ({ ...prev, x: Math.min(500, prev.x + 10) }));
            }}
            aria-label="KI-Buddy - drehbar mit Maus oder Pfeiltasten"
          >
            <div className="w-16 h-16 bg-fuchsia-500/80 rounded-full animate-pulse blur-lg absolute top-2 left-2"></div>
            <p className="font-bold text-3xl drop-shadow-lg relative">🎣</p>
            <p className="text-white text-xs font-semibold drop-shadow-md relative bg-black/30 rounded-full px-1">
              KI.Buddy
            </p>
          </div>
        )}

        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-12 h-12 text-gray-600 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-400">Kamera ist aus.</p>
          </div>
        )}

        <canvas ref={hiddenCanvasRef} className="hidden" />
      </div>
    </div>
  );
}