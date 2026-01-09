import { useCallback, useMemo, useRef, useState } from 'react';

type ErrorVariant = 'error' | 'warning' | 'info';

type ErrorHandlingOptions = {
  defaultMessage: string;
  rateLimitMessage?: string;
  title?: string;
  variant?: ErrorVariant;
  debounceMs?: number;
};

type ApiErrorState = {
  message: string;
  title: string;
  variant: ErrorVariant;
  visible: boolean;
};

const DEFAULT_DEBOUNCE_MS = 1200;

const parseStatusFromError = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const err = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    request?: { status?: number };
  };
  return (
    err.status ??
    err.statusCode ??
    err.response?.status ??
    err.request?.status ??
    null
  );
};

const isRateLimited = (error: unknown) => {
  const status = parseStatusFromError(error);
  if (status === 429) return true;
  if (!error) return false;
  if (typeof error === 'string') {
    return error.includes('429') || error.toLowerCase().includes('too many requests');
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('429') || message.includes('too many requests')) return true;
  }
  if (typeof error === 'object') {
    const err = error as { message?: string };
    if (typeof err.message === 'string') {
      const message = err.message.toLowerCase();
      if (message.includes('429') || message.includes('too many requests')) return true;
    }
  }
  return false;
};

export default function useApiError() {
  const [errorState, setErrorState] = useState<ApiErrorState>({
    message: '',
    title: 'Error',
    variant: 'error',
    visible: false,
  });
  const lastShownAt = useRef(0);

  const handleError = useCallback((error: unknown, options: ErrorHandlingOptions) => {
    const now = Date.now();
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    if (now - lastShownAt.current < debounceMs) return;
    lastShownAt.current = now;

    const rateLimited = isRateLimited(error);
    const message = rateLimited
      ? options.rateLimitMessage ?? options.defaultMessage
      : options.defaultMessage;
    const variant: ErrorVariant = options.variant ?? (rateLimited ? 'warning' : 'error');
    const title = options.title ?? (variant === 'warning' ? 'Warning' : 'Error');

    setErrorState({
      message,
      title,
      variant,
      visible: true,
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorState((prev) => ({ ...prev, visible: false, message: '' }));
  }, []);

  return useMemo(
    () => ({
      errorMessage: errorState.message,
      errorTitle: errorState.title,
      errorVariant: errorState.variant,
      isErrorVisible: errorState.visible,
      handleError,
      clearError,
    }),
    [errorState, handleError, clearError],
  );
}
