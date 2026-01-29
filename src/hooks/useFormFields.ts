import { useCallback, useState } from 'react';

export function useFormFields<T extends Record<string, string>>(initialFields: T) {
  const [fields, setFields] = useState<T>(initialFields);

  const setField = useCallback((key: keyof T, value: string) => {
    setFields(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFields = useCallback(() => {
    setFields(initialFields);
  }, [initialFields]);

  const resetField = useCallback((key: keyof T) => {
    setFields(prev => ({ ...prev, [key]: initialFields[key] }));
  }, [initialFields]);

  return { fields, setField, resetFields, resetField };
}