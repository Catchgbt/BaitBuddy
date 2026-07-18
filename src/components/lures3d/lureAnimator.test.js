import { describe, it, expect } from 'vitest';
import { LureAnimator, PHASE } from './lureAnimator';
import { LURES, getLureById, getStyleById } from '@/data/lureGuide.data';
import { LURE_MODEL_BUILDERS } from './lureModels';

const DT = 1 / 60;

function makeAnimator(lureId, styleId) {
  const lure = getLureById(lureId);
  const style = getStyleById(lure, styleId);
  const animator = new LureAnimator({ surfaceY: 0, floorY: -2.5 });
  animator.setStyle(lure.model, style.params);
  return animator;
}

describe('LureAnimator', () => {
  it('Gummifisch-Jiggen: Absinkphase fällt monoton bis zur Grundlinie', () => {
    const animator = makeAnimator('gummifisch', 'jiggen');

    let state = animator.update(DT);
    while (state.phase !== PHASE.PAUSE) state = animator.update(DT);

    const floorLimit = -2.5 + 0.12;
    const samples = [];
    while (state.phase === PHASE.PAUSE && state.y > floorLimit + 0.01) {
      samples.push(state.y);
      state = animator.update(DT);
    }
    expect(samples.length).toBeGreaterThan(10);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }
    expect(samples[samples.length - 1]).toBeGreaterThanOrEqual(floorLimit);
  });

  it('Walk the Dog: Gier-Ausschlag wechselt pro Zyklus die Seite', () => {
    const animator = makeAnimator('topwater', 'walk_the_dog');
    const lure = getLureById('topwater');
    const { pullDuration, pauseDuration } = getStyleById(lure, 'walk_the_dog').params;
    const cycle = pullDuration + pauseDuration;

    // Gier-Winkel jeweils in der Mitte der Zugphase abtasten.
    const midPullYaws = [];
    let elapsed = 0;
    let lastCycleIndex = -1;
    while (midPullYaws.length < 6) {
      const state = animator.update(DT);
      elapsed += DT;
      const cycleIndex = Math.floor(elapsed / cycle);
      const inCycle = elapsed % cycle;
      if (
        state.phase === PHASE.PULL &&
        inCycle > pullDuration * 0.6 &&
        cycleIndex !== lastCycleIndex
      ) {
        midPullYaws.push(state.yaw);
        lastCycleIndex = cycleIndex;
      }
    }
    for (let i = 1; i < midPullYaws.length; i++) {
      expect(Math.sign(midPullYaws[i])).toBe(-Math.sign(midPullYaws[i - 1]));
      expect(Math.abs(midPullYaws[i])).toBeGreaterThan(0.1);
    }
  });

  it('alle Köder und Stile liefern über 30 Sekunden endliche Posen', () => {
    for (const lure of LURES) {
      for (const style of lure.styles) {
        const animator = new LureAnimator();
        animator.setStyle(lure.model, style.params);
        for (let i = 0; i < 30 * 60; i++) {
          const state = animator.update(DT);
          for (const key of ['x', 'y', 'z', 'roll', 'pitch', 'yaw', 'bladeAngle', 'tailAngle', 'forwardSpeed']) {
            expect(Number.isFinite(state[key])).toBe(true);
          }
          expect(state.y).toBeLessThanOrEqual(0.05);
          expect(state.y).toBeGreaterThanOrEqual(-2.5);
        }
      }
    }
  });

  it('Einholtempo skaliert die Vorwärtsgeschwindigkeit linear', () => {
    const slow = makeAnimator('spinner', 'einleiern');
    const fast = makeAnimator('spinner', 'einleiern');
    slow.setSpeed(1);
    fast.setSpeed(2);
    const slowState = slow.update(DT);
    const fastState = fast.update(DT);
    expect(fastState.forwardSpeed).toBeCloseTo(slowState.forwardSpeed * 2, 6);
  });

  it('jeder model-Key aus der Datenbasis hat eine Modell-Factory', () => {
    for (const lure of LURES) {
      expect(typeof LURE_MODEL_BUILDERS[lure.model]).toBe('function');
    }
  });
});
