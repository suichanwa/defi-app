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
  currentAvatarType = 'identicon',
  currentAvatarUri,
  currentAvatarSeed,
  profilesById,
}: UseChatAvatarArgs) {
  return useCallback(
    (message: ChatMessage): ChatAvatarSource => {
      const isCurrentUser =
        typeof message.outgoing === 'boolean'
          ? message.outgoing
          : (currentUserId ? message.authorId === currentUserId : false) || message.author === currentUserLabel;
      if (isCurrentUser) {
        if (currentAvatarType === 'custom' && currentAvatarUri) {
          return { kind: 'image', uri: currentAvatarUri };
        }
        if (currentAvatarType === 'identicon') {
          const seed = currentAvatarSeed || currentUserId || currentUserLabel || message.author;
          return { kind: 'identicon', seed };
        }
        return { kind: 'initials', initials: initialsForLabel(currentUserLabel || message.author) };
      }

      const profile = message.authorId ? profilesById?.[message.authorId] : undefined;
      if (profile) {
        if (profile.avatarType === 'custom' && profile.avatarUri) {
          return { kind: 'image', uri: profile.avatarUri };
        }
        if (profile.avatarType === 'identicon') {
          const seed = profile.avatarSeed || message.authorId || message.author || 'anon';
          return { kind: 'identicon', seed };
        }
        if (profile.avatarType === 'none') {
          return {
            kind: 'initials',
            initials: initialsForLabel(profile.alias || message.author || 'Anonymous'),
          };
        }
        if (profile.avatarUri) {
          return { kind: 'image', uri: profile.avatarUri };
        }
      }

      if (message.avatarUri) {
        return { kind: 'image', uri: message.avatarUri };
      }

      const seed = message.authorId || message.author || 'anon';
      return { kind: 'identicon', seed };
    },
    [currentAvatarSeed, currentAvatarType, currentAvatarUri, currentUserId, currentUserLabel, profilesById],
  );
}
