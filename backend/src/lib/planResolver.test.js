import { describe, expect, it } from 'vitest';
import { resolvePlan } from './planResolver.js';

describe('resolvePlan', () => {
  const now = new Date('2026-09-11T12:00:00.000Z');

  it('ignoriert manipulierbare Premium-Felder aus user_metadata', () => {
    const result = resolvePlan({
      user_metadata: {
        premium_plan_id: 'elite',
        premium_expires_at: '2099-01-01T00:00:00.000Z',
      },
      app_metadata: {},
    }, now);

    expect(result.effectiveId).toBe('free');
    expect(result.isActive).toBe(false);
  });

  it('liest aktive Premium-Pläne aus app_metadata', () => {
    const result = resolvePlan({
      user_metadata: {},
      app_metadata: {
        premium_plan_id: 'elite',
        premium_expires_at: '2026-09-12T12:00:00.000Z',
      },
    }, now);

    expect(result.effectiveId).toBe('elite');
    expect(result.source).toBe('subscription');
    expect(result.remainingHours).toBe(24);
  });

  it('aktiviert 24h-Pass und Trial nur innerhalb ihres Serverzeit-Fensters', () => {
    const pass = resolvePlan({
      app_metadata: {
        premium_pass_started_at: '2026-09-11T10:00:00.000Z',
        premium_pass_expires_at: '2026-09-11T18:00:00.000Z',
      },
    }, now);
    const expiredTrial = resolvePlan({
      app_metadata: {
        trial_used: true,
        trial_started_at: '2026-09-09T12:00:00.000Z',
        trial_expires_at: '2026-09-10T12:00:00.000Z',
      },
    }, now);

    expect(pass.effectiveId).toBe('elite');
    expect(pass.isPass).toBe(true);
    expect(pass.remainingHours).toBe(6);
    expect(expiredTrial.effectiveId).toBe('free');
    expect(expiredTrial.remainingHours).toBeNull();
  });

  it('meldet kostenlose Trials nicht als reguläres Premium-Abo', () => {
    const result = resolvePlan({
      app_metadata: {
        premium_plan_id: 'elite',
        premium_trial: true,
        premium_expires_at: '2026-09-12T12:00:00.000Z',
        trial_started_at: '2026-09-11T12:00:00.000Z',
        trial_expires_at: '2026-09-12T12:00:00.000Z',
        trial_used: true,
      },
    }, now);

    expect(result.effectiveId).toBe('elite');
    expect(result.source).toBe('trial');
    expect(result.isTrial).toBe(true);
    expect(result.isPass).toBe(false);
    expect(result.remainingHours).toBe(24);
  });

  it('priorisiert aktive Tagespaesse vor gleichzeitigen Trial-Fenstern', () => {
    const result = resolvePlan({
      app_metadata: {
        premium_pass_started_at: '2026-09-11T10:00:00.000Z',
        premium_pass_expires_at: '2026-09-11T18:00:00.000Z',
        trial_started_at: '2026-09-11T08:00:00.000Z',
        trial_expires_at: '2026-09-12T08:00:00.000Z',
        trial_used: true,
      },
    }, now);

    expect(result.effectiveId).toBe('elite');
    expect(result.source).toBe('premium_pass');
    expect(result.isPass).toBe(true);
    expect(result.isTrial).toBe(false);
  });
});
