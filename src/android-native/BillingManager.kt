package de.catchgbt.app

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import com.android.billingclient.api.QueryProductDetailsParams.Product
import org.json.JSONArray
import org.json.JSONObject

/**
 * Kapselt die Google Play Billing Library v8.3.0 Logik.
 * Sendet Events an die Web-App via [emit] Callback.
 *
 * emit(eventName, jsonPayloadString) -> wird in der MainActivity in
 *   window.dispatchEvent(new CustomEvent(eventName, { detail: <payload> }))
 * uebersetzt.
 */
class BillingManager(
    private val activity: Activity,
    private val emit: (eventName: String, jsonPayload: String) -> Unit
) : PurchasesUpdatedListener, BillingClientStateListener {

    private val tag = "BillingManager"

    private val productIds = listOf(
        "catchgbt_basic_monthly",
        "catchgbt_pro_monthly",
        "catchgbt_ultimate_monthly",
        "catchgbt_friends_yearly",
        "catchgbt_friends_monthly",
        "catchgbt_trial_10_10"
    )

    private val billingClient: BillingClient = BillingClient.newBuilder(activity)
        .setListener(this)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build()
        )
        .build()

    private val productDetailsCache = mutableMapOf<String, ProductDetails>()
    private var isConnected = false

    init {
        billingClient.startConnection(this)
    }

    fun isReady(): Boolean = isConnected && billingClient.isReady

    fun destroy() {
        if (billingClient.isReady) billingClient.endConnection()
    }

    // -------- Connection Lifecycle --------

    override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            isConnected = true
            Log.i(tag, "Billing connected")
            queryProductDetails()
            queryActivePurchases()
        } else {
            Log.e(tag, "Billing setup failed: ${billingResult.debugMessage}")
            emitError(null, billingResult.responseCode, "Billing setup failed: ${billingResult.debugMessage}")
        }
    }

    override fun onBillingServiceDisconnected() {
        isConnected = false
        Log.w(tag, "Billing disconnected - reconnecting...")
        billingClient.startConnection(this)
    }

    // -------- Product Details --------

    private fun queryProductDetails() {
        val products = productIds.map { id ->
            val type = if (id == "catchgbt_trial_10_10") {
                BillingClient.ProductType.INAPP
            } else {
                BillingClient.ProductType.SUBS
            }
            Product.newBuilder()
                .setProductId(id)
                .setProductType(type)
                .build()
        }

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build()

        billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                productDetailsList.forEach { pd ->
                    productDetailsCache[pd.productId] = pd
                }
                Log.i(tag, "Loaded ${productDetailsList.size} product details")
            } else {
                Log.e(tag, "queryProductDetails failed: ${result.debugMessage}")
            }
        }
    }

    // -------- Purchase --------

    fun startPurchase(productId: String) {
        if (!isReady()) {
            emitError(productId, -1, "Billing service not ready")
            return
        }

        val productDetails = productDetailsCache[productId]
        if (productDetails == null) {
            emitError(productId, -1, "Product $productId not found")
            return
        }

        val productDetailsParamsBuilder = BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(productDetails)

        // Subscriptions brauchen eine offerToken; In-App-Produkte nicht.
        if (productDetails.productType == BillingClient.ProductType.SUBS) {
            val offerToken = productDetails.subscriptionOfferDetails
                ?.firstOrNull()
                ?.offerToken
            if (offerToken == null) {
                emitError(productId, -1, "No subscription offer found")
                return
            }
            productDetailsParamsBuilder.setOfferToken(offerToken)
        }

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParamsBuilder.build()))
            .build()

        val launchResult = billingClient.launchBillingFlow(activity, flowParams)
        if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
            emitError(productId, launchResult.responseCode, launchResult.debugMessage ?: "launchBillingFlow failed")
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                purchases?.forEach { handlePurchase(it) }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                emitCancel(null)
            }
            else -> {
                emitError(null, billingResult.responseCode, billingResult.debugMessage ?: "Purchase failed")
            }
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
            Log.w(tag, "Purchase pending or unknown state: ${purchase.purchaseState}")
            return
        }

        val productId = purchase.products.firstOrNull() ?: return

        // Acknowledge (sonst wird der Kauf nach 3 Tagen refunded)
        if (!purchase.isAcknowledged) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
            billingClient.acknowledgePurchase(ackParams) { ackResult ->
                if (ackResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    emitSuccess(productId, purchase)
                } else {
                    emitError(productId, ackResult.responseCode, "Acknowledge failed: ${ackResult.debugMessage}")
                }
            }
        } else {
            emitSuccess(productId, purchase)
        }
    }

    // -------- Restore / Active Purchases --------

    fun queryActivePurchases(notifyWeb: Boolean = false) {
        if (!billingClient.isReady) return

        val subsParams = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        billingClient.queryPurchasesAsync(subsParams) { result, subsList ->
            val all = mutableListOf<Purchase>()
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                all.addAll(subsList)
            }

            val inappParams = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()

            billingClient.queryPurchasesAsync(inappParams) { result2, inappList ->
                if (result2.responseCode == BillingClient.BillingResponseCode.OK) {
                    all.addAll(inappList)
                }

                if (notifyWeb) {
                    emitRestored(all)
                }
            }
        }
    }

    // -------- JavaScript Event Emitter --------

    private fun emitSuccess(productId: String, purchase: Purchase) {
        val json = JSONObject().apply {
            put("productId", productId)
            put("purchaseToken", purchase.purchaseToken)
            put("orderId", purchase.orderId ?: JSONObject.NULL)
        }
        emit("play-billing-success", json.toString())
    }

    private fun emitCancel(productId: String?) {
        val json = JSONObject().apply {
            put("productId", productId ?: JSONObject.NULL)
        }
        emit("play-billing-cancel", json.toString())
    }

    private fun emitError(productId: String?, code: Int, message: String) {
        val json = JSONObject().apply {
            put("productId", productId ?: JSONObject.NULL)
            put("code", code)
            put("message", message)
        }
        emit("play-billing-error", json.toString())
    }

    private fun emitRestored(purchases: List<Purchase>) {
        val arr = JSONArray()
        purchases.forEach { p ->
            val productId = p.products.firstOrNull() ?: return@forEach
            arr.put(JSONObject().apply {
                put("productId", productId)
                put("purchaseToken", p.purchaseToken)
                put("orderId", p.orderId ?: JSONObject.NULL)
            })
        }
        val json = JSONObject().apply {
            put("purchases", arr)
        }
        emit("play-billing-restored", json.toString())
    }
}