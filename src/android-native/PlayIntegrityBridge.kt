package com.catchly.app

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * PlayIntegrityBridge
 *
 * JavaScript-Bridge fuer die WebView, damit das Web-Frontend die native
 * Play Integrity API ueber window.AndroidIntegrity.requestToken(nonce, callbackId)
 * ansprechen kann.
 *
 * Registrierung in MainActivity:
 *   webView.addJavascriptInterface(
 *       PlayIntegrityBridge(this, webView, CLOUD_PROJECT_NUMBER),
 *       "AndroidIntegrity"
 *   )
 */
class PlayIntegrityBridge(
    private val context: Context,
    private val webView: WebView,
    cloudProjectNumber: Long
) {
    private val integrityManager = PlayIntegrityManager(context, cloudProjectNumber)

    /**
     * Wird vom JavaScript aufgerufen.
     * @param nonce Server-generierter Nonce
     * @param callbackId Eindeutige ID, damit das JS die Antwort zuordnen kann
     */
    @JavascriptInterface
    fun requestToken(nonce: String, callbackId: String) {
        integrityManager.requestIntegrityTokenAsync(
            nonce = nonce,
            onSuccess = { token ->
                dispatchToWeb(callbackId, token, null)
            },
            onError = { errorMsg ->
                dispatchToWeb(callbackId, null, errorMsg)
            }
        )
    }

    @JavascriptInterface
    fun isAvailable(): Boolean = true

    private fun dispatchToWeb(callbackId: String, token: String?, error: String?) {
        val tokenJs = token?.let { "\"${it.replace("\"", "\\\"")}\"" } ?: "null"
        val errorJs = error?.let { "\"${it.replace("\"", "\\\"")}\"" } ?: "null"
        val js = """
            if (window.__integrityCallbacks && window.__integrityCallbacks["$callbackId"]) {
                window.__integrityCallbacks["$callbackId"]($tokenJs, $errorJs);
                delete window.__integrityCallbacks["$callbackId"];
            }
        """.trimIndent()

        webView.post {
            webView.evaluateJavascript(js, null)
        }
    }
}