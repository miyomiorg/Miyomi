import { AlertCircle, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';

export const noticeTypeOptions = ['info', 'warning', 'error', 'success'] as const;
export type NoticeType = typeof noticeTypeOptions[number];

/**
 * Shared by the public site-wide banner and the admin notices list so the
 * selected type always has the same label, icon, and colors in both places.
 */
export const noticeTypeStyles: Record<NoticeType, {
  label: string;
  icon: LucideIcon;
  tone: string;
  badge: string;
}> = {
  info: {
    label: 'Info',
    icon: Info,
    tone: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    tone: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    tone: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/50 dark:text-red-200',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-200',
  },
  success: {
    label: 'Success',
    icon: CheckCircle2,
    tone: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
};

export function normalizeNoticeType(value?: string | null): NoticeType {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return noticeTypeOptions.includes(normalized as NoticeType) ? normalized as NoticeType : 'info';
}
