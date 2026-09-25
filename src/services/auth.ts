import { supabase, isSupabaseConfigured } from './supabaseClient';

export type Session = {
  user: {
    id: string;
    email?: string;
    [key: string]: any;
  };
  access_token?: string;
  [key: string]: any;
};

export type AuthError = {
  message: string;
  name?: string;
  status?: number;
};

export type AuthSession = Session | null;

type AuthResult = {
  session: AuthSession;
  error: AuthError | null;
};

export async function getAuthSession(): Promise<AuthSession> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error getting auth session:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.warn('Exception getting auth session:', err);
    return null;
  }
}

export function onAuthStateChange(callback: (session: AuthSession) => void) {
  if (!isSupabaseConfigured || !supabase) return null;
  
  const { data } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
    callback(session);
  });
  
  return data.subscription;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { session: null, error: { message: 'Supabase not configured' } as AuthError };
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    return { session: data.session, error };
  } catch (err) {
    return { session: null, error: { message: err instanceof Error ? err.message : 'Sign up failed' } as AuthError };
  }
}

/**
 * Sign in anonymously - creates an anonymous user without email
 * Falls back to local anonymous session if Supabase anonymous auth is not enabled
 */
export async function signInAnonymously(): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    // Create local anonymous session
    return createLocalAnonymousSession();
  }
  
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    // If anonymous sign-in is not enabled (422 error), fall back to local
    if (error) {
      console.warn('Supabase anonymous sign-in failed:', error.message);
      if (error.message.includes('Anonymous sign-ins are disabled') || 
          error.status === 422) {
        return createLocalAnonymousSession();
      }
      return { session: null, error };
    }
    
    return { session: data.session, error: null };
  } catch (err) {
    console.warn('Anonymous sign-in exception:', err);
    return createLocalAnonymousSession();
  }
}

/**
 * Create a local-only anonymous session (not stored in Supabase)
 */
function createLocalAnonymousSession(): AuthResult {
  const anonId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Create a fake session object that matches the Session interface
  const localSession = {
    access_token: `local-${anonId}`,
    refresh_token: '',
    expires_in: 0,
    expires_at: 0,
    token_type: 'bearer',
    user: {
      id: anonId,
      aud: 'authenticated',
      role: 'authenticated',
      email: undefined,
      email_confirmed_at: undefined,
      phone: undefined,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
      user_metadata: { is_local_anonymous: true },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  } as AuthSession;
  
  return { session: localSession, error: null };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { session: null, error: { message: 'Supabase not configured' } as AuthError };
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { session: data.session, error };
  } catch (err) {
    return { session: null, error: { message: err instanceof Error ? err.message : 'Sign in failed' } as AuthError };
  }
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: { message: 'Supabase not configured' } as AuthError };
  }
  
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { error };
  } catch (err) {
    return { error: { message: err instanceof Error ? err.message : 'Password update failed' } as AuthError };
  }
}

/**
 * Link email to anonymous account (upgrade anonymous to full account)
 */
export async function linkEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { session: null, error: { message: 'Supabase not configured' } as AuthError };
  }
  
  try {
    const { data, error } = await supabase.auth.updateUser({
      email,
      password,
    });
    
    // Get updated session
    const sessionResult = await supabase.auth.getSession();
    return { session: sessionResult.data.session, error };
  } catch (err) {
    return { session: null, error: { message: err instanceof Error ? err.message : 'Failed to link email' } as AuthError };
  }
}
