import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEntities, mockApi, onlineState, mockPhotoStorage } = vi.hoisted(() => ({
  mockEntities: { Catch: { create: vi.fn() } },
  mockApi: { getToken: vi.fn(() => 'test-token'), post: vi.fn() },
  onlineState: { current: true },
  mockPhotoStorage: {
    getUnsyncdOfflinePhotos: vi.fn(async () => []),
    markPhotoAsSynced: vi.fn(async () => {}),
    markPhotoSyncError: vi.fn(async () => {}),
    cleanupSyncedPhotos: vi.fn(async () => {}),
  },
}));

vi.mock('@/api/frontendClient', () => ({ entities: mockEntities, api: mockApi }));
vi.mock('@/utils/networkStatus', () => ({
  isOnline: () => onlineState.current,
  onOnlineStatusChange: vi.fn(() => () => {}),
}));
vi.mock('@/utils/offlinePhotoStorage', () => mockPhotoStorage);

import {
  addToOfflineCatchQueue,
  getOfflineCatchQueue,
  removeFromOfflineCatchQueue,
  clearOfflineCatchQueue,
  syncOfflineCatches,
  syncOfflinePhotos,
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

describe('offlineSync – Foto-Sync', () => {
  const photo = () => ({
    id: 7,
    fileName: 'fang.jpg',
    mimeType: 'image/jpeg',
    // "abc" als ArrayBuffer — btoa('abc') === 'YWJj'
    fileData: new Uint8Array([97, 98, 99]).buffer,
    synced: false,
  });

  beforeEach(() => {
    onlineState.current = true;
    mockApi.getToken.mockReturnValue('test-token');
    mockApi.post.mockReset();
    mockPhotoStorage.getUnsyncdOfflinePhotos.mockReset().mockResolvedValue([]);
    mockPhotoStorage.markPhotoAsSynced.mockClear();
    mockPhotoStorage.markPhotoSyncError.mockClear();
    mockPhotoStorage.cleanupSyncedPhotos.mockClear();
  });

  it('laedt Fotos als Base64 auf /api/files/upload hoch und markiert sie als gesynct', async () => {
    mockPhotoStorage.getUnsyncdOfflinePhotos.mockResolvedValue([photo()]);
    mockApi.post.mockResolvedValue({ file_url: 'https://storage/fang.jpg' });

    const result = await syncOfflinePhotos();

    expect(mockApi.post).toHaveBeenCalledWith('/api/files/upload', {
      file_base64: 'YWJj',
      file_name: 'fang.jpg',
      file_type: 'image/jpeg',
    });
    expect(mockPhotoStorage.markPhotoAsSynced).toHaveBeenCalledWith(7);
    expect(mockPhotoStorage.cleanupSyncedPhotos).toHaveBeenCalled();
    expect(result).toEqual({ synced: 1, failed: 0, errors: [] });
  });

  it('entfernt Pfadanteile aus dem Dateinamen (Backend-Path-Traversal-Schutz)', async () => {
    mockPhotoStorage.getUnsyncdOfflinePhotos.mockResolvedValue([
      { ...photo(), fileName: '../evil/fang.jpg' },
    ]);
    mockApi.post.mockResolvedValue({ file_url: 'https://storage/fang.jpg' });

    await syncOfflinePhotos();

    expect(mockApi.post.mock.calls[0][1].file_name).toBe('fang.jpg');
  });

  it('markiert Fotos mit Fehler, wenn der Upload fehlschlaegt', async () => {
    mockPhotoStorage.getUnsyncdOfflinePhotos.mockResolvedValue([photo()]);
    mockApi.post.mockRejectedValue(new Error('HTTP 500'));

    const result = await syncOfflinePhotos();

    expect(mockPhotoStorage.markPhotoAsSynced).not.toHaveBeenCalled();
    expect(mockPhotoStorage.markPhotoSyncError).toHaveBeenCalledWith(7, 'HTTP 500');
    expect(result.failed).toBe(1);
  });

  it('synchronisiert nicht ohne Auth-Token', async () => {
    mockApi.getToken.mockReturnValue(null);
    mockPhotoStorage.getUnsyncdOfflinePhotos.mockResolvedValue([photo()]);

    const result = await syncOfflinePhotos();

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(result).toEqual({ synced: 0, failed: 0, errors: [] });
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
