import { useEffect, useReducer } from 'react';
import {
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateAccountPassword,
  getAuthSession,
  onAuthStateChange,
  isSupabaseConfigured,
  type AuthSession,
} from '@services';

type AuthState = {
  email: string;
  password: string;
  accountPassword: string;
  accountConfirm: string;
  loading: boolean;
  message: string | null;
  error: string | null;
  session: AuthSession | LocalSession | null;
};

type AuthAction =
  | { type: 'SET_FIELD'; key: keyof AuthState; value: string | boolean | AuthState['session'] | null }
  | { type: 'START' }
  | { type: 'SUCCESS'; message: string }
  | { type: 'FAIL'; error: string }
  | { type: 'SET_SESSION'; session: AuthState['session'] };

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PASSWORD_MIN = 8;

type LocalSession = { user: { id: string; email?: string } };

const isSignupDisabledError = (error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return msg.toLowerCase().includes('signups are disabled') || msg.toLowerCase().includes('signup is disabled');
};

const createLocalSession = (email: string): LocalSession => ({ user: { id: `local-${Date.now()}`, email } });

const initialState: AuthState = {
  email: '',
  password: '',
  accountPassword: '',
  accountConfirm: '',
  loading: false,
  message: null,
  error: null,
  session: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value } as AuthState;
    case 'START':
      return { ...state, loading: true, message: null, error: null };
    case 'SUCCESS':
      return { ...state, loading: false, message: action.message, error: null };
    case 'FAIL':
      return { ...state, loading: false, error: action.error, message: null };
    case 'SET_SESSION':
      return { ...state, session: action.session };
    default:
      return state;
  }
}

const validatePassword = (value: string) =>
  value.length < PASSWORD_MIN ? `Password must be at least ${PASSWORD_MIN} characters.` : null;

export function useProfileAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let active = true;
    getAuthSession().then((current) => {
      if (active) {
        dispatch({ type: 'SET_SESSION', session: current });
      }
    });
    const subscription = onAuthStateChange((next) => {
      dispatch({ type: 'SET_SESSION', session: next });
    });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const setField = (key: keyof AuthState, value: string) => dispatch({ type: 'SET_FIELD', key, value });

  const signUp = async () => {
    dispatch({ type: 'START' });
    const email = state.email.trim();
    if (!EMAIL_REGEX.test(email)) {
      dispatch({ type: 'FAIL', error: 'Enter a valid email address.' });
      return;
    }
    const policyError = validatePassword(state.password);
    if (policyError) {
      dispatch({ type: 'FAIL', error: policyError });
      return;
    }
    try {
      if (!isSupabaseConfigured) {
        const localSession: LocalSession = createLocalSession(email);
        dispatch({ type: 'SET_SESSION', session: localSession });
        dispatch({ type: 'SUCCESS', message: 'Account created (local auth).' });
        return;
      }
      const result = await signUpWithEmail(email, state.password);
      if (result.session) {
        dispatch({ type: 'SUCCESS', message: 'Account created. You are signed in.' });
        return;
      }
      // Try to sign in immediately to bypass email confirmation in dev-friendly setups.
      try {
        const session = await signInWithEmail(email, state.password);
        dispatch({ type: 'SET_SESSION', session });
        dispatch({ type: 'SUCCESS', message: 'Account created and signed in (no email confirmation needed).' });
      } catch (signInErr) {
        dispatch({
          type: 'FAIL',
          error:
            signInErr instanceof Error
              ? signInErr.message
              : 'Account created, but sign-in requires email confirmation.',
        });
      }
    } catch (error) {
      if (isSignupDisabledError(error)) {
        const localSession = createLocalSession(email);
        dispatch({ type: 'SET_SESSION', session: localSession });
        dispatch({ type: 'SUCCESS', message: 'Account created (local auth, Supabase signups disabled).' });
        return;
      }
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to create account.' });
    }
  };

  const signIn = async () => {
    dispatch({ type: 'START' });
    const email = state.email.trim();
    if (!EMAIL_REGEX.test(email)) {
      dispatch({ type: 'FAIL', error: 'Enter a valid email address.' });
      return;
    }
    const policyError = validatePassword(state.password);
    if (policyError) {
      dispatch({ type: 'FAIL', error: policyError });
      return;
    }
    try {
      if (!isSupabaseConfigured) {
        const localSession: LocalSession = createLocalSession(email);
        dispatch({ type: 'SET_SESSION', session: localSession });
        dispatch({ type: 'SUCCESS', message: 'Signed in (local auth).' });
        return;
      }
      await signInWithEmail(email, state.password);
      dispatch({ type: 'SUCCESS', message: 'Signed in.' });
    } catch (error) {
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to sign in.' });
    }
  };

  const signOutUser = async () => {
    dispatch({ type: 'START' });
    try {
      if (isSupabaseConfigured) {
        await signOut();
      }
      dispatch({ type: 'SUCCESS', message: 'Signed out.' });
      dispatch({ type: 'SET_SESSION', session: null });
    } catch (error) {
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to sign out.' });
    }
  };

  const updatePassword = async () => {
    dispatch({ type: 'START' });
    if (!state.session) {
      dispatch({ type: 'FAIL', error: 'Sign in to update your account password.' });
      return;
    }
    if (!isSupabaseConfigured) {
      dispatch({ type: 'FAIL', error: 'Password updates are disabled in local auth mode.' });
      return;
    }
    const policyError = validatePassword(state.accountPassword);
    if (policyError) {
      dispatch({ type: 'FAIL', error: policyError });
      return;
    }
    if (state.accountPassword !== state.accountConfirm) {
      dispatch({ type: 'FAIL', error: 'Password entries do not match.' });
      return;
    }
    try {
      await updateAccountPassword(state.accountPassword);
      dispatch({ type: 'SET_FIELD', key: 'accountPassword', value: '' });
      dispatch({ type: 'SET_FIELD', key: 'accountConfirm', value: '' });
      dispatch({ type: 'SUCCESS', message: 'Account password updated.' });
    } catch (error) {
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to update password.' });
    }
  };

  return {
    state,
    actions: {
      setField,
      signUp,
      signIn,
      signOut: signOutUser,
      updatePassword,
    },
  };
}
