import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'messages';
let readyPromise: Promise<void> | null = null;

const ensureHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

export const ensureNotificationReady = async () => {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    ensureHandler();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Messages',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.requestPermissionsAsync();
  })();
  return readyPromise;
};

export const notifyChatMessage = async ({
  title,
  body,
  data,
}: {
  title: string;
  body: string;
  data?: Record<string, string>;
}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: null,
  });
};
