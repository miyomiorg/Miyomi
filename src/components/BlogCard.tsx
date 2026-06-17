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
    const text = (post.excerpt || post.content || '').replace(/<[^>]*>?/gm, '');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200) || 1;

    return (
        <>
            {/* Desktop Card — vertical layout */}
            <div
                onClick={onClick}
                className="hidden md:flex group cursor-pointer bg-[var(--bg-surface)] border rounded-2xl overflow-hidden flex-col transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--brand)]/5 hover:border-[var(--brand)]/30"
                style={{ borderColor: 'var(--divider)' }}
            >
                {post.thumbnail_url ? (
                    <div className="aspect-video w-full overflow-hidden bg-[var(--bg-elev-1)] relative">
                        <img
                            src={post.thumbnail_url}
                            alt={post.thumbnail_alt || post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                    </div>
                ) : (
                    <div className="aspect-video w-full bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] flex items-center justify-center relative">
                        <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
                    </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2.5 mb-3">
                        <span
                            className="text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm"
                            style={{ backgroundColor: catColor }}
                        >
                            {post.category}
                        </span>
                        <span className="text-[12px] text-[var(--text-secondary)] font-medium">{formattedDate}</span>
                    </div>

                    <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand)] transition-colors line-clamp-2 leading-snug font-['Poppins',sans-serif]">
                        {post.title}
                    </h3>

                    <p className="text-[13px] text-[var(--text-secondary)] mb-4 line-clamp-2 flex-1 leading-relaxed">
                        {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center text-[13px] text-[var(--brand)] font-medium">
                            Read more <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                        {post.views !== undefined && (
                            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] font-medium">
                                <Eye className="w-4 h-4" />
                                {post.views.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Card — horizontal row layout */}
            <div
                onClick={onClick}
                className="flex md:hidden group cursor-pointer bg-[var(--bg-surface)] border rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                style={{ borderColor: 'var(--divider)' }}
            >
                {/* Thumbnail */}
                <div className="w-[130px] min-h-[130px] flex-shrink-0 overflow-hidden bg-[var(--bg-elev-1)] relative">
                    {post.thumbnail_url ? (
                        <img
                            src={post.thumbnail_url}
                            alt={post.thumbnail_alt || post.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] flex items-center justify-center">
                            <FileText className="w-8 h-8 text-[var(--text-secondary)] opacity-20" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span
                            className="text-white text-[10px] font-semibold px-2 py-0.5 rounded"
                            style={{ backgroundColor: catColor }}
                        >
                            {post.category}
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">{formattedDate}</span>
                        {post.views !== undefined && (
                            <>
                                <span className="text-[var(--divider)] mx-0.5">•</span>
                                <span className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-medium">
                                    <Eye className="w-3.5 h-3.5" />
                                    {post.views.toLocaleString()}
                                </span>
                            </>
                        )}
                    </div>

                    <h3 className="text-[15px] font-bold text-[var(--text-primary)] line-clamp-2 leading-snug mb-1.5 font-['Poppins',sans-serif]">
                        {post.title}
                    </h3>

                    <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {post.excerpt}
                    </p>
                </div>

                {/* Chevron */}
                <div className="flex items-center pr-3 flex-shrink-0">
                    <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
            </div>
        </>
    );
}
