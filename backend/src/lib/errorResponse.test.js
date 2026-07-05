import { describe, it, expect, vi } from 'vitest';
import { sendDbError } from './errorResponse.js';

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('sendDbError', () => {
  it('gibt eine generische Meldung zurück statt der rohen DB-Fehlermeldung', () => {
    const res = mockRes();
    sendDbError(res, { message: 'column "secret_internal_col" does not exist' });

    expect(res.status).toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).not.toMatch(/secret_internal_col/);
    expect(payload.error).toMatch(/Datenbankfehler/);
  });

  it('erlaubt einen abweichenden Statuscode', () => {
    const res = mockRes();
    sendDbError(res, { message: 'x' }, 503);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
