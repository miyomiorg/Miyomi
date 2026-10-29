import { useEffect, useSyncExternalStore } from 'react';
import { authApi } from '@/services/api';
import type { LoginResult, SessionInfo } from '@/services/api/types';
import { ApiError } from '@/services/api/http';
import { invalidateAllAdminCaches } from './useAdminCache';

export type { AdminRole } from '@/services/api/types';

let snapshot: { session: SessionInfo | null; loading: boolean } = { session: null, loading: true };
const listeners = new Set<() => void>();
let restoration: Promise<void> | undefined;
let revision = 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const getSnapshot = () => snapshot;

// The session cookie is HttpOnly, so JS cannot see it. This hint records
// "an admin session existed on this browser" so public pages can skip the
// /admin/auth/me probe (a guaranteed 401) for ordinary visitors.
const SESSION_HINT_KEY = 'miyomi-admin-session';
function hasSessionHint(): boolean {
  try { return localStorage.getItem(SESSION_HINT_KEY) === '1'; } catch { return true; }
}
function setSessionHint(present: boolean) {
  try {
    if (present) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch { /* optional */ }
}
/** True when the probe was skipped on a public page (an /admin page must still check). */
let probeSkipped = false;

function publish(session: SessionInfo | null) {
  snapshot = { session, loading: false };
  setSessionHint(Boolean(session));
  listeners.forEach(listener => listener());
}

function restoreSession() {
  if (restoration) return;
  const onAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  if (!onAdminPage && !hasSessionHint()) {
    if (snapshot.loading) {
      probeSkipped = true;
      snapshot = { session: null, loading: false };
      listeners.forEach(listener => listener());
    }
    return;
  }
  if (!snapshot.loading && !probeSkipped) return;
  if (probeSkipped) {
    probeSkipped = false;
    // Back to "loading" so admin route guards wait for the real answer.
    snapshot = { session: null, loading: true };
    listeners.forEach(listener => listener());
  }
  const started = revision;
  restoration = authApi.me().then(session => {
    if (started === revision) publish(session);
  }).catch(error => {
    if (!(error instanceof ApiError && error.status === 401)) console.error('Failed to restore session:', error);
    if (started === revision) publish(null);
  });
}

/**
 * Password step. If the account has 2FA configured, the server returns
 * { loginStage: '2fa_required', pendingToken } and the caller finishes with
 * completeLogin. Accounts without 2FA get a session immediately
 * (totpEnabled:false) and are redirected to Settings to enrol.
 */
async function signInWithEmail(email: string, password: string, remember = false, turnstileToken?: string) {
  const started = ++revision;
  const result: LoginResult = await authApi.login({ email, password, remember, turnstileToken });
  if ('loginStage' in result) return result;
  if (started === revision) {
    invalidateAllAdminCaches();
    publish(result);
  }
  return result;
}

/** Finish a staged login with the 6-digit TOTP code. */
async function completeLogin(pendingToken: string, code: string, remember = false) {
  const started = ++revision;
  const session = await authApi.completeLogin({ pendingToken, code, remember });
  if (started === revision) {
    invalidateAllAdminCaches();
    publish(session);
  }
  return session;
}

/** Re-pull the current session (e.g. after enabling/disabling 2FA). */
async function refreshSession() {
  const started = ++revision;
  const session = await authApi.me();
  if (started === revision) publish(session);
  return session;
}

async function signOut() {
  await authApi.logout();
  ++revision;
  invalidateAllAdminCaches();
  publish(null);
}

/** All consumers subscribe to the same cookie-backed session. */
export function useAuth() {
  const { session, loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(restoreSession, []);
  return {
    user: session?.admin ?? null,
    role: session?.role ?? null,
    permissions: session?.permissions ?? [],
    loading,
    signInWithEmail,
    completeLogin,
    refreshSession,
    signOut,
  };
}