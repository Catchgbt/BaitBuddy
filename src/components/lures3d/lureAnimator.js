// Parametrisches Bewegungsmodell der 3D-Köderanimation. Bewusst ohne
// three.js-Import: Der Animator rechnet nur Zahlen (Pose + Teil-Winkel),
// LureScene.jsx überträgt das Ergebnis auf die Szene. Dadurch ist das
// Laufverhalten ohne WebGL unit-testbar.
//
// Koordinaten: Zugrichtung +X, Wasseroberfläche y = surfaceY, Grund y = floorY.
// "Laufband"-Modell: Der Köder bleibt nahe dem Ursprung, die gefühlte
// Vorwärtsbewegung (forwardSpeed) scrollt die Umgebung.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export const PHASE = {
  PULL: 'zug',
  PAUSE: 'pause',
};

export class LureAnimator {
  constructor({ surfaceY = 0, floorY = -2.5 } = {}) {
    this.surfaceY = surfaceY;
    this.floorY = floorY;
    this.speedMultiplier = 1;
    this.style = null;
    this.behavior = 'swim';
    this._reset();
  }

  _reset() {
    this.time = 0;
    this.cycleTime = 0;
    this.pulseSide = 1;
    this.bladeAngle = 0;
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.y = -1;
  }

  // lureId bestimmt das Grundverhalten:
  //   topwater  → Lauf an der Oberfläche
  //   depth-Param gesetzt → Schwimmköder auf Lauftiefe (Wobbler/Spinner/Blinker)
  //   sonst → Grundköder mit Hüpf-/Absinkzyklus (Gummifisch am Jigkopf)
  setStyle(lureId, params) {
    this.lureId = lureId;
    this.style = { ...params };
    this._reset();
    if (lureId === 'topwater') {
      this.behavior = 'surface';
      this.y = this.surfaceY - 0.06;
    } else if (params.depth != null) {
      this.behavior = 'swim';
      this.y = -params.depth;
    } else {
      this.behavior = 'jig';
      this.y = this.floorY + 0.15;
    }
  }

  setSpeed(multiplier) {
    this.speedMultiplier = clamp(multiplier, 0.25, 3);
  }

  _cycleEnvelope() {
    const { pullDuration, pauseDuration } = this.style;
    if (!pullDuration || !pauseDuration) {
      return { envelope: 1, phase: PHASE.PULL };
    }
    if (this.cycleTime < pullDuration) {
      const ramp = Math.min(0.15, pullDuration / 3);
      const up = smoothstep(0, ramp, this.cycleTime);
      const down = 1 - smoothstep(pullDuration - ramp, pullDuration, this.cycleTime);
      return { envelope: Math.min(up, down), phase: PHASE.PULL };
    }
    return { envelope: 0, phase: PHASE.PAUSE };
  }

  update(dt) {
    const p = this.style;
    if (!p) return null;
    const mult = this.speedMultiplier;
    this.time += dt;

    const cycleLength = (p.pullDuration || 0) + (p.pauseDuration || 0);
    if (cycleLength > 0) {
      this.cycleTime += dt;
      if (this.cycleTime >= cycleLength) {
        this.cycleTime %= cycleLength;
        // Seitenwechsel pro Zyklus: Grundlage für Twitchen und Walk the Dog.
        this.pulseSide *= -1;
      }
    }
    const { envelope, phase } = this._cycleEnvelope();

    const forwardSpeed = p.retrieveSpeed * mult * envelope;

    // Vertikalbewegung je nach Verhalten.
    let vy = 0;
    if (this.behavior === 'swim') {
      if (phase === PHASE.PULL) {
        const target = -p.depth;
        vy = (target - this.y) * Math.min(1, dt * 3) / Math.max(dt, 1e-6);
        this.y += (target - this.y) * Math.min(1, dt * 3);
      } else if (p.riseRate) {
        vy = p.riseRate * mult;
        this.y = clamp(this.y + vy * dt, -20, this.surfaceY - 0.12);
      } else if (p.sinkRate) {
        vy = -p.sinkRate * mult;
        this.y = clamp(this.y + vy * dt, this.floorY + 0.12, this.surfaceY - 0.12);
      }
    } else if (this.behavior === 'jig') {
      const hopRate = 1.15;
      vy = envelope * hopRate * mult - (1 - envelope) * (p.sinkRate || 0.7) * mult;
      this.y = clamp(this.y + vy * dt, this.floorY + 0.12, -0.35);
    } else {
      // Oberflächenköder: leichtes Nicken/Bobbing um die Wasserlinie.
      this.y = this.surfaceY - 0.06 + Math.sin(this.time * 5) * 0.02 * (0.3 + envelope);
      vy = 0;
    }

    // Seitliches Ausbrechen (Twitchen, Walk the Dog): Gieren zur aktuellen
    // Seite während des Zugs, Rückdrift in der Gleitphase.
    let targetYaw = 0;
    if (p.yawAmp) {
      targetYaw = phase === PHASE.PULL ? this.pulseSide * p.yawAmp : this.yaw * 0.6;
    }
    this.yaw += (targetYaw - this.yaw) * Math.min(1, dt * 8);
    this.z = clamp(this.z + Math.sin(this.yaw) * forwardSpeed * dt * 0.6 - this.z * dt * 0.4, -0.9, 0.9);

    // Körper-Roll: Wobbeln/Taumeln nur solange Zug anliegt.
    const rollActivity = cycleLength > 0 ? 0.15 + 0.85 * envelope : 1;
    const roll = p.wobbleAmp
      ? Math.sin(this.time * Math.PI * 2 * (p.wobbleFreq || 4) * (0.6 + 0.4 * mult)) *
        p.wobbleAmp * rollActivity
      : 0;

    // Nase folgt der Bewegungsrichtung: Steigen → Nase hoch, Sinken → Nase runter.
    const pitch = clamp(Math.atan2(vy, Math.max(forwardSpeed, 0.18)) * 0.6, -0.85, 0.85);

    // Leichter Vor/Zurück-Versatz macht Zug- und Stopp-Phasen sichtbar.
    const surgeTarget = (envelope - 0.5) * 0.28;
    this.x += (surgeTarget - this.x) * Math.min(1, dt * 4);

    // Teil-Animationen.
    if (p.bladeSpin) {
      this.bladeAngle += Math.PI * 2 * p.bladeSpin * mult * (0.2 + 0.8 * envelope) * dt;
    }
    const tailAngle = p.tailFreq
      ? Math.sin(this.time * Math.PI * 2 * p.tailFreq * (0.4 + 0.6 * mult)) *
        0.5 * (0.25 + 0.75 * envelope)
      : 0;

    return {
      x: this.x,
      y: this.y,
      z: this.z,
      roll,
      pitch,
      yaw: this.yaw,
      bladeAngle: this.bladeAngle,
      tailAngle,
      phase,
      behavior: this.behavior,
      forwardSpeed,
    };
  }
}
