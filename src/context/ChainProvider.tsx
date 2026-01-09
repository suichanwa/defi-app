import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getJson, setJson } from '../services/storage';
import { CHAINS, getActiveChain, getActiveChainKey, setActiveChainKey, type ChainConfig, type ChainKey } from '../config/chain';
import { resetProvider } from '../services/provider';
import { resetSolanaConnection } from '../services/solanaProvider';

type ChainContextValue = {
  chain: ChainConfig;
  chainKey: ChainKey;
  setChainKey: (nextKey: ChainKey) => Promise<void>;
  ready: boolean;
};

const CHAIN_STORAGE_KEY = 'app.chain.active.v1';

const ChainContext = createContext<ChainContextValue | null>(null);

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [chainKey, setChainKeyState] = useState<ChainKey>(getActiveChainKey());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const stored = await getJson<ChainKey | null>(CHAIN_STORAGE_KEY);
      if (stored && CHAINS[stored]) {
        setActiveChainKey(stored);
        if (mounted) {
          setChainKeyState(stored);
        }
      }
      if (mounted) {
        setReady(true);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const setChainKey = useCallback(async (nextKey: ChainKey) => {
    if (!CHAINS[nextKey]) return;
    setActiveChainKey(nextKey);
    resetProvider();
    resetSolanaConnection();
    setChainKeyState(nextKey);
    await setJson(CHAIN_STORAGE_KEY, nextKey);
  }, []);

  const value = useMemo(
    () => ({
      chain: getActiveChain(),
      chainKey,
      setChainKey,
      ready,
    }),
    [chainKey, setChainKey, ready],
  );

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export const useChain = () => {
  const ctx = useContext(ChainContext);
  if (!ctx) {
    throw new Error('useChain must be used within ChainProvider');
  }
  return ctx;
};
