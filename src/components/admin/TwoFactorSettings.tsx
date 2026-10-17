import { useState } from 'react';
import { authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import type { TwoFactorSetup } from '@/services/api/types';
import { TotpSetupPanel } from './TotpSetupPanel';
import { ShieldCheck, RotateCcw, Loader2, KeyRound, AlertTriangle } from 'lucide-react';

/**
 * Two-factor authentication for the CURRENT admin. 2FA is one-way:
 * once enabled it can never be disabled — only reset (re-enrol with a fresh
 * secret, which invalidates the old authenticator).
 */
export function TwoFactorSettings() {
  const { user, refreshSession } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [enrollToken, setEnrollToken] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enabled = Boolean(user?.totpEnabled);
  const isReset = enabled && enrolling;

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.enroll2fa();
      setEnrollToken(res.enrollToken);
      setSetup(res.setup);
      setCode('');
      setPassword('');
      setEnrolling(true);
    } catch (err: any) {
      setError(err.message || 'Failed to start 2FA setup');
    } finally {
      setBusy(false);
    }
  };

  const verifyEnroll = async () => {
    if (code.length !== 6) return;
    if (!password) {
      setError('Enter your current password to confirm this change');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authApi.verifyEnroll({ enrollToken, code, currentPassword: password });
      setEnrolling(false);
      setSetup(null);
      setEnrollToken('');
      setCode('');
      setPassword('');
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Failed to verify 2FA setup');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setEnrolling(false);
    setSetup(null);
    setEnrollToken('');
    setCode('');
    setPassword('');
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {enabled
          ? 'Your account is protected. A 6-digit code from your authenticator app is required at every login.'
          : 'Required before you can use the rest of the admin panel. Add an authenticator app code to your login.'}
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!enrolling && !enabled && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Two-factor authentication is required. Until you finish this setup, all other admin sections stay locked.</span>
        </div>
      )}

      {isReset && setup && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Resetting generates a new secret — your current authenticator code stops working the moment you verify
            the new one. Keep the app ready to scan.
          </span>
        </div>
      )}

      {!enrolling && enabled && (
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20 mr-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Enabled
          </span>
          <button
            type="button"
            onClick={startEnroll}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50"
            style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset code
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Use Reset code if you lost your authenticator. Disabling 2FA is not allowed.
          </p>
        </div>
      )}

      {!enrolling && !enabled && (
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Enable 2FA
        </button>
      )}

      {enrolling && setup && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Current password (to confirm this change)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none border"
              style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
            />
          </div>
          <TotpSetupPanel
            secret={setup.secret}
            otpauthUrl={setup.otpauthUrl}
            code={code}
            onCodeChange={setCode}
            onVerify={verifyEnroll}
            verifying={busy}
            verifyLabel={isReset ? 'Verify & Update' : 'Verify & Enable'}
          />
          <button
            type="button"
            onClick={cancel}
            className="text-xs underline underline-offset-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}