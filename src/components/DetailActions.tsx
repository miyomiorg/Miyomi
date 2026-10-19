import { Share, Edit2, Flag, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

interface DetailActionsProps {
    targetType: 'app' | 'extensions' | 'guide';
    targetId: string;
    targetName: string;
    onReportClick: () => void;
    onShareClick: () => void;
    onAddClick?: () => void;
}

/**
 * Direct detail-page actions (Share · Edit · Report · Add) shown inline for
 * every target type — no more three-dot menu. On mobile the labels collapse to
 * icon-only buttons; desktop keeps the icon + label in the same order.
 */
export function DetailActions({ targetType, targetId, targetName, onReportClick, onShareClick, onAddClick }: DetailActionsProps) {
    const navigate = useNavigate();
    const { hasPermission } = useAdmin();

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

    const buttonClass =
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] hover:text-[var(--brand)] transition-colors';

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label={`${targetName} actions`}>
            <button type="button" className={buttonClass} onClick={onShareClick} aria-label="Share">
                <Share className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
            </button>
            {canEdit && (
                <button type="button" className={buttonClass} onClick={() => navigate(editPath())} aria-label="Edit">
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                </button>
            )}
            <button type="button" className={buttonClass} onClick={onReportClick} aria-label="Report">
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
            </button>
            {onAddClick ? (
                <button type="button" className={buttonClass} onClick={onAddClick} aria-label="Add">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Add</span>
                </button>
            ) : (
                <button type="button" className={buttonClass} onClick={() => navigate(addNewPath())} aria-label="Add New">
                    <PlusCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Add New</span>
                </button>
            )}
        </div>
    );
}