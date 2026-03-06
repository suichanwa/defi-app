import { useCallback, useEffect, useState } from 'react';
import {
  getAuthSession,
  onAuthStateChange,
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  signInAnonymously as authSignInAnonymously,
  updatePassword as authUpdatePassword,
  type AuthSession,
} from '../services/auth';
import { clearProfileSettings } from '../services/profileStore';
import { clearRewardsCache } from '../services/rewardsStore';

export type LocalSession = {
  user: { id: string; email?: string };
  isLocal: true;
};

type AuthField = 'email' | 'password' | 'accountPassword' | 'accountConfirm';

export function useProfileAuth() {
  const [session, setSession] = useState<AuthSession | LocalSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirm, setAccountConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load session on mount and subscribe to changes
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const currentSession = await getAuthSession();
        if (mounted) {
          setSession(currentSession);
        }
      } catch (err) {
        console.warn('Error loading auth session:', err);
      }
    };

    loadSession();

    const subscription = onAuthStateChange((nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const setField = useCallback((field: AuthField, value: string) => {
    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'accountPassword':
        setAccountPassword(value);
        break;
      case 'accountConfirm':
        setAccountConfirm(value);
        break;
    }
  }, []);

  const signUp = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await authSignUp(email.trim(), password);
      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Account created! Check your email to confirm.');
        if (result.session) {
          setSession(result.session);
          setEmail('');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const signIn = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const result = await authSignIn(email.trim(), password);
      if (result.error) {
        setError(result.error.message);
      } else if (result.session) {
        await Promise.allSettled([clearProfileSettings(), clearRewardsCache()]);
        setSession(result.session);
        setMessage('Signed in successfully.');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  const signOut = useCallback(async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await authSignOut();
      setSession(null);
      setMessage('Signed out.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async () => {
    setError(null);
    setMessage(null);

    if (!accountPassword.trim()) {
      setError('New password is required.');
      return;
    }

    if (accountPassword !== accountConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await authUpdatePassword(accountPassword);
      if (result.error) {
        setError(result.error.message);
      } else {
        setMessage('Password updated successfully.');
        setAccountPassword('');
        setAccountConfirm('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setLoading(false);
    }
  }, [accountPassword, accountConfirm]);

  const signInAnonymously = useCallback(async () => {
    setError(null);
    setMessage(null);
    setLoading(true);
    
    try {
      const result = await authSignInAnonymously();
      if (result.error) {
        setError(result.error.message);
      } else if (result.session) {
        await Promise.allSettled([clearProfileSettings(), clearRewardsCache()]);
        setSession(result.session);
        const isLocal = result.session.user?.user_metadata?.is_local_anonymous;
        setMessage(isLocal 
          ? 'Local anonymous account created. Your data stays on this device.'
          : 'Anonymous account created.'
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anonymous sign in failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    state: {
      session,
      email,
      password,
      accountPassword,
      accountConfirm,
      message,
      error,
      loading,
    },
    actions: {
      signUp,
      signIn,
      signOut,
      signInAnonymously,
      updatePassword,
      setField,
    },
  };
}
