import React from 'react';
import { Heart } from 'lucide-react';
import { useLikes } from '../context/LikeContext';
import { cn } from '@/lib/utils';

interface LoveButtonProps {
    itemId: string;
    /** DB likes_count shown while the context is still loading */
    fallbackCount?: number;
    itemType?: string;
    className?: string;
    size?: 'default' | 'lg';
}

export function LoveButton({
    itemId,
    fallbackCount = 0,
    itemType = 'app',
    className = '',
    size = 'default',
}: LoveButtonProps) {
    const { getLikeData, toggleLike, loading } = useLikes();
    const { count, loved } = getLikeData(itemId);
    // While loading, use fallbackCount (from DB) to avoid 0-flicker
    const displayCount = (loading && count === 0) ? fallbackCount : count;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleLike(itemId, itemType);
    };

    const isLarge = size === 'lg';

    // relative z-10: stays clickable above a card's stretched link overlay.
    return (
        <div className={cn("relative z-10 flex items-center gap-1.5", className)}>
            <button
                onClick={handleToggle}
                className={cn(
                    // before: invisible 8px hit-area extension (~44px touch target) without changing the layout
                    "group relative flex items-center gap-1.5 rounded-full transition-all before:absolute before:-inset-2 before:content-['']",
                    isLarge ? "px-3 py-1.5" : "px-2 py-1",
                    loved
                        ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30'
                        : 'hover:bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-rose-500'
                )}
                title={loved ? "Unlove this" : "Love this"}
                aria-pressed={loved}
            >
                <Heart
                    className={cn(
                        "transition-transform",
                        isLarge ? "w-5 h-5" : "w-4 h-4",
                        loved ? 'fill-current scale-110' : 'group-hover:scale-110',
                    )}
                />
                <span className={cn(
                    "font-['Inter',sans-serif] font-medium tabular-nums",
                    isLarge ? "text-sm" : "text-xs",
                )}>
                    {displayCount}
                </span>
            </button>
        </div>
    );
}