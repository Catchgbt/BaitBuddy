import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PendingCheckoutManager,
  isPermanentActivationError,
} from './pendingCheckoutRecovery';

describe('PendingCheckoutManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('write and read', () => {
    it('should write and read a pending checkout', () => {
      PendingCheckoutManager.write('elite', 'cs_test123');
      const checkout = PendingCheckoutManager.read();

      expect(checkout).toBeDefined();
      expect(checkout.planId).toBe('elite');
      expect(checkout.sessionId).toBe('cs_test123');
      expect(checkout.createdAt).toBeDefined();
    });

    it('should return null when no checkout exists', () => {
      const checkout = PendingCheckoutManager.read();
      expect(checkout).toBeNull();
    });

    it('should return null if checkout data is corrupt', () => {
      localStorage.setItem('bb_pending_checkout', '{invalid json');
      const checkout = PendingCheckoutManager.read();
      expect(checkout).toBeNull();
    });

    it('should return null if checkout is missing required fields', () => {
      localStorage.setItem('bb_pending_checkout', JSON.stringify({ planId: 'elite' }));
      const checkout = PendingCheckoutManager.read();
      expect(checkout).toBeNull();
    });

    it('should clear expired checkouts (older than 7 days)', () => {
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000) - 1;
      localStorage.setItem('bb_pending_checkout', JSON.stringify({
        planId: 'elite',
        sessionId: 'cs_test123',
        createdAt: sevenDaysAgo,
      }));

      const checkout = PendingCheckoutManager.read();
      expect(checkout).toBeNull();
    });
  });

  describe('retry tracking', () => {
    beforeEach(() => {
      PendingCheckoutManager.write('elite', 'cs_test123');
    });

    it('should track retry attempts', () => {
      const error1 = new Error('Network error');
      error1.status = 502;

      PendingCheckoutManager.recordRetryAttempt(error1);
      expect(PendingCheckoutManager.getRetryCount()).toBe(1);

      const error2 = new Error('Server error');
      error2.status = 500;
      PendingCheckoutManager.recordRetryAttempt(error2);
      expect(PendingCheckoutManager.getRetryCount()).toBe(2);
    });

    it('should know when max retries are exceeded', () => {
      // Record max retries (5)
      for (let i = 0; i < 5; i++) {
        const error = new Error('Retry ' + i);
        error.status = 502;
        PendingCheckoutManager.recordRetryAttempt(error);
      }

      expect(PendingCheckoutManager.isMaxRetriesExceeded()).toBe(true);
    });

    it('should not exceed max retries when under limit', () => {
      const error = new Error('Network error');
      error.status = 502;
      PendingCheckoutManager.recordRetryAttempt(error);

      expect(PendingCheckoutManager.isMaxRetriesExceeded()).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      const error = new Error('Network error');
      error.status = 502;

      // No retries yet
      expect(PendingCheckoutManager.getBackoffDelayMs()).toBe(0);

      // 1st retry: 1s ± jitter
      PendingCheckoutManager.recordRetryAttempt(error);
      const delay1 = PendingCheckoutManager.getBackoffDelayMs();
      expect(delay1).toBeGreaterThanOrEqual(900); // 1s * 0.9
      expect(delay1).toBeLessThanOrEqual(1100); // 1s * 1.1

      // 2nd retry: 2s ± jitter
      PendingCheckoutManager.recordRetryAttempt(error);
      const delay2 = PendingCheckoutManager.getBackoffDelayMs();
      expect(delay2).toBeGreaterThanOrEqual(1800); // 2s * 0.9
      expect(delay2).toBeLessThanOrEqual(2200); // 2s * 1.1

      // Backoff should cap at 30s
      for (let i = 2; i < 8; i++) {
        PendingCheckoutManager.recordRetryAttempt(error);
      }
      const maxDelay = PendingCheckoutManager.getBackoffDelayMs();
      expect(maxDelay).toBeLessThanOrEqual(33000); // 30s * 1.1 (jitter)
    });

    it('should return last retry error', () => {
      const error1 = new Error('First error');
      error1.status = 502;
      PendingCheckoutManager.recordRetryAttempt(error1);

      const error2 = new Error('Second error');
      error2.status = 503;
      PendingCheckoutManager.recordRetryAttempt(error2);

      const lastError = PendingCheckoutManager.getLastRetryError();
      expect(lastError).toBeDefined();
      expect(lastError.errorStatus).toBe(503);
      expect(lastError.errorMessage).toBe('Second error');
    });

    it('should keep only last 10 retry attempts', () => {
      const error = new Error('Network error');
      error.status = 502;

      // Record 15 attempts
      for (let i = 0; i < 15; i++) {
        PendingCheckoutManager.recordRetryAttempt(error);
      }

      const history = PendingCheckoutManager.getRetryHistory();
      expect(history.length).toBe(10);
    });

    it('should clear retry history on write', () => {
      const error = new Error('Network error');
      error.status = 502;
      PendingCheckoutManager.recordRetryAttempt(error);

      expect(PendingCheckoutManager.getRetryCount()).toBe(1);

      // Write a new checkout
      PendingCheckoutManager.write('pro', 'cs_new456');
      expect(PendingCheckoutManager.getRetryCount()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear pending checkout and retry history', () => {
      PendingCheckoutManager.write('elite', 'cs_test123');
      const error = new Error('Network error');
      error.status = 502;
      PendingCheckoutManager.recordRetryAttempt(error);

      PendingCheckoutManager.clear();

      expect(PendingCheckoutManager.read()).toBeNull();
      expect(PendingCheckoutManager.getRetryCount()).toBe(0);
    });
  });
});

describe('isPermanentActivationError', () => {
  it('should identify 400 as permanent', () => {
    const error = new Error('Bad Request');
    error.status = 400;
    expect(isPermanentActivationError(error)).toBe(true);
  });

  it('should identify 403 as permanent', () => {
    const error = new Error('Forbidden');
    error.status = 403;
    expect(isPermanentActivationError(error)).toBe(true);
  });

  it('should not identify 402 as permanent', () => {
    const error = new Error('Payment Required');
    error.status = 402;
    expect(isPermanentActivationError(error)).toBe(false);
  });

  it('should not identify 5xx as permanent', () => {
    const error = new Error('Internal Server Error');
    error.status = 500;
    expect(isPermanentActivationError(error)).toBe(false);
  });

  it('should not identify network errors as permanent', () => {
    const error = new Error('Network error');
    expect(isPermanentActivationError(error)).toBe(false);
  });
});
