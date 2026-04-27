import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { notifyAndroidSecureChatMessage, prepareAndroidNotifications } from '../src/services/androidNotifications';

const originalPlatformOs = Platform.OS;
const originalPlatformVersion = Platform.Version;
const originalModule = NativeModules.SecureChatNotifications;

function setAndroidPlatform(version: number) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => 'android',
  });
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    get: () => version,
  });
}

describe('androidNotifications', () => {
  beforeEach(() => {
    setAndroidPlatform(32);
    NativeModules.SecureChatNotifications = {
      ensureChannel: jest.fn().mockResolvedValue(undefined),
      notifyChatMessage: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalPlatformOs,
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      get: () => originalPlatformVersion,
    });
    NativeModules.SecureChatNotifications = originalModule;
    jest.restoreAllMocks();
  });

  it('calls the Android native module with positional chat notification arguments', async () => {
    await expect(
      notifyAndroidSecureChatMessage({
        chatId: 'dm:xmtp:1',
        chatName: 'Alice',
        author: 'Alice',
        message: 'Hello',
        messageType: 'text',
      }),
    ).resolves.toBe(true);

    expect(NativeModules.SecureChatNotifications.notifyChatMessage).toHaveBeenCalledWith(
      'dm:xmtp:1',
      'Alice',
      'Alice',
      'Hello',
      'text',
    );
  });

  it('does not request Android 13 notification permission when already granted', async () => {
    setAndroidPlatform(33);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    const requestSpy = jest.spyOn(PermissionsAndroid, 'request');

    await expect(prepareAndroidNotifications()).resolves.toBe(true);

    expect(requestSpy).not.toHaveBeenCalled();
    expect(NativeModules.SecureChatNotifications.ensureChannel).toHaveBeenCalled();
  });
});
