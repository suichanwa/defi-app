use aes::Aes256;
use ctr::cipher::{KeyIvInit, StreamCipher};
use jni::objects::JString;
use jni::sys::{jobject, jstring};
use jni::JNIEnv;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::fs;
use std::path::{Path, PathBuf};

type Aes256Ctr = ctr::Ctr128BE<Aes256>;

const PBKDF2_ITERATIONS: u32 = 100_000;
const SALT_LENGTH: usize = 16;
const IV_LENGTH: usize = 16;
const KEY_LENGTH: usize = 32;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredWalletRecord {
    id: String,
    encrypted_json: String,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    backup_completed: Option<bool>,
    #[serde(default)]
    wallet_type: Option<String>,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    color: Option<String>,
    #[serde(default)]
    card_name: Option<String>,
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WalletStoreFile {
    #[serde(default)]
    records: Vec<StoredWalletRecord>,
    #[serde(default)]
    active_wallet_id: Option<String>,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WalletRecordUpdates {
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    color: Option<String>,
    #[serde(default)]
    card_name: Option<String>,
}

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

    let payload: EncryptedPayload = serde_json::from_str(encrypted_json)
        .map_err(|e| format!("Invalid encrypted payload: {e}"))?;
    if payload.version != 1 || payload.algorithm != "aes-256-ctr" {
        return Err("Unsupported encryption version or algorithm".to_string());
    }

    let salt = hex::decode(payload.salt).map_err(|e| format!("Invalid salt: {e}"))?;
    let iv = hex::decode(payload.iv).map_err(|e| format!("Invalid iv: {e}"))?;
    let mut ciphertext =
        hex::decode(payload.ciphertext).map_err(|e| format!("Invalid ciphertext: {e}"))?;

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

fn normalize_wallet_type(wallet_type: &str) -> String {
    let trimmed = wallet_type.trim().to_lowercase();
    if trimmed.is_empty() {
        "solana".to_string()
    } else {
        trimmed
    }
}

fn wallet_store_dir(storage_dir: &str) -> PathBuf {
    Path::new(storage_dir).join("rust_wallet_store")
}

fn wallet_store_path(storage_dir: &str, wallet_type: &str) -> PathBuf {
    wallet_store_dir(storage_dir).join(format!("{}.json", normalize_wallet_type(wallet_type)))
}

fn read_wallet_store(storage_dir: &str, wallet_type: &str) -> Result<WalletStoreFile, String> {
    let path = wallet_store_path(storage_dir, wallet_type);
    if !path.exists() {
        return Ok(WalletStoreFile::default());
    }

    let contents = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    if contents.trim().is_empty() {
        return Ok(WalletStoreFile::default());
    }

    serde_json::from_str(&contents).map_err(|error| error.to_string())
}

fn write_wallet_store(storage_dir: &str, wallet_type: &str, store: &WalletStoreFile) -> Result<(), String> {
    let path = wallet_store_path(storage_dir, wallet_type);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let serialized = serde_json::to_string_pretty(store).map_err(|error| error.to_string())?;
    fs::write(&path, serialized).map_err(|error| error.to_string())
}

fn load_records_json(storage_dir: &str, wallet_type: &str) -> Result<String, String> {
    let store = read_wallet_store(storage_dir, wallet_type)?;
    serde_json::to_string(&store.records).map_err(|error| error.to_string())
}

fn load_record_by_id_json(storage_dir: &str, wallet_type: &str, wallet_id: &str) -> Result<String, String> {
    let store = read_wallet_store(storage_dir, wallet_type)?;
    let record = store
        .records
        .into_iter()
        .find(|item| item.id == wallet_id)
        .ok_or_else(|| "Wallet record not found".to_string())?;

    serde_json::to_string(&record).map_err(|error| error.to_string())
}

fn load_single_record_json(storage_dir: &str, wallet_type: &str) -> Result<String, String> {
    let store = read_wallet_store(storage_dir, wallet_type)?;
    let record = if let Some(active_id) = store.active_wallet_id {
        store.records.into_iter().find(|item| item.id == active_id)
    } else {
        store.records.into_iter().next()
    };

    match record {
        Some(record) => serde_json::to_string(&record).map_err(|error| error.to_string()),
        None => Err("Wallet record not found".to_string()),
    }
}

fn upsert_record(storage_dir: &str, wallet_type: &str, record: StoredWalletRecord) -> Result<WalletStoreFile, String> {
    let mut store = read_wallet_store(storage_dir, wallet_type)?;
    if let Some(existing) = store.records.iter_mut().find(|item| item.id == record.id) {
        *existing = record.clone();
    } else {
        store.records.push(record.clone());
    }
    store.active_wallet_id = Some(record.id);
    write_wallet_store(storage_dir, wallet_type, &store)?;
    Ok(store)
}

fn remove_record(storage_dir: &str, wallet_type: &str, wallet_id: &str) -> Result<WalletStoreFile, String> {
    let mut store = read_wallet_store(storage_dir, wallet_type)?;
    store.records.retain(|item| item.id != wallet_id);
    if store.active_wallet_id.as_deref() == Some(wallet_id) {
        store.active_wallet_id = store.records.first().map(|item| item.id.clone());
    }
    write_wallet_store(storage_dir, wallet_type, &store)?;
    Ok(store)
}

fn update_record_meta(storage_dir: &str, wallet_type: &str, wallet_id: &str, updates: WalletRecordUpdates) -> Result<WalletStoreFile, String> {
    let mut store = read_wallet_store(storage_dir, wallet_type)?;
    let record = store
        .records
        .iter_mut()
        .find(|item| item.id == wallet_id)
        .ok_or_else(|| "Wallet record not found".to_string())?;

    if let Some(label) = updates.label {
        record.label = Some(label);
    }
    if let Some(color) = updates.color {
        record.color = Some(color);
    }
    if let Some(card_name) = updates.card_name {
        record.card_name = Some(card_name);
    }

    write_wallet_store(storage_dir, wallet_type, &store)?;
    Ok(store)
}

fn clear_wallet_store(storage_dir: &str, wallet_type: &str) -> Result<(), String> {
    let path = wallet_store_path(storage_dir, wallet_type);
    if path.exists() {
        fs::remove_file(&path).map_err(|error| error.to_string())
    } else {
        Ok(())
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

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeLoadWalletRecords(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
) -> jstring {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match load_records_json(&storage_dir, &wallet_type) {
        Ok(result) => rust_to_jstring(&mut env, &result),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeGetActiveWalletId(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
) -> jstring {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match read_wallet_store(&storage_dir, &wallet_type) {
        Ok(store) => rust_to_jstring(&mut env, store.active_wallet_id.as_deref().unwrap_or("")),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeSetActiveWalletId(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
    wallet_id: JString,
) {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_id = match jstring_to_rust(&mut env, wallet_id) {
        Ok(v) => v,
        Err(_) => return,
    };

    if let Ok(mut store) = read_wallet_store(&storage_dir, &wallet_type) {
        store.active_wallet_id = if wallet_id.trim().is_empty() { None } else { Some(wallet_id) };
        let _ = write_wallet_store(&storage_dir, &wallet_type, &store);
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeLoadEncryptedWalletKeyById(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
    wallet_id: JString,
) -> jstring {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_id = match jstring_to_rust(&mut env, wallet_id) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match load_record_by_id_json(&storage_dir, &wallet_type, &wallet_id) {
        Ok(result) => rust_to_jstring(&mut env, &result),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeLoadEncryptedWalletKey(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
) -> jstring {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match load_single_record_json(&storage_dir, &wallet_type) {
        Ok(result) => rust_to_jstring(&mut env, &result),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeSaveEncryptedWalletKey(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
    record_json: JString,
) {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return,
    };
    let record_json = match jstring_to_rust(&mut env, record_json) {
        Ok(v) => v,
        Err(_) => return,
    };

    let mut record: StoredWalletRecord = match serde_json::from_str(&record_json) {
        Ok(v) => v,
        Err(_) => return,
    };
    if record.wallet_type.is_none() {
        record.wallet_type = Some(normalize_wallet_type(&wallet_type));
    }

    let _ = upsert_record(&storage_dir, &wallet_type, record);
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeMarkBackupCompleted(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
) {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return,
    };

    if let Ok(mut store) = read_wallet_store(&storage_dir, &wallet_type) {
        if let Some(active_id) = store.active_wallet_id.clone() {
            if let Some(record) = store.records.iter_mut().find(|item| item.id == active_id) {
                record.backup_completed = Some(true);
            }
            let _ = write_wallet_store(&storage_dir, &wallet_type, &store);
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeClearWallet(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
) {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return,
    };

    let _ = clear_wallet_store(&storage_dir, &wallet_type);
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeRemoveWalletRecord(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
    wallet_id: JString,
) {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return,
    };
    let wallet_id = match jstring_to_rust(&mut env, wallet_id) {
        Ok(v) => v,
        Err(_) => return,
    };

    let _ = remove_record(&storage_dir, &wallet_type, &wallet_id);
}

#[no_mangle]
pub extern "system" fn Java_com_yourcompany_defiaiapp_RustWalletCryptoModule_nativeUpdateWalletRecordMeta(
    mut env: JNIEnv,
    _thiz: jobject,
    storage_dir: JString,
    wallet_type: JString,
    wallet_id: JString,
    updates_json: JString,
) -> jstring {
    let storage_dir = match jstring_to_rust(&mut env, storage_dir) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_type = match jstring_to_rust(&mut env, wallet_type) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let wallet_id = match jstring_to_rust(&mut env, wallet_id) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };
    let updates_json = match jstring_to_rust(&mut env, updates_json) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    let updates: WalletRecordUpdates = match serde_json::from_str(&updates_json) {
        Ok(v) => v,
        Err(_) => return std::ptr::null_mut(),
    };

    match update_record_meta(&storage_dir, &wallet_type, &wallet_id, updates) {
        Ok(store) => match serde_json::to_string(&store.records) {
            Ok(result) => rust_to_jstring(&mut env, &result),
            Err(_) => std::ptr::null_mut(),
        },
        Err(_) => std::ptr::null_mut(),
    }
}

#[cfg(test)]
mod tests {
    use super::{decrypt_wallet_key_impl, encrypt_wallet_key_impl};

    #[test]
    fn encrypts_and_decrypts_wallet_key() {
        let encrypted = encrypt_wallet_key_impl("secret-key", "password").expect("encrypt");
        let decrypted = decrypt_wallet_key_impl(&encrypted, "password").expect("decrypt");

        assert_eq!(decrypted, "secret-key");
    }

    #[test]
    fn rejects_empty_private_key() {
        let err = encrypt_wallet_key_impl("", "password").unwrap_err();

        assert_eq!(err, "Private key must be a non-empty string");
    }
}
