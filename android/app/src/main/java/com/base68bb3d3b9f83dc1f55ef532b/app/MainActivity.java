package com.base68bb3d3b9f83dc1f55ef532b.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private BillingManager billingManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = bridge.getWebView();

        billingManager = new BillingManager(this, (eventName, jsonPayload) -> {
            webView.post(() -> {
                String jsCode = "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: " + jsonPayload + " }))";
                webView.evaluateJavascript(jsCode, null);
            });
        });

        webView.addJavascriptInterface(new AndroidBillingBridge(billingManager), "AndroidBilling");
    }

    @Override
    protected void onDestroy() {
        if (billingManager != null) {
            billingManager.destroy();
        }
        super.onDestroy();
    }
}
