import { useState, useEffect } from 'react';
import { X, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { useNotices } from '@/hooks/useNotices';
import { motion, AnimatePresence } from 'motion/react';
import type { Tables } from '@/types/db';

// Legacy ID-only dismissals cannot identify which content the visitor saw.
// Use a new format so those notices can be seen and dismissed once again.
const DISMISSED_KEY = 'miyomi-dismissed-notices-v2';
const noticeRevision = (notice: Tables<'notices'>) => JSON.stringify([
  notice.title, notice.message, notice.type,
]);

const typeConfig: Record<string, { icon: typeof Info; bg: string; border: string; text: string }> = {
  info: { icon: Info, bg: 'bg-[var(--bg-elev-1)]', border: 'border-[var(--brand)]', text: 'text-[var(--text-primary)]' },
  warning: { icon: AlertTriangle, bg: 'bg-[var(--warning-bg)]', border: 'border-[var(--warning-border)]', text: 'text-[var(--warning-text)]' },
  error: { icon: AlertCircle, bg: 'bg-[var(--destructive)]/10', border: 'border-[var(--destructive)]', text: 'text-[var(--destructive)]' },
};

export function NoticeBanner() {
  const { notices } = useNotices();
  const [dismissed, setDismissed] = useState<Map<string, string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return new Map();
      return new Map(Object.entries(saved).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    } catch { return new Map(); }
  });

  useEffect(() => {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Object.fromEntries(dismissed))); }
    catch { /* Dismissal still works for this session if storage is unavailable. */ }
  }, [dismissed]);

  const visibleNotices = notices.filter(n => !n.dismissible || dismissed.get(n.id) !== noticeRevision(n));
  if (visibleNotices.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visibleNotices.map(notice => {
          const config = typeConfig[notice.type] || typeConfig.info;
          const Icon = config.icon;
          return (
            <motion.div
              key={notice.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${config.bg} ${config.border}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.text}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${config.text}`}>{notice.title}</p>
                <p className={`text-sm opacity-80 ${config.text}`}>{notice.message}</p>
              </div>
              {notice.dismissible && (
                <button type="button" aria-label={`Dismiss notice: ${notice.title}`} onClick={() => setDismissed(prev => new Map(prev).set(notice.id, noticeRevision(notice)))} className={`flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 ${config.text}`}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
