import React from 'react';
import { Animated, Text, View } from 'react-native';
import renderer, { act } from 'react-test-renderer';

const mockRequestSolAirdrop = jest.fn();
const mockUseWalletRefresh = jest.fn();
const mockSetNavHidden = jest.fn();
const mockChain = {
  kind: 'solana',
  cluster: 'devnet',
  nativeToken: {
    name: 'Solana',
    symbol: 'SOL',
    color: '#14f195',
    priceSymbol: 'SOLUSDT',
  },
};

jest.spyOn(Animated, 'timing').mockImplementation(
  () =>
    ({
      start: (callback?: () => void) => callback?.(),
    }) as never,
);

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
  useFocusEffect: () => undefined,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
  CardStyleInterpolators: {
    forHorizontalIOS: jest.fn(),
  },
  TransitionSpecs: {
    TransitionIOSSpec: {},
  },
}));

jest.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      border: '#d4d4d8',
      text: '#111827',
      muted: '#6b7280',
    },
  }),
}));

jest.mock('../src/ui/styles/WalletStyles', () => ({
  createWalletStyles: () => ({
    scrollContent: {},
    messageText: {},
    messageInfo: {},
    errorText: {},
    metaRow: {},
    metaText: {},
    listCard: {},
    headerRow: {},
    headerTitle: {},
    headerSubtitle: {},
    statusPill: {},
    statusText: {},
  }),
}));

jest.mock('../src/context/ChainProvider', () => ({
  useChain: () => ({
    chain: mockChain,
    chainKey: 'solanaDevnet',
    setChainKey: jest.fn(),
  }),
}));

jest.mock('../src/context/WalletSessionProvider', () => ({
  useWalletSession: () => ({
    status: 'unlocked',
    address: 'devnet-user-address',
    wallets: [],
    activeWalletId: 'devnet-user-address',
    switchWallet: jest.fn(),
    registerActivity: jest.fn(),
  }),
}));

jest.mock('../src/context/NavVisibilityProvider', () => ({
  useNavVisibility: () => ({
    setNavHidden: mockSetNavHidden,
  }),
}));

jest.mock('../src/hooks/useApiError', () => ({
  __esModule: true,
  default: () => ({
    errorMessage: null,
    errorTitle: null,
    errorVariant: 'error',
    isErrorVisible: false,
    handleError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../src/hooks/useWalletRefresh', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseWalletRefresh(...args),
}));

jest.mock('../src/services/airdrop', () => ({
  AIRDROP_ERROR_COOLDOWN_MS: 30_000,
  SOL_AIRDROP_AMOUNT: 1,
  getAirdropErrorMessage: () => 'Airdrop failed.',
  isAirdropRateLimited: () => false,
  requestSolAirdrop: (...args: unknown[]) => mockRequestSolAirdrop(...args),
}));

jest.mock('../src/services/biometrics', () => ({
  canUseBiometrics: jest.fn().mockResolvedValue(false),
  getBiometricPassword: jest.fn().mockResolvedValue(null),
  promptBiometric: jest.fn().mockResolvedValue({ success: false }),
  saveBiometricPassword: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/profileStore', () => ({
  clearProfileSettings: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/rewardsStore', () => ({
  clearRewardsCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/masterPasscodeStore', () => ({
  isMasterPasscodeSet: jest.fn().mockResolvedValue(false),
  clearMasterPasscode: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/config/appFeatures', () => ({
  appFeatures: {
    showStartFreshOnLockScreen: false,
  },
}));

jest.mock('../src/ui/components/PulseBadge', () => () => null);

jest.mock('../src/ui/components/wallet/NetworkBadge', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/ui/components/wallet/WalletSetupScreen', () => () => null);
jest.mock('../src/screens/walletScreens/AddWalletScreen', () => () => null);
jest.mock('../src/screens/walletScreens/ReceiveScreen', () => () => null);
jest.mock('../src/screens/walletScreens/SendScreen', () => () => null);
jest.mock('../src/screens/walletScreens/SwapScreen', () => () => null);
jest.mock('../src/screens/walletScreens/SendCryptoScreen', () => () => null);
jest.mock('../src/screens/walletScreens/SendCryptoComplete', () => () => null);
jest.mock('../src/screens/walletScreens/QRReceiveScreen', () => () => null);
jest.mock('../src/screens/walletScreens/ExpressSwapScreen', () => () => null);
jest.mock('../src/screens/walletScreens/ExpressSwapSuccessScreen', () => () => null);
jest.mock('../src/screens/walletScreens/WalletCardSettingsScreen', () => () => null);
jest.mock('../src/screens/walletScreens/WalletSettingsScreen', () => () => null);

jest.mock('../src/ui/components/common/ErrorDialog', () => () => null);

jest.mock('../src/screens/walletScreens/components/WalletCardCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/walletScreens/components/WalletSearchBar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/walletScreens/components/WalletTokenSearchOverlay', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/walletScreens/components/WalletTabSelector', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/walletScreens/NFTs/WalletNFTsTab', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../src/screens/walletScreens/Tokens/WalletTokensTab', () => ({
  __esModule: true,
  default: ({ tokens }: { tokens: Array<{ symbol: string; amount: number }> }) => {
    const ReactLocal = require('react');
    const { View: NativeView, Text: NativeText } = require('react-native');

    return ReactLocal.createElement(
      NativeView,
      null,
      ...tokens.map((token) =>
        ReactLocal.createElement(NativeText, { key: token.symbol }, `${token.symbol}:${token.amount}`),
      ),
    );
  },
}));

const { WalletHomeScreen } = require('../src/screens/WalletScreen');

const getRenderedText = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((node) => {
    const { children } = node.props;
    if (Array.isArray(children)) {
      return children.join('');
    }
    return String(children);
  });

describe('WalletHomeScreen airdrop flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestSolAirdrop.mockResolvedValue({ signature: 'airdrop-signature' });
    mockUseWalletRefresh.mockImplementation(
      (_chain: unknown, _status: unknown, _address: unknown, airdropTick: number) => ({
        prices: {},
        loadingPrices: false,
        priceError: null,
        lastUpdated: '12:00:00',
        lastChainUpdated: '12:00:00',
        chainTokens: [
          {
            name: 'Solana',
            symbol: 'SOL',
            amount: airdropTick > 0 ? 1 : 0,
            pair: 'SOLUSDT',
            color: '#14f195',
          },
        ],
        fetchingChain: false,
        rpcError: null,
        onScrollBeginDrag: jest.fn(),
        onScrollEndDrag: jest.fn(),
        onMomentumScrollEnd: jest.fn(),
      }),
    );
  });

  it('requests 1 SOL and refreshes the displayed balance after the user presses the devnet airdrop button', async () => {
    const navigation = { navigate: jest.fn() };
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(<WalletHomeScreen navigation={navigation} />);
    });

    expect(getRenderedText(tree!)).toContain('1 SOL');
    expect(getRenderedText(tree!)).toContain('SOL:0');

    const button = tree!.root.findByProps({ testID: 'wallet-airdrop-button' });

    await act(async () => {
      await button.props.onPress();
    });

    expect(mockRequestSolAirdrop).toHaveBeenCalledWith({
      address: 'devnet-user-address',
      amountSol: 1,
      commitment: 'confirmed',
    });
    expect(getRenderedText(tree!)).toContain('Airdrop requested. Balance will update shortly.');
    expect(getRenderedText(tree!)).toContain('SOL:1');
  });
});
