package de.catchgbt.app

import android.webkit.JavascriptInterface

/**
 * JavaScript-Interface, das im WebView als window.AndroidBilling verfuegbar ist.
 * Methoden werden aus dem Web-Kontext aufgerufen.
 */
class AndroidBillingBridge(private val billingManager: BillingManager) {

    @JavascriptInterface
    fun purchase(productId: String) {
        billingManager.startPurchase(productId)
    }

    @JavascriptInterface
    fun restorePurchases() {
        billingManager.queryActivePurchases(notifyWeb = true)
    }

    @JavascriptInterface
    fun isAvailable(): Boolean {
        return billingManager.isReady()
    }
}