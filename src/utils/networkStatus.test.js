import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockNetwork, listenerCallbacks } = vi.hoisted(() => ({
  mockNetwork: {
    getStatus: vi.fn(),
    addListener: vi.fn(),
  },
  listenerCallbacks: [],
}));

vi.mock('@capacitor/network', () => ({ Network: mockNetwork }));

// Ruft alle beim Plugin registrierten networkStatusChange-Handler auf.
function emitNetworkChange(connected) {
  listenerCallbacks.forEach((cb) => cb({ connected, connectionType: connected ? 'wifi' : 'none' }));
}

describe('networkStatus', () => {
  beforeEach(() => {
    vi.resetModules();
    listenerCallbacks.length = 0;
    mockNetwork.getStatus.mockReset();
    mockNetwork.addListener.mockReset();
    mockNetwork.getStatus.mockResolvedValue({ connected: true, connectionType: 'wifi' });
    mockNetwork.addListener.mockImplementation((event, cb) => {
      listenerCallbacks.push(cb);
      return { remove: vi.fn() };
    });
  });

  it('spiegelt den initialen Plugin-Status in isOnline() wider', async () => {
    mockNetwork.getStatus.mockResolvedValue({ connected: false, connectionType: 'none' });
    const mod = await import('./networkStatus');
    await mod.initNetworkStatus();
    expect(mod.isOnline()).toBe(false);
  });

  it('aktualisiert isOnline() und benachrichtigt Listener bei networkStatusChange', async () => {
    const mod = await import('./networkStatus');
    await mod.initNetworkStatus();
    expect(mod.isOnline()).toBe(true);

    const cb = vi.fn();
    mod.onOnlineStatusChange(cb);

    emitNetworkChange(false);
    expect(mod.isOnline()).toBe(false);
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('benachrichtigt Listener nur bei echtem Statuswechsel, nicht bei Wiederholung', async () => {
    const mod = await import('./networkStatus');
    await mod.initNetworkStatus();

    const cb = vi.fn();
    mod.onOnlineStatusChange(cb);

    emitNetworkChange(true); // bereits online -> kein Wechsel
    expect(cb).not.toHaveBeenCalled();

    emitNetworkChange(false); // echter Wechsel
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('registriert trotz mehrfacher Initialisierung nur einen Plugin-Listener (keine Race-Condition)', async () => {
    const mod = await import('./networkStatus');
    // Auto-Init beim Import + explizite Init + Init ueber Subscription
    await Promise.all([mod.initNetworkStatus(), mod.initNetworkStatus()]);
    mod.onOnlineStatusChange(() => {});
    await mod.initNetworkStatus();

    expect(mockNetwork.addListener).toHaveBeenCalledTimes(1);
  });

  it('entfernt Listener nach unsubscribe', async () => {
    const mod = await import('./networkStatus');
    await mod.initNetworkStatus();

    const cb = vi.fn();
    const unsubscribe = mod.onOnlineStatusChange(cb);
    unsubscribe();

    emitNetworkChange(false);
    expect(cb).not.toHaveBeenCalled();
  });
});
