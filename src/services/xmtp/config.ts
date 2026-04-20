import { DEFAULT_XMTP_ENV, type XmtpEnvironment } from './constants';

export const getXmtpEnvironment = (): XmtpEnvironment => {
  const raw = process.env.EXPO_PUBLIC_XMTP_ENV?.trim().toLowerCase();
  if (raw === 'local' || raw === 'production' || raw === 'dev') {
    return raw;
  }
  return DEFAULT_XMTP_ENV;
};
