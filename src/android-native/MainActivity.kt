package de.catchgbt.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var billingManager: BillingManager
    private lateinit var billingBridge: AndroidBillingBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.webViewClient = WebViewClient()

        // Billing initialisieren
        billingManager = BillingManager(this) { eventName, jsonPayload ->
            // Sende JavaScript-Event an die Web-App
            runOnUiThread {
                val js = """
                    window.dispatchEvent(new CustomEvent('$eventName', { detail: $jsonPayload }));
                """.trimIndent()
                webView.evaluateJavascript(js, null)
            }
        }

        // JavaScript-Interface registrieren - exponiert window.AndroidBilling
        billingBridge = AndroidBillingBridge(billingManager)
        webView.addJavascriptInterface(billingBridge, "AndroidBilling")

        // Catchly App laden
        webView.loadUrl("https://app.catchly.de/apps/68bb3d3b9f83dc1f55ef532b/Dashboard")
    }

    override fun onDestroy() {
        billingManager.destroy()
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        billingManager.queryActivePurchases()
    }
}