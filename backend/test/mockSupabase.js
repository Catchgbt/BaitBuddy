import { vi } from 'vitest';

// Generischer chainbarer Query-Builder-Mock für den Supabase-JS-Client.
// Jede Methode (.select/.eq/.order/.insert/...) gibt sich selbst zurück, damit
// beliebige Aufruf-Ketten funktionieren; `resolveWith`/`rejectWith` legen fest,
// was ein `await` auf die Kette liefert (Supabase-Client-Antworten sind
// thenable, kein echtes Promise-Objekt).
export function createQueryBuilderMock(result = { data: null, error: null }) {
  let pendingResult = result;

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    then: (resolve, reject) => Promise.resolve(pendingResult).then(resolve, reject),
    __setResult(next) {
      pendingResult = next;
      return builder;
    },
  };

  return builder;
}

// Fabrik für einen kompletten `supabase`-Client-Mock. `authUser` steuert, was
// `supabase.auth.getUser(token)` zurückgibt (requireAuth/optionalAuth-Middleware);
// `fromResult` ist der Default für jede `.from(table)`-Kette, überschreibbar
// pro Tabelle über `fromResults`.
export function createSupabaseMock({ authUser = null, authError = null, fromResults = {} } = {}) {
  const builders = {};

  const from = vi.fn((table) => {
    if (!builders[table]) {
      builders[table] = createQueryBuilderMock(fromResults[table] || { data: [], error: null });
    }
    return builders[table];
  });

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authUser },
        error: authError,
      })),
    },
    from,
    __builders: builders,
  };
}
