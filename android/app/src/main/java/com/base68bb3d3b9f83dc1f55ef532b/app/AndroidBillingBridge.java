package com.base68bb3d3b9f83dc1f55ef532b.app;

import android.webkit.JavascriptInterface;

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
