import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

const SEVERITY_STYLES: Record<string, { icon: typeof Info; color: string }> = {
    info: { icon: Info, color: '#3b82f6' },
    warning: { icon: AlertTriangle, color: '#f59e0b' },
    danger: { icon: ShieldAlert, color: '#ef4444' },
};

/** Admin-only indicator for a repository moderator note (read-only; editing happens in the form). */
export function AdminNoteBadge({ note, severity }: { note?: string | null; severity?: string | null }) {
    if (!note) return null;
    const style = SEVERITY_STYLES[severity || 'warning'] || SEVERITY_STYLES.warning;
    const Icon = style.icon;
    return (
        <span
            className="inline-flex items-center align-middle"
            title={`${severity || 'warning'}: ${note}`}
            aria-label="Moderator note"
        >
            <Icon className="h-4 w-4" style={{ color: style.color }} />
        </span>
    );
}