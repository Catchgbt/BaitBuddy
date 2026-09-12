import { describe, expect, it } from 'vitest';
import { resolveToolAccess } from './entitlementResolver.js';

describe('resolveToolAccess', () => {
  it('grants Premium immediately without a permanent unlock', () => {
    expect(resolveToolAccess({ premiumActive: true, permanentUnlock: false }))
      .toMatchObject({ allowed: true, entitled: true, source: 'premium' });
  });

  it('keeps a level unlock permanent but applies its monthly cloud quota', () => {
    const access = resolveToolAccess({
      premiumActive: false,
      permanentUnlock: true,
      unlockType: 'level',
      monthlyLimit: 20,
      monthlyUsed: 19,
    });
    expect(access).toMatchObject({ allowed: true, source: 'level' });
    expect(access.quota.remaining).toBe(1);
  });

  it('does not turn permanent ownership into unlimited paid usage', () => {
    expect(resolveToolAccess({
      premiumActive: false,
      permanentUnlock: true,
      unlockType: 'purchase',
      monthlyLimit: 20,
      monthlyUsed: 20,
    })).toMatchObject({ allowed: false, entitled: true, source: 'purchase' });
  });

  it('fails closed when neither Premium nor a permanent unlock exists', () => {
    expect(resolveToolAccess({ premiumActive: false, permanentUnlock: false }))
      .toMatchObject({ allowed: false, entitled: false, source: null });
  });
});
