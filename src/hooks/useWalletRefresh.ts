import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ERC20_TOKENS } from '@config/tokens';
import type { ChainConfig } from '@config/chain';
import { fetchNativeBalance, fetchTokenBalances } from '@services/balances';
import { fetchSolBalance } from '@services/solanaBalances';
import { rpcErrorMessage } from '@utils/walletErrors';
import useDoubleScrollRefresh from './useDoubleScrollRefresh';

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

type UseWalletRefreshResult = {
  prices: Record<string, number>;
  loadingPrices: boolean;
  priceError: string | null;
  lastUpdated: string | null;
  lastChainUpdated: string | null;
  chainTokens: TokenBalance[];
  fetchingChain: boolean;
  rpcError: string | null;
  refreshAll: () => void;
  onScrollBeginDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

const buildDefaultTokens = (chain: ChainConfig): TokenBalance[] => [
  {
    name: chain.nativeToken.name,
    symbol: chain.nativeToken.symbol,
    amount: 0,
    pair: chain.nativeToken.priceSymbol,
    color: chain.nativeToken.color,
  },
  ...(chain.kind === 'ethereum'
    ? ERC20_TOKENS.map<TokenBalance>((token) => ({
        name: token.name,
        symbol: token.symbol,
        amount: 0,
        pair: token.priceSymbol,
        color: token.color ?? '#f59e0b',
      }))
    : []),
];

const isLikelyEthereumAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

export default function useWalletRefresh(
  chain: ChainConfig,
  status: 'loading' | 'missing' | 'locked' | 'unlocked',
  address: string | null,
  airdropTick: number,
  refreshIntervalMs = 15000,
  chainTimeoutMs = 7000,
): UseWalletRefreshResult {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastChainUpdated, setLastChainUpdated] = useState<string | null>(null);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(() => buildDefaultTokens(chain));
  const [fetchingChain, setFetchingChain] = useState(false);
  const [rpcError, setRpcError] = useState<string | null>(null);

  const isPriceFetchingRef = useRef(false);
  const isChainFetchingRef = useRef(false);
  const isScrollingRef = useRef(false);

  const trackedPairs = useMemo(() => chainTokens.filter((t) => t.pair).map((t) => t.pair as string), [chainTokens]);

  const fetchPrices = useCallback(async () => {
    if (trackedPairs.length === 0) return;
    if (isPriceFetchingRef.current) return;
    isPriceFetchingRef.current = true;
    setLoadingPrices(true);
    setPriceError(null);
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
        JSON.stringify(trackedPairs),
      )}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance status ${response.status}`);
      }
      const data: { symbol: string; price: string }[] = await response.json();
      const next: Record<string, number> = {};
      data.forEach((item) => {
        next[item.symbol] = Number(item.price);
      });
      setPrices(next);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setPriceError('Unable to load live prices right now.');
    } finally {
      isPriceFetchingRef.current = false;
      setLoadingPrices(false);
    }
  }, [trackedPairs]);

  const loadOnChain = useCallback(async () => {
    if (status !== 'unlocked' || !address) return;
    if (chain.kind === 'solana' && isLikelyEthereumAddress(address)) {
      setRpcError('Switch to a Solana wallet for this chain, then relaunch the app.');
      return;
    }
    if (chain.kind === 'ethereum' && !isLikelyEthereumAddress(address)) {
      setRpcError('Switch to an Ethereum wallet for this chain, then relaunch the app.');
      return;
    }
    if (isChainFetchingRef.current) return;
    isChainFetchingRef.current = true;
    setFetchingChain(true);
    let didTimeout = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          didTimeout = true;
          reject(new Error('chain-timeout'));
        }, chainTimeoutMs);
      });

      const fetchPromise = (async () => {
        if (chain.kind === 'solana') {
          const native = await fetchSolBalance(address);
          const nextTokens: TokenBalance[] = buildDefaultTokens(chain).map((token) =>
            token.symbol === chain.nativeToken.symbol ? { ...token, amount: Number(native) } : token,
          );
          return nextTokens;
        }
        const [native, erc20] = await Promise.all([
          fetchNativeBalance(address),
          fetchTokenBalances(address, ERC20_TOKENS),
        ]);
        return buildDefaultTokens(chain).map((token) => {
          if (token.symbol === chain.nativeToken.symbol) {
            return { ...token, amount: Number(native) };
          }
          const match = erc20[token.symbol];
          return { ...token, amount: match ? Number(match) : 0 };
        });
      })();

      const nextTokens = await Promise.race([fetchPromise, timeoutPromise]);
      if (didTimeout) return;
      setChainTokens(nextTokens);
      setRpcError(null);
      setLastChainUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      if (didTimeout) return;
      const rpcMessage = rpcErrorMessage(error);
      setRpcError(rpcMessage ?? 'Unable to load on-chain balances.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      isChainFetchingRef.current = false;
      setFetchingChain(false);
    }
  }, [address, chain, chainTimeoutMs, status]);

  useEffect(() => {
    setChainTokens(buildDefaultTokens(chain));
    setPriceError(null);
  }, [chain]);

  useEffect(() => {
    if (status !== 'unlocked') return;
    fetchPrices();
    const interval = setInterval(() => {
      if (isScrollingRef.current) return;
      fetchPrices();
    }, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshIntervalMs, status]);

  useEffect(() => {
    loadOnChain();
  }, [loadOnChain, airdropTick]);

  const refreshAll = useCallback(() => {
    fetchPrices();
    loadOnChain();
  }, [fetchPrices, loadOnChain]);

  const handleScrollBeginDrag = useCallback((_: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(velocityY) < 0.1) {
      isScrollingRef.current = false;
    }
  }, []);

  const handleMomentumEnd = useCallback((_: NativeSyntheticEvent<NativeScrollEvent>) => {
    isScrollingRef.current = false;
  }, []);

  const { onScrollEndDrag: onDoubleScrollEndDrag } = useDoubleScrollRefresh({ onTrigger: refreshAll });

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      handleScrollEndDrag(event);
      onDoubleScrollEndDrag(event);
    },
    [handleScrollEndDrag, onDoubleScrollEndDrag],
  );

  return {
    prices,
    loadingPrices,
    priceError,
    lastUpdated,
    lastChainUpdated,
    chainTokens,
    fetchingChain,
    rpcError,
    refreshAll,
    onScrollBeginDrag: handleScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollEnd: handleMomentumEnd,
  };
}
