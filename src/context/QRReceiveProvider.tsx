import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type QRReceiveData = {
  symbol: string;
  name: string;
  address: string;
} | null;

type QRReceiveContextValue = {
  qrData: QRReceiveData;
  setQRData: (data: QRReceiveData) => void;
  clearQRData: () => void;
};

const QRReceiveContext = createContext<QRReceiveContextValue | null>(null);

export function QRReceiveProvider({ children }: { children: React.ReactNode }) {
  const [qrData, setQRDataState] = useState<QRReceiveData>(null);

  const setQRData = useCallback((data: QRReceiveData) => {
    setQRDataState(data);
  }, []);

  const clearQRData = useCallback(() => {
    setQRDataState(null);
  }, []);

  const value = useMemo(
    () => ({
      qrData,
      setQRData,
      clearQRData,
    }),
    [clearQRData, qrData, setQRData],
  );

  return <QRReceiveContext.Provider value={value}>{children}</QRReceiveContext.Provider>;
}

export const useQRReceive = () => {
  const context = useContext(QRReceiveContext);
  if (!context) {
    throw new Error('useQRReceive must be used within QRReceiveProvider');
  }
  return context;
};
