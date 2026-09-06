import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  needsOrientationPermission,
  requestOrientationPermission,
  orientationEventName,
  headingFromOrientationEvent,
} from './deviceOrientation';

const originalDOE = globalThis.DeviceOrientationEvent;

function installIos(requestPermission) {
  function DOE() {}
  DOE.requestPermission = requestPermission;
  globalThis.DeviceOrientationEvent = DOE;
}

function installAndroid() {
  function DOE() {}
  globalThis.DeviceOrientationEvent = DOE;
}

afterEach(() => {
  if (originalDOE === undefined) delete globalThis.DeviceOrientationEvent;
  else globalThis.DeviceOrientationEvent = originalDOE;
  delete window.ondeviceorientationabsolute;
});

describe('needsOrientationPermission', () => {
  it('erkennt iOS 13+ an der statischen requestPermission-Methode', () => {
    installIos(vi.fn());
    expect(needsOrientationPermission()).toBe(true);
  });

  it('ist auf Android/Desktop false', () => {
    installAndroid();
    expect(needsOrientationPermission()).toBe(false);
  });

  it('ist ohne DeviceOrientationEvent false', () => {
    delete globalThis.DeviceOrientationEvent;
    expect(needsOrientationPermission()).toBe(false);
  });
});

describe('requestOrientationPermission', () => {
  it('liefert granted, wenn iOS zustimmt', async () => {
    installIos(vi.fn(async () => 'granted'));
    expect(await requestOrientationPermission()).toBe('granted');
  });

  it('liefert denied, wenn iOS ablehnt', async () => {
    installIos(vi.fn(async () => 'denied'));
    expect(await requestOrientationPermission()).toBe('denied');
  });

  it('liefert denied, wenn der Aufruf ausserhalb einer Nutzer-Geste wirft', async () => {
    installIos(vi.fn(async () => { throw new Error('NotAllowedError'); }));
    expect(await requestOrientationPermission()).toBe('denied');
  });

  it('liefert not-required auf Plattformen ohne Freigabe-Zwang', async () => {
    installAndroid();
    expect(await requestOrientationPermission()).toBe('not-required');
  });

  it('liefert unsupported ohne DeviceOrientationEvent', async () => {
    delete globalThis.DeviceOrientationEvent;
    expect(await requestOrientationPermission()).toBe('unsupported');
  });
});

describe('orientationEventName', () => {
  it('bevorzugt deviceorientationabsolute, wo vorhanden (Android)', () => {
    window.ondeviceorientationabsolute = null;
    expect(orientationEventName()).toBe('deviceorientationabsolute');
  });

  it('faellt auf deviceorientation zurueck (iOS kennt das absolute Event nicht)', () => {
    expect(orientationEventName()).toBe('deviceorientation');
  });
});

describe('headingFromOrientationEvent', () => {
  it('nutzt auf iOS webkitCompassHeading und rechnet in die alpha-Konvention um', () => {
    // 90 Grad im Uhrzeigersinn ab Nord (Osten) => 270 in alpha-Konvention
    expect(headingFromOrientationEvent({ webkitCompassHeading: 90, alpha: 12 })).toBe(270);
    expect(headingFromOrientationEvent({ webkitCompassHeading: 0, alpha: 12 })).toBe(0);
    expect(headingFromOrientationEvent({ webkitCompassHeading: 359 })).toBe(1);
  });

  it('nutzt alpha, wenn keine Kompassrichtung mitkommt (Android)', () => {
    expect(headingFromOrientationEvent({ alpha: 123.5 })).toBeCloseTo(123.5);
  });

  it('normalisiert alpha in den Bereich 0..360', () => {
    expect(headingFromOrientationEvent({ alpha: -90 })).toBe(270);
    expect(headingFromOrientationEvent({ alpha: 450 })).toBe(90);
  });

  it('liefert null, wenn das Event keine Richtung enthaelt', () => {
    expect(headingFromOrientationEvent({ alpha: null })).toBeNull();
    expect(headingFromOrientationEvent({})).toBeNull();
    expect(headingFromOrientationEvent(null)).toBeNull();
    expect(headingFromOrientationEvent({ webkitCompassHeading: NaN, alpha: null })).toBeNull();
  });
});
