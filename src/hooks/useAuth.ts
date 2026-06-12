import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, REMEMBER_SESSION } from '@/integrations/supabase/client';
import { useSessionTracker } from './useSessionTracker';
import type { Session, User } from '@supabase/supabase-js';

const SESSION_ACTIVE_KEY = 'miyomi_session_active';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { trackSession } = useSessionTracker();
  const trackSessionRef = useRef(trackSession);
  trackSessionRef.current = trackSession;
  const isInitialLoad = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: restored } }) => {
      const isOAuthCallback = localStorage.getItem('auth_start') === 'true';

      if (!REMEMBER_SESSION && restored && !sessionStorage.getItem(SESSION_ACTIVE_KEY) && !isOAuthCallback) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(restored);
      setUser(restored?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_IN' && session) {
        sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');

        if (isInitialLoad.current) {
          isInitialLoad.current = false;
        }

        const isAuthStart = localStorage.getItem('auth_start');
        if (isAuthStart) {
          localStorage.removeItem('auth_start');
          trackSessionRef.current('login').catch(err => {
            console.error('Failed to track login session:', err);
          });
        }
      }

      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(SESSION_ACTIVE_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) throw error;
    await trackSessionRef.current('login').catch(console.error);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    localStorage.setItem('auth_start', 'true');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error);
      localStorage.removeItem('auth_start');
    }
  }, []);

  const signOut = useCallback(async () => {
    await trackSessionRef.current('logout').catch(err => {
      console.error('Failed to track logout session:', err);
    });

    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
    await supabase.auth.signOut();
  }, []);

  return { session, user, loading, signInWithEmail, signInWithGoogle, signOut };
}
