import { useEffect, useMemo, useState } from 'react';
import type { AvatarType } from '@app-types/profile';
import { getAuthSession, onAuthStateChange, type AuthSession } from '@services/auth';
import { getAnonymousId, toAnonymousProfileId } from '@services/identity';
import { loadProfileSettings } from '@services/profileStore';

type SecureChatIdentity = {
  session: AuthSession;
  authorId?: string;
  displayLabel: string;
  effectiveUserId: string;
  profileAlias: string;
  authLabel: string;
  anonId: string;
  userAvatarUri?: string;
  userAvatarType: AvatarType;
  userAvatarSeed?: string;
};

export function useSecureChatIdentity(isActive: boolean): SecureChatIdentity {
  const [session, setSession] = useState<AuthSession>(null);
  const [anonId, setAnonId] = useState('');
  const [authLabel, setAuthLabel] = useState('');
  const [profileAlias, setProfileAlias] = useState('');
  const [userAvatarUri, setUserAvatarUri] = useState<string | undefined>(undefined);
  const [userAvatarType, setUserAvatarType] = useState<AvatarType>('identicon');
  const [userAvatarSeed, setUserAvatarSeed] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getAuthSession().then(async (current) => {
      if (!active) return;
      setSession(current);
      const anonIdValue = await getAnonymousId();
      setAnonId(anonIdValue);
      const label = current?.user?.email ?? current?.user?.id ?? `anon-${anonIdValue.slice(-6)}`;
      setAuthLabel(label);
    });
    const sub = onAuthStateChange(async (next) => {
      setSession(next);
      const anonIdValue = await getAnonymousId();
      setAnonId(anonIdValue);
      const label = next?.user?.email ?? next?.user?.id ?? `anon-${anonIdValue.slice(-6)}`;
      setAuthLabel(label);
    });
    return () => {
      active = false;
      sub?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    let mounted = true;
    loadProfileSettings().then((settings) => {
      if (!mounted) return;
      if (settings.alias) {
        setProfileAlias(settings.alias);
      } else {
        setProfileAlias('');
      }
      setUserAvatarUri(settings.avatarUri);
      setUserAvatarType(settings.avatarType ?? 'identicon');
      setUserAvatarSeed(settings.avatarSeed);
    });
    return () => {
      mounted = false;
    };
  }, [isActive]);

  const authorId = useMemo(
    () => session?.user?.id ?? (anonId ? toAnonymousProfileId(anonId) : undefined),
    [anonId, session],
  );

  const displayLabel = useMemo(() => profileAlias || authLabel || 'Anonymous', [authLabel, profileAlias]);

  const effectiveUserId = useMemo(() => {
    if (authorId) return authorId;
    if (displayLabel && displayLabel !== 'Anonymous') {
      return `anon-${displayLabel.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
    return `anon-${Date.now()}`;
  }, [authorId, displayLabel]);

  return {
    session,
    authorId,
    displayLabel,
    effectiveUserId,
    profileAlias,
    authLabel,
    anonId,
    userAvatarUri,
    userAvatarType,
    userAvatarSeed,
  };
}
