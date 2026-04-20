import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@xmtp/react-native-sdk';
import { useWalletSession } from './WalletSessionProvider';
import { getOrCreateXmtpDbKey } from '@services/xmtp/dbKeyStore';
import { createXmtpEoaSigner, isEvmAddress, isEvmMessageSigner } from '@services/xmtp/signer';
import { getXmtpEnvironment } from '@services/xmtp/config';
import { XMTP_APP_VERSION } from '@services/xmtp/constants';

type XmtpStatus = 'idle' | 'unsupported' | 'initializing' | 'ready' | 'error';

type XmtpContextValue = {
  client: Client | null;
  status: XmtpStatus;
  error: string | null;
  walletAddress: string | null;
  reconnect: () => Promise<void>;
};

const XmtpContext = createContext<XmtpContextValue | null>(null);

async function dropXmtpClient(client: Client | null): Promise<void> {
  if (!client) return;
  try {
    await Client.dropClient(client.installationId);
  } catch {
    // Keep drop best-effort to avoid blocking app state transitions.
  }
}

export function XmtpProvider({ children }: { children: React.ReactNode }) {
  const { status: walletStatus, wallet, address } = useWalletSession();
  const [client, setClient] = useState<Client | null>(null);
  const [status, setStatus] = useState<XmtpStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const activeInitRef = useRef(0);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const disconnectCurrentClient = useCallback(async () => {
    const existing = clientRef.current;
    clientRef.current = null;
    setClient(null);
    setWalletAddress(null);
    await dropXmtpClient(existing);
  }, []);

  const initClient = useCallback(async () => {
    const canUseWallet =
      walletStatus === 'unlocked' &&
      Boolean(address) &&
      isEvmAddress(address ?? '') &&
      isEvmMessageSigner(wallet);

    if (!canUseWallet) {
      await disconnectCurrentClient();
      setError(null);
      setStatus(walletStatus === 'unlocked' ? 'unsupported' : 'idle');
      return;
    }

    const normalizedAddress = address!.toLowerCase();
    if (clientRef.current && walletAddress === normalizedAddress) {
      setStatus('ready');
      setError(null);
      return;
    }

    const initId = Date.now();
    activeInitRef.current = initId;
    setStatus('initializing');
    setError(null);

    try {
      const dbEncryptionKey = await getOrCreateXmtpDbKey(normalizedAddress);
      const signer = createXmtpEoaSigner(wallet, normalizedAddress);
      const options = {
        env: getXmtpEnvironment(),
        dbEncryptionKey,
        appVersion: XMTP_APP_VERSION,
      };
      const nextClient = await Client.create(signer, options);

      if (activeInitRef.current !== initId) {
        await dropXmtpClient(nextClient);
        return;
      }

      const previous = clientRef.current;
      clientRef.current = nextClient;
      setClient(nextClient);
      setWalletAddress(normalizedAddress);
      setStatus('ready');
      setError(null);
      await dropXmtpClient(previous);
    } catch (nextError) {
      if (activeInitRef.current !== initId) return;
      await disconnectCurrentClient();
      setStatus('error');
      setError(nextError instanceof Error ? nextError.message : 'Failed to initialize XMTP client.');
    }
  }, [address, disconnectCurrentClient, wallet, walletAddress, walletStatus]);

  useEffect(() => {
    void initClient();
  }, [initClient]);

  useEffect(() => {
    return () => {
      void disconnectCurrentClient();
    };
  }, [disconnectCurrentClient]);

  const value = useMemo<XmtpContextValue>(
    () => ({
      client,
      status,
      error,
      walletAddress,
      reconnect: initClient,
    }),
    [client, error, initClient, status, walletAddress],
  );

  return <XmtpContext.Provider value={value}>{children}</XmtpContext.Provider>;
}

export function useXmtpClient() {
  const context = useContext(XmtpContext);
  if (!context) {
    throw new Error('useXmtpClient must be used within XmtpProvider');
  }
  return context;
}
