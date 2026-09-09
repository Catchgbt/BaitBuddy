package app.baitbuddy.mobile;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private BillingManager billingManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 16: Edge-to-Edge Enforcement — WebView muss bis zum Displayrand reichen
        if (Build.VERSION.SDK_INT >= 35) {
            WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        }

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
        // Aktive Kaeufe an die Web-App melden (notifyWeb=true). Damit gleicht
        // die Web-Schicht bei jedem Wiedereinstieg ab, ob ein bezahlter Kauf
        // serverseitig noch gar nicht aktiviert wurde (z. B. weil die App
        // direkt nach der Zahlung geschlossen wurde) oder ob Play das Abo
        // inzwischen verlaengert hat. Ohne die Meldung (vorher notifyWeb=false)
        // verpuffte die Abfrage wirkungslos.
        if (billingManager != null) {
            billingManager.queryActivePurchases(true);
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
