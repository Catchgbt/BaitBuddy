package app.baitbuddy.mobile

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import com.getcapacitor.Bridge
import org.json.JSONObject

/**
 * Google Play Billing Bridge — verwaltet In-App-Käufe für Premium-Pläne.
 *
 * Nutzt die Google Play Billing Library, um Einkäufe zu starten und zu verifizieren.
 * Ergebnisse werden dem WebView via JavaScript Events zugesandt:
 * - play-billing-success: { productId, purchaseToken, orderId, planId }
 * - play-billing-cancel: { productId }
 * - play-billing-error: { productId, code, message }
 * - play-billing-restored: { purchases: [{productId, purchaseToken, orderId}] }
 *
 * Lifecycle: billingClient.startConnection() beim App-Start, endConnection() beim Exit.
 */
class GooglePlayBillingBridge(private val activity: Activity, private val bridge: Bridge) {
  private var billingClient: BillingClient? = null
  private val tag = "GooglePlayBilling"

  fun initialize() {
    billingClient = BillingClient.newBuilder(activity)
      .setListener(::handleBillingResult)
      .enablePendingPurchases()
      .build()

    billingClient?.startConnection(object : BillingClientStateListener {
      override fun onBillingServiceDisconnected() {
        Log.w(tag, "Billing service disconnected")
      }

      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
          Log.e(tag, "Billing setup failed: ${billingResult.debugMessage}")
        } else {
          Log.d(tag, "Billing service connected")
        }
      }
    })
  }

  fun purchase(productId: String) {
    if (billingClient == null || !billingClient!!.isReady) {
      val error = JSONObject().apply {
        put("productId", productId)
        put("code", "SERVICE_UNAVAILABLE")
        put("message", "Billing service nicht verfügbar — versuche später")
      }
      dispatchEvent("play-billing-error", error)
      return
    }

    val productDetails = queryProductDetails(productId)
    if (productDetails == null) {
      val error = JSONObject().apply {
        put("productId", productId)
        put("code", "PRODUCT_NOT_FOUND")
        put("message", "Produkt '$productId' nicht in Play Console konfiguriert")
      }
      dispatchEvent("play-billing-error", error)
      return
    }

    val offerToken = productDetails.subscriptionOfferDetails?.get(0)?.offerToken
      ?: productDetails.oneTimePurchaseOfferDetails?.formattedPrice ?: ""

    val billingFlowParams = BillingFlowParams.newBuilder()
      .setProductDetailsParamsList(
        listOf(
          BillingFlowParams.ProductDetailsParams.newBuilder()
            .setProductDetails(productDetails)
            .setOfferToken(offerToken)
            .build()
        )
      )
      .build()

    billingClient?.launchBillingFlow(activity, billingFlowParams)
  }

  fun restorePurchases() {
    if (billingClient == null || !billingClient!!.isReady) {
      val error = JSONObject().apply {
        put("code", "SERVICE_UNAVAILABLE")
        put("message", "Billing service nicht verfügbar")
      }
      dispatchEvent("play-billing-error", error)
      return
    }

    billingClient?.queryPurchasesAsync(
      QueryPurchasesParams.newBuilder()
        .setProductType(BillingClient.ProductType.INAPP)
        .build()
    ) { billingResult, purchases ->
      if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
        val error = JSONObject().apply {
          put("code", "QUERY_FAILED")
          put("message", billingResult.debugMessage)
        }
        dispatchEvent("play-billing-error", error)
        return@queryPurchasesAsync
      }

      val purchaseList = purchases.map { purchase ->
        JSONObject().apply {
          put("productId", purchase.products[0])
          put("purchaseToken", purchase.purchaseToken)
          put("orderId", purchase.orderId)
        }
      }
      val event = JSONObject().apply {
        put("purchases", purchaseList)
      }
      dispatchEvent("play-billing-restored", event)
    }
  }

  fun teardown() {
    billingClient?.endConnection()
    billingClient = null
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private fun handleBillingResult(billingResult: BillingResult, purchases: List<Purchase>?) {
    if (billingResult.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
      if (!purchases.isNullOrEmpty()) {
        purchases.forEach { purchase ->
          val detail = JSONObject().apply {
            put("productId", purchase.products[0])
          }
          dispatchEvent("play-billing-cancel", detail)
        }
      }
      return
    }

    if (billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
      if (!purchases.isNullOrEmpty()) {
        purchases.forEach { purchase ->
          val error = JSONObject().apply {
            put("productId", purchase.products[0])
            put("code", billingResult.responseCode.toString())
            put("message", billingResult.debugMessage)
          }
          dispatchEvent("play-billing-error", error)
        }
      }
      return
    }

    if (purchases.isNullOrEmpty()) return

    purchases.forEach { purchase ->
      if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) {
        val error = JSONObject().apply {
          put("productId", purchase.products[0])
          put("code", "PURCHASE_PENDING")
          put("message", "Kauf noch nicht abgeschlossen")
        }
        dispatchEvent("play-billing-error", error)
        return@forEach
      }

      val success = JSONObject().apply {
        put("productId", purchase.products[0])
        put("purchaseToken", purchase.purchaseToken)
        put("orderId", purchase.orderId)
        put("planId", mapProductIdToPlanId(purchase.products[0]))
      }
      dispatchEvent("play-billing-success", success)

      // Acknowledge the purchase — Google Play verlangt das, um den Kauf zu bestätigen
      billingClient?.acknowledgePurchase(
        AcknowledgePurchaseParams.newBuilder()
          .setPurchaseToken(purchase.purchaseToken)
          .build()
      ) { _ ->
        Log.d(tag, "Purchase acknowledged: ${purchase.products[0]}")
      }
    }
  }

  private fun queryProductDetails(productId: String): ProductDetails? {
    var result: ProductDetails? = null
    val sem = java.util.concurrent.Semaphore(0)

    billingClient?.queryProductDetailsAsync(
      QueryProductDetailsParams.newBuilder()
        .addProduct(
          QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        )
        .build()
    ) { billingResult, productDetailsList ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
        result = productDetailsList.firstOrNull()
      }
      sem.release()
    }

    try {
      sem.tryAcquire(5, java.util.concurrent.TimeUnit.SECONDS)
    } catch (_: Exception) {}

    return result
  }

  private fun mapProductIdToPlanId(productId: String): String {
    return when (productId) {
      "catchgbt_basic_monthly" -> "basic"
      "catchgbt_pro_monthly" -> "pro"
      "catchgbt_ultimate_monthly", "catchgbt_elite_monthly" -> "elite"
      "catchgbt_friends_yearly" -> "friends"
      "catchgbt_friends_monthly" -> "friends_monthly"
      "catchgbt_trial_10_10" -> "trial_10_10"
      else -> productId
    }
  }

  private fun dispatchEvent(eventName: String, detail: JSONObject) {
    bridge.webView?.evaluateJavascript(
      """
      (function() {
        const event = new CustomEvent('$eventName', { detail: ${detail.toString()} });
        window.dispatchEvent(event);
      })();
      """.trimIndent(),
      null
    )
  }
}
