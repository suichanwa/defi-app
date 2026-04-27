import type * as XmtpSdk from '@xmtp/react-native-sdk';

let sdk: typeof XmtpSdk | null = null;
let sdkErrorMessage: string | null = null;

type NativeXmtpModuleShape = {
  create?: unknown;
  default?: NativeXmtpModuleShape;
};

const hasClientExport = (value: unknown): value is { Client: unknown } =>
  !!value && typeof value === 'object' && 'Client' in (value as Record<string, unknown>);

const unwrapDefaultModule = <T extends object>(value: unknown): T | null => {
  let current = value as unknown;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== 'object') return null;
    if (hasClientExport(current)) return current as T;
    if (!('default' in (current as Record<string, unknown>))) break;
    current = (current as { default?: unknown }).default;
  }
  return current && typeof current === 'object' ? (current as T) : null;
};

const patchNativeXmtpInterop = (): { ok: boolean; reason?: string } => {
  try {
    const nativeModuleEntry = require('@xmtp/react-native-sdk/build/XMTPModule') as {
      default?: NativeXmtpModuleShape;
    };
    const root = nativeModuleEntry?.default;
    const nested = root?.default;
    if (
      root &&
      nested &&
      typeof root.create !== 'function' &&
      typeof nested.create === 'function'
    ) {
      Object.assign(root, nested);
    }
    if (!root || typeof root.create !== 'function') {
      return {
        ok: false,
        reason:
          'XMTP native module is not linked in this runtime. Use a dev/release build (not Expo Go) and restart Metro with cache clear.',
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        'XMTP native module failed to load. Use a dev/release build (not Expo Go) and restart Metro with cache clear.',
    };
  }
};

try {
  const nativeInterop = patchNativeXmtpInterop();
  if (!nativeInterop.ok) {
    throw new Error(nativeInterop.reason);
  }
  const loaded = require('@xmtp/react-native-sdk');
  sdk = unwrapDefaultModule<typeof XmtpSdk>(loaded);
  if (!sdk || !hasClientExport(sdk)) {
    throw new Error('Invalid @xmtp/react-native-sdk module shape.');
  }
} catch (error) {
  sdkErrorMessage = error instanceof Error ? error.message : 'XMTP native module is unavailable.';
}

export const isXmtpNativeModuleAvailable = () => Boolean(sdk?.Client);
export const getXmtpSdkErrorMessage = () => sdkErrorMessage;

export const XmtpClient = sdk?.Client ?? null;
export const XmtpPublicIdentity = sdk?.PublicIdentity ?? null;
export const XmtpConversationVersion = sdk?.ConversationVersion ?? null;
export const createXmtpReadReceiptCodec = () => (sdk?.ReadReceiptCodec ? new sdk.ReadReceiptCodec() : null);
