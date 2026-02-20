export type TokenInfo = {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  priceSymbol?: string; 
};

export const ERC20_TOKENS: TokenInfo[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    priceSymbol: 'USDCUSDT',
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    priceSymbol: 'DAIUSDT',
  },
];
