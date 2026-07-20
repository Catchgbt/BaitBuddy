package com.base68bb3d3b9f83dc1f55ef532b.app

import android.webkit.JavascriptInterface

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
