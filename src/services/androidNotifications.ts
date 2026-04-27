import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

type SecureChatNotificationPayload = {
  chatId: string;
  chatName: string;
  author: string;
  message: string;
  messageType?: 'text' | 'system' | 'image' | 'file';
};

type AndroidNotificationsModule = {
  ensureChannel: () => Promise<void>;
  notifyChatMessage: (
    chatId: string,
    chatName: string,
    author: string,
    message: string,
    messageType: SecureChatNotificationPayload['messageType'],
  ) => Promise<boolean>;
};

const moduleName = 'SecureChatNotifications';

function getModule(): AndroidNotificationsModule | null {
  const module = NativeModules[moduleName] as AndroidNotificationsModule | undefined;
  return module ?? null;
}

export async function prepareAndroidNotifications(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = getModule();
  if (!module) return false;

  if (Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const granted = await PermissionsAndroid.check(permission);
    if (!granted) {
      const result = await PermissionsAndroid.request(permission);
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }
  }

  await module.ensureChannel();
  return true;
}

export async function notifyAndroidSecureChatMessage(payload: SecureChatNotificationPayload): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const module = getModule();
  if (!module) return false;

  if (Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    const granted = await PermissionsAndroid.check(permission);
    if (!granted) return false;
  }

  try {
    return await module.notifyChatMessage(
      payload.chatId,
      payload.chatName,
      payload.author,
      payload.message,
      payload.messageType ?? 'text',
    );
  } catch (error) {
    console.warn('Failed to show Android secure chat notification.', error);
    return false;
  }
}
