import { LTC_ERC20_ADDRESS } from '@env';

export type TokenInfo = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceSymbol?: string;
  color?: string;
};

const baseTokens: TokenInfo[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    priceSymbol: 'USDCUSDT',
    color: '#0ea5e9',
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    priceSymbol: 'DAIUSDT',
    color: '#f59e0b',
  },
];

const looksLikeAddress = (value?: string) => !!value && /^0x[a-fA-F0-9]{40}$/.test(value);

export const ERC20_TOKENS: TokenInfo[] = [
  ...baseTokens,
  ...(looksLikeAddress(LTC_ERC20_ADDRESS)
    ? [
        {
          symbol: 'WLTC',
          name: 'Wrapped Litecoin',
          address: LTC_ERC20_ADDRESS,
          decimals: 18,
          priceSymbol: 'LTCUSDT',
          color: '#7c8ca0',
        },
      ]
    : []),
];

export const getErc20TokenBySymbol = (symbol: string) =>
  ERC20_TOKENS.find((token) => token.symbol === symbol.toUpperCase()) ?? null;
