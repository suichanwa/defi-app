import { useCallback, useMemo, useReducer } from 'react';
import { DEFAULT_GLOBAL_CHAT_ID } from '@constants/secureChatScreen';

type SecureTab = 'chats' | 'connect';
type ChatView = 'list' | 'thread';

type UIState = {
  secureTab: SecureTab;
  chatView: ChatView;
  selectedChatId: string;
  draft: string;
  connectAddress: string;
  connectName: string;
  pendingImageUri: string | null;
};

type Action =
  | { type: 'SET_TAB'; tab: SecureTab }
  | { type: 'SET_VIEW'; view: ChatView }
  | { type: 'SELECT_CHAT'; chatId: string }
  | { type: 'SET_DRAFT'; draft: string }
  | { type: 'SET_CONNECT_ADDRESS'; value: string }
  | { type: 'SET_CONNECT_NAME'; value: string }
  | { type: 'SET_ATTACHMENT'; uri: string | null };

const initialState: UIState = {
  secureTab: 'chats',
  chatView: 'list',
  selectedChatId: DEFAULT_GLOBAL_CHAT_ID,
  draft: '',
  connectAddress: '',
  connectName: '',
  pendingImageUri: null,
};

const reducer = (state: UIState, action: Action): UIState => {
  switch (action.type) {
    case 'SET_TAB':
      return {
        ...state,
        secureTab: action.tab,
        chatView: action.tab === 'chats' ? 'list' : state.chatView,
      };
    case 'SET_VIEW':
      return { ...state, chatView: action.view };
    case 'SELECT_CHAT':
      return {
        ...state,
        selectedChatId: action.chatId,
        chatView: 'thread',
        pendingImageUri: null,
      };
    case 'SET_DRAFT':
      return { ...state, draft: action.draft };
    case 'SET_CONNECT_ADDRESS':
      return { ...state, connectAddress: action.value };
    case 'SET_CONNECT_NAME':
      return { ...state, connectName: action.value };
    case 'SET_ATTACHMENT':
      return { ...state, pendingImageUri: action.uri };
    default:
      return state;
  }
};

export function useSecureChatUIState() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = useMemo(
    () => ({
      setTab: (tab: SecureTab) => dispatch({ type: 'SET_TAB', tab }),
      setView: (view: ChatView) => dispatch({ type: 'SET_VIEW', view }),
      selectChat: (chatId: string) => dispatch({ type: 'SELECT_CHAT', chatId }),
      setDraft: (draft: string) => dispatch({ type: 'SET_DRAFT', draft }),
      setConnectAddress: (value: string) => dispatch({ type: 'SET_CONNECT_ADDRESS', value }),
      setConnectName: (value: string) => dispatch({ type: 'SET_CONNECT_NAME', value }),
      setAttachment: (uri: string | null) => dispatch({ type: 'SET_ATTACHMENT', uri }),
    }),
    [],
  );

  const getState = useCallback(() => state, [state]);

  return {
    state,
    actions,
    getState,
  };
}
