import { Alert, Platform } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'default';

type ShowToastParams = {
  type?: ToastType;
  text1: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
};

export const showToast = ({
  type = 'default',
  text1,
  text2,
}: ShowToastParams) => {
  if (Platform.OS === 'web') {
    // For web, use console or a simple alert
    console.log(`[${type}] ${text1}`, text2 || '');
    return;
  }
  
  // Use native Alert for mobile
  Alert.alert(
    text1,
    text2,
    [{ text: 'OK', style: type === 'error' ? 'destructive' : 'default' }]
  );
};

export const hideToast = () => {
  // No-op for Alert-based implementation
};
