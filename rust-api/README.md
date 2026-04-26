# rust-api

Native Rust workspace for the app wallet crypto.

## Native wallet crypto

The Rust library is compiled into `librust_wallet_core.so` and loaded by:

- `android/app/src/main/java/com/yourcompany/defiaiapp/RustWalletCryptoModule.kt`

## Android build

1. Install Android targets:

```bash
rustup target add armv7-linux-androideabi aarch64-linux-android x86_64-linux-android
```

2. Install cargo-ndk:

```bash
cargo install cargo-ndk
```

3. Build and copy `.so` files into the Android app:

```bash
npm run rust:wallet:build:android
```

This outputs `.so` files into:

- `android/app/src/main/jniLibs/armeabi-v7a/`
- `android/app/src/main/jniLibs/arm64-v8a/`
- `android/app/src/main/jniLibs/x86_64/`
