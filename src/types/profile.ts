export type ThemePreference = 'system' | 'light' | 'dark';

export type AvatarType = 'identicon' | 'custom' | 'none';
export type LanguageCode = 'en' | 'ru' | 'ro';

export type ProfileSettings = {
  alias: string;
  bio?: string;
  avatarType: AvatarType;
  avatarUri?: string;
  avatarSeed?: string;
  themePreference: ThemePreference;
  language: LanguageCode;
  walletBiometricUnlockEnabled?: boolean;
  experimental?: {
    cardNamesEnabled?: boolean;
  };
  updatedAt: string;
};
