package app.baitbuddy.mobile;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private BillingManager billingManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        billingManager = new BillingManager(this, (eventName, jsonPayload) -> {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) return;
            // eventName ist immer eine feste Konstante aus BillingManager, der
            // jsonPayload ein von org.json erzeugtes Objekt-Literal (gueltiges JS).
            final String js = "window.dispatchEvent(new CustomEvent('" + eventName
                    + "', { detail: " + jsonPayload + " }));";
            runOnUiThread(() -> webView.evaluateJavascript(js, null));
        });

        // Das JS-Interface muss vor der (asynchronen) Seitenladung registriert
        // sein, damit window.AndroidBilling schon beim ersten Render existiert.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidBillingBridge(billingManager), "AndroidBilling");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (billingManager != null) {
            billingManager.queryActivePurchases(false);
        }
    }

    @Override
    public void onDestroy() {
        if (billingManager != null) {
            billingManager.destroy();
        }
        super.onDestroy();
    }
}
