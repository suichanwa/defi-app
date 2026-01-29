import { useCallback, useState } from 'react';

type AsyncState = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

export function useAsyncAction() {
  const [state, setState] = useState<AsyncState>({
    loading: false,
    error: null,
    message: null,
  });

  const execute = useCallback(async <T>(
    action: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    setState({ loading: true, error: null, message: null });
    try {
      const result = await action();
      setState({ loading: false, error: null, message: successMessage ?? null });
      return result;
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred.',
        message: null,
      });
      return null;
    }
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, loading: false, error, message: null }));
  }, []);

  const clear = useCallback(() => {
    setState({ loading: false, error: null, message: null });
  }, []);

  return { ...state, execute, setError, clear };
}