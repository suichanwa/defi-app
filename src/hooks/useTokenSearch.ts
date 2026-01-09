import { useCallback, useEffect, useMemo, useState } from 'react';

type TokenQuote = {
  symbol: string;
  name: string;
  price: number | null;
};

type UseTokenSearchResult = {
  query: string;
  setQuery: (value: string) => void;
  tokens: TokenQuote[];
  filteredTokens: TokenQuote[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const TOKEN_LIST: TokenQuote[] = [
  { symbol: 'SOLUSDT', name: 'Solana', price: null },
  { symbol: 'USDCUSDT', name: 'USD Coin', price: null },
];

export default function useTokenSearch(active: boolean): UseTokenSearchResult {
  const [tokens, setTokens] = useState<TokenQuote[]>(TOKEN_LIST);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const symbols = TOKEN_LIST.map((token) => token.symbol);
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance status ${response.status}`);
      }
      const data: { symbol: string; price: string }[] = await response.json();
      const priceMap = data.reduce<Record<string, number>>((acc, item) => {
        acc[item.symbol] = Number(item.price);
        return acc;
      }, {});
      setTokens(
        TOKEN_LIST.map((token) => ({
          ...token,
          price: typeof priceMap[token.symbol] === 'number' ? priceMap[token.symbol] : null,
        })),
      );
    } catch {
      setError('Unable to load token prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    refresh();
  }, [active, refresh]);

  const filteredTokens = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tokens;
    return tokens.filter((token) => {
      return token.symbol.toLowerCase().includes(needle) || token.name.toLowerCase().includes(needle);
    });
  }, [query, tokens]);

  return { query, setQuery, tokens, filteredTokens, loading, error, refresh };
}
