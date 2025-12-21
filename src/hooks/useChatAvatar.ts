import { useCallback } from 'react';
import type { AvatarType } from '../types/profile';
import type { ChatAuthorProfile, ChatAvatarSource, ChatMessage } from '../types/secureChat';

type UseChatAvatarArgs = {
  currentUserId?: string;
  currentUserLabel: string;
  currentAvatarType?: AvatarType;
  currentAvatarUri?: string;
  currentAvatarSeed?: string;
  profilesById?: Record<string, ChatAuthorProfile>;
};

const initialsForLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export function useChatAvatar({
  currentUserId,
  currentUserLabel,
  currentAvatarType,
  currentAvatarUri,
  currentAvatarSeed,
  profilesById = {},
}: UseChatAvatarArgs) {
  const resolveAvatar = useCallback(
    (message: ChatMessage): ChatAvatarSource => {
      // Check if this is the current user's message
      const isCurrentUser =
        message.outgoing === true ||
        (currentUserId && message.authorId === currentUserId) ||
        message.author === currentUserLabel;

      if (isCurrentUser) {
        // Return current user's avatar settings
        return {
          avatarType: currentAvatarType ?? 'identicon',
          uri: currentAvatarUri,
          seed: currentAvatarSeed ?? currentUserId ?? currentUserLabel ?? 'default',
        };
      }

      // For other users, check profilesById first
      if (message.authorId && profilesById[message.authorId]) {
        const profile = profilesById[message.authorId];
        return {
          avatarType: profile.avatarType ?? 'identicon',
          uri: profile.avatarUri,
          seed: profile.avatarSeed ?? message.authorId,
        };
      }

      // Fallback to message's avatar info or identicon
      return {
        avatarType: message.avatarUri ? 'custom' : 'identicon',
        uri: message.avatarUri,
        seed: message.authorId ?? message.author ?? 'anonymous',
      };
    },
    [currentUserId, currentUserLabel, currentAvatarType, currentAvatarUri, currentAvatarSeed, profilesById],
  );

  return resolveAvatar;
}
