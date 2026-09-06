package app.baitbuddy.mobile;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kapselt die Google Play Billing Library Logik fuer die Capacitor-WebView-App.
 * Alle Plaene sind Abos (SUBS); das Trial-Produkt ist ein Einmal-Produkt (INAPP).
 *
 * Events werden ueber den {@link Emitter} an die Web-App gereicht und dort in
 * window.dispatchEvent(new CustomEvent(eventName, { detail: <payload> })) uebersetzt.
 * Die Produkt-IDs muessen exakt den in der Play Console angelegten IDs entsprechen.
 */
public class BillingManager implements PurchasesUpdatedListener, BillingClientStateListener {

    /** Bruecke zum Web: sendet ein Event mit JSON-Payload an die WebView. */
    public interface Emitter {
        void emit(String eventName, String jsonPayload);
    }

    private static final String TAG = "BillingManager";

    // Trial ist ein Einmal-Produkt (INAPP); alle uebrigen Plaene sind Abos (SUBS).
    private static final String TRIAL_PRODUCT_ID = "baitbuddy_trial_10_10";
    private static final List<String> PRODUCT_IDS = Arrays.asList(
            "baitbuddy_basic_monthly",
            "baitbuddy_pro_monthly",
            "baitbuddy_ultimate_monthly",
            "baitbuddy_friends_yearly",
            "baitbuddy_friends_monthly",
            TRIAL_PRODUCT_ID
    );

    /**
     * Wie lange ein Kaufwunsch auf eine bereite Billing-Verbindung wartet, bevor
     * er als Fehler zurueckgemeldet wird.
     */
    private static final long PURCHASE_READY_TIMEOUT_MS = 15_000L;

    private final Activity activity;
    private final Emitter emitter;
    private final BillingClient billingClient;
    // Wird aus dem Billing-Callback-Thread befuellt und aus dem Main-Thread
    // gelesen — deshalb nebenlaeufigkeitssicher.
    private final Map<String, ProductDetails> productDetailsCache = new ConcurrentHashMap<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // isReady() wird auch vom JavaScript-Bridge-Thread gelesen.
    private volatile boolean isConnected = false;
    private volatile boolean isConnecting = false;

    // Kaufwunsch, der auf die Billing-Verbindung/Produktdetails wartet.
    // Nur auf dem Main-Thread anfassen.
    private String pendingPurchaseProductId = null;
    private Runnable pendingPurchaseTimeout = null;

    public BillingManager(Activity activity, Emitter emitter) {
        this.activity = activity;
        this.emitter = emitter;
        this.billingClient = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases(
                        PendingPurchasesParams.newBuilder()
                                .enableOneTimeProducts()
                                .build()
                )
                .build();
        connect();
    }

    private void connect() {
        if (isConnecting || billingClient.isReady()) return;
        isConnecting = true;
        billingClient.startConnection(this);
    }

    private static String productType(String productId) {
        return TRIAL_PRODUCT_ID.equals(productId)
                ? BillingClient.ProductType.INAPP
                : BillingClient.ProductType.SUBS;
    }

    public boolean isReady() {
        return isConnected && billingClient.isReady();
    }

    public void destroy() {
        mainHandler.post(this::cancelPendingPurchase);
        if (billingClient.isReady()) billingClient.endConnection();
    }

    // -------- Connection Lifecycle --------

    @Override
    public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
        isConnecting = false;
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            isConnected = true;
            Log.i(TAG, "Billing connected");
            queryProductDetails();
            queryActivePurchases(true);
        } else {
            isConnected = false;
            Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
            // Ein wartender Kaufwunsch kann jetzt nicht mehr erfuellt werden —
            // sofort melden, statt den Nutzer bis zum Timeout warten zu lassen.
            mainHandler.post(() -> failPendingPurchase(billingResult.getResponseCode(),
                    "Google Play Billing nicht verfuegbar: " + billingResult.getDebugMessage()));
            emitError(null, billingResult.getResponseCode(),
                    "Billing setup failed: " + billingResult.getDebugMessage());
        }
    }

    @Override
    public void onBillingServiceDisconnected() {
        isConnected = false;
        isConnecting = false;
        Log.w(TAG, "Billing disconnected - reconnecting...");
        connect();
    }

    // -------- Product Details --------

    private void queryProductDetails() {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            products.add(
                    QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(id)
                            .setProductType(productType(id))
                            .build()
            );
        }

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(products)
                .build();

        billingClient.queryProductDetailsAsync(params, (result, productDetailsList) -> {
            boolean ok = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
            if (ok) {
                for (ProductDetails pd : productDetailsList) {
                    productDetailsCache.put(pd.getProductId(), pd);
                }
                Log.i(TAG, "Loaded " + productDetailsList.size() + " product details");
            } else {
                Log.e(TAG, "queryProductDetails failed: " + result.getDebugMessage());
            }
            // Ein Kaufwunsch, der auf genau diese Details gewartet hat, wird
            // jetzt ausgefuehrt (oder mit klarer Ursache abgelehnt).
            final String debugMessage = result.getDebugMessage();
            mainHandler.post(() -> {
                if (ok) {
                    flushPendingPurchase();
                } else {
                    failPendingPurchase(result.getResponseCode(),
                            "Produktdaten konnten nicht geladen werden: " + debugMessage);
                }
            });
        });
    }

    // -------- Purchase --------

    /**
     * Startet den Kauf. Aufruf kommt aus dem JavaScript-Bridge-Thread, die
     * Kauf-Logik laeuft deshalb komplett auf dem Main-Thread.
     */
    public void startPurchase(String productId) {
        mainHandler.post(() -> startPurchaseOnMain(productId));
    }

    private void startPurchaseOnMain(String productId) {
        ProductDetails productDetails = isReady() ? productDetailsCache.get(productId) : null;
        if (productDetails != null) {
            launchPurchase(productId, productDetails);
            return;
        }

        // Billing verbindet sich asynchron und laedt die Produktdetails erst
        // danach. Tippt der Nutzer direkt nach dem App-Start auf "Kaufen", ist
        // beides noch nicht da — ein sofortiger Fehler waere reines Timing und
        // wuerde einen kaufwilligen Nutzer grundlos abweisen. Der Kaufwunsch
        // wird deshalb gemerkt und ausgefuehrt, sobald die Details vorliegen.
        queuePurchase(productId);

        if (isReady()) {
            queryProductDetails();
        } else {
            connect();
        }
    }

    private void queuePurchase(String productId) {
        // Tippt der Nutzer waehrenddessen einen anderen Plan an, wird der alte
        // Kaufwunsch verworfen — die wartende Web-Seite muss das erfahren,
        // sonst dreht sich dort bis zum Timeout ein Spinner.
        if (pendingPurchaseProductId != null && !pendingPurchaseProductId.equals(productId)) {
            emitCancel(pendingPurchaseProductId);
        }
        cancelPendingPurchase();
        pendingPurchaseProductId = productId;
        pendingPurchaseTimeout = () -> {
            pendingPurchaseTimeout = null;
            failPendingPurchase(-1,
                    "Google Play ist gerade nicht bereit. Bitte in ein paar Sekunden erneut versuchen.");
        };
        mainHandler.postDelayed(pendingPurchaseTimeout, PURCHASE_READY_TIMEOUT_MS);
    }

    private void cancelPendingPurchase() {
        if (pendingPurchaseTimeout != null) {
            mainHandler.removeCallbacks(pendingPurchaseTimeout);
            pendingPurchaseTimeout = null;
        }
        pendingPurchaseProductId = null;
    }

    /** Fuehrt einen wartenden Kaufwunsch aus, sobald die Produktdetails da sind. */
    private void flushPendingPurchase() {
        String productId = pendingPurchaseProductId;
        if (productId == null) return;

        ProductDetails productDetails = productDetailsCache.get(productId);
        if (productDetails == null) {
            // Details erfolgreich geladen, dieses Produkt war nicht dabei: die
            // Produkt-ID existiert in der Play Console nicht (oder ist inaktiv).
            failPendingPurchase(-1, "Produkt " + productId + " ist im Play Store nicht verfuegbar.");
            return;
        }
        if (!isReady()) return; // Timeout greift, falls die Verbindung ausbleibt

        cancelPendingPurchase();
        launchPurchase(productId, productDetails);
    }

    private void failPendingPurchase(int code, String message) {
        String productId = pendingPurchaseProductId;
        if (productId == null) return;
        cancelPendingPurchase();
        emitError(productId, code, message);
    }

    private void launchPurchase(String productId, ProductDetails productDetails) {
        BillingFlowParams.ProductDetailsParams.Builder paramsBuilder =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails);

        // Abos brauchen ein offerToken; Einmal-Produkte nicht.
        if (BillingClient.ProductType.SUBS.equals(productDetails.getProductType())) {
            List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
            String offerToken = (offers != null && !offers.isEmpty()) ? offers.get(0).getOfferToken() : null;
            if (offerToken == null) {
                emitError(productId, -1, "No subscription offer found");
                return;
            }
            paramsBuilder.setOfferToken(offerToken);
        }

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(paramsBuilder.build()))
                .build();

        BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            String msg = launchResult.getDebugMessage();
            emitError(productId, launchResult.getResponseCode(), msg != null ? msg : "launchBillingFlow failed");
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        int code = billingResult.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK) {
            if (purchases != null) {
                for (Purchase p : purchases) handlePurchase(p);
            }
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            emitCancel(null);
        } else {
            String msg = billingResult.getDebugMessage();
            emitError(null, code, msg != null ? msg : "Purchase failed");
        }
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            Log.w(TAG, "Purchase pending or unknown state: " + purchase.getPurchaseState());
            return;
        }

        List<String> products = purchase.getProducts();
        if (products.isEmpty()) return;
        final String productId = products.get(0);

        // Acknowledge (sonst wird der Kauf nach 3 Tagen refunded).
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
            billingClient.acknowledgePurchase(ackParams, ackResult -> {
                if (ackResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    emitSuccess(productId, purchase);
                } else {
                    emitError(productId, ackResult.getResponseCode(),
                            "Acknowledge failed: " + ackResult.getDebugMessage());
                }
            });
        } else {
            emitSuccess(productId, purchase);
        }
    }

    // -------- Restore / Active Purchases --------

    public void queryActivePurchases(boolean notifyWeb) {
        if (!billingClient.isReady()) {
            // Nach dem Verbindungsaufbau wird ohnehin erneut abgefragt
            // (onBillingSetupFinished) — hier nur den Aufbau anstossen.
            connect();
            return;
        }

        QueryPurchasesParams subsParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

        billingClient.queryPurchasesAsync(subsParams, (subsResult, subsList) -> {
            List<Purchase> all = new ArrayList<>();
            if (subsResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                all.addAll(subsList);
            }

            QueryPurchasesParams inappParams = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build();

            billingClient.queryPurchasesAsync(inappParams, (inappResult, inappList) -> {
                if (inappResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    all.addAll(inappList);
                }
                if (notifyWeb) {
                    emitRestored(all);
                }
            });
        });
    }

    // -------- JavaScript Event Emitter --------

    private void emitSuccess(String productId, Purchase purchase) {
        try {
            JSONObject json = new JSONObject();
            json.put("productId", productId);
            json.put("purchaseToken", purchase.getPurchaseToken());
            json.put("orderId", purchase.getOrderId() != null ? purchase.getOrderId() : JSONObject.NULL);
            emitter.emit("play-billing-success", json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "emitSuccess JSON error", e);
        }
    }

    private void emitCancel(String productId) {
        try {
            JSONObject json = new JSONObject();
            json.put("productId", productId != null ? productId : JSONObject.NULL);
            emitter.emit("play-billing-cancel", json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "emitCancel JSON error", e);
        }
    }

    private void emitError(String productId, int code, String message) {
        try {
            JSONObject json = new JSONObject();
            json.put("productId", productId != null ? productId : JSONObject.NULL);
            json.put("code", code);
            json.put("message", message);
            emitter.emit("play-billing-error", json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "emitError JSON error", e);
        }
    }

    private void emitRestored(List<Purchase> purchases) {
        try {
            JSONArray arr = new JSONArray();
            for (Purchase p : purchases) {
                List<String> products = p.getProducts();
                if (products.isEmpty()) continue;
                JSONObject o = new JSONObject();
                o.put("productId", products.get(0));
                o.put("purchaseToken", p.getPurchaseToken());
                o.put("orderId", p.getOrderId() != null ? p.getOrderId() : JSONObject.NULL);
                arr.put(o);
            }
            JSONObject json = new JSONObject();
            json.put("purchases", arr);
            emitter.emit("play-billing-restored", json.toString());
        } catch (JSONException e) {
            Log.e(TAG, "emitRestored JSON error", e);
        }
    }
}
