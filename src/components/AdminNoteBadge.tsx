import { normalizeNoticeSeverity, noticeSeverityStyles } from './noticeSeverity';

/** Admin-only indicator for a repository moderator note (read-only; editing happens in the form). */
export function AdminNoteBadge({ note, severity }: { note?: string | null; severity?: string | null }) {
    if (!note) return null;
    const style = noticeSeverityStyles[normalizeNoticeSeverity(severity)];
    const Icon = style.icon;
    return (
        <span
            className={`inline-flex items-center align-middle rounded-full border p-1 ${style.tone}`}
            title={`${style.label}: ${note}`}
            aria-label={`${style.label} notice`}
        >
            <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
    );
}
