# Defi-App — Multi-Chain Mobile Wallet & Encrypted P2P Chat

A serverless React Native (Expo) mobile wallet and end-to-end encrypted messaging application powered by **Solana**, **Ethereum / EVM**, **XMTP v5**, and a **native Rust JNI cryptographic keystore**.

---

## Architecture Overview

```text
React Native UI (Expo 56 / React 19 / TypeScript)
 ├── Multi-Chain Wallet Layer
 │    ├── Solana (@solana/web3.js, devnet/mainnet RPCs, SPL balances, QR receive/send)
 │    ├── Ethereum / EVM (ethers v6, viem, Reown AppKit / WalletConnect)
 │    └── Native Rust Crypto Core (rust-api/src/lib.rs -> JNI librust_wallet_core.so)
 │         └── PBKDF2-HMAC-SHA256 (100k iterations) + AES-256-CTR key encryption
 └── Serverless Encrypted Messaging Layer
      ├── XMTP v5 Direct Messages (@xmtp/react-native-sdk)
      └── Decentralized Room Transport + WebSocket Relay (scripts/chatRelay.js)
```

---

## Key Features

* **Non-Custodial Multi-Chain Wallet:** Generate, import, unlock (passcode + biometrics via `expo-local-authentication` & `expo-secure-store`), and manage Solana & Ethereum accounts with QR transfers, swap views, and Solana NFT metadata (`ALCHEMY_API_KEY`).
* **Native Rust Cryptography (`rust-api/`):** Sensitive wallet key derivation (`pbkdf2_hmac::<Sha256>`, `100_000` iterations) and stream encryption (`AES-256-CTR`) implemented in Rust and exposed to Android via JNI (`cargo-ndk`).
* **Decentralized E2EE Messaging:** Direct wallet-to-wallet encrypted chats on XMTP v5 plus multi-client room messaging backed by a lightweight WebSocket relay (`ws://localhost:8082` started alongside Metro).
* **Local-First Persistence:** Encrypted keystores, local identities, DM channel state, and user preferences reside directly on device without centralized backend dependencies.

---

## Project Structure

```text
├── App.tsx                  # Root shell, providers (WalletSession, Chain, XMTP, Theme)
├── src/
│   ├── config/              # Chain & token registries
│   ├── context/             # React contexts (Chain, WalletSession, XMTP, Notification)
│   ├── hooks/               # Wallet, balances, XMTP DM, room history, security hooks
│   ├── screens/             # Wallet, Send/Receive, Swap, NFTs, SecureChat, Profile screens
│   ├── services/            # Solana/EVM transfer & balance services, Rust JNI bridge, XMTP SDK
│   ├── theme/               # Dark/light theme provider
│   ├── ui/                  # Shared components and style modules
│   └── utils/               # Mnemonic, encryption envelope, password validation helpers
├── rust-api/                # Rust cdylib/rlib crate (`rust_wallet_core`) for Android JNI crypto
├── scripts/chatRelay.js     # Local WebSocket room chat relay
├── buildScripts/            # Windows EAS/Gradle build helper scripts
└── __tests__/               # Jest + React Native unit and component test suites
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
cp .env.example .env
```

All `.env` fields are optional for local development (Solana falls back to public devnet/mainnet RPC endpoints; `ALCHEMY_API_KEY` enables Solana DAS NFT metadata; `WALLETCONNECT_PROJECT_ID` enables WalletConnect sessions).

### 2. Run Locally

```bash
npm run start
# or platform-specific targets:
npm run android
npm run web
```

### 3. Build Native Rust Crypto Library (Android)

See [`rust-api/README.md`](rust-api/README.md) for Android NDK target setup:

```bash
npm run rust:wallet:check
npm run rust:wallet:build:android
```

---

## Verification & Tests

```bash
npm run typecheck   # TypeScript check (tsc --noEmit)
npm test            # Jest unit & component test suites
npm run rust:wallet:check
```

---

## License

MIT — see [`LICENSE`](LICENSE).
