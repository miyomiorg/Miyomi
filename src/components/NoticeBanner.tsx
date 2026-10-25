import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNotices } from '@/hooks/useNotices';
import { motion, AnimatePresence } from 'motion/react';
import type { Tables } from '@/types/db';
import { normalizeNoticeType, noticeTypeStyles } from './noticeTypes';

// Legacy ID-only dismissals cannot identify which content the visitor saw.
// Use a new format so those notices can be seen and dismissed once again.
const DISMISSED_KEY = 'miyomi-dismissed-notices-v2';
const noticeRevision = (notice: Tables<'notices'>) => JSON.stringify([
  notice.title, notice.message, notice.type,
]);

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
          const type = normalizeNoticeType(notice.type);
          const config = noticeTypeStyles[type];
          const Icon = config.icon;
          return (
            <motion.div
              key={notice.id}
              role="alert"
              data-notice-type={type}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${config.tone}`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{notice.title}</p>
                <p className="text-sm opacity-80">{notice.message}</p>
              </div>
              {notice.dismissible && (
                <button type="button" aria-label={`Dismiss notice: ${notice.title}`} onClick={() => setDismissed(prev => new Map(prev).set(notice.id, noticeRevision(notice)))} className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5">
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
