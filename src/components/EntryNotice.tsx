import { useState } from 'react';
import { X } from 'lucide-react';
import { normalizeNoticeSeverity, noticeSeverityStyles } from './noticeSeverity';

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

  const config = noticeSeverityStyles[normalizeNoticeSeverity(severity)];
  const Icon = config.icon;

  const dismiss = () => {
    setDismissed(storageKey + revision);
    try { localStorage.setItem(storageKey, revision); } catch { /* ignore */ }
  };

  return (
    <div role="note" aria-label={`${config.label} notice`} className={`flex items-start gap-3 px-4 py-3 rounded-xl border mb-4 ${config.tone}`}>
      <Icon aria-hidden="true" className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 whitespace-pre-wrap break-words text-sm">{text}</p>
      {!sticky && (
        <button type="button" onClick={dismiss} aria-label="Dismiss notice" className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
