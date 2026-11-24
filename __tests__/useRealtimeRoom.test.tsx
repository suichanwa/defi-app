import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useRealtimeRoom } from '../src/hooks/secureChat/useRealtimeRoom';

const mockDestroy = jest.fn();
const mockSendBroadcast = jest.fn().mockResolvedValue(undefined);
const mockSendTyping = jest.fn().mockResolvedValue(undefined);
const mockTransportInstances: Array<{ opts: unknown }> = [];

jest.mock('../src/services/securechat/roomTransport', () => ({
  DecentralizedRoomTransport: jest.fn().mockImplementation((opts: unknown) => {
    mockTransportInstances.push({ opts });
    return {
      destroy: mockDestroy,
      sendBroadcast: mockSendBroadcast,
      sendTyping: mockSendTyping,
    };
  }),
}));

function TestHarness({ enabled }: { enabled: boolean }) {
  const { isReady, participantCount } = useRealtimeRoom({
    enabled,
    roomId: 'global',
    presenceKey: 'anon_test',
    onIncomingMessage: jest.fn(),
  });
  return React.createElement('View', { testID: `${isReady}:${participantCount}` });
}

describe('useRealtimeRoom gating & chatRelay config', () => {
  beforeEach(() => {
    mockDestroy.mockClear();
    mockTransportInstances.length = 0;
  });

  it('does not connect to room transport when enabled is false', async () => {
    await act(async () => {
      renderer.create(React.createElement(TestHarness, { enabled: false }));
    });

    expect(mockTransportInstances).toHaveLength(0);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('connects only once enabled becomes true and disconnects when disabled again', async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(React.createElement(TestHarness, { enabled: false }));
    });
    expect(mockTransportInstances).toHaveLength(0);

    await act(async () => {
      tree.update(React.createElement(TestHarness, { enabled: true }));
    });
    expect(mockTransportInstances).toHaveLength(1);

    await act(async () => {
      tree.update(React.createElement(TestHarness, { enabled: false }));
    });
    expect(mockDestroy).toHaveBeenCalledTimes(1);

    await act(async () => {
      tree.unmount();
    });
  });

  it('binds chatRelay to 127.0.0.1 by default and honors CHAT_RELAY_HOST env var', () => {
    const prevHost = process.env.CHAT_RELAY_HOST;
    const prevPort = process.env.CHAT_RELAY_PORT;
    try {
      delete process.env.CHAT_RELAY_HOST;
      delete process.env.CHAT_RELAY_PORT;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { resolveRelayConfig } = require('../scripts/chatRelay');

      expect(resolveRelayConfig()).toEqual({ port: 8082, host: '127.0.0.1' });

      process.env.CHAT_RELAY_HOST = '0.0.0.0';
      process.env.CHAT_RELAY_PORT = '9090';
      expect(resolveRelayConfig()).toEqual({ port: 9090, host: '0.0.0.0' });
    } finally {
      if (prevHost === undefined) delete process.env.CHAT_RELAY_HOST;
      else process.env.CHAT_RELAY_HOST = prevHost;
      if (prevPort === undefined) delete process.env.CHAT_RELAY_PORT;
      else process.env.CHAT_RELAY_PORT = prevPort;
    }
  });
});
