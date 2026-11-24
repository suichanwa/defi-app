import type { ProfileSettings } from '../types/profile';

export async function fetchRemoteProfile(_userId: string): Promise<ProfileSettings | null> {
  return null;
}

export async function upsertRemoteProfile(_userId: string, _settings: ProfileSettings): Promise<void> {
  return;
}
