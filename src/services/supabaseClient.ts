import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

const isValidConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isValidConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: AsyncStorage,
      },
    })
  : null;

export const isSupabaseConfigured = isValidConfig;
