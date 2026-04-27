import { getJson, removeKey, setJson } from '@services/storage';

const SECURE_CHAT_LOCAL_STATE_KEY = 'securechat.local-state.v1';

export type SecureChatLocalState = {
  hiddenChatIds: string[];
  hiddenMessageIdsByChatId: Record<string, string[]>;
};

const defaultState = (): SecureChatLocalState => ({
  hiddenChatIds: [],
  hiddenMessageIdsByChatId: {},
});

const normalizeIds = (ids: string[] | undefined) => Array.from(new Set((ids ?? []).filter(Boolean)));

export async function loadSecureChatLocalState(): Promise<SecureChatLocalState> {
  const stored = await getJson<SecureChatLocalState>(SECURE_CHAT_LOCAL_STATE_KEY);
  if (!stored) return defaultState();
  return {
    hiddenChatIds: normalizeIds(stored.hiddenChatIds),
    hiddenMessageIdsByChatId: Object.fromEntries(
      Object.entries(stored.hiddenMessageIdsByChatId ?? {}).map(([chatId, ids]) => [chatId, normalizeIds(ids)]),
    ),
  };
}

export async function saveSecureChatLocalState(next: SecureChatLocalState): Promise<SecureChatLocalState> {
  const normalized: SecureChatLocalState = {
    hiddenChatIds: normalizeIds(next.hiddenChatIds),
    hiddenMessageIdsByChatId: Object.fromEntries(
      Object.entries(next.hiddenMessageIdsByChatId ?? {}).map(([chatId, ids]) => [chatId, normalizeIds(ids)]),
    ),
  };
  await setJson(SECURE_CHAT_LOCAL_STATE_KEY, normalized);
  return normalized;
}

export async function clearSecureChatLocalState(): Promise<void> {
  await removeKey(SECURE_CHAT_LOCAL_STATE_KEY);
}

export const isConversationHidden = (state: SecureChatLocalState, chatId: string) =>
  state.hiddenChatIds.includes(chatId);

export const isMessageHidden = (state: SecureChatLocalState, chatId: string, messageId: string) =>
  Boolean(state.hiddenMessageIdsByChatId[chatId]?.includes(messageId));

export const hideConversationInState = (state: SecureChatLocalState, chatId: string): SecureChatLocalState => ({
  hiddenChatIds: normalizeIds([...state.hiddenChatIds, chatId]),
  hiddenMessageIdsByChatId: {
    ...state.hiddenMessageIdsByChatId,
    [chatId]: [],
  },
});

export const restoreConversationInState = (state: SecureChatLocalState, chatId: string): SecureChatLocalState => {
  const nextHiddenChats = state.hiddenChatIds.filter((id) => id !== chatId);
  const nextHiddenMessages = { ...state.hiddenMessageIdsByChatId };
  delete nextHiddenMessages[chatId];
  return {
    hiddenChatIds: nextHiddenChats,
    hiddenMessageIdsByChatId: nextHiddenMessages,
  };
};

export const hideMessageInState = (
  state: SecureChatLocalState,
  chatId: string,
  messageId: string,
): SecureChatLocalState => {
  const nextHiddenIds = normalizeIds([...(state.hiddenMessageIdsByChatId[chatId] ?? []), messageId]);
  return {
    ...state,
    hiddenMessageIdsByChatId: {
      ...state.hiddenMessageIdsByChatId,
      [chatId]: nextHiddenIds,
    },
  };
};

export const restoreMessageInState = (
  state: SecureChatLocalState,
  chatId: string,
  messageId: string,
): SecureChatLocalState => {
  const nextHiddenIds = (state.hiddenMessageIdsByChatId[chatId] ?? []).filter((id) => id !== messageId);
  const nextHiddenMessages = { ...state.hiddenMessageIdsByChatId };
  if (nextHiddenIds.length > 0) {
    nextHiddenMessages[chatId] = nextHiddenIds;
  } else {
    delete nextHiddenMessages[chatId];
  }
  return {
    ...state,
    hiddenMessageIdsByChatId: nextHiddenMessages,
  };
};
