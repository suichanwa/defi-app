package com.yourcompany.defiaiapp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RustWalletCryptoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  companion object {
    private var loaded = false

    init {
      loaded = try {
        System.loadLibrary("rust_wallet_core")
        true
      } catch (_: Throwable) {
        false
      }
    }
  }

  external fun nativeEncryptWalletKey(privateKey: String, password: String): String

  external fun nativeDecryptWalletKey(encryptedJson: String, password: String): String

  override fun getName(): String = "RustWalletCrypto"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(loaded)
  }

  @ReactMethod
  fun encryptWalletKey(privateKey: String, password: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet crypto library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeEncryptWalletKey(privateKey, password))
    } catch (error: Throwable) {
      promise.reject("RUST_ENCRYPT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun decryptWalletKey(encryptedJson: String, password: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet crypto library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeDecryptWalletKey(encryptedJson, password))
    } catch (error: Throwable) {
      promise.reject("RUST_DECRYPT_FAILED", error.message, error)
    }
  }
}

