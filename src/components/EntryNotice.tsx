import { useState } from 'react';
import { X, Info, AlertTriangle, AlertCircle } from 'lucide-react';

const severityConfig: Record<string, { icon: typeof Info; border: string; bg: string; text: string }> = {
  info: { icon: Info, border: 'border-[var(--brand)]', bg: 'bg-[var(--bg-elev-1)]', text: 'text-[var(--text-primary)]' },
  warning: { icon: AlertTriangle, border: 'border-[var(--warning-border)]', bg: 'bg-[var(--warning-bg)]', text: 'text-[var(--warning-text)]' },
  danger: { icon: AlertCircle, border: 'border-[var(--destructive)]', bg: 'bg-[var(--destructive)]/10', text: 'text-[var(--destructive)]' },
};

/**
 * Per-entry public notice banner. Shown below the main (global) notice.
 * Sticky notices are always visible; dismissible ones show an "x" and are
 * remembered per browser/entry.
 */
export function EntryNotice({ text, severity, sticky, entryKey }: {
  text?: string | null; severity?: string | null; sticky?: boolean; entryKey: string;
}) {
  const storageKey = `miyomi-dismissed-notice-${entryKey}`;
  const revision = JSON.stringify([text, severity || 'warning']);
  const [dismissed, setDismissed] = useState<string | null>(null);
  let stored: string | null = null;
  try { stored = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  if (!text?.trim() || (!sticky && (dismissed === storageKey + revision || stored === revision))) return null;

  const config = severityConfig[severity || 'warning'] || severityConfig.warning;
  const Icon = config.icon;

  const dismiss = () => {
    setDismissed(storageKey + revision);
    try { localStorage.setItem(storageKey, revision); } catch { /* ignore */ }
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-4 ${config.bg} ${config.border}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
      <p className={`flex-1 min-w-0 whitespace-pre-wrap break-words text-sm ${config.text}`}>{text}</p>
      {!sticky && (
        <button onClick={dismiss} aria-label="Dismiss notice" className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${config.text}`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
