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

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setProfile(null);
    });

    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    setProfile(null);
    if (!session) return;
    supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => { if (active) setProfile(data as Profile | null); });
    return () => { active = false; };
  }, [session]);

  return { session, profile, loading };
}
