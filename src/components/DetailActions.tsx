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
        <div role="group" className="flex items-center gap-1 sm:flex-wrap sm:gap-2" aria-label={`${targetName} actions`}>
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
// Mobile: Material 3 "connected button group" — 40px icon buttons (same size as
// the round mobile Back button) with 4px gaps; the outer corners of the first and
// last buttons are fully rounded, inner corners keep a small 4px radius. The outer
// radius is exactly half the 40px height, not `rounded-*-full`: an infinite radius
// makes the browser scale every corner of the box down (CSS overlapping-curves
// rule), which flattens the 4px inner corners to square. Icons on the
// rounded ends are nudged 2px inward so they look optically centred.
// Desktop (sm+): unchanged labelled buttons.
const buttonClass = [
    'inline-flex items-center justify-center gap-1.5 border border-[var(--divider)] bg-[var(--bg-surface)] text-sm text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors',
    'max-sm:h-10 max-sm:w-10 max-sm:rounded-[4px] max-sm:first:rounded-l-[20px] max-sm:last:rounded-r-[20px] max-sm:first:[&_svg]:translate-x-0.5 max-sm:last:[&_svg]:-translate-x-0.5 max-sm:shadow-sm max-sm:hover:border-[var(--brand)] max-sm:[&_svg]:h-5 max-sm:[&_svg]:w-5',
    'sm:min-h-11 sm:rounded-xl sm:px-3 sm:py-2',
].join(' ');

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