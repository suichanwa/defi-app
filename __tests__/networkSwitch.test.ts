import { Platform } from 'react-native';
import { getNextChainKey, switchNetworkAndRequireAuth } from '../src/utils/networkSwitch';

describe('networkSwitch', () => {
  const originalOS = Platform.OS;
  const originalWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
    jest.restoreAllMocks();
  });

  it('cycles networks in expected order', () => {
    expect(getNextChainKey('solanaDevnet')).toBe('solanaMainnet');
    expect(getNextChainKey('solanaMainnet')).toBe('ethereumMainnet');
    expect(getNextChainKey('ethereumMainnet')).toBe('solanaDevnet');
  });

  it('locks wallet session on native to prompt for passcode', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    const setChainKey = jest.fn(async () => {});
    const lockForNetworkSwitch = jest.fn(async () => 'locked' as const);

    const result = await switchNetworkAndRequireAuth({
      currentKey: 'solanaDevnet',
      nextKey: 'ethereumMainnet',
      setChainKey,
      lockForNetworkSwitch,
    });

    expect(setChainKey).toHaveBeenCalledWith('ethereumMainnet');
    expect(lockForNetworkSwitch).toHaveBeenCalledWith('Ethereum');
    expect(result).toBe('locked');
  });

  it('reloads the page on web after persisting the new network when unlocked', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const reload = jest.fn();
    (globalThis as { window?: unknown }).window = { location: { reload } };
    const setChainKey = jest.fn(async () => {});
    const lockForNetworkSwitch = jest.fn(async () => 'locked' as const);

    const result = await switchNetworkAndRequireAuth({
      currentKey: 'solanaDevnet',
      nextKey: 'solanaMainnet',
      setChainKey,
      lockForNetworkSwitch,
      reloadOnWeb: true,
    });

    expect(setChainKey).toHaveBeenCalledWith('solanaMainnet');
    expect(lockForNetworkSwitch).toHaveBeenCalledWith('Solana (Mainnet Beta)');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(result).toBe('reloaded');
  });

  it('falls back to passcode prompt on web when reloadOnWeb is false', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const reload = jest.fn();
    (globalThis as { window?: unknown }).window = { location: { reload } };
    const setChainKey = jest.fn(async () => {});
    const lockForNetworkSwitch = jest.fn(async () => 'locked' as const);

    const result = await switchNetworkAndRequireAuth({
      currentKey: 'solanaMainnet',
      nextKey: 'ethereumMainnet',
      setChainKey,
      lockForNetworkSwitch,
      reloadOnWeb: false,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(result).toBe('locked');
  });

  it('does not reload on web when no wallets exist yet (missing status)', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const reload = jest.fn();
    (globalThis as { window?: unknown }).window = { location: { reload } };
    const setChainKey = jest.fn(async () => {});
    const lockForNetworkSwitch = jest.fn(async () => 'missing' as const);

    const result = await switchNetworkAndRequireAuth({
      currentKey: 'solanaDevnet',
      nextKey: 'ethereumMainnet',
      setChainKey,
      lockForNetworkSwitch,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(result).toBe('missing');
  });

  it('is a no-op when nextKey equals currentKey', async () => {
    const setChainKey = jest.fn(async () => {});
    const lockForNetworkSwitch = jest.fn(async () => 'locked' as const);

    const result = await switchNetworkAndRequireAuth({
      currentKey: 'solanaDevnet',
      nextKey: 'solanaDevnet',
      setChainKey,
      lockForNetworkSwitch,
    });

    expect(setChainKey).not.toHaveBeenCalled();
    expect(lockForNetworkSwitch).not.toHaveBeenCalled();
    expect(result).toBe('unchanged');
  });
});
