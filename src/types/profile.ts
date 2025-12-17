export type ThemePreference = 'system' | 'light' | 'dark';

export type AvatarType = 'identicon' | 'custom' | 'none';

export type ProfileSettings = {
  alias: string;
  avatarType: AvatarType;
  avatarUri?: string;
  avatarSeed?: string;
  themePreference: ThemePreference;
  updatedAt: string;
};
