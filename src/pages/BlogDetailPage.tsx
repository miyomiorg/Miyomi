import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBlogPost } from '@/hooks/useBlogPost';
import { BackButton } from '../components/BackButton';
import { Globe, Clock, Eye, Calendar, UserCircle } from 'lucide-react';
import { SITE_NAME } from '../../functions/_lib/seo';
import DOMPurify from 'dompurify';
import { ReportModal } from '../components/ReportModal';
import { Share, Flag } from 'lucide-react';
import { toast } from 'sonner';

// Allow deep links
const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|mihon|tachiyomi|aniyomi|tachi|cloudstream):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

export function BlogDetailPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
    const { slug } = useParams<{ slug: string }>();
    const { post, loading, error } = useBlogPost(slug, { incrementView: true, requirePublished: true });
    const contentRef = useRef<HTMLDivElement>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto py-24 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--brand)] mb-6"></div>
                Loading post...
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="max-w-4xl mx-auto py-24 text-center">
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4">Post Not Found</h1>
                <p className="text-[var(--text-secondary)] mb-8">The blog post you're looking for doesn't exist or has been removed.</p>
                <BackButton onClick={() => { if (onNavigate) onNavigate('/blog'); else window.history.back(); }} />
            </div>
        );
    }

    const formattedDate = new Date(post.published_at || post.created_at).toLocaleDateString(undefined, {
        month: 'long', day: 'numeric', year: 'numeric'
    });

    const sanitizedHtml = DOMPurify.sanitize(post.content, { ALLOWED_URI_REGEXP });
    
    // Estimate read time
    const text = sanitizedHtml.replace(/<[^>]*>?/gm, '');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200) || 1;

    const handleShare = async (title: string, url: string) => {
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        if (navigator.share) {
            try { await navigator.share({ title, text: `Read on ${SITE_NAME}: ${title}`, url }); } 
            catch (err) { toast.success("Link copied to clipboard!"); }
        } else {
            toast.success("Link copied to clipboard!");
        }
    };

    const authorName = post.author_name || "Miyomi Admin";
    const authorRole = post.author_role || "Staff";
    const authorAvatar = post.author_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=random`;

    return (
        <div className="max-w-4xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-8">
                <BackButton onClick={() => { if (onNavigate) onNavigate('/blog'); else window.history.back(); }} />
            </div>

            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-secondary)] mb-6">
                    <span className="bg-[var(--chip-bg)] text-[var(--text-primary)] px-3 py-1 rounded-md">{post.category}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {formattedDate}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {readTime} min read</span>
                    {post.views > 0 && <span className="flex items-center gap-1"><Eye className="w-4 h-4"/> {post.views} views</span>}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] leading-tight mb-6">
                    {post.title}
                </h1>
                
                {/* Author Info */}
                <div className="flex items-center gap-4 py-4 border-y" style={{ borderColor: 'var(--divider)' }}>
                    <img src={authorAvatar} alt={authorName} className="w-12 h-12 rounded-full object-cover bg-[var(--bg-elev-1)] border" style={{ borderColor: 'var(--divider)' }} />
                    <div>
                        <div className="font-semibold text-[var(--text-primary)] text-lg leading-none mb-1">{authorName}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{authorRole}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <button 
                            onClick={() => handleShare(post.title, window.location.href)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm"
                        >
                            <Share className="w-4 h-4" /> Share
                        </button>
                        <button 
                            onClick={() => setIsReportOpen(true)}
                            className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm transition-all"
                            title="Report"
                        >
                            <Flag className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Thumbnail */}
            {post.thumbnail_url && (
                <div className="mb-10 aspect-video w-full rounded-2xl overflow-hidden bg-[var(--bg-elev-1)] border shadow-sm" style={{ borderColor: 'var(--divider)' }}>
                    <img src={post.thumbnail_url} alt={post.thumbnail_alt || post.title} className="w-full h-full object-cover" />
                </div>
            )}

            {/* Content */}
            <div className="bg-[var(--bg-surface)] border rounded-3xl p-6 md:p-12 shadow-sm" style={{ borderColor: 'var(--divider)' }}>
                <div 
                    ref={contentRef}
                    className="guide-content prose max-w-none text-[var(--text-secondary)]"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
            </div>

            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetId={post.id}
                targetType="page"
                targetName={post.title}
            />
        </div>
    );
}
