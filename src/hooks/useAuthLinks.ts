import { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { supabase } from '../lib/supabase';

export const AUTH_REDIRECT = 'revtech://auth/callback';

export function useAuthLinks() {
  const [recovering, setRecovering] = useState(false);
  useEffect(() => {
    let active = true;
    let lastURL = '';
    const handle = async (url: string | null) => {
      if (!url || !active || url === lastURL) return;
      let parsed: URL;
      try { parsed = new URL(url); } catch { return; }
      if (parsed.protocol !== 'revtech:' || parsed.hostname !== 'auth' || parsed.pathname !== '/callback') return;
      lastURL = url;
      const params = new URLSearchParams(parsed.hash.slice(1) || parsed.search.slice(1));
      try {
        if (params.has('error')) throw new Error('This email link has expired or cannot be used. Request a new email.');
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token) throw new Error('This email link is incomplete. Request a new email.');
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        if (active && params.get('type') === 'recovery') setRecovering(true);
      } catch (error) {
        if (active) Alert.alert('Could not open email link', error instanceof Error ? error.message : 'Please try again.');
      }
    };
    const listener = Linking.addEventListener('url', ({ url }) => { void handle(url); });
    void Linking.getInitialURL().then(handle).catch(() => undefined);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
    });
    return () => { active = false; listener.remove(); data.subscription.unsubscribe(); };
  }, []);
  return { recovering, finishRecovery: () => setRecovering(false) };
}
