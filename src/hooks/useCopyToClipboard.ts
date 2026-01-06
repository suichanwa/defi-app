import { useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import { showToast } from '@services/toast';

type CopyOptions = {
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
  onSuccess?: () => void;
  onError?: () => void;
  scope?: string;
  animation?: 'slide' | 'fade' | 'scale';
};

export const useCopyToClipboard = () => {
  const copyText = useCallback(async (text: string, options?: CopyOptions) => {
    const showToasts = options?.showToast ?? true;
    if (!text) {
      if (showToasts) {
        showToast({
          type: 'error',
          text1: options?.errorMessage ?? 'Nothing to copy',
          scope: options?.scope,
          animation: options?.animation,
        });
      }
      options?.onError?.();
      return false;
    }
    try {
      await Clipboard.setStringAsync(text);
      if (showToasts) {
        showToast({
          type: 'success',
          text1: options?.successMessage ?? 'Copied to clipboard',
          scope: options?.scope,
          animation: options?.animation,
        });
      }
      options?.onSuccess?.();
      return true;
    } catch {
      if (showToasts) {
        showToast({
          type: 'error',
          text1: options?.errorMessage ?? 'Unable to copy',
          scope: options?.scope,
          animation: options?.animation,
        });
      }
      options?.onError?.();
      return false;
    }
  }, []);

  return { copyText };
};
