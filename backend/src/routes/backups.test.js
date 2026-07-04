import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const TEST_USER = { id: 'user-1', email: 'angler@baitbuddy.test' };

// Bespoke Mock statt des generischen createSupabaseMock-Helfers: der Test
// muss unterscheiden koennen, ob .delete() auf catches/spots/water_scenes
// aufgerufen wurde, BEVOR bzw. NACHDEM das Sicherheits-Backup fehlgeschlagen
// ist — das braucht pro Tabelle eigene, unabhaengig konfigurierbare Mocks.
const { state } = vi.hoisted(() => ({
  state: {
    backupRow: null,
    safetyBackupShouldFail: false,
    deleteCalls: [],
  },
}));

function makeTableBuilder(table) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn((rows) => {
      if (table === 'user_backups' && Array.isArray(rows) === false && state.safetyBackupShouldFail) {
        builder.__result = { data: null, error: { message: 'insert fehlgeschlagen' } };
      } else {
        builder.__result = { data: null, error: null, count: Array.isArray(rows) ? rows.length : 1 };
      }
      return builder;
    }),
    delete: vi.fn(() => {
      state.deleteCalls.push(table);
      builder.__result = { data: null, error: null };
      return builder;
    }),
    eq: vi.fn(() => builder),
    single: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(
      builder.__result ?? { data: table === 'user_backups' ? state.backupRow : [], error: null }
    ).then(resolve, reject),
  };
  return builder;
}

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: TEST_USER }, error: null })) },
    from: vi.fn((table) => makeTableBuilder(table)),
  },
}));

let app;

beforeEach(async () => {
  vi.resetModules();
  state.backupRow = { payload: { data: { catches: [{ species: 'Hecht' }], spots: [], water_scenes: [] } } };
  state.safetyBackupShouldFail = false;
  state.deleteCalls = [];
  ({ default: app } = await import('../server.js'));
});

describe('POST /api/backups/:id/restore (mode=replace)', () => {
  it('loescht KEINE Tabellen, wenn das Sicherheits-Backup vorab fehlschlaegt', async () => {
    state.safetyBackupShouldFail = true;

    const res = await request(app)
      .post('/api/backups/backup-1/restore')
      .set('Authorization', 'Bearer test-token')
      .send({ mode: 'replace', tables: ['catches'] });

    expect(res.status).toBe(500);
    expect(state.deleteCalls).toEqual([]);
  });

  it('loescht und stellt wieder her, wenn das Sicherheits-Backup gelingt', async () => {
    state.safetyBackupShouldFail = false;

    const res = await request(app)
      .post('/api/backups/backup-1/restore')
      .set('Authorization', 'Bearer test-token')
      .send({ mode: 'replace', tables: ['catches'] });

    expect(res.status).toBe(200);
    expect(state.deleteCalls).toEqual(['catches']);
    expect(res.body.results.catches.ok).toBe(true);
  });
});
