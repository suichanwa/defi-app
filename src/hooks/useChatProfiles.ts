import type { ChatAuthorProfile } from '../types/securechat-types/secureChat';

type UseChatProfilesArgs = {
  authorIds: string[];
  enabled?: boolean;
};

export function useChatProfiles(_args: UseChatProfilesArgs) {
  const profilesById: Record<string, ChatAuthorProfile> = {};
  return { profilesById };
}
