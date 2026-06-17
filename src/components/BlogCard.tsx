import { BlogPostData } from '../types/data';
import { ChevronRight, FileText, Eye } from 'lucide-react';

interface BlogCardProps {
    post: BlogPostData;
    onClick: () => void;
}

export function BlogCard({ post, onClick }: BlogCardProps) {
    const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div 
            onClick={onClick}
            className="group cursor-pointer bg-[var(--bg-surface)] border rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-[var(--brand)]/5 hover:border-[var(--brand)]/30"
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
                    {post.is_pinned && (
                        <div className="absolute top-3 left-3 bg-[var(--brand)] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                            📌 Pinned
                        </div>
                    )}
                </div>
            ) : (
                <div className="aspect-[21/9] w-full bg-gradient-to-br from-[var(--bg-elev-1)] to-[var(--bg-elev-2)] flex items-center justify-center relative">
                    <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-20" />
                    {post.is_pinned && (
                        <div className="absolute top-3 left-3 bg-[var(--brand)] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                            📌 Pinned
                        </div>
                    )}
                </div>
            )}
            
            <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)] mb-3">
                    <span className="bg-[var(--chip-bg)] px-2.5 py-1 rounded-md font-medium text-[var(--text-primary)]">
                        {post.category}
                    </span>
                    <span className="flex items-center gap-2">
                        {post.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> {post.views}</span>}
                        <span>{formattedDate}</span>
                    </span>
                </div>
                
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand)] transition-colors line-clamp-2 leading-tight">
                    {post.title}
                </h3>
                
                <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-3 flex-1">
                    {post.excerpt}
                </p>
                
                <div className="flex items-center text-sm text-[var(--brand)] font-medium mt-auto">
                    Read more <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    );
}
