import { useCallback } from 'react';
import type { AvatarType } from '../types/profile';
import type { ChatAvatarSource, ChatMessage } from '../types/secureChat';

type UseChatAvatarArgs = {
  currentUserLabel: string;
  currentAvatarType?: AvatarType;
  currentAvatarUri?: string;
  currentAvatarSeed?: string;
};

const initialsForLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export function useChatAvatar({
  currentUserLabel,
  currentAvatarType = 'identicon',
  currentAvatarUri,
  currentAvatarSeed,
}: UseChatAvatarArgs) {
  return useCallback(
    (message: ChatMessage): ChatAvatarSource => {
      const isCurrentUser = message.outgoing ?? message.author === currentUserLabel;
      if (isCurrentUser) {
        if (currentAvatarType === 'custom' && currentAvatarUri) {
          return { kind: 'image', uri: currentAvatarUri };
        }
        if (currentAvatarType === 'identicon') {
          const seed = currentAvatarSeed || currentUserLabel || message.author;
          return { kind: 'identicon', seed };
        }
        return { kind: 'initials', initials: initialsForLabel(currentUserLabel || message.author) };
      }

      if (message.avatarUri) {
        return { kind: 'image', uri: message.avatarUri };
      }

      const seed = message.author || 'anon';
      return { kind: 'identicon', seed };
    },
    [currentAvatarSeed, currentAvatarType, currentAvatarUri, currentUserLabel],
  );
}
