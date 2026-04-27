import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SecureChatLocalState } from '@services/securechat/localState';
import {
  hideConversationInState,
  hideMessageInState,
  isConversationHidden,
  isMessageHidden,
  loadSecureChatLocalState,
  restoreConversationInState,
  restoreMessageInState,
  saveSecureChatLocalState,
} from '@services/securechat/localState';

const defaultState: SecureChatLocalState = {
  hiddenChatIds: [],
  hiddenMessageIdsByChatId: {},
};

export function useSecureChatLocalState() {
  const [state, setState] = useState<SecureChatLocalState>(defaultState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let mounted = true;
    void loadSecureChatLocalState()
      .then((next) => {
        if (!mounted) return;
        stateRef.current = next;
        setState(next);
      })
      .catch((error) => {
        console.warn('Failed to load secure chat local state:', error);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const commit = useCallback(async (nextState: SecureChatLocalState) => {
    stateRef.current = nextState;
    setState(nextState);
    try {
      await saveSecureChatLocalState(nextState);
    } catch (error) {
      console.warn('Failed to save secure chat local state:', error);
      throw error;
    }
  }, []);

  const hideConversation = useCallback(
    async (chatId: string) => {
      const next = hideConversationInState(stateRef.current, chatId);
      await commit(next);
    },
    [commit],
  );

  const restoreConversation = useCallback(
    async (chatId: string) => {
      const next = restoreConversationInState(stateRef.current, chatId);
      await commit(next);
    },
    [commit],
  );

  const hideMessage = useCallback(
    async (chatId: string, messageId: string) => {
      const next = hideMessageInState(stateRef.current, chatId, messageId);
      await commit(next);
    },
    [commit],
  );

  const restoreMessage = useCallback(
    async (chatId: string, messageId: string) => {
      const next = restoreMessageInState(stateRef.current, chatId, messageId);
      await commit(next);
    },
    [commit],
  );

  return useMemo(
    () => ({
      state,
      hiddenChatIds: new Set(state.hiddenChatIds),
      hiddenMessageIdsByChatId: state.hiddenMessageIdsByChatId,
      hideConversation,
      restoreConversation,
      hideMessage,
      restoreMessage,
      isConversationHidden: (chatId: string) => isConversationHidden(stateRef.current, chatId),
      isMessageHidden: (chatId: string, messageId: string) => isMessageHidden(stateRef.current, chatId, messageId),
    }),
    [hideConversation, hideMessage, restoreConversation, restoreMessage, state],
  );
}
