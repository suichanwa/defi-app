use aes::Aes256;
use ctr::cipher::{KeyIvInit, StreamCipher};
use jni::objects::JString;
use jni::sys::{jobject, jstring};
use jni::JNIEnv;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

type Aes256Ctr = ctr::Ctr128BE<Aes256>;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LENGTH: usize = 16;
const IV_LENGTH: usize = 16;
const KEY_LENGTH: usize = 32;

#[derive(Serialize, Deserialize)]
struct EncryptedPayload {
    version: u8,
    algorithm: String,
    salt: String,
    iv: String,
    ciphertext: String,
}

fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LENGTH] {
    let mut key = [0_u8; KEY_LENGTH];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITERATIONS, &mut key);
    key
}

fn encrypt_wallet_key_impl(private_key: &str, password: &str) -> Result<String, String> {
    if private_key.trim().is_empty() {
        return Err("Private key must be a non-empty string".to_string());
    }
    if password.is_empty() {
        return Err("Password must be a non-empty string".to_string());
    }

    let mut salt = [0_u8; SALT_LENGTH];
    let mut iv = [0_u8; IV_LENGTH];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut iv);

    let key = derive_key(password, &salt);
    let mut data = private_key.as_bytes().to_vec();
    let mut cipher = Aes256Ctr::new((&key).into(), (&iv).into());
    cipher.apply_keystream(&mut data);

    let payload = EncryptedPayload {
        version: 1,
        algorithm: "aes-256-ctr".to_string(),
        salt: hex::encode(salt),
        iv: hex::encode(iv),
        ciphertext: hex::encode(data),
    };

    serde_json::to_string(&payload).map_err(|e| e.to_string())
}

fn decrypt_wallet_key_impl(encrypted_json: &str, password: &str) -> Result<String, String> {
    if password.is_empty() {
        return Err("Password must be a non-empty string".to_string());
    }

    let payload: EncryptedPayload =
        serde_json::from_str(encrypted_json).map_err(|e| format!("Invalid encrypted payload: {e}"))?;
    if payload.version != 1 || payload.algorithm != "aes-256-ctr" {
        return Err("Unsupported encryption version or algorithm".to_string());
    }

    let salt = hex::decode(payload.salt).map_err(|e| format!("Invalid salt: {e}"))?;
    let iv = hex::decode(payload.iv).map_err(|e| format!("Invalid iv: {e}"))?;
    let mut ciphertext = hex::decode(payload.ciphertext).map_err(|e| format!("Invalid ciphertext: {e}"))?;

    if salt.len() != SALT_LENGTH {
        return Err("Invalid salt length".to_string());
    }
    if iv.len() != IV_LENGTH {
        return Err("Invalid iv length".to_string());
    }

    let iv_array: [u8; IV_LENGTH] = iv
        .as_slice()
        .try_into()
        .map_err(|_| "Invalid iv length".to_string())?;
    let key = derive_key(password, &salt);
    let mut cipher = Aes256Ctr::new((&key).into(), (&iv_array).into());
    cipher.apply_keystream(&mut ciphertext);

    String::from_utf8(ciphertext).map_err(|e| format!("Invalid decrypted UTF-8: {e}"))
}

fn jstring_to_rust(env: &mut JNIEnv, value: JString) -> Result<String, String> {
    env.get_string(&value)
        .map_err(|e| e.to_string())
        .map(|s| s.to_string_lossy().into_owned())
}

fn rust_to_jstring(env: &mut JNIEnv, value: &str) -> jstring {
    match env.new_string(value) {
        Ok(s) => s.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeEncryptWalletKey(
    mut env: JNIEnv,
    _thiz: jobject,
    private_key: JString,
    password: JString,
) -> jstring {
    let private_key = match jstring_to_rust(&mut env, private_key) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let password = match jstring_to_rust(&mut env, password) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match encrypt_wallet_key_impl(&private_key, &password) {
        Ok(result) => rust_to_jstring(&mut env, &result),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeDecryptWalletKey(
    mut env: JNIEnv,
    _thiz: jobject,
    encrypted_json: JString,
    password: JString,
) -> jstring {
    let encrypted_json = match jstring_to_rust(&mut env, encrypted_json) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let password = match jstring_to_rust(&mut env, password) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match decrypt_wallet_key_impl(&encrypted_json, &password) {
        Ok(result) => rust_to_jstring(&mut env, &result),
        Err(_) => std::ptr::null_mut(),
    }
}
