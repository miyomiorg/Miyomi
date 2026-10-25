import { Info, AlertTriangle, ShieldAlert } from 'lucide-react';

export const noticeSeverityOptions = ['info', 'warning', 'danger'] as const;
export type NoticeSeverity = typeof noticeSeverityOptions[number];

/** Shared by the editor, admin indicators, and public entry banner. */
export const noticeSeverityStyles = {
  info: {
    label: 'Information', icon: Info,
    tone: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  },
  warning: {
    label: 'Warning', icon: AlertTriangle,
    tone: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  danger: {
    label: 'Critical', icon: ShieldAlert,
    tone: 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300',
  },
};

export function normalizeNoticeSeverity(value?: string | null): NoticeSeverity {
  return value === 'info' || value === 'danger' ? value : 'warning';
}
