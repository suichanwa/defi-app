type AppVariant = 'development' | 'production';

const resolveVariant = (): AppVariant => {
  const raw = process.env.EXPO_PUBLIC_APP_VARIANT;
  if (raw === 'development' || raw === 'production') return raw;
  const isDevRuntime = (globalThis as { __DEV__?: boolean }).__DEV__ ?? false;
  return isDevRuntime ? 'development' : 'production';
};

export const APP_VARIANT: AppVariant = resolveVariant();
export const IS_DEV_BUILD = APP_VARIANT === 'development';

export const appFeatures = {
  showStartFreshOnLockScreen: IS_DEV_BUILD,
  showDeveloperTab: IS_DEV_BUILD,
};

