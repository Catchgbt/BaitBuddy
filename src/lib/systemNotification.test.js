import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showSystemNotification } from './systemNotification';

const ctorSpy = vi.fn();

class MockNotification {
  constructor(title, options) {
    ctorSpy(title, options);
    this.title = title;
    this.options = options;
    this.onclick = null;
  }
  close() { this.closed = true; }
}

function installNotificationApi() {
  MockNotification.permission = 'granted';
  globalThis.Notification = MockNotification;
}

// Android/iOS verhalten sich so: der Konstruktor ist gar nicht aufrufbar.
function installIllegalConstructor() {
  function Illegal() {
    throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
  }
  Illegal.permission = 'granted';
  globalThis.Notification = Illegal;
}

function installServiceWorker(registration) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration: vi.fn(async () => registration) },
    configurable: true,
    writable: true,
  });
}

function removeServiceWorker() {
  if ('serviceWorker' in navigator) delete navigator.serviceWorker;
}

beforeEach(() => {
  ctorSpy.mockReset();
  removeServiceWorker();
});

afterEach(() => {
  delete globalThis.Notification;
  removeServiceWorker();
  vi.restoreAllMocks();
});

describe('showSystemNotification', () => {
  it('nutzt die Service-Worker-Registrierung, wenn eine vorhanden ist', async () => {
    installNotificationApi();
    const showNotification = vi.fn(async () => {});
    installServiceWorker({ showNotification, getNotifications: vi.fn(async () => []) });

    const handle = await showSystemNotification('Fang gespeichert', {
      body: 'Hecht, 82 cm',
      tag: 'catch-logged',
      url: '/Logbook',
    });

    expect(handle?.via).toBe('serviceworker');
    expect(showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = showNotification.mock.calls[0];
    expect(title).toBe('Fang gespeichert');
    expect(options.tag).toBe('catch-logged');
    // Die Ziel-Route reist in data mit — der Klick wird im SW behandelt.
    expect(options.data).toEqual({ url: '/Logbook' });
    expect(options.url).toBeUndefined();
    // Der Konstruktor darf auf diesem Weg gar nicht erst angefasst werden.
    expect(ctorSpy).not.toHaveBeenCalled();
  });

  it('funktioniert auch dann, wenn der Konstruktor wie auf Android wirft', async () => {
    installIllegalConstructor();
    const showNotification = vi.fn(async () => {});
    installServiceWorker({ showNotification, getNotifications: vi.fn(async () => []) });

    const handle = await showSystemNotification('Trip aktiv', { tag: 'trip-activated' });

    expect(handle?.via).toBe('serviceworker');
    expect(showNotification).toHaveBeenCalledTimes(1);
  });

  it('faellt ohne Service Worker auf den Konstruktor zurueck (Desktop)', async () => {
    installNotificationApi();

    const handle = await showSystemNotification('Spot gespeichert', {
      body: 'Alter Hafen',
      tag: 'spot-created',
      url: '/Map',
    });

    expect(handle?.via).toBe('constructor');
    expect(ctorSpy).toHaveBeenCalledTimes(1);
    const [, options] = ctorSpy.mock.calls[0];
    expect(options.data).toEqual({ url: '/Map' });
  });

  it('schliesst SW-Benachrichtigungen ueber den Tag', async () => {
    installNotificationApi();
    const openNotification = { close: vi.fn() };
    const getNotifications = vi.fn(async () => [openNotification]);
    installServiceWorker({ showNotification: vi.fn(async () => {}), getNotifications });

    const handle = await showSystemNotification('Event erstellt', { tag: 'event-created' });
    handle.close();
    await vi.waitFor(() => expect(openNotification.close).toHaveBeenCalled());
    expect(getNotifications).toHaveBeenCalledWith({ tag: 'event-created' });
  });

  it('liefert null, wenn die Notification-API komplett fehlt', async () => {
    delete globalThis.Notification;
    expect(await showSystemNotification('Egal')).toBeNull();
  });

  it('eskaliert einen Fehler des Service Workers nicht', async () => {
    installNotificationApi();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    installServiceWorker({
      showNotification: vi.fn(async () => { throw new Error('SW nicht bereit'); }),
      getNotifications: vi.fn(async () => []),
    });

    expect(await showSystemNotification('Trip gespeichert')).toBeNull();
  });

  it('ignoriert eine kaputte getRegistration-Implementierung', async () => {
    installNotificationApi();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn(async () => { throw new Error('kaputt'); }) },
      configurable: true,
      writable: true,
    });

    const handle = await showSystemNotification('Ausrüstung ergänzt', { tag: 'gear-added' });
    expect(handle?.via).toBe('constructor');
  });
});
