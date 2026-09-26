import { DecentralizedRoomTransport } from '../src/services/securechat/roomTransport';
import type { ChatMessage } from '../src/types/securechat-types/secureChat';

describe('DecentralizedRoomTransport', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with self participant count and calls onSubscribed', () => {
    const onSubscribed = jest.fn();
    const onPresenceChange = jest.fn();
    const onIncomingMessage = jest.fn();

    const transport = new DecentralizedRoomTransport({
      roomId: 'test-room',
      presenceKey: 'user-alice',
      onSubscribed,
      onPresenceChange,
      onIncomingMessage,
    });

    expect(transport.getParticipantCount()).toBe(1);

    jest.advanceTimersByTime(500);

    expect(onSubscribed).toHaveBeenCalled();
    expect(onPresenceChange).toHaveBeenCalledWith(1);

    transport.destroy();
  });

  it('handles incoming messages and avoids duplicates', async () => {
    const onIncomingMessage = jest.fn();
    const transport = new DecentralizedRoomTransport({
      roomId: 'test-room',
      presenceKey: 'user-alice',
      onIncomingMessage,
    });

    const msg: ChatMessage = {
      id: 'msg-1',
      chatId: 'test-room',
      author: 'Bob',
      authorId: 'user-bob',
      content: 'Hello Alice!',
      timestamp: '12:00',
    };

    // Simulate sending our own message (should mark it as seen)
    await transport.sendBroadcast(msg);

    // Call private handleIncomingPayload simulation via message
    // @ts-expect-error accessing private method for unit test
    transport.handleIncomingPayload({ type: 'message', payload: msg }, 'test');

    // Should NOT notify because msg-1 was already marked as seen from outgoing sendBroadcast
    expect(onIncomingMessage).not.toHaveBeenCalled();

    // Now an incoming message from Bob
    const msg2: ChatMessage = {
      id: 'msg-2',
      chatId: 'test-room',
      author: 'Bob',
      authorId: 'user-bob',
      content: 'Second message',
      timestamp: '12:01',
    };

    // @ts-expect-error accessing private method for unit test
    transport.handleIncomingPayload({ type: 'message', payload: msg2 }, 'test');

    expect(onIncomingMessage).toHaveBeenCalledWith(msg2);

    transport.destroy();
  });

  it('updates participant count when peers send presence and prunes on timeout', () => {
    const onPresenceChange = jest.fn();
    const transport = new DecentralizedRoomTransport({
      roomId: 'test-room',
      presenceKey: 'user-alice',
      onPresenceChange,
      onIncomingMessage: jest.fn(),
    });

    // Simulate peer Bob sending presence ping
    // @ts-expect-error accessing private method for unit test
    transport.handleIncomingPayload({ type: 'presence', user: 'user-bob' }, 'test');

    // Alice + Bob = 2
    expect(transport.getParticipantCount()).toBe(2);
    expect(onPresenceChange).toHaveBeenCalledWith(2);

    // Simulate peer Charlie sending presence ping
    // @ts-expect-error accessing private method for unit test
    transport.handleIncomingPayload({ type: 'presence', user: 'user-charlie' }, 'test');

    // Alice + Bob + Charlie = 3
    expect(transport.getParticipantCount()).toBe(3);
    expect(onPresenceChange).toHaveBeenCalledWith(3);

    // Advance timer past 30 seconds to trigger prune
    jest.advanceTimersByTime(32000);

    // Both peers pruned -> back to 1
    expect(transport.getParticipantCount()).toBe(1);

    transport.destroy();
  });
});
