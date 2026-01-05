import ToastManager from 'toastify-react-native';
import type { ToastShowParams } from 'toastify-react-native';

type ToastManagerStatic = {
  show: (options: ToastShowParams) => void;
};

export const showToast = (options: ToastShowParams) => {
  (ToastManager as unknown as ToastManagerStatic).show(options);
};
