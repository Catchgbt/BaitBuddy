import React, { useState, useEffect, useRef } from 'react';

const KNOTS = {
  "Palomar": {
    color: "#00c8ff",
    steps: [
      { title:"Schnur verdoppeln", desc:"Falte ~20cm der Schnur und führe die Schlaufe durch das Öhr.", tip:"Je größer das Öhr, desto einfacher.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.18}, label:"Durch das Öhr" }},
      { title:"Überhandknoten", desc:"Binde mit der Schlaufe einen losen Überhandknoten — noch nicht fest.", tip:"Knoten muss noch frei beweglich bleiben.",ar:{ hl:[4,8], arrow:{dx:0.15,dy:0}, label:"Schlaufe drehen" }},
      { title:"Haken durchfädeln", desc:"Schiebe den Haken komplett durch die große Schlaufe.", tip:"Ganz durch — nicht nur die Spitze!", ar:{ hl:[4,8,12], arrow:{dx:0,dy:0.15}, label:"Haken durch" }},
      { title:"Befeuchten", desc:"Befeuchte den Knoten kurz mit Speichel oder Wasser.", tip:"Verhindert Reibungshitze.", ar:{ hl:[4,8], arrow:null, label:"Anfeuchten" }},
      { title:"Langsam festziehen", desc:"Ziehe beide Enden gleichmäßig, bis der Knoten sitzt.", tip:"Kein Rucken — gleichmäßiger Zug.", ar:{ hl:[4,8], arrow:{dx:-0.12,dy:0.12}, label:"Gleichmäßig ziehen" }},
      { title:"Überstand abschneiden", desc:"Lasse ~3mm Überstand, Rest abschneiden.", tip:"3mm ist der sichere Abstand.", ar:{ hl:[4,8], arrow:null, label:"3mm stehen lassen" }},
      { title:"Zugtest", desc:"Kräftig an der Schnur ziehen — Sitz testen vor dem Werfen.", tip:"Lieber jetzt testen!", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.2}, label:"Zugtest" }},
    ]
  },
  "Clinch": {
    color: "#00ff9d",
    steps: [
      { title:"Einfädeln", desc:"Führe 15-20cm der Schnur durch das Öhr des Hakens.", tip:"Von vorne einfädeln.", ar:{ hl:[8], arrow:{dx:0,dy:-0.16}, label:"Durch das Öhr" }},
      { title:"5× wickeln", desc:"Wickle den losen Rest genau 5× um den Hauptstrang.", tip:"Bei dicker Schnur nur 4×.", ar:{ hl:[4,8], arrow:{dx:0.18,dy:0}, label:"5 Wicklungen" }},
      { title:"Durch die erste Öse", desc:"Führe das Ende durch die erste Schlaufe direkt am Öhr.", tip:"Wicklungen mit Daumen festhalten.", ar:{ hl:[4,8], arrow:{dx:-0.1,dy:-0.1}, label:"Durch die Öse" }},
      { title:"Durch die Schlaufe", desc:"Führe das Ende durch die große Schlaufe — Improved Clinch.", tip:"Stabiler als einfacher Clinch.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Durch die Schlaufe" }},
      { title:"Befeuchten & ziehen", desc:"Befeuchte, halte Haken fest, ziehe am Hauptstrang.", tip:"Wicklungen nebeneinander — nicht über.", ar:{ hl:[4,8], arrow:{dx:-0.15,dy:0.1}, label:"Festziehen" }},
      { title:"Abschneiden", desc:"Überstand auf ~3mm kürzen. Fertig!", tip:"Hält bis zu 95% der Bruchlast.", ar:{ hl:[8], arrow:null, label:"3mm" }},
    ]
  },
  "Uni-Knoten": {
    color: "#ffc84a",
    steps: [
      { title:"Einfädeln & legen", desc:"Fädle 20cm durch das Öhr, lege parallel zum Hauptstrang zurück.", tip:"Längeres Tag-End macht Wickeln leichter.", ar:{ hl:[8], arrow:{dx:0,dy:-0.15}, label:"Einfädeln" }},
      { title:"Schlaufe formen", desc:"Forme mit Tag-End, Doppelstrang und Hauptstrang eine offene Schlaufe.", tip:"Schlaufe groß und locker lassen.", ar:{ hl:[4,8], arrow:{dx:0.15,dy:0.1}, label:"Schlaufe" }},
      { title:"6× wickeln", desc:"Wickle das Tag-End 6× durch die Schlaufe, von unten nach oben.", tip:"5–6 Wicklungen sind optimal.", ar:{ hl:[4,8], arrow:{dx:0.18,dy:-0.05}, label:"6×" }},
      { title:"Locker anziehen", desc:"Halte Wicklungen fest, ziehe Tag-End bis Knoten zusammenzieht.", tip:"Noch nicht ganz — erst verschieben.", ar:{ hl:[4,8], arrow:{dx:-0.1,dy:0.1}, label:"Locker ziehen" }},
      { title:"Zum Öhr schieben", desc:"Schiebe den losen Knoten entlang der Schnur bis ans Öhr.", tip:"Uni-Knoten ist noch verstellbar.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Zum Öhr schieben" }},
      { title:"Festziehen", desc:"Kräftig am Hauptstrang ziehen — Knoten endgültig fixieren.", tip:"Befeuchten nicht vergessen!", ar:{ hl:[4,8], arrow:{dx:-0.15,dy:0.12}, label:"Festziehen" }},
      { title:"Kürzen", desc:"Überstand auf 2–3mm kürzen. Fertig!", tip:"Auch für zwei Schnüre verbindbar.", ar:{ hl:[8], arrow:null, label:"2-3mm" }},
    ]
  },
  "Schlaufenknoten": {
    color: "#ff6b9d",
    steps: [
      { title:"Schnur falten", desc:"Falte das Ende der Schnur ca. 10cm doppelt, sodass eine Schlaufe entsteht.", tip:"Je grösser, desto einfacher.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Falten" }},
      { title:"Überhandknoten", desc:"Bilde mit der doppelten Schnur einen losen Überhandknoten.", tip:"Nicht festziehen!", ar:{ hl:[4,8], arrow:{dx:0.12,dy:0}, label:"Überhand" }},
      { title:"Schlaufe durchziehen", desc:"Führe die Schlaufe nochmal durch den entstandenen Knoten.", tip:"Doppelt hält besser.", ar:{ hl:[4,8,12], arrow:{dx:0,dy:0.12}, label:"Durchziehen" }},
      { title:"Befeuchten", desc:"Befeuchte den Knoten kurz vor dem Festziehen.", tip:"Schützt die Schnur.", ar:{ hl:[4,8], arrow:null, label:"Anfeuchten" }},
      { title:"Festziehen", desc:"Ziehe Schlaufe und beide Enden gleichmässig fest.", tip:"Gleichmässig - kein Rucken.", ar:{ hl:[4,8], arrow:{dx:-0.12,dy:0.12}, label:"Festziehen" }},
      { title:"Kürzen", desc:"Überstand auf 3mm kürzen. Fertig!", tip:"Ideal für Vorfächer.", ar:{ hl:[8], arrow:null, label:"3mm" }},
    ]
  },
  "Stopperknoten": {
    color: "#9d4aff",
    steps: [
      { title:"Hilfsschnur legen", desc:"Lege ein 15cm Stück Schnur parallel zur Hauptschnur.", tip:"Gleiche Schnur verwenden.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Parallel legen" }},
      { title:"Schlaufe bilden", desc:"Forme aus der Hilfsschnur eine Schlaufe über die Hauptschnur.", tip:"Schlaufe locker halten.", ar:{ hl:[4,8], arrow:{dx:0.15,dy:0.1}, label:"Schlaufe" }},
      { title:"5× wickeln", desc:"Wickle ein Ende 5× um beide Schnüre durch die Schlaufe.", tip:"Eng nebeneinander wickeln.", ar:{ hl:[4,8], arrow:{dx:0.18,dy:-0.05}, label:"5 Wicklungen" }},
      { title:"Festziehen", desc:"Ziehe beide Enden der Hilfsschnur fest zusammen.", tip:"Knoten muss noch verschiebbar sein.", ar:{ hl:[4,8], arrow:{dx:-0.12,dy:0.1}, label:"Zuziehen" }},
      { title:"Position prüfen", desc:"Schiebe den Knoten zur gewünschten Stelle - er muss verstellbar bleiben.", tip:"Stoppt Pose oder Perle.", ar:{ hl:[4,8], arrow:{dx:0,dy:0}, label:"Verschieben" }},
      { title:"Enden kürzen", desc:"Lasse 1-2cm der Hilfsschnur stehen, Rest abschneiden.", tip:"Längere Enden = mehr Halt.", ar:{ hl:[8], arrow:null, label:"1-2cm" }},
    ]
  },
  "Albright-Knoten": {
    color: "#4affc8",
    steps: [
      { title:"Schlaufe formen", desc:"Bilde mit der dickeren Schnur eine ca. 8cm grosse Schlaufe.", tip:"Verbindet zwei Schnüre.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Schlaufe" }},
      { title:"Dünnere durchführen", desc:"Führe die dünnere Schnur durch die Schlaufe der dickeren.", tip:"15cm Tag-End lassen.", ar:{ hl:[4,8,12], arrow:{dx:0.12,dy:0}, label:"Durchführen" }},
      { title:"10× wickeln", desc:"Wickle die dünnere Schnur 10× um beide Schenkel der Schlaufe.", tip:"Wicklungen eng und ordentlich.", ar:{ hl:[4,8], arrow:{dx:0.18,dy:-0.05}, label:"10 Wicklungen" }},
      { title:"Zurück durchführen", desc:"Führe das Ende zurück durch die Schlaufe - in die gleiche Richtung wie zu Beginn.", tip:"Gleiche Richtung beachten!", ar:{ hl:[4,8], arrow:{dx:-0.15,dy:0.1}, label:"Zurück durch" }},
      { title:"Befeuchten & ziehen", desc:"Befeuchte und ziehe alle vier Enden gleichmässig fest.", tip:"Wicklungen müssen sauber liegen.", ar:{ hl:[4,8], arrow:{dx:-0.1,dy:0.1}, label:"Festziehen" }},
      { title:"Kürzen", desc:"Beide Enden auf 3mm kürzen. Fertig!", tip:"Ideal Geflecht zu Mono.", ar:{ hl:[8], arrow:null, label:"3mm" }},
    ]
  },
  "Blutknoten": {
    color: "#ff8c42",
    steps: [
      { title:"Schnüre kreuzen", desc:"Lege beide Schnurenden über Kreuz, je 15cm Tag-End.", tip:"Verbindet zwei gleich dicke Schnüre.", ar:{ hl:[4,8], arrow:{dx:0,dy:-0.15}, label:"Kreuzen" }},
      { title:"Erste Seite wickeln", desc:"Wickle das eine Ende 5× um die andere Schnur.", tip:"Eng nebeneinander.", ar:{ hl:[4,8], arrow:{dx:0.18,dy:0}, label:"5× wickeln" }},
      { title:"Zurück durch Mitte", desc:"Führe das Ende zurück durch die Mitte zwischen beiden Schnüren.", tip:"Mit Daumen festhalten.", ar:{ hl:[4,8,12], arrow:{dx:-0.1,dy:-0.1}, label:"Durch Mitte" }},
      { title:"Zweite Seite wickeln", desc:"Wickle das andere Ende ebenfalls 5× - in die Gegenrichtung.", tip:"Gleiche Anzahl Wicklungen!", ar:{ hl:[4,8], arrow:{dx:-0.18,dy:0}, label:"5× andere Seite" }},
      { title:"Durch Mitte führen", desc:"Führe auch dieses Ende zurück durch die Mitte - entgegengesetzt.", tip:"Beide Enden zeigen jetzt entgegengesetzt.", ar:{ hl:[4,8], arrow:{dx:0.1,dy:-0.1}, label:"Durch Mitte" }},
      { title:"Befeuchten & ziehen", desc:"Befeuchte und ziehe alle vier Enden gleichzeitig fest.", tip:"Knoten zieht sich symmetrisch.", ar:{ hl:[4,8], arrow:{dx:-0.15,dy:0.1}, label:"Festziehen" }},
      { title:"Kürzen", desc:"Beide Tag-Enden auf 2mm kürzen. Fertig!", tip:"Klassischer Vorfachknoten.", ar:{ hl:[8], arrow:null, label:"2mm" }},
    ]
  }
};

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]
];

const CMDS = {
  "weiter":["weiter","nächster","next","vorwärts"],
  "zurück":["zurück","zurückgehen","back","vorheriger"],
  "wiederholen":["wiederholen","nochmal","wiederhole","repeat"],
  "langsamer":["langsamer","slower"],
  "schneller":["schneller","faster"],
};

export default function ARKnotenAssistent() {
  const [currentKnot, setCurrentKnot] = useState("Palomar");
  const [currentStep, setCurrentStep] = useState(0);
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [isListening, setIsListening] = useState(false);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [transcript, setTranscript] = useState("Sprachbefehle: Weiter, Zurück, Wiederholen");
  const [transClass, setTransClass] = useState("");
  const [tracking, setTracking] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const arAnimIdRef = useRef(null);
  const mpHandsRef = useRef(null);
  const mpCameraRef = useRef(null);

  const steps = KNOTS[currentKnot].steps;
  const step = steps[currentStep];

  useEffect(() => {
    return () => {
      if (mpCameraRef.current) mpCameraRef.current.stop();
      if (arAnimIdRef.current) cancelAnimationFrame(arAnimIdRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = ttsSpeed;
    window.speechSynthesis.speak(u);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStarted(true);
      initMediaPipe();
    } catch(e) {
      alert('Kamerazugriff verweigert: ' + e.message);
    }
  };

  const initMediaPipe = async () => {
    const Hands = window.Hands;
    if (!Hands) {
      console.error('MediaPipe Hands not loaded');
      return;
    }
    
    mpHandsRef.current = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    mpHandsRef.current.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    mpHandsRef.current.onResults(onHandResults);

    const Camera = window.Camera;
    mpCameraRef.current = new Camera(videoRef.current, {
      onFrame: async () => {
        if (mpHandsRef.current) {
          await mpHandsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });
    mpCameraRef.current.start();
    drawAR();
  };

  const onHandResults = (results) => {
    setHandLandmarks((results.multiHandLandmarks && results.multiHandLandmarks.length > 0) ? results.multiHandLandmarks[0] : null);
    setTracking(!!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0));
  };

  let arPhase = 0;
  const drawAR = () => {
    arPhase += 0.04;
    arAnimIdRef.current = requestAnimationFrame(drawAR);
    
    const canvas = canvasRef.current;
    if (!canvas || !handLandmarks) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const arCfg = step.ar;
    const knotColor = KNOTS[currentKnot].color;

    const lm = (idx) => {
      const l = handLandmarks[idx];
      return { x: l.x * W, y: l.y * H };
    };

    // Skeleton
    ctx.save();
    CONNECTIONS.forEach(([a,b]) => {
      const pa = lm(a), pb = lm(b);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Landmarks
    for (let i = 0; i < 21; i++) {
      const p = lm(i);
      const isHL = arCfg.hl.includes(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHL ? 0 : 4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    }
    ctx.restore();

    // Highlight
    arCfg.hl.forEach((idx, i) => {
      const p = lm(idx);
      const pulse = 8 + Math.sin(arPhase + i * 1.2) * 4;

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, pulse + 8, 0, Math.PI*2);
      ctx.strokeStyle = knotColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.25 + Math.sin(arPhase)*0.15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(p.x, p.y, pulse, 0, Math.PI*2);
      const grad = ctx.createRadialGradient(p.x,p.y,0, p.x,p.y,pulse);
      grad.addColorStop(0, knotColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.7;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 1;
      ctx.fill();
      ctx.restore();
    });

    // Fishing line
    if (handLandmarks[4] && handLandmarks[8]) {
      const pt = lm(4), pi = lm(8);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -arPhase * 8;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pi.x, pi.y);
      ctx.strokeStyle = knotColor;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = knotColor;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    // Arrow
    if (arCfg.arrow && arCfg.hl.length > 0) {
      const base = lm(arCfg.hl[0]);
      const startX = base.x + 20;
      const startY = base.y - 30;
      const endX = startX + arCfg.arrow.dx * W;
      const endY = startY + arCfg.arrow.dy * H;
      const t = (Math.sin(arPhase * 1.5) + 1) / 2;
      const tx = startX + (endX - startX) * t;
      const ty = startY + (endY - startY) * t;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = knotColor;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = knotColor;
      ctx.shadowBlur = 12;
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 14*Math.cos(angle-0.4), endY - 14*Math.sin(angle-0.4));
      ctx.lineTo(endX - 14*Math.cos(angle+0.4), endY - 14*Math.sin(angle+0.4));
      ctx.closePath();
      ctx.fillStyle = knotColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI*2);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
    }
  };

  const navigate = (dir) => {
    const next = currentStep + dir;
    if (next < 0 || next >= steps.length) return;
    setCurrentStep(next);
    speakText(steps[next].title + '. ' + steps[next].desc);
  };

  const repeatStep = () => {
    speakText(step.title + '. ' + step.desc);
  };

  const toggleMic = () => {
    isListening ? stopMic() : startMic();
  };

  const startMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setTranscript('Nicht unterstützt');
      return;
    }

    recognitionRef.current = new SR();
    recognitionRef.current.lang = 'de-DE';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setTranscript('Höre zu...');
    };

    recognitionRef.current.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript.toLowerCase();
        }
      }
      if (final) {
        setTranscript('✓ ' + final);
        setTransClass('ok');
        handleVoice(final);
      }
    };

    recognitionRef.current.onerror = () => {
      setTransClass('err');
    };

    recognitionRef.current.onend = () => {
      if (isListeningRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    };

    recognitionRef.current.start();
  };

  const stopMic = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  };

  const handleVoice = (text) => {
    if (CMDS.weiter.some(k => text.includes(k))) { navigate(1); return; }
    if (CMDS.zurück.some(k => text.includes(k))) { navigate(-1); return; }
    if (CMDS.wiederholen.some(k => text.includes(k))) { repeatStep(); return; }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col text-white">
      <div className="flex-1 relative bg-black overflow-hidden">
        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        <div className="absolute top-4 left-4 z-10">
          <div className="text-2xl font-bold text-cyan-400">CatchGBT</div>
        </div>
        
        <div className="absolute top-4 right-4 z-10">
          <div className={`px-3 py-1 rounded-full border text-xs ${tracking ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-400'}`}>
            {tracking ? 'Hand erkannt' : 'Suche Hand...'}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-gray-950 to-transparent p-6">
          <div className="flex items-end gap-4 mb-4">
            <div className="text-4xl font-bold text-cyan-400">{String(currentStep+1).padStart(2,'0')}</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-gray-300 mt-1">{step.desc}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 rounded ${i < currentStep ? 'bg-gray-600' : i === currentStep ? 'bg-cyan-400 w-6' : 'bg-gray-700'} transition-all`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-0 bg-gray-800 p-4 space-y-3">
        <div className="flex gap-2">
          {Object.keys(KNOTS).map(k => (
            <button
              key={k}
              onClick={() => { setCurrentKnot(k); setCurrentStep(0); }}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                currentKnot === k ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} disabled={currentStep === 0} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 text-sm font-medium">
            Zurück
          </button>
          <button onClick={repeatStep} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium">
            Wiederholen
          </button>
          <button onClick={toggleMic} className={`flex-1 px-4 py-2 rounded text-sm font-medium ${isListening ? 'bg-orange-600' : 'bg-gray-700'}`}>
            {isListening ? 'Höre...' : 'Mikrofon'}
          </button>
          <button onClick={() => navigate(1)} disabled={currentStep === steps.length - 1} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 text-sm font-medium">
            Weiter
          </button>
        </div>

        <div className={`p-2 rounded bg-gray-900 text-xs ${transClass === 'ok' ? 'text-green-400 border border-green-600' : 'text-gray-400'}`}>
          {transcript}
        </div>

        {!cameraStarted && (
          <button onClick={startCamera} className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-medium">
            Kamera starten
          </button>
        )}
      </div>
    </div>
  );
}