package com.catchly.app

import android.content.Context
import android.util.Log
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * PlayIntegrityManager
 *
 * Holt sich einen Integrity-Token von der Google Play Integrity API.
 * Der Token wird anschliessend an das Backend (Base44 Funktion verifyPlayIntegrity)
 * geschickt und dort serverseitig verifiziert.
 *
 * WICHTIG: Im Google Cloud Console muss die Play Integrity API aktiviert sein
 * und das Cloud Project muss mit dem Play Console Projekt verknuepft sein.
 */
class PlayIntegrityManager(
    private val context: Context,
    private val cloudProjectNumber: Long
) {

    companion object {
        private const val TAG = "PlayIntegrityManager"
    }

    private val integrityManager = IntegrityManagerFactory.createStandard(context)

    /**
     * Fordert einen Integrity-Token an.
     *
     * @param nonce Ein vom Server generierter Nonce (Base64URL, max. 500 Zeichen)
     * @return Den verschluesselten Integrity-Token-String oder null bei Fehler
     */
    suspend fun requestIntegrityToken(nonce: String): String? {
        return try {
            suspendCancellableCoroutine { continuation ->
                val request = IntegrityTokenRequest.builder()
                    .setNonce(nonce)
                    .setCloudProjectNumber(cloudProjectNumber)
                    .build()

                integrityManager.requestIntegrityToken(request)
                    .addOnSuccessListener { response ->
                        val token = response.token()
                        Log.d(TAG, "Integrity Token erhalten")
                        continuation.resume(token)
                    }
                    .addOnFailureListener { exception ->
                        Log.e(TAG, "Integrity Token Fehler", exception)
                        continuation.resumeWithException(exception)
                    }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Fehler beim Abrufen des Integrity-Tokens", e)
            null
        }
    }

    fun requestIntegrityTokenAsync(
        nonce: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val token = requestIntegrityToken(nonce)
                if (token != null) {
                    onSuccess(token)
                } else {
                    onError("Token konnte nicht abgerufen werden")
                }
            } catch (e: Exception) {
                onError(e.message ?: "Unbekannter Fehler")
            }
        }
    }
}