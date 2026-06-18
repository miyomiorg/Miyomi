import { BlogPostData } from '../types/data';
import { ChevronRight, FileText, Clock, Eye } from 'lucide-react';

interface BlogCardProps {
    post: BlogPostData;
    onClick: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Guides': '#8b5cf6',
    'Apps': '#3b82f6',
    'Extensions': '#10b981',
    'Updates': '#f59e0b',
    'Community': '#ec4899',
    'Transparency': '#06b6d4',
    'Announcements': '#f97316',
    'Devlog': '#6366f1',
    'News': '#14b8a6',
    'Editorial': '#a855f7',
};

export function BlogCard({ post, onClick }: BlogCardProps) {
    const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const catColor = CATEGORY_COLORS[post.category] || 'var(--brand)';

    // Estimate read time
    const text = (post.content || post.excerpt || '').replace(/<[^>]*>?/gm, '');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200) || 1;

    return (
        <>
            {/* Card — unified layout */}
            <div
                onClick={onClick}
                className="flex group cursor-pointer bg-[var(--bg-surface)] border rounded-2xl overflow-hidden flex-col transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--brand)]/10 hover:border-[var(--brand)]/30 h-full"
                style={{ borderColor: 'var(--divider)' }}
            >
                {/* Image Section (Top Half) */}
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-[var(--bg-elev-1)] flex-shrink-0">
                    {post.thumbnail_url ? (
                        <img
                            src={post.thumbnail_url}
                            alt={post.thumbnail_alt || post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] flex items-center justify-center">
                            <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
                        </div>
                    )}

                    {/* Subtle top gradient for date readability */}
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-0" />

                    {/* Top Overlay: Tag and Date */}
                    <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none z-10">
                        <span
                            className="text-white text-[11px] font-bold px-3 py-1 rounded-[10px] shadow-sm truncate max-w-[120px] inline-block"
                            style={{ backgroundColor: catColor }}
                            title={post.category}
                        >
                            {post.category}
                        </span>
                        <span className="text-[13px] text-white/95 font-semibold tracking-wide drop-shadow-md">
                            {formattedDate}
                        </span>
                    </div>

                    {/* Bottom Overlay: Blended Glassmorphism */}
                    <div className="absolute inset-x-[-9px] bottom-[-9px] h-[62%] pointer-events-none z-0">
                        {/* Feathered blur effect */}
                        <div
                            className="absolute inset-0 bg-black/10 backdrop-blur-[3px]"
                            style={{ maskImage: 'linear-gradient(to top, black 30%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 100%)' }}
                        />
                        {/* Dark gradient for text contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    {/* Bottom Overlay: Title Text */}
                    <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none z-10">
                        <h3 className="text-[15px] font-bold text-white line-clamp-2 leading-[1.35] font-['Poppins',sans-serif]" style={{ textShadow: '0px 1px 3px black' }}>
                            {post.title}
                        </h3>
                    </div>
                </div>

                {/* Content Section (Bottom Half) */}
                <div className="p-4 flex flex-col flex-1 bg-[var(--bg-surface)]">
                    <p className="text-[13px] text-[var(--text-secondary)] mb-auto line-clamp-2 leading-relaxed">
                        {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--divider)' }}>
                        <div className="flex items-center text-[13px] text-[#3b82f6] font-semibold tracking-wide">
                            Read more <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div className="flex items-center gap-3">
                            {post.views !== undefined && (
                                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] font-medium">
                                    <Eye className="w-4 h-4" />
                                    {post.views.toLocaleString()}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] font-medium">
                                <Clock className="w-4 h-4" />
                                {readTime} min
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </>
    );
}
