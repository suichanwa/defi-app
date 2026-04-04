import {
  isUuid,
  mapRowToMessage,
  createOutgoingTextMessage,
  createOutgoingImageMessage,
} from '../src/utils/secureChatUtils';

jest.mock('../src/utils/secureChatImages', () => ({
  decodeChatImageContent: (content: string) =>
    content.startsWith('__image__:') ? content.slice('__image__:'.length) : null,
}));

const baseRow = {
  id: 'msg-1',
  room_id: 'room-abc',
  author_id: 'user-123',
  author: 'Alice',
  content: 'Hello!',
  created_at: '2024-01-01T12:00:00.000Z',
  message_type: 'text' as const,
  image_path: null,
};

const baseOptions = {
  authorId: 'user-123',
  displayLabel: 'Alice',
  userAvatarType: 'default' as const,
};

describe('isUuid', () => {
  it('returns true for a valid UUID v4', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('returns false for a non-UUID string', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isUuid('')).toBe(false);
  });
});

describe('mapRowToMessage', () => {
  it('maps a basic row to a ChatMessage', () => {
    const msg = mapRowToMessage(baseRow, baseOptions);
    expect(msg.id).toBe('msg-1');
    expect(msg.chatId).toBe('room-abc');
    expect(msg.author).toBe('Alice');
    expect(msg.content).toBe('Hello!');
    expect(msg.type).toBe('text');
    expect(msg.outgoing).toBe(true);
  });

  it('marks the message as not outgoing when author_id does not match', () => {
    const msg = mapRowToMessage(baseRow, { ...baseOptions, authorId: 'other-user' });
    expect(msg.outgoing).toBe(false);
  });

  it('falls back to displayLabel comparison when authorId is not provided', () => {
    const msg = mapRowToMessage(baseRow, { ...baseOptions, authorId: undefined });
    expect(msg.outgoing).toBe(true);
  });

  it('detects image type from image_path', () => {
    const row = { ...baseRow, image_path: 'path/to/image.jpg', message_type: null };
    const msg = mapRowToMessage(row, baseOptions);
    expect(msg.type).toBe('image');
    expect(msg.imagePath).toBe('path/to/image.jpg');
  });

  it('decodes image path from content prefix', () => {
    const row = { ...baseRow, content: '__image__:path/to/img.png', image_path: null, message_type: null };
    const msg = mapRowToMessage(row, baseOptions);
    expect(msg.type).toBe('image');
    expect(msg.imagePath).toBe('path/to/img.png');
  });

  it('replaces __image__: content with "Photo"', () => {
    const row = { ...baseRow, content: '__image__:path/to/img.png', image_path: null, message_type: null };
    const msg = mapRowToMessage(row, baseOptions);
    expect(msg.content).toBe('Photo');
  });

  it('uses a fallback timestamp when created_at is null', () => {
    const row = { ...baseRow, created_at: null };
    const msg = mapRowToMessage(row, baseOptions);
    expect(msg.createdAt).toBeTruthy();
  });
});

describe('createOutgoingTextMessage', () => {
  it('creates a text message with the correct fields', () => {
    const now = new Date('2024-01-01T10:00:00.000Z');
    const msg = createOutgoingTextMessage({
      chatId: 'chat-1',
      authorId: 'user-1',
      author: 'Bob',
      content: 'Hey there',
      now,
    });
    expect(msg.chatId).toBe('chat-1');
    expect(msg.authorId).toBe('user-1');
    expect(msg.author).toBe('Bob');
    expect(msg.content).toBe('Hey there');
    expect(msg.outgoing).toBe(true);
    expect(msg.type).toBe('text');
    expect(msg.id).toBe(now.getTime().toString());
    expect(msg.createdAt).toBe(now.toISOString());
  });
});

describe('createOutgoingImageMessage', () => {
  it('creates an image message with "Photo" content when no caption', () => {
    const now = new Date('2024-01-01T10:00:00.000Z');
    const msg = createOutgoingImageMessage({
      chatId: 'chat-1',
      authorId: 'user-1',
      author: 'Bob',
      imageUri: 'file:///img.jpg',
      now,
    });
    expect(msg.type).toBe('image');
    expect(msg.content).toBe('Photo');
    expect(msg.imageUri).toBe('file:///img.jpg');
    expect(msg.id).toBe(`${now.getTime()}-image`);
  });

  it('uses the provided caption as content', () => {
    const msg = createOutgoingImageMessage({
      chatId: 'chat-1',
      authorId: 'user-1',
      author: 'Bob',
      imageUri: 'file:///img.jpg',
      content: 'Look at this!',
    });
    expect(msg.content).toBe('Look at this!');
  });
});
