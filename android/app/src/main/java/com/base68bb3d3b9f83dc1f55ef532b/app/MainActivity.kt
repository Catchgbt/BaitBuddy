package com.base68bb3d3b9f83dc1f55ef532b.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    private var billingManager: BillingManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val webView = bridge.webView

        billingManager = BillingManager(this) { eventName, jsonPayload ->
            webView.post {
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('$eventName', { detail: $jsonPayload }))",
                    null
                )
            }
        }

        webView.addJavascriptInterface(AndroidBillingBridge(billingManager!!), "AndroidBilling")
    }

    override fun onDestroy() {
        billingManager?.destroy()
        super.onDestroy()
    }
}
