import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isBackendConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isBackendConfigured);

  useEffect(() => {
    if (!isBackendConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [session]);

  return { session, profile, loading };
}
