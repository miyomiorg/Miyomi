import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, KeyRound, ShieldCheck } from 'lucide-react';

/**
 * 2FA enrolment panel: QR code (from the otpauth:// URL), manual secret with
 * copy button, and a 6-digit verification input. Used by the login setup
 * stage and the dashboard settings page.
 */

export function TotpQr({ otpauthUrl }: { otpauthUrl: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(otpauthUrl, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
      .then(url => { if (!cancelled) setDataUrl(url); })
      .catch(() => { if (!cancelled) setDataUrl(null); });
    return () => { cancelled = true; };
  }, [otpauthUrl]);

  return (
    <div className="flex justify-center">
      {dataUrl ? (
        <img src={dataUrl} alt="Two-factor QR code" className="w-48 h-48" />
      ) : (
        <div className="w-48 h-48 flex items-center justify-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          Loading QR code…
        </div>
      )}
    </div>
  );
}

export function TotpSetupPanel({
  secret,
  otpauthUrl,
  code,
  onCodeChange,
  onVerify,
  verifying = false,
  verifyLabel = 'Verify & Enable',
}: {
  secret: string;
  otpauthUrl: string;
  code: string;
  onCodeChange: (value: string) => void;
  onVerify: () => void;
  verifying?: boolean;
  verifyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can copy manually */
    }
  };

  const grouped = secret.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        Scan the QR code with your authenticator app
      </div>

      <TotpQr otpauthUrl={otpauthUrl} />

      <div className="space-y-2">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Or enter this secret manually (e.g. Google Authenticator, 1Password, Aegis):
        </p>
        <div
          className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
          style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)' }}
        >
          <KeyRound className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <code
            className="flex-1 font-mono text-sm tracking-wider select-all break-all"
            style={{ color: 'var(--text-primary)' }}
          >
            {grouped}
          </code>
          <button
            type="button"
            onClick={copySecret}
            className="flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 py-1.5 border transition-colors"
            style={{ borderColor: 'var(--divider)', color: copied ? 'var(--brand)' : 'var(--text-secondary)' }}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          6-digit verification code
        </label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-center font-mono tracking-[0.4em] outline-none border"
          style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
        />
        <button
          type="button"
          onClick={onVerify}
          disabled={verifying || code.length !== 6}
          className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          {verifying ? 'Verifying…' : verifyLabel}
        </button>
      </div>
    </div>
  );
}