import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type AuthSession = Session | null;

export async function getAuthSession(): Promise<AuthSession> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: AuthSession) => void) {
  if (!supabase) return null;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

export async function signUpWithEmail(email: string, password: string): Promise<{ user: User | null; session: AuthSession }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { user: data.user ?? null, session: data.session };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthSession> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updateAccountPassword(newPassword: string): Promise<User | null> {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data.user ?? null;
}
