package app.baitbuddy.mobile;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private GooglePlayBillingBridge billingBridge;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Google Play Billing Bridge initialisieren
    billingBridge = new GooglePlayBillingBridge(this, this.bridge);
    billingBridge.initialize();

    // WebView konfigurieren — einmalig nach Bridge-Erstellung
    WebView webView = bridge.getWebView();
    if (webView != null) {
      setupAndroidBillingAPI(webView);
    }
  }

  @Override
  protected void onDestroy() {
    if (billingBridge != null) {
      billingBridge.teardown();
    }
    super.onDestroy();
  }

  /**
   * Inject die `window.AndroidBilling` Schnittstelle ins WebView.
   * Das Frontend ruft z.B. `window.AndroidBilling.purchase('catchgbt_pro_monthly')`
   * auf, und die Bridge startet den Kauf-Flow.
   */
  private void setupAndroidBillingAPI(WebView webView) {
    webView.addJavascriptInterface(
      new Object() {
        public void purchase(String productId) {
          billingBridge.purchase(productId);
        }

        public void restorePurchases() {
          billingBridge.restorePurchases();
        }

        public boolean isAvailable() {
          return true; // Die Bridge ist initialisiert, wenn diese Methode existiert
        }
      },
      "AndroidBilling"
    );
  }
}
