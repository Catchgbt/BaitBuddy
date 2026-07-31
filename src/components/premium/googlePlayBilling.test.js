import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { functionsMock, apiMock } = vi.hoisted(() => ({
  functionsMock: { invoke: vi.fn() },
  apiMock: { getToken: vi.fn(() => 'bb-token') },
}));

vi.mock('@/api/frontendClient', () => ({
  functions: functionsMock,
  api: apiMock,
}));

const { pickBestPurchase, getPlanIdFromProductId } = await import('./googlePlayBilling');

// Der Abgleich haelt Zustand auf Modulebene (Listener-Flag, Throttle). Jeder
// Test bekommt deshalb eine frische Modul-Instanz, sonst wuerde der Throttle
// aus dem vorherigen Test das Ergebnis verfaelschen.
async function freshReconciliation() {
  vi.resetModules();
  const mod = await import('./googlePlayBilling');
  return mod.startGooglePlayReconciliation;
}

function emitRestored(purchases) {
  window.dispatchEvent(new CustomEvent('play-billing-restored', { detail: { purchases } }));
}

// Wartet, bis die asynchronen Aktivierungs-Aufrufe des Listeners durch sind.
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('pickBestPurchase', () => {
  it('waehlt den hoechstwertigen Plan aus mehreren Kaeufen', () => {
    const best = pickBestPurchase([
      { productId: 'baitbuddy_basic_monthly', purchaseToken: 't1' },
      { productId: 'baitbuddy_friends_yearly', purchaseToken: 't2' },
      { productId: 'baitbuddy_pro_monthly', purchaseToken: 't3' },
    ]);

    expect(best.planId).toBe('friends');
    expect(best.purchase.purchaseToken).toBe('t2');
  });

  it('ignoriert unbekannte Produkte und Eintraege ohne Token', () => {
    expect(pickBestPurchase([{ productId: 'irgendwas_anderes', purchaseToken: 't1' }])).toBeNull();
    expect(pickBestPurchase([{ productId: 'baitbuddy_pro_monthly' }])).toBeNull();
    expect(pickBestPurchase([])).toBeNull();
    expect(pickBestPurchase(undefined)).toBeNull();
  });

  it('ordnet das 10-Tage-Produkt dem Trial-Plan zu', () => {
    expect(getPlanIdFromProductId('baitbuddy_trial_10_10')).toBe('trial_10_10');
  });
});

describe('startGooglePlayReconciliation', () => {
  let stop = () => {};

  beforeEach(() => {
    functionsMock.invoke.mockReset();
    apiMock.getToken.mockReturnValue('bb-token');
    window.AndroidBilling = {
      purchase: vi.fn(),
      restorePurchases: vi.fn(),
    };
  });

  afterEach(() => {
    stop();
    stop = () => {};
    delete window.AndroidBilling;
  });

  it('ist ein No-op ohne Google-Play-Bridge (Browser)', async () => {
    delete window.AndroidBilling;
    stop = (await freshReconciliation())();

    emitRestored([{ productId: 'baitbuddy_pro_monthly', purchaseToken: 't1' }]);
    expect(functionsMock.invoke).not.toHaveBeenCalled();
  });

  it('fragt aktive Kaeufe beim Start ab', async () => {
    stop = (await freshReconciliation())();
    expect(window.AndroidBilling.restorePurchases).toHaveBeenCalled();
  });

  it('fragt ohne Sitzung nicht ab (die Aktivierung waere nur ein 401)', async () => {
    apiMock.getToken.mockReturnValue(null);
    stop = (await freshReconciliation())();
    expect(window.AndroidBilling.restorePurchases).not.toHaveBeenCalled();
  });

  it('aktiviert einen bezahlten, aber noch nicht freigeschalteten Kauf nach', async () => {
    functionsMock.invoke.mockResolvedValue({ ok: true, updated: true });
    const planUpdated = vi.fn();
    window.addEventListener('plan-updated', planUpdated);

    stop = (await freshReconciliation())();
    emitRestored([{ productId: 'baitbuddy_ultimate_monthly', purchaseToken: 'tok-1', orderId: 'GPA.1' }]);
    await flush();

    expect(functionsMock.invoke).toHaveBeenCalledWith('activatePlan', {
      plan_id: 'ultimate',
      payment_method: 'google_play',
      transaction_id: 'GPA.1',
      purchase_token: 'tok-1',
      product_id: 'baitbuddy_ultimate_monthly',
    });
    expect(planUpdated).toHaveBeenCalled();
    window.removeEventListener('plan-updated', planUpdated);
  });

  it('loest keinen Plan-Reload aus, wenn der Server nichts geaendert hat', async () => {
    functionsMock.invoke.mockResolvedValue({ ok: true, updated: false });
    const planUpdated = vi.fn();
    window.addEventListener('plan-updated', planUpdated);

    stop = (await freshReconciliation())();
    emitRestored([{ productId: 'baitbuddy_pro_monthly', purchaseToken: 'tok-2' }]);
    await flush();

    expect(functionsMock.invoke).toHaveBeenCalled();
    expect(planUpdated).not.toHaveBeenCalled();
    window.removeEventListener('plan-updated', planUpdated);
  });

  it('schluckt Fehler beim stillen Abgleich', async () => {
    functionsMock.invoke.mockRejectedValue(new Error('Netzwerkfehler'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    stop = (await freshReconciliation())();
    emitRestored([{ productId: 'baitbuddy_basic_monthly', purchaseToken: 'tok-3' }]);
    await flush();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reagiert nach dem Stoppen nicht mehr auf Kauf-Meldungen', async () => {
    functionsMock.invoke.mockResolvedValue({ ok: true, updated: true });
    stop = (await freshReconciliation())();
    stop();
    stop = () => {};

    emitRestored([{ productId: 'baitbuddy_pro_monthly', purchaseToken: 'tok-4' }]);
    await flush();

    expect(functionsMock.invoke).not.toHaveBeenCalled();
  });
});
