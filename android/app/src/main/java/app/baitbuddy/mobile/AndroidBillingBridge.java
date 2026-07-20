package app.baitbuddy.mobile;

import android.webkit.JavascriptInterface;

/**
 * JavaScript-Interface, das im WebView als window.AndroidBilling verfuegbar ist.
 * Die Web-App (src/components/premium/googlePlayBilling.jsx) ruft diese Methoden
 * aus dem Web-Kontext auf.
 */
public class AndroidBillingBridge {

    private final BillingManager billingManager;

    public AndroidBillingBridge(BillingManager billingManager) {
        this.billingManager = billingManager;
    }

    @JavascriptInterface
    public void purchase(String productId) {
        billingManager.startPurchase(productId);
    }

    @JavascriptInterface
    public void restorePurchases() {
        billingManager.queryActivePurchases(true);
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return billingManager.isReady();
    }
}
