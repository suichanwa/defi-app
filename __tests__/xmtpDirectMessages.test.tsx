import React, { useEffect } from 'react';
import renderer, { act } from 'react-test-renderer';

const mockUseXmtpClient = jest.fn();
const mockResolvePeerXmtpAddress = jest.fn();
const mockMapXmtpDmToChatThread = jest.fn();
const mockMapXmtpMessageToChatMessage = jest.fn();
const mockXmtpConversationIdToChatId = jest.fn();
const mockXmtpChatIdToConversationId = jest.fn();

const MockPublicIdentity = jest.fn().mockImplementation((identifier: string, chain: string) => ({
  identifier,
  chain,
}));

jest.mock('@context/XmtpProvider', () => ({
  useXmtpClient: () => mockUseXmtpClient(),
}));

jest.mock('@services/xmtp/addressResolver', () => ({
  resolvePeerXmtpAddress: (...args: unknown[]) => mockResolvePeerXmtpAddress(...args),
}));

jest.mock('@services/xmtp/mappers', () => ({
  mapXmtpDmToChatThread: (...args: unknown[]) => mockMapXmtpDmToChatThread(...args),
  mapXmtpMessageToChatMessage: (...args: unknown[]) => mockMapXmtpMessageToChatMessage(...args),
  xmtpConversationIdToChatId: (...args: unknown[]) => mockXmtpConversationIdToChatId(...args),
  xmtpChatIdToConversationId: (...args: unknown[]) => mockXmtpChatIdToConversationId(...args),
}));

jest.mock('@services/xmtp/sdk', () => ({
  isXmtpNativeModuleAvailable: () => true,
  XmtpConversationVersion: { DM: 'DM' },
  XmtpPublicIdentity: MockPublicIdentity,
}));

const { useXmtpDirectMessages } = require('../src/hooks/secureChat/useXmtpDirectMessages');

type HookApi = ReturnType<typeof useXmtpDirectMessages>;

type HookHarnessProps = {
  onReady: (api: HookApi) => void;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
};

function HookHarness({ onReady, setMessagesByChat }: HookHarnessProps) {
  const api = useXmtpDirectMessages({
    displayLabel: 'Alice',
    isActive: false,
    notifyIncoming: jest.fn(),
    setMessagesByChat,
    onError: jest.fn(),
  });

  useEffect(() => {
    onReady(api);
  }, [api, onReady]);

  return null;
}

describe('useXmtpDirectMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolvePeerXmtpAddress.mockResolvedValue({
      xmtpEvmAddress: '0xe159a1193c224c7b4ad819fc653a2ea59b9d8725',
      alias: 'Augustin',
      source: 'evm',
    });
    mockXmtpConversationIdToChatId.mockImplementation((conversationId: string) => `dm:xmtp:${conversationId}`);
    mockXmtpChatIdToConversationId.mockImplementation((chatId: string) => chatId.replace('dm:xmtp:', ''));
    mockMapXmtpDmToChatThread.mockResolvedValue({
      id: 'dm:xmtp:conv-1',
      name: 'Augustin',
      participants: ['Alice', 'Augustin'],
      peerAddress: 'inbox-b',
      isOnline: true,
      isDM: true,
    });
  });

  it('starts a DM and sends a message to a peer wallet', async () => {
    const mockDm = {
      id: 'conv-1',
      version: 'DM',
      lastMessage: null,
      peerInboxId: jest.fn().mockResolvedValue('inbox-b'),
      sync: jest.fn().mockResolvedValue(undefined),
      messages: jest.fn().mockResolvedValue([
        {
          id: 'msg-1',
          sentNs: 1_000_000,
          senderInboxId: 'inbox-a',
          content: () => 'hello from alice',
          fallback: null,
        },
      ]),
      send: jest.fn().mockResolvedValue(undefined),
    };

    const mockClient = {
      inboxId: 'inbox-a',
      conversations: {
        findConversation: jest.fn().mockResolvedValue(mockDm),
        findConversationByTopic: jest.fn().mockResolvedValue(null),
        findOrCreateDmWithIdentity: jest.fn().mockResolvedValue(mockDm),
        sync: jest.fn().mockResolvedValue(undefined),
        listDms: jest.fn().mockResolvedValue([mockDm]),
        streamAllMessages: jest.fn().mockResolvedValue(undefined),
        cancelStreamAllMessages: jest.fn(),
      },
    };

    mockUseXmtpClient.mockReturnValue({
      client: mockClient,
      status: 'ready',
      error: null,
    });

    mockMapXmtpMessageToChatMessage.mockImplementation((message: any, chatId: string) => ({
      id: message.id,
      chatId,
      authorId: message.senderInboxId,
      author: 'Alice',
      content: message.content(),
      timestamp: '21:52',
      createdAt: '2026-04-25T21:52:00.000Z',
      outgoing: true,
      type: 'text',
    }));

    let api: HookApi | null = null;
    let messagesByChat: Record<string, any[]> = {};
    const setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, any[]>>> = (updater) => {
      messagesByChat =
        typeof updater === 'function'
          ? (updater as (prev: Record<string, any[]>) => Record<string, any[]>)(messagesByChat)
          : updater;
    };

    await act(async () => {
      renderer.create(
        <HookHarness
          onReady={(nextApi) => {
            api = nextApi;
          }}
          setMessagesByChat={setMessagesByChat}
        />, 
      );
    });

    expect(api).toBeTruthy();

    let chatId = '';
    await act(async () => {
      chatId = await api!.startDM('0xa38E5d9CD49fF2fDc7D9B96bbb3DF4FF6d1ff787', 'Augustin');
    });

    expect(chatId).toBe('dm:xmtp:conv-1');
    expect(MockPublicIdentity).toHaveBeenCalledWith('0xe159a1193c224c7b4ad819fc653a2ea59b9d8725', 'ETHEREUM');

    let result: { sent: boolean; error?: string } | undefined;
    await act(async () => {
      result = await api!.sendText({ chatId, content: 'hello from alice' });
    });

    expect(result).toEqual({ sent: true });
    expect(mockDm.send).toHaveBeenCalledWith('hello from alice');
    expect(messagesByChat[chatId]).toBeDefined();
    expect(messagesByChat[chatId][0].content).toBe('hello from alice');
  });

  it('throws the provider error when XMTP client is unavailable', async () => {
    mockUseXmtpClient.mockReturnValue({
      client: null,
      status: 'error',
      error: 'XMTP create failed: java.lang.ExceptionInInitializerError',
    });

    let api: HookApi | null = null;

    await act(async () => {
      renderer.create(
        <HookHarness
          onReady={(nextApi) => {
            api = nextApi;
          }}
          setMessagesByChat={jest.fn() as unknown as React.Dispatch<
            React.SetStateAction<Record<string, any[]>>
          >}
        />,
      );
    });

    await expect(api!.startDM('0xe159a1193c224C7b4AD819fC653A2eA59b9d8725', 'Augustin')).rejects.toThrow(
      'XMTP create failed: java.lang.ExceptionInInitializerError',
    );
  });
});
