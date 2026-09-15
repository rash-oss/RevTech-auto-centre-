import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// These are public client credentials. Row Level Security remains the security boundary.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mdhofmjympsnytwhqzwd.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  || 'sb_publishable_UmcZ--ATRAV9kBA2MX0v_g_zRmbDu8v';

export const isBackendConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url,
  anonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
