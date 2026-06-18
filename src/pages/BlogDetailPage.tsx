import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useBlogPost } from '@/hooks/useBlogPost';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { BackButton } from '../components/BackButton';
import { Globe, Clock, Eye, Calendar, UserCircle, Share, Flag, Sparkles, ChevronRight, ThumbsUp, ThumbsDown, ExternalLink, MessageCircle, Bookmark, Heart, Pin, ArrowUp } from 'lucide-react';
import { SITE_NAME } from '../../functions/_lib/seo';
import DOMPurify from 'dompurify';
import { ReportModal } from '../components/ReportModal';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { toast } from 'sonner';

// Allow deep links
const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|mihon|tachiyomi|aniyomi|tachi|cloudstream):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

export function BlogDetailPage({ onNavigate }: { onNavigate?: (path: string) => void }) {
    const { slug } = useParams<{ slug: string }>();
    const { post, loading, error } = useBlogPost(slug, { incrementView: true, requirePublished: true });
    const { posts: relatedPostsRaw } = useBlogPosts({
        category: post?.category,
        limit: 4,
        requirePublished: true
    });
    const contentRef = useRef<HTMLDivElement>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [headings, setHeadings] = useState<{ id: string, text: string, level: number }[]>([]);
    const [finalHtml, setFinalHtml] = useState('');
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        if (!post?.content) return;

        const sanitized = DOMPurify.sanitize(post.content, { ALLOWED_URI_REGEXP });

        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');

        const elements = Array.from(doc.querySelectorAll('h1, h2, h3')) as HTMLElement[];
        const extracted = elements.map((el, i) => {
            if (!el.id) {
                el.id = `heading-${i}-${el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || i}`;
            }
            return {
                id: el.id,
                text: el.textContent || '',
                level: parseInt(el.tagName[1])
            };
        });

        setHeadings(extracted);
        setFinalHtml(doc.body.innerHTML);
    }, [post?.content]);

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

    const text = finalHtml.replace(/<[^>]*>?/gm, '');
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const readTime = Math.ceil(wordCount / 200) || 1;

    const handleShare = async (title: string, url: string) => {
        try { await navigator.clipboard.writeText(url); } catch (e) { }
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

    const communitySections = (
        <>
            {/* Social Links */}
            <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 font-['Poppins',sans-serif]">Be part of Miyomi</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-5 leading-relaxed">Join our community servers and stay updated.</p>
                <div className="flex items-center gap-3">
                    <a href="https://discord.gg/miyomi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#5865F2] hover:border-[#5865F2]/50 transition-all hover:-translate-y-0.5 shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                    </a>
                    <a href="https://reddit.com/r/miyomi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF5700] hover:border-[#FF5700]/50 transition-all hover:-translate-y-0.5 shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" /></svg>
                    </a>
                    <a href="https://t.me/miyomi" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#26A5E4] hover:border-[#26A5E4]/50 transition-all hover:-translate-y-0.5 shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0 12 12 0 0 0 11.944 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                    </a>
                </div>
            </div>

            {/* Contribution Section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 font-['Poppins',sans-serif]">Want to contribute?</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">Help us grow by submitting new apps, extensions, or sending feedback.</p>
                <div className="flex flex-col gap-2.5">
                    <button 
                        onClick={() => onNavigate ? onNavigate('/contribute') : window.location.href = '/contribute'} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-elev-1)] hover:bg-[var(--brand)] hover:text-white text-[var(--text-primary)] border border-[var(--divider)] hover:border-[var(--brand)] text-[13px] font-semibold rounded-xl transition-all shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" /> Submit App / Ext
                    </button>
                    <button 
                        onClick={() => setIsFeedbackOpen(true)} 
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-elev-1)] hover:bg-[#3b82f6] hover:text-white text-[var(--text-primary)] border border-[var(--divider)] hover:border-[#3b82f6] text-[13px] font-semibold rounded-xl transition-all shadow-sm"
                    >
                        <MessageCircle className="w-4 h-4" /> Send Feedback
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="max-w-[1200px] mx-auto pb-24 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Top Bar: Back, Share, Report */}
            <div className="flex items-center justify-between mb-8">
                <BackButton onClick={() => { if (onNavigate) onNavigate('/blog'); else window.history.back(); }} />
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleShare(post.title, window.location.href)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm"
                    >
                        <Share className="w-4 h-4" /> <span className="hidden sm:inline">Share</span>
                    </button>
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="flex items-center justify-center w-[34px] h-[34px] rounded-xl border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm transition-all"
                        title="Report"
                    >
                        <Flag className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Main Content (Left Column) */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between text-sm font-medium text-[var(--text-secondary)] mb-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <span>{formattedDate}</span>
                            <span className="text-[var(--divider)]">•</span>
                            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {readTime} min read</span>
                        </div>
                        {/* Fake Pinned badge since post type might not have it yet */}
                        <div className="flex items-center gap-1.5 text-[#ef4444] font-bold text-[10px] bg-[#ef4444]/10 px-2 py-1 rounded-md uppercase tracking-widest">
                            <Pin className="w-3 h-3" /> Pinned
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl lg:text-[3.25rem] font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] leading-[1.15] mb-4 tracking-tight">
                        {post.title}
                    </h1>

                    <div className="mb-6">
                        <span className="bg-[#a855f7]/10 text-[#a855f7] px-3 py-1 rounded-md text-xs uppercase tracking-wider font-semibold truncate max-w-[150px] inline-block" title={post.category}>
                            {post.category}
                        </span>
                    </div>

                    {post.excerpt && (
                        <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[90%]">
                            {post.excerpt}
                        </p>
                    )}

                    {/* Author Info */}
                    <div className="flex items-center justify-between mb-8 pb-8 border-b" style={{ borderColor: 'var(--divider)' }}>
                        <div className="flex items-center gap-4">
                            <img src={authorAvatar} alt={authorName} className="w-12 h-12 rounded-full object-cover bg-[var(--bg-elev-1)]" />
                            <div>
                                <div className="font-semibold text-[var(--text-primary)] text-[15px] flex items-center gap-1.5 mb-0.5">
                                    {authorName}
                                    <Sparkles className="w-3.5 h-3.5 text-[#a855f7] fill-[#a855f7]" />
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">{authorRole}</div>
                            </div>
                        </div>
                    </div>

                    {/* Thumbnail */}
                    {post.thumbnail_url && (
                        <div className="mb-10 aspect-[2/1] w-full rounded-3xl overflow-hidden bg-[var(--bg-elev-1)] shadow-sm">
                            <img src={post.thumbnail_url} alt={post.thumbnail_alt || post.title} className="w-full h-full object-cover" />
                        </div>
                    )}

                    {/* Content (Removed box wrapping) */}
                    <div
                        ref={contentRef}
                        className="guide-content prose max-w-none text-[var(--text-secondary)] mb-12"
                        dangerouslySetInnerHTML={{ __html: finalHtml }}
                    />

                    {/* Mobile-only: Community Sections */}
                    <div className="lg:hidden mb-12">
                        <div className="flex items-center justify-center gap-4 mb-8 text-[var(--divider)]">
                            <div className="h-px bg-[var(--divider)] flex-1"></div>
                            <Sparkles className="w-5 h-5 opacity-40 text-[#a855f7]" />
                            <div className="h-px bg-[var(--divider)] flex-1"></div>
                        </div>
                        <div className="flex flex-col gap-6">
                            {communitySections}
                        </div>
                    </div>

                    {/* Related Articles */}
                    {(() => {
                        const relatedArticles = relatedPostsRaw?.filter(p => p.id !== post.id).slice(0, 3) || [];
                        if (relatedArticles.length === 0) return null;

                        return (
                            <div className="border-t pt-10" style={{ borderColor: 'var(--divider)' }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Poppins',sans-serif]">Related Articles</h3>
                                    <button onClick={() => onNavigate && onNavigate('/blog')} className="text-sm text-[#a855f7] font-semibold hover:underline flex items-center gap-1 transition-all">
                                        View all <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4">
                                    {relatedArticles.map((article) => {
                                        const articleDate = new Date(article.published_at || article.created_at).toLocaleDateString(undefined, {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        });
                                        return (
                                            <div key={article.id} onClick={() => onNavigate && onNavigate(`/blog/${article.slug}`)} className="flex flex-col sm:flex-row gap-4 p-3 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] hover:border-[#a855f7]/50 transition-colors cursor-pointer group shadow-sm">
                                                <div className="w-full sm:w-40 h-32 sm:h-24 rounded-xl overflow-hidden bg-[var(--bg-elev-1)] flex-shrink-0">
                                                    {article.thumbnail_url ? (
                                                        <img src={article.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={article.title} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-secondary)] font-medium bg-[var(--bg-elev-1)]">No Image</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-center min-w-0 pr-4 py-1">
                                                    <div className="flex items-center gap-3 text-[11px] font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                                                        <span className="bg-[#a855f7]/10 text-[#a855f7] px-2 py-0.5 rounded-md truncate max-w-[100px] inline-block" title={article.category}>{article.category}</span>
                                                        <span>{articleDate}</span>
                                                    </div>
                                                    <h4 className="text-[15px] font-bold text-[var(--text-primary)] mb-1 truncate font-['Poppins',sans-serif]">{article.title}</h4>
                                                    <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{article.excerpt || 'Read more...'}</p>
                                                </div>
                                                <div className="hidden sm:flex items-center justify-center pr-4">
                                                    <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 group-hover:text-[#a855f7] group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Sidebar (Right Column) */}
                <aside className="hidden lg:flex flex-col gap-6 w-[320px] flex-shrink-0">
                    <div className="sticky top-24 space-y-6">
                        {/* TOC Card */}
                        {headings.length > 0 && (
                            <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 shadow-sm">
                                <div className="text-[11px] font-bold tracking-widest text-[var(--text-secondary)] uppercase mb-5 font-['Inter',sans-serif]">On this page</div>
                                <div className="space-y-4 border-l-2 border-[#a855f7] pl-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                                    {headings.map(h => (
                                        <a
                                            key={h.id}
                                            href={`#${h.id}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const el = document.getElementById(h.id);
                                                if (el) {
                                                    const y = el.getBoundingClientRect().top + window.scrollY - 100; // Offset for header padding
                                                    window.scrollTo({ top: y, behavior: 'smooth' });
                                                }
                                            }}
                                            className={`block text-[13px] transition-colors ${h.level === 1 || h.level === 2 ? 'font-semibold text-[#a855f7]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} ${h.level > 2 ? 'pl-3' : ''}`}
                                        >
                                            {h.text}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        {communitySections}
                    </div>
                </aside>
            </div>

            {/* Scroll to Top Button */}
            <button
                onClick={scrollToTop}
                className={`fixed z-50 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)] shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-[var(--text-secondary)] hover:text-[#a855f7] hover:border-[#a855f7]/50 transition-all duration-300 flex items-center justify-center ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
                    } right-4 bottom-24 md:right-8 md:bottom-8`}
                aria-label="Scroll to top"
            >
                <ArrowUp className="w-5 h-5" />
            </button>

            <ReportModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
                targetId={post.id}
                targetType="page"
                targetName={post.title}
            />

            {isFeedbackOpen && (
                <FeedbackPanel page="blog" onClose={() => setIsFeedbackOpen(false)} />
            )}
        </div>
    );
}
