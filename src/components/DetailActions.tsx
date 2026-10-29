import { useEffect, useState, type ReactNode } from 'react';
import { Share, Edit2, Flag, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface DetailActionsProps {
    targetType: 'app' | 'extensions' | 'guide';
    targetId: string;
    targetName: string;
    onReportClick: () => void;
    onShareClick: () => void;
    onAddClick?: () => void;
}

/**
 * Direct detail-page actions (Add · Edit · Report · Share) shown inline for
 * every target type — no more three-dot menu. On mobile the labels collapse to
 * icon-only buttons; desktop keeps the icon + label in the same order. The
 * label is also surfaced as a tooltip, but only while the icon-only state is
 * active (so desktop never shows a redundant tooltip).
 */
export function DetailActions({ targetType, targetId, targetName, onReportClick, onShareClick, onAddClick }: DetailActionsProps) {
    const navigate = useNavigate();
    const { hasPermission } = useAdmin();

    // Track the "icon-only" state (below the `sm` breakpoint) so the label
    // tooltip only appears when the inline label is actually hidden.
    const [iconOnly, setIconOnly] = useState(
        () =>
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(max-width: 639px)').matches,
    );
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mql = window.matchMedia('(max-width: 639px)');
        const onChange = () => setIconOnly(mql.matches);
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, []);

    const isExtension = targetType === 'extensions';
    // Extensions edit the repo in the admin panel (requires write permission).
    // Apps/guides reuse the public "suggest an edit" flow, available to everyone.
    const canEdit = isExtension ? hasPermission('extensions', 'write') : true;

    const editPath = () => {
        if (isExtension) return `/admin/extensions/${targetId}/edit`;
        if (targetType === 'guide') return `/submit-guide?editId=${targetId}`;
        return `/contribute?type=software&mode=edit&id=${targetId}&step=form`;
    };

    const addNewPath = () => (targetType === 'guide' ? '/submit-guide' : '/contribute?step=select');

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label={`${targetName} actions`}>
            {onAddClick ? (
                <ActionButton label="Add" onClick={onAddClick} iconOnly={iconOnly}>
                    <PlusCircle className="h-4 w-4" />
                </ActionButton>
            ) : (
                <ActionButton label="Add New" onClick={() => navigate(addNewPath())} iconOnly={iconOnly}>
                    <PlusCircle className="h-4 w-4" />
                </ActionButton>
            )}
            {canEdit && (
                <ActionButton label="Edit" onClick={() => navigate(editPath())} iconOnly={iconOnly}>
                    <Edit2 className="h-4 w-4" />
                </ActionButton>
            )}
            <ActionButton label="Report" onClick={onReportClick} iconOnly={iconOnly}>
                <Flag className="h-4 w-4" />
            </ActionButton>
            <ActionButton label="Share" onClick={onShareClick} iconOnly={iconOnly}>
                <Share className="h-4 w-4" />
            </ActionButton>
        </div>
    );
}

// Match the muted Back-button styling (text-secondary → brand on hover).
const buttonClass =
    'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors';

// Module-level so it is not remounted on every DetailActions render.
function ActionButton({ label, onClick, iconOnly, children }: { label: string; onClick: () => void; iconOnly: boolean; children: ReactNode }) {
    const button = (
        <button type="button" className={buttonClass} onClick={onClick} aria-label={label}>
            {children}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    if (!iconOnly) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}