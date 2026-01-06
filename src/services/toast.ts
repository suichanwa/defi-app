import { Platform } from 'react-native';
import { notify } from './notificationService';
import type { NotificationAnimation } from '@context/NotificationProvider';

type ToastType = 'success' | 'error' | 'info' | 'default';

type ShowToastParams = {
  type?: ToastType;
  text1: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
  scope?: string;
  animation?: NotificationAnimation;
};

export const showToast = ({
  type = 'default',
  text1,
  text2,
  visibilityTime,
  scope,
  animation,
}: ShowToastParams) => {
  const mappedType = type === 'error' ? 'error' : type === 'success' ? 'success' : 'info';
  const handled = notify({
    type: mappedType,
    title: text1,
    message: text2,
    durationMs: visibilityTime,
    animation,
    scope,
  });
  if (handled) return;
  if (Platform.OS === 'web') {
    console.log(`[${type}] ${text1}`, text2 || '');
  }
};

export const hideToast = () => {
  // No-op for Alert-based implementation
};
