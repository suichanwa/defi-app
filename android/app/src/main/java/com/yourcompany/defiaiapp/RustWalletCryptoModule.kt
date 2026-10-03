package com.yourcompany.defiaiapp

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class RustWalletCryptoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private fun storageDir(): String {
    return reactApplicationContext.filesDir?.absolutePath ?: reactApplicationContext.cacheDir.absolutePath
  }

  companion object {
    private var loaded = false

    init {
      loaded = try {
        System.loadLibrary("rust_wallet_core")
        android.util.Log.i("RustWalletCrypto", "librust_wallet_core.so loaded successfully!")
        true
      } catch (e: Throwable) {
        android.util.Log.e("RustWalletCrypto", "Failed to load librust_wallet_core: ${e.message}", e)
        false
      }
    }
  }

  external fun nativeEncryptWalletKey(privateKey: String, password: String): String

  external fun nativeDecryptWalletKey(encryptedJson: String, password: String): String

  external fun nativeHashPasscode(passcode: String): String

  external fun nativeVerifyPasscode(passcode: String, hash: String): Boolean

  external fun nativeLoadWalletRecords(storageDir: String, walletType: String): String

  external fun nativeGetActiveWalletId(storageDir: String, walletType: String): String

  external fun nativeSetActiveWalletId(storageDir: String, walletType: String, walletId: String)

  external fun nativeLoadEncryptedWalletKeyById(storageDir: String, walletType: String, walletId: String): String

  external fun nativeLoadEncryptedWalletKey(storageDir: String, walletType: String): String

  external fun nativeSaveEncryptedWalletKey(storageDir: String, walletType: String, recordJson: String)

  external fun nativeMarkBackupCompleted(storageDir: String, walletType: String)

  external fun nativeClearWallet(storageDir: String, walletType: String)

  external fun nativeRemoveWalletRecord(storageDir: String, walletType: String, walletId: String)

  external fun nativeUpdateWalletRecordMeta(storageDir: String, walletType: String, walletId: String, updatesJson: String): String

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

  @ReactMethod
  fun hashPasscode(passcode: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet crypto library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeHashPasscode(passcode))
    } catch (error: Throwable) {
      promise.reject("RUST_HASH_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun verifyPasscode(passcode: String, hash: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet crypto library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeVerifyPasscode(passcode, hash))
    } catch (error: Throwable) {
      promise.reject("RUST_VERIFY_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun loadWalletRecords(walletType: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeLoadWalletRecords(storageDir(), walletType))
    } catch (error: Throwable) {
      promise.reject("RUST_LOAD_RECORDS_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getActiveWalletId(walletType: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeGetActiveWalletId(storageDir(), walletType))
    } catch (error: Throwable) {
      promise.reject("RUST_GET_ACTIVE_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun setActiveWalletId(walletType: String, walletId: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      nativeSetActiveWalletId(storageDir(), walletType, walletId)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("RUST_SET_ACTIVE_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun loadEncryptedWalletKeyById(walletType: String, walletId: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeLoadEncryptedWalletKeyById(storageDir(), walletType, walletId))
    } catch (error: Throwable) {
      promise.reject("RUST_LOAD_WALLET_BY_ID_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun loadEncryptedWalletKey(walletType: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeLoadEncryptedWalletKey(storageDir(), walletType))
    } catch (error: Throwable) {
      promise.reject("RUST_LOAD_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun saveEncryptedWalletKey(walletType: String, recordJson: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      nativeSaveEncryptedWalletKey(storageDir(), walletType, recordJson)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("RUST_SAVE_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun markBackupCompleted(walletType: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      nativeMarkBackupCompleted(storageDir(), walletType)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("RUST_MARK_BACKUP_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun clearWallet(walletType: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      nativeClearWallet(storageDir(), walletType)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("RUST_CLEAR_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun removeWalletRecord(walletType: String, walletId: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      nativeRemoveWalletRecord(storageDir(), walletType, walletId)
      promise.resolve(true)
    } catch (error: Throwable) {
      promise.reject("RUST_REMOVE_WALLET_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun updateWalletRecordMeta(walletType: String, walletId: String, updatesJson: String, promise: Promise) {
    if (!loaded) {
      promise.reject("RUST_UNAVAILABLE", "Rust wallet store library is not loaded.")
      return
    }
    try {
      promise.resolve(nativeUpdateWalletRecordMeta(storageDir(), walletType, walletId, updatesJson))
    } catch (error: Throwable) {
      promise.reject("RUST_UPDATE_WALLET_FAILED", error.message, error)
    }
  }
}
