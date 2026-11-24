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

const CLOUD_AUTH_DISABLED_ERROR: AuthError = {
  message: 'Cloud email authentication is disabled in serverless local mode.',
};

export async function getAuthSession(): Promise<AuthSession> {
  return null;
}

export type AuthSubscription = {
  unsubscribe: () => void;
};

export function onAuthStateChange(_callback: (session: AuthSession) => void): AuthSubscription | null {
  return null;
}

export async function signUp(_email: string, _password: string): Promise<AuthResult> {
  return { session: null, error: CLOUD_AUTH_DISABLED_ERROR };
}

/**
 * Create a local-only anonymous session stored on device.
 */
export async function signInAnonymously(): Promise<AuthResult> {
  return createLocalAnonymousSession();
}

function createLocalAnonymousSession(): AuthResult {
  const anonId = `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

export async function signIn(_email: string, _password: string): Promise<AuthResult> {
  return { session: null, error: CLOUD_AUTH_DISABLED_ERROR };
}

export async function signOut(): Promise<void> {
  return;
}

export async function updatePassword(_newPassword: string): Promise<{ error: AuthError | null }> {
  return { error: CLOUD_AUTH_DISABLED_ERROR };
}

export async function linkEmail(_email: string, _password: string): Promise<AuthResult> {
  return { session: null, error: CLOUD_AUTH_DISABLED_ERROR };
}
