import { describe, it, expect, vi, beforeEach } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { current: null } }));
vi.mock('./supabase.js', () => ({
  get supabase() { return supabaseMock.current; },
}));

function makeSupabaseMock({ deleteError = null, authDeleteError = null } = {}) {
  const deleteCalls = [];
  const builder = {
    delete: vi.fn(() => builder),
    eq: vi.fn((column, value) => {
      deleteCalls.push({ column, value });
      return Promise.resolve({ error: deleteError, count: deleteError ? null : 1 });
    }),
  };
  return {
    from: vi.fn(() => builder),
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ error: authDeleteError })),
      },
    },
    __deleteCalls: deleteCalls,
  };
}

let deleteUserAccount;

beforeEach(async () => {
  vi.resetModules();
  ({ deleteUserAccount } = await import('./accountDeletion.js'));
});

describe('deleteUserAccount', () => {
  it('loescht ueber alle bekannten Tabellen und dann den Auth-User', async () => {
    supabaseMock.current = makeSupabaseMock();

    const result = await deleteUserAccount({ userId: 'user-uuid-1', email: 'angler@baitbuddy.test' });

    expect(result.success).toBe(true);
    expect(result.authUserDeleted).toBe(true);
    expect(supabaseMock.current.auth.admin.deleteUser).toHaveBeenCalledWith('user-uuid-1');
    // Stichprobe: sowohl user_id- als auch email-basierte Spalten wurden probiert
    const columns = supabaseMock.current.__deleteCalls.map(c => c.column);
    expect(columns).toContain('user_id');
    expect(columns).toContain('created_by');
  });

  it('meldet authUserDeleted=false, wenn das Loeschen des Auth-Users fehlschlaegt', async () => {
    supabaseMock.current = makeSupabaseMock({ authDeleteError: { message: 'admin api down' } });

    const result = await deleteUserAccount({ userId: 'user-uuid-1', email: 'angler@baitbuddy.test' });

    expect(result.authUserDeleted).toBe(false);
    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.includes('admin api down'))).toBe(true);
  });

  it('sammelt Tabellenfehler als Warnungen, bricht aber nicht ab', async () => {
    supabaseMock.current = makeSupabaseMock({ deleteError: { message: 'permission denied' } });

    const result = await deleteUserAccount({ userId: 'user-uuid-1', email: 'angler@baitbuddy.test' });

    expect(result.authUserDeleted).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(supabaseMock.current.auth.admin.deleteUser).toHaveBeenCalled();
  });
});
