package com.base68bb3d3b9f83dc1f55ef532b.app

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import com.android.billingclient.api.QueryProductDetailsParams.Product
import org.json.JSONArray
import org.json.JSONObject

class BillingManager(
    private val activity: Activity,
    private val emit: (eventName: String, jsonPayload: String) -> Unit
) : PurchasesUpdatedListener, BillingClientStateListener {

    private val tag = "BillingManager"

    private val productIds = arrayOf(
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

    private val productDetailsCache = HashMap<String, ProductDetails>()
    private var isConnected = false

    init {
        billingClient.startConnection(this)
    }

    fun isReady(): Boolean = isConnected && billingClient.isReady

    fun destroy() {
        if (billingClient.isReady) billingClient.endConnection()
    }

    override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
            isConnected = true
            Log.i(tag, "Billing connected")
            queryProductDetails()
            queryActivePurchases()
        } else {
            Log.e(tag, "Billing setup failed: " + billingResult.debugMessage)
            emitError(null, billingResult.responseCode, "Billing setup failed: " + billingResult.debugMessage)
        }
    }

    override fun onBillingServiceDisconnected() {
        isConnected = false
        Log.w(tag, "Billing disconnected - reconnecting...")
        billingClient.startConnection(this)
    }

    private fun queryProductDetails() {
        val subProducts = ArrayList<Product>()
        val inappProducts = ArrayList<Product>()

        for (id in productIds) {
            if (id == "catchgbt_trial_10_10") {
                inappProducts.add(
                    Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()
                )
            } else {
                subProducts.add(
                    Product.newBuilder()
                        .setProductId(id)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
            }
        }

        if (subProducts.isNotEmpty()) {
            val subsParams = QueryProductDetailsParams.newBuilder()
                .setProductList(subProducts)
                .build()

            billingClient.queryProductDetailsAsync(subsParams,
                ProductDetailsResponseListener { result, productDetailsList ->
                    if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                        for (i in 0 until productDetailsList.size()) {
                            val pd = productDetailsList.get(i)
                            productDetailsCache[pd.productId] = pd
                        }
                        Log.i(tag, "Loaded " + productDetailsList.size() + " subscription details")
                    } else {
                        Log.e(tag, "queryProductDetails (subs) failed: " + result.debugMessage)
                    }
                })
        }

        val inappParams = QueryProductDetailsParams.newBuilder()
            .setProductList(inappProducts)
            .build()

        billingClient.queryProductDetailsAsync(inappParams,
            ProductDetailsResponseListener { result, productDetailsList ->
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    for (i in 0 until productDetailsList.size) {
                        val pd = productDetailsList[i]
                        productDetailsCache[pd.productId] = pd
                    }
                    Log.i(tag, "Loaded " + productDetailsList.size + " inapp details")
                } else {
                    Log.e(tag, "queryProductDetails (inapp) failed: " + result.debugMessage)
                }
            })
    }

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

        if (productDetails.productType == BillingClient.ProductType.SUBS) {
            val offers = productDetails.subscriptionOfferDetails
            if (offers == null || offers.size() == 0) {
                emitError(productId, -1, "No subscription offer found")
                return
            }
            productDetailsParamsBuilder.setOfferToken(offers.get(0).offerToken)
        }

        val flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(productDetailsParamsBuilder.build()))
            .build()

        val launchResult = billingClient.launchBillingFlow(activity, flowParams)
        if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
            val msg = launchResult.debugMessage
            emitError(productId, launchResult.responseCode, if (msg != null) msg else "launchBillingFlow failed")
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (purchases != null) {
                    for (i in 0 until purchases.size) {
                        handlePurchase(purchases[i])
                    }
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                emitCancel(null)
            }
            else -> {
                val msg = billingResult.debugMessage
                emitError(null, billingResult.responseCode, if (msg != null) msg else "Purchase failed")
            }
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
            Log.w(tag, "Purchase pending or unknown state: " + purchase.purchaseState)
            return
        }

        val products = purchase.products
        if (products.isEmpty()) return
        val productId = products[0]

        if (!purchase.isAcknowledged) {
            val ackParams = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.purchaseToken)
                .build()
            billingClient.acknowledgePurchase(ackParams,
                AcknowledgePurchaseResponseListener { ackResult ->
                    if (ackResult.responseCode == BillingClient.BillingResponseCode.OK) {
                        emitSuccess(productId, purchase)
                    } else {
                        emitError(productId, ackResult.responseCode, "Acknowledge failed: " + ackResult.debugMessage)
                    }
                })
        } else {
            emitSuccess(productId, purchase)
        }
    }

    fun queryActivePurchases(notifyWeb: Boolean = false) {
        if (!billingClient.isReady) return

        val subsParams = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS)
            .build()

        billingClient.queryPurchasesAsync(subsParams,
            PurchasesResponseListener { result, subsList ->
                val all = ArrayList<Purchase>()
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    all.addAll(subsList)
                }

                val inappParams = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()

                billingClient.queryPurchasesAsync(inappParams,
                    PurchasesResponseListener { result2, inappList ->
                        if (result2.responseCode == BillingClient.BillingResponseCode.OK) {
                            all.addAll(inappList)
                        }

                        if (notifyWeb) {
                            emitRestored(all)
                        }
                    })
            })
    }

    private fun emitSuccess(productId: String, purchase: Purchase) {
        val json = JSONObject()
        json.put("productId", productId)
        json.put("purchaseToken", purchase.purchaseToken)
        val orderId = purchase.orderId
        json.put("orderId", if (orderId != null) orderId else JSONObject.NULL)
        emit("play-billing-success", json.toString())
    }

    private fun emitCancel(productId: String?) {
        val json = JSONObject()
        json.put("productId", if (productId != null) productId else JSONObject.NULL)
        emit("play-billing-cancel", json.toString())
    }

    private fun emitError(productId: String?, code: Int, message: String) {
        val json = JSONObject()
        json.put("productId", if (productId != null) productId else JSONObject.NULL)
        json.put("code", code)
        json.put("message", message)
        emit("play-billing-error", json.toString())
    }

    private fun emitRestored(purchases: ArrayList<Purchase>) {
        val arr = JSONArray()
        for (i in 0 until purchases.size) {
            val p = purchases[i]
            val products = p.products
            if (products.isEmpty()) continue
            val productId = products[0]
            val obj = JSONObject()
            obj.put("productId", productId)
            obj.put("purchaseToken", p.purchaseToken)
            val orderId = p.orderId
            obj.put("orderId", if (orderId != null) orderId else JSONObject.NULL)
            arr.put(obj)
        }
        val json = JSONObject()
        json.put("purchases", arr)
        emit("play-billing-restored", json.toString())
    }
}
