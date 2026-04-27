import { createNotifyIncomingMessage } from '../src/services/securechat/handlemessage';
import type { ChatMessage, ChatThread } from '../src/types/securechat-types/secureChat';

jest.mock('@utils/secureChatImages', () => ({
  decodeChatImageContent: jest.fn(),
  resolveChatImageMessage: jest.fn(),
}));

jest.mock('@services/supabaseClient', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}));

const incomingMessage: ChatMessage = {
  id: 'msg-1',
  chatId: 'dm:xmtp:1',
  author: 'Alice',
  authorId: 'peer-1',
  content: 'Hello from Alice',
  timestamp: '10:00',
  outgoing: false,
  type: 'text',
};

const chat: ChatThread = {
  id: 'dm:xmtp:1',
  name: 'Alice DM',
  participants: ['Me', 'Alice'],
  peerAddress: 'peer-1',
  isDM: true,
};

describe('createNotifyIncomingMessage', () => {
  it('uses native notifications and leaves in-app notifications off by default', () => {
    const showToast = jest.fn();
    const notifyNative = jest.fn();
    const notifyIncoming = createNotifyIncomingMessage({
      effectiveUserId: 'me',
      displayLabel: 'Me',
      mutedChatIds: new Set(),
      secureTab: 'chats',
      chatView: 'list',
      selectedChatId: '',
      getChatById: () => chat,
      showToast,
      notifyNative,
    });

    notifyIncoming(incomingMessage.chatId, incomingMessage);

    expect(showToast).not.toHaveBeenCalled();
    expect(notifyNative).toHaveBeenCalledWith({
      chatId: incomingMessage.chatId,
      chatName: chat.name,
      message: incomingMessage,
    });
  });

  it('can still opt into reusable in-app notifications', () => {
    const showToast = jest.fn();
    const notifyNative = jest.fn();
    const notifyIncoming = createNotifyIncomingMessage({
      effectiveUserId: 'me',
      displayLabel: 'Me',
      mutedChatIds: new Set(),
      secureTab: 'chats',
      chatView: 'list',
      selectedChatId: '',
      getChatById: () => chat,
      showToast,
      notifyNative,
      showInAppNotification: true,
    });

    notifyIncoming(incomingMessage.chatId, incomingMessage);

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        text1: chat.name,
        text2: incomingMessage.content,
      }),
    );
    expect(notifyNative).toHaveBeenCalled();
  });
});
