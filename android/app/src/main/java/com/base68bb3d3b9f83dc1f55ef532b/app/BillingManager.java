package com.base68bb3d3b9f83dc1f55ef532b.app;

import android.app.Activity;
import android.util.Log;
import com.android.billingclient.api.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class BillingManager implements PurchasesUpdatedListener, BillingClientStateListener {

    private static final String TAG = "BillingManager";

    private static final String[] PRODUCT_IDS = {
        "catchgbt_basic_monthly",
        "catchgbt_pro_monthly",
        "catchgbt_ultimate_monthly",
        "catchgbt_friends_yearly",
        "catchgbt_friends_monthly",
        "catchgbt_trial_10_10"
    };

    private final Activity activity;
    private final BillingCallback emit;
    private final BillingClient billingClient;
    private final HashMap<String, ProductDetails> productDetailsCache;
    private boolean isConnected = false;

    public interface BillingCallback {
        void onEvent(String eventName, String jsonPayload);
    }

    public BillingManager(Activity activity, BillingCallback emit) {
        this.activity = activity;
        this.emit = emit;
        this.productDetailsCache = new HashMap<>();
        this.billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();
        billingClient.startConnection(this);
    }

    public boolean isReady() {
        return isConnected && billingClient.isReady();
    }

    public void destroy() {
        if (billingClient.isReady()) {
            billingClient.endConnection();
        }
    }

    @Override
    public void onBillingSetupFinished(BillingResult billingResult) {
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
            isConnected = true;
            Log.i(TAG, "Billing connected");
            queryProductDetails();
            queryActivePurchases(false);
        } else {
            Log.e(TAG, "Billing setup failed: " + billingResult.getDebugMessage());
            emitError(null, billingResult.getResponseCode(), "Billing setup failed: " + billingResult.getDebugMessage());
        }
    }

    @Override
    public void onBillingServiceDisconnected() {
        isConnected = false;
        Log.w(TAG, "Billing disconnected - reconnecting...");
        billingClient.startConnection(this);
    }

    private void queryProductDetails() {
        List<QueryProductDetailsParams.Product> subProducts = new ArrayList<>();
        List<QueryProductDetailsParams.Product> inappProducts = new ArrayList<>();

        for (String id : PRODUCT_IDS) {
            if (id.equals("catchgbt_trial_10_10")) {
                inappProducts.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                );
            } else {
                subProducts.add(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                );
            }
        }

        if (!subProducts.isEmpty()) {
            QueryProductDetailsParams subsParams = QueryProductDetailsParams.newBuilder()
                .setProductList(subProducts)
                .build();

            billingClient.queryProductDetailsAsync(subsParams, (result, productDetailsList) -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (ProductDetails pd : productDetailsList) {
                        productDetailsCache.put(pd.getProductId(), pd);
                    }
                    Log.i(TAG, "Loaded " + productDetailsList.size() + " subscription details");
                } else {
                    Log.e(TAG, "queryProductDetails (subs) failed: " + result.getDebugMessage());
                }
            });
        }

        QueryProductDetailsParams inappParams = QueryProductDetailsParams.newBuilder()
            .setProductList(inappProducts)
            .build();

        billingClient.queryProductDetailsAsync(inappParams, (result, productDetailsList) -> {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                for (ProductDetails pd : productDetailsList) {
                    productDetailsCache.put(pd.getProductId(), pd);
                }
                Log.i(TAG, "Loaded " + productDetailsList.size() + " inapp details");
            } else {
                Log.e(TAG, "queryProductDetails (inapp) failed: " + result.getDebugMessage());
            }
        });
    }

    public void startPurchase(String productId) {
        if (!isReady()) {
            emitError(productId, -1, "Billing service not ready");
            return;
        }

        ProductDetails productDetails = productDetailsCache.get(productId);
        if (productDetails == null) {
            emitError(productId, -1, "Product " + productId + " not found");
            return;
        }

        BillingFlowParams.ProductDetailsParams.Builder productDetailsParamsBuilder =
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails);

        if (BillingClient.ProductType.SUBS.equals(productDetails.getProductType())) {
            List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
            if (offers == null || offers.isEmpty()) {
                emitError(productId, -1, "No subscription offer found");
                return;
            }
            productDetailsParamsBuilder.setOfferToken(offers.get(0).getOfferToken());
        }

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(java.util.Collections.singletonList(productDetailsParamsBuilder.build()))
            .build();

        BillingResult launchResult = billingClient.launchBillingFlow(activity, flowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            String msg = launchResult.getDebugMessage();
            emitError(productId, launchResult.getResponseCode(), msg != null ? msg : "launchBillingFlow failed");
        }
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        switch (billingResult.getResponseCode()) {
            case BillingClient.BillingResponseCode.OK:
                if (purchases != null) {
                    for (Purchase purchase : purchases) {
                        handlePurchase(purchase);
                    }
                }
                break;
            case BillingClient.BillingResponseCode.USER_CANCELED:
                emitCancel(null);
                break;
            default:
                String msg = billingResult.getDebugMessage();
                emitError(null, billingResult.getResponseCode(), msg != null ? msg : "Purchase failed");
        }
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            Log.w(TAG, "Purchase pending or unknown state: " + purchase.getPurchaseState());
            return;
        }

        List<String> products = purchase.getProducts();
        if (products.isEmpty()) return;
        String productId = products.get(0);

        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
            billingClient.acknowledgePurchase(ackParams, ackResult -> {
                if (ackResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    emitSuccess(productId, purchase);
                } else {
                    emitError(productId, ackResult.getResponseCode(), "Acknowledge failed: " + ackResult.getDebugMessage());
                }
            });
        } else {
            emitSuccess(productId, purchase);
        }
    }

    public void queryActivePurchases(boolean notifyWeb) {
        if (!billingClient.isReady()) return;

        QueryPurchasesParams subsParams = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build();

        billingClient.queryPurchasesAsync(subsParams, (result, subsList) -> {
            List<Purchase> all = new ArrayList<>(subsList);

            QueryPurchasesParams inappParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

            billingClient.queryPurchasesAsync(inappParams, (result2, inappList) -> {
                all.addAll(inappList);
                if (notifyWeb) {
                    emitRestored(all);
                }
            });
        });
    }

    private void emitSuccess(String productId, Purchase purchase) {
        JSONObject json = new JSONObject();
        try {
            json.put("productId", productId);
            json.put("purchaseToken", purchase.getPurchaseToken());
            String orderId = purchase.getOrderId();
            json.put("orderId", orderId != null ? orderId : JSONObject.NULL);
        } catch (Exception ignored) {}
        emit.onEvent("play-billing-success", json.toString());
    }

    private void emitCancel(String productId) {
        JSONObject json = new JSONObject();
        try {
            json.put("productId", productId != null ? productId : JSONObject.NULL);
        } catch (Exception ignored) {}
        emit.onEvent("play-billing-cancel", json.toString());
    }

    private void emitError(String productId, int code, String message) {
        JSONObject json = new JSONObject();
        try {
            json.put("productId", productId != null ? productId : JSONObject.NULL);
            json.put("code", code);
            json.put("message", message);
        } catch (Exception ignored) {}
        emit.onEvent("play-billing-error", json.toString());
    }

    private void emitRestored(List<Purchase> purchases) {
        JSONArray arr = new JSONArray();
        for (Purchase p : purchases) {
            List<String> products = p.getProducts();
            if (products.isEmpty()) continue;
            String productId = products.get(0);
            JSONObject obj = new JSONObject();
            try {
                obj.put("productId", productId);
                obj.put("purchaseToken", p.getPurchaseToken());
                String orderId = p.getOrderId();
                obj.put("orderId", orderId != null ? orderId : JSONObject.NULL);
                arr.put(obj);
            } catch (Exception ignored) {}
        }
        JSONObject json = new JSONObject();
        try {
            json.put("purchases", arr);
        } catch (Exception ignored) {}
        emit.onEvent("play-billing-restored", json.toString());
    }
}
