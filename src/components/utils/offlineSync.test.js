import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEntities, mockApi, onlineState } = vi.hoisted(() => ({
  mockEntities: { Catch: { create: vi.fn() } },
  mockApi: { getToken: vi.fn(() => 'test-token') },
  onlineState: { current: true },
}));

vi.mock('@/api/frontendClient', () => ({ entities: mockEntities, api: mockApi }));
vi.mock('@/utils/networkStatus', () => ({
  isOnline: () => onlineState.current,
  onOnlineStatusChange: vi.fn(() => () => {}),
}));

import {
  addToOfflineCatchQueue,
  getOfflineCatchQueue,
  removeFromOfflineCatchQueue,
  clearOfflineCatchQueue,
  syncOfflineCatches,
  createCatchWithOfflineSupport,
  initAutoSync,
  stopAutoSync,
} from './offlineSync';

describe('offlineSync – Catch-Queue', () => {
  beforeEach(() => {
    localStorage.clear();
    onlineState.current = true;
    mockEntities.Catch.create.mockReset();
    mockApi.getToken.mockReturnValue('test-token');
  });

  it('fuegt einen Fang mit Metadaten zur Queue hinzu', () => {
    const entry = addToOfflineCatchQueue({ species: 'Hecht' });
    expect(entry.__id).toMatch(/^offline_/);
    expect(entry.__synced).toBe(false);
    expect(getOfflineCatchQueue()).toHaveLength(1);
  });

  it('entfernt einen Eintrag anhand seiner __id', () => {
    const entry = addToOfflineCatchQueue({ species: 'Zander' });
    removeFromOfflineCatchQueue(entry.__id);
    expect(getOfflineCatchQueue()).toHaveLength(0);
  });

  it('leert die gesamte Queue', () => {
    addToOfflineCatchQueue({ species: 'Barsch' });
    addToOfflineCatchQueue({ species: 'Aal' });
    clearOfflineCatchQueue();
    expect(getOfflineCatchQueue()).toHaveLength(0);
  });

  it('createCatchWithOfflineSupport speichert offline in die Queue statt zu senden', async () => {
    onlineState.current = false;
    const result = await createCatchWithOfflineSupport({ species: 'Karpfen' });
    expect(mockEntities.Catch.create).not.toHaveBeenCalled();
    expect(result.__id).toMatch(/^offline_/);
    expect(getOfflineCatchQueue()).toHaveLength(1);
  });

  it('createCatchWithOfflineSupport sendet direkt, wenn online', async () => {
    onlineState.current = true;
    mockEntities.Catch.create.mockResolvedValue({ id: 'server-1' });
    const result = await createCatchWithOfflineSupport({ species: 'Karpfen' });
    expect(mockEntities.Catch.create).toHaveBeenCalledWith({ species: 'Karpfen' });
    expect(result).toEqual({ id: 'server-1' });
  });

  it('syncOfflineCatches synchronisiert erfolgreich und entfernt aus der Queue', async () => {
    addToOfflineCatchQueue({ species: 'Hecht' });
    mockEntities.Catch.create.mockResolvedValue({ id: 'server-1' });

    const result = await syncOfflineCatches();

    expect(result).toEqual({ synced: 1, failed: 0, errors: [] });
    expect(getOfflineCatchQueue()).toHaveLength(0);
  });

  it('syncOfflineCatches behaelt fehlgeschlagene Eintraege in der Queue', async () => {
    addToOfflineCatchQueue({ species: 'Hecht' });
    mockEntities.Catch.create.mockRejectedValue(new Error('Netzwerkfehler'));

    const result = await syncOfflineCatches();

    expect(result.synced).toBe(0);
    expect(result.failed).toBe(1);
    expect(getOfflineCatchQueue()).toHaveLength(1);
  });

  it('syncOfflineCatches synchronisiert nicht, wenn offline', async () => {
    onlineState.current = false;
    addToOfflineCatchQueue({ species: 'Hecht' });

    const result = await syncOfflineCatches();

    expect(result).toEqual({ synced: 0, failed: 0, errors: [] });
    expect(mockEntities.Catch.create).not.toHaveBeenCalled();
    expect(getOfflineCatchQueue()).toHaveLength(1);
  });

  it('syncOfflineCatches synchronisiert nicht ohne Auth-Token', async () => {
    mockApi.getToken.mockReturnValue(null);
    addToOfflineCatchQueue({ species: 'Hecht' });

    const result = await syncOfflineCatches();

    expect(result).toEqual({ synced: 0, failed: 0, errors: [] });
    expect(mockEntities.Catch.create).not.toHaveBeenCalled();
    expect(getOfflineCatchQueue()).toHaveLength(1);
  });

  it('addToOfflineCatchQueue wirft, wenn die Queue voll ist (Cap)', () => {
    for (let i = 0; i < 200; i++) {
      addToOfflineCatchQueue({ species: `Fisch-${i}` });
    }
    expect(getOfflineCatchQueue()).toHaveLength(200);
    expect(() => addToOfflineCatchQueue({ species: 'Ueberlaeufer' })).toThrow(/voll/);
    expect(getOfflineCatchQueue()).toHaveLength(200);
  });
});

describe('offlineSync – initAutoSync / plan-updated', () => {
  beforeEach(() => {
    localStorage.clear();
    onlineState.current = false;
    mockEntities.Catch.create.mockReset();
    mockApi.getToken.mockReturnValue('test-token');
    stopAutoSync();
  });

  it('synchronisiert nach einem plan-updated-Event (Login)', async () => {
    addToOfflineCatchQueue({ species: 'Hecht' });
    mockEntities.Catch.create.mockResolvedValue({ id: 'server-1' });

    initAutoSync();
    onlineState.current = true;
    window.dispatchEvent(new Event('plan-updated'));
    await new Promise((r) => setTimeout(r, 0));

    expect(mockEntities.Catch.create).toHaveBeenCalled();
    stopAutoSync();
  });
});
