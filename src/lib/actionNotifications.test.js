import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  notifyAction,
  isActionNotificationsEnabled,
  setActionNotificationsEnabled,
  ensurePermission,
  getPermissionState,
  actionMessages,
  NOTIFICATION_STORAGE_KEYS,
} from "./actionNotifications";

const NotificationCtor = vi.fn();

class MockNotification {
  constructor(title, options) {
    NotificationCtor(title, options);
    this.title = title;
    this.options = options;
    this.onclick = null;
  }
  close() {}
}

function installNotification(permission = "granted") {
  MockNotification.permission = permission;
  MockNotification.requestPermission = vi.fn(async () => permission);
  globalThis.Notification = MockNotification;
  return MockNotification;
}

beforeEach(() => {
  NotificationCtor.mockReset();
  localStorage.clear();
});

afterEach(() => {
  delete globalThis.Notification;
  if ('serviceWorker' in navigator) delete navigator.serviceWorker;
});

describe("actionNotifications helper", () => {
  it("kennt eine sinnvolle Default-Einstellung", () => {
    expect(isActionNotificationsEnabled()).toBe(true);
    setActionNotificationsEnabled(false);
    expect(isActionNotificationsEnabled()).toBe(false);
    setActionNotificationsEnabled(true);
    expect(isActionNotificationsEnabled()).toBe(true);
  });

  it("sendet keine Notification wenn User sie deaktiviert hat", async () => {
    installNotification("granted");
    setActionNotificationsEnabled(false);
    const result = await notifyAction("Trip gespeichert", { body: "…" });
    expect(result).toBeNull();
    expect(NotificationCtor).not.toHaveBeenCalled();
  });

  it("sendet Notification wenn Permission erteilt und Feature aktiv ist", async () => {
    installNotification("granted");
    const result = await notifyAction("Trip gespeichert", {
      body: "„Barsch-Trip" + '"' + " ist bereit.",
      tag: "trip-created",
      url: "/TripPlanner",
    });
    expect(result).not.toBeNull();
    expect(NotificationCtor).toHaveBeenCalledTimes(1);
    const [title, opts] = NotificationCtor.mock.calls[0];
    expect(title).toBe("Trip gespeichert");
    expect(opts.tag).toBe("trip-created");
    expect(opts.icon).toBe("/icons/icon-192.png");
  });

  it("stellt auf Android/iOS ueber den Service Worker zu, nicht ueber den Konstruktor", async () => {
    installNotification("granted");
    const showNotification = vi.fn(async () => {});
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        getRegistration: vi.fn(async () => ({
          showNotification,
          getNotifications: vi.fn(async () => []),
        })),
      },
      configurable: true,
      writable: true,
    });

    const result = await notifyAction("Fang gespeichert", {
      body: "Hecht, 82 cm",
      tag: "catch-logged",
      url: "/Logbook",
    });

    expect(result?.via).toBe("serviceworker");
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(NotificationCtor).not.toHaveBeenCalled();
    expect(showNotification.mock.calls[0][1].data).toEqual({ url: "/Logbook" });
  });

  it("dedupliziert doppelte Aufrufe mit demselben Tag innerhalb des Fensters", async () => {
    installNotification("granted");
    await notifyAction("A", { tag: "same" });
    await notifyAction("A", { tag: "same" });
    expect(NotificationCtor).toHaveBeenCalledTimes(1);
  });

  it("fragt Permission nur einmal automatisch, wenn abgelehnt bleibt es dabei", async () => {
    const N = installNotification("default");
    N.requestPermission = vi.fn(async () => "denied");
    N.permission = "default";

    const first = await notifyAction("A", { tag: "trip-1" });
    expect(first).toBeNull();
    expect(N.requestPermission).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(NOTIFICATION_STORAGE_KEYS.prompted)).toBe("1");

    // Zweiter Call soll ohne force NICHT erneut fragen
    const second = await notifyAction("B", { tag: "trip-2" });
    expect(second).toBeNull();
    expect(N.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("meldet 'unsupported' wenn die Notification-API fehlt", () => {
    delete globalThis.Notification;
    expect(getPermissionState()).toBe("unsupported");
  });

  it("ensurePermission({force:true}) fragt trotz gemerktem 'prompted' erneut", async () => {
    const N = installNotification("default");
    N.requestPermission = vi.fn(async () => "granted");
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.prompted, "1");
    const result = await ensurePermission({ force: true });
    expect(result).toBe("granted");
    expect(N.requestPermission).toHaveBeenCalled();
  });

  it("actionMessages liefern strukturierte Texte für die Aufrufsites", () => {
    const trip = actionMessages.tripCreated("Herbst-Karpfen");
    expect(trip.title).toBe("Trip gespeichert");
    expect(trip.body).toContain("Herbst-Karpfen");
    expect(trip.tag).toBe("trip-created");
    expect(trip.url).toBe("/TripPlanner");

    const alerts = actionMessages.weatherAlertsSaved();
    expect(alerts.title).toBe("Wetter-Alarme aktualisiert");

    const empty = actionMessages.catchLogged();
    expect(empty.title).toBe("Fang gespeichert");
    expect(empty.body).toBeDefined();
  });
});
