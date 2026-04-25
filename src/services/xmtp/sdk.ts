import type * as XmtpSdk from '@xmtp/react-native-sdk';

let sdk: typeof XmtpSdk | null = null;
let sdkErrorMessage: string | null = null;

try {
  sdk = require('@xmtp/react-native-sdk') as typeof XmtpSdk;
} catch (error) {
  sdkErrorMessage = error instanceof Error ? error.message : 'XMTP native module is unavailable.';
}

export const isXmtpNativeModuleAvailable = () => Boolean(sdk);
export const getXmtpSdkErrorMessage = () => sdkErrorMessage;

export const XmtpClient = sdk?.Client ?? null;
export const XmtpPublicIdentity = sdk?.PublicIdentity ?? null;
export const XmtpConversationVersion = sdk?.ConversationVersion ?? null;
