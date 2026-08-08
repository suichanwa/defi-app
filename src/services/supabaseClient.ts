import { createClient, SupabaseClient } from '@supabase/supabase-js';
// react-native-dotenv rewrites this import at build time. A runtime
// require('@env') is NOT rewritten and always throws, which is why this file
// silently ran on the fallback credentials below.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

let supabase: SupabaseClient | null = null;
export let isSupabaseConfigured = false;

// Hardcoded fallback for when @env doesn't load properly
const FALLBACK_URL = 'https://jjpljjmgjklmrbfiqibc.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqcGxqam1namtsbXJiZmlxaWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5OTA2NDYsImV4cCI6MjA4MTU2NjY0Nn0.XjzwKgFLlWV1p3HDNlnkLzMOWwoEGBIqIa322IuoISY';

function initializeSupabase(): SupabaseClient | null {
  // allowUndefined is on in babel.config.js, so a missing key arrives as
  // undefined rather than throwing.
  let url: string | undefined = SUPABASE_URL?.trim();
  let key: string | undefined = SUPABASE_ANON_KEY?.trim();

  // Use fallback if env vars are missing
  if (!url || !key || url.includes('YOUR_') || key.includes('YOUR_')) {
    console.log('Using fallback Supabase credentials');
    url = FALLBACK_URL;
    key = FALLBACK_KEY;
  }

  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    isSupabaseConfigured = true;
    console.log('Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

supabase = initializeSupabase();

export { supabase };
