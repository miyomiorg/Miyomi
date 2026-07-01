import { useState, useMemo, useRef } from 'react';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { useNotices } from '../hooks/useNotices';
import { BlogCard } from '../components/BlogCard';
import { BlogSortDropdown, SortMode } from '../components/BlogSortDropdown';
import { FileText, ChevronRight, Search, Clock, Pin, ChevronDown, Sparkles, Info, AlertTriangle, AlertCircle, BookOpen, Smartphone, Puzzle, Package, Heart, Search as SearchIcon, Megaphone, Wrench, Newspaper, PenTool, LucideIcon, Eye, MessageCircle, Youtube, Github } from 'lucide-react';
import { SITE_NAME } from '../../functions/_lib/seo';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { DiscordIcon } from '../components/DiscordIcon';
import { TelegramIcon } from '../components/TelegramIcon';
const CATEGORIES = ['All', 'Announcements', 'Updates', 'Community', 'Transparency', 'Devlog', 'News', 'Editorial'];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Announcements': Megaphone,
    'News': Newspaper,
    'Updates': Package,
    'Apps': Smartphone,
    'Extensions': Puzzle,
    'Community': Heart,
    'Devlog': Wrench,
};

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


export function BlogPage({ onNavigate }: { onNavigate: (path: string) => void }) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const categoryContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragged, setDragged] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragged(false);
        if (categoryContainerRef.current) {
            setStartX(e.pageX - categoryContainerRef.current.offsetLeft);
            setScrollLeft(categoryContainerRef.current.scrollLeft);
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !categoryContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - categoryContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        if (Math.abs(walk) > 5) setDragged(true);
        categoryContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    const scrollCategories = (dir: 'left' | 'right') => {
        if (categoryContainerRef.current) {
            categoryContainerRef.current.scrollBy({ left: dir === 'left' ? -250 : 250, behavior: 'smooth' });
        }
    };

    const { notices } = useNotices();

    const { posts, loading } = useBlogPosts({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        requirePublished: true
    });

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        let result = posts.filter(p =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.excerpt?.toLowerCase().includes(search.toLowerCase())
        );

        // Sort
        if (sortMode === 'oldest') {
            result = [...result].sort((a, b) => new Date(a.published_at || a.created_at).getTime() - new Date(b.published_at || b.created_at).getTime());
        } else if (sortMode === 'popular') {
            result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));
        }

        return result;
    }, [posts, search, sortMode]);

    const pinnedPost = useMemo(() => posts.find(p => p.is_pinned), [posts]);
    const regularPosts = useMemo(() => filteredPosts.filter(p => p.id !== pinnedPost?.id), [filteredPosts, pinnedPost]);



    const pinnedDate = pinnedPost ? new Date(pinnedPost.published_at || pinnedPost.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : '';

    const pinnedReadTime = pinnedPost ? (() => {
        const text = (pinnedPost.content || pinnedPost.excerpt || '').replace(/<[^>]*>?/gm, '');
        const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
        return Math.ceil(wordCount / 200) || 1;
    })() : 0;

    const catColor = (cat: string) => CATEGORY_COLORS[cat] || 'var(--brand)';

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Hero Banner */}
            <div
                className="relative rounded-3xl overflow-hidden mb-8 bg-[var(--bg-elev-1)]"
                style={{ minHeight: '180px' }}
            >
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 md:opacity-100 transition-opacity"
                    style={{ backgroundImage: 'url(/journal-hero-bg.png)' }}
                />

                {/* Gradient overlay for text readability */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, var(--bg-surface) 10%, color-mix(in srgb, var(--bg-surface) 80%, transparent) 40%, transparent 100%)'
                    }}
                />
                <div className="absolute inset-0 pointer-events-none md:hidden"
                    style={{
                        background: 'linear-gradient(to top, var(--bg-surface) 0%, color-mix(in srgb, var(--bg-surface) 80%, transparent) 50%, transparent 100%)'
                    }}
                />

                <div className="relative z-10 p-8 md:p-12 md:w-2/3">
                    <h1 className="text-3xl md:text-5xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-3 tracking-tight">
                        Blog Posts
                        <span className="text-[var(--brand)] ml-2 text-lg md:text-2xl align-super drop-shadow-md">✦</span>
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-xl leading-relaxed">
                        Updates, guides, app news, extensions, and stories from the {SITE_NAME} community.
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Search & Sort Row */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
                        <div className="flex-1 relative group min-w-0">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--brand)] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search articles..."
                                className="w-full h-[42px] sm:h-[44px] bg-[var(--bg-elev-1)] border-transparent text-[var(--text-primary)] rounded-xl py-2 sm:py-2.5 pl-11 pr-4 focus:outline-none focus:border-[var(--brand)] border transition-all font-['Inter',sans-serif] text-sm shadow-sm"
                            />
                        </div>
                        <div className="relative flex-shrink-0 w-auto self-end sm:self-auto">
                            <BlogSortDropdown
                                value={sortMode}
                                onChange={(val) => setSortMode(val as SortMode)}
                            />
                        </div>
                    </div>



                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-[var(--text-secondary)]">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand)] mb-4"></div>
                            Loading posts...
                        </div>
                    ) : (
                        <>
                            {/* Featured Pinned Post */}
                            {pinnedPost && selectedCategory === 'All' && !search && (
                                <div
                                    className="mb-8 cursor-pointer group"
                                    onClick={() => onNavigate(`/blog/${pinnedPost.slug}`)}
                                >
                                    <div
                                        className="bg-[var(--bg-surface)] border rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all hover:border-[var(--brand)]/50 hover:shadow-xl hover:shadow-[var(--brand)]/10"
                                        style={{ borderColor: 'var(--divider)' }}
                                    >
                                        {pinnedPost.thumbnail_url && (
                                            <div className="md:w-[45%] aspect-video md:aspect-auto relative overflow-hidden bg-[var(--bg-elev-1)]">
                                                <img
                                                    src={pinnedPost.thumbnail_url}
                                                    alt={pinnedPost.thumbnail_alt || pinnedPost.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                />
                                            </div>
                                        )}
                                        <div className={`p-6 md:p-8 flex flex-col justify-center ${pinnedPost.thumbnail_url ? 'md:w-[55%]' : 'w-full'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-[#a855f7] bg-[#a855f7]/10 px-2 py-1 rounded-md text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                                                    <Pin className="w-3 h-3" /> PINNED
                                                </span>
                                            </div>
                                            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand)] transition-colors line-clamp-2 font-['Poppins',sans-serif]">
                                                {pinnedPost.title}
                                            </h2>
                                            <div className="mb-4">
                                                <span
                                                    className="text-[11px] font-bold text-white px-2.5 py-1 rounded-[10px] shadow-sm uppercase tracking-wide inline-block max-w-[150px] truncate"
                                                    style={{ backgroundColor: catColor(pinnedPost.category) }}
                                                    title={pinnedPost.category}
                                                >
                                                    {pinnedPost.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-3 leading-relaxed flex-1">
                                                {pinnedPost.excerpt || 'Read the full post for more details...'}
                                            </p>
                                            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                                <span>{pinnedDate}</span>
                                                {pinnedPost.views !== undefined && (
                                                    <>
                                                        <span className="text-[var(--divider)] -mx-1">•</span>
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            {pinnedPost.views.toLocaleString()}
                                                        </span>
                                                    </>
                                                )}
                                                <span className="text-[var(--divider)] -mx-1">•</span>
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Clock className="w-3.5 h-3.5" /> {pinnedReadTime} min read
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Posts Grid / List */}
                            {regularPosts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {regularPosts.map(post => (
                                        <BlogCard key={post.id} post={post} onClick={() => onNavigate(`/blog/${post.slug}`)} />
                                    ))}
                                </div>
                            ) : (
                                <div className="py-24 text-center">
                                    <div className="w-20 h-20 mx-auto bg-[var(--bg-elev-1)] rounded-full flex items-center justify-center mb-6">
                                        <FileText className="w-10 h-10 text-[var(--text-secondary)] opacity-50" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 font-['Poppins',sans-serif]">No posts found</h3>
                                    <p className="text-[var(--text-secondary)] max-w-md mx-auto text-sm">
                                        We couldn't find any blog posts matching your criteria. Check back later!
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Sidebar — desktop only */}
                <aside className="hidden lg:flex flex-col gap-6 w-[300px] flex-shrink-0">

                    {/* Pinned Notices */}
                    {notices.length > 0 && (
                        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 flex items-center gap-2 border-b border-[var(--divider)]" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.06) 100%)' }}>
                                <Sparkles className="w-4 h-4 text-[var(--brand)]" />
                                <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Poppins',sans-serif]">Pinned Notices</h3>
                            </div>
                            <div className="divide-y" style={{ divideColor: 'var(--divider)' }}>
                                {notices.slice(0, 4).map(notice => {
                                    const noticeIconMap: Record<string, typeof Info> = {
                                        info: Info,
                                        warning: AlertTriangle,
                                        error: AlertCircle,
                                    };
                                    const noticeColorMap: Record<string, string> = {
                                        info: 'var(--brand)',
                                        warning: '#f59e0b',
                                        error: '#ef4444',
                                    };
                                    const NoticeIcon = noticeIconMap[notice.type] || Info;
                                    const noticeColor = noticeColorMap[notice.type] || 'var(--brand)';
                                    return (
                                        <div key={notice.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-[var(--chip-bg)] transition-colors cursor-default">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: `color-mix(in srgb, ${noticeColor} 15%, transparent)` }}
                                            >
                                                <NoticeIcon className="w-4 h-4" style={{ color: noticeColor }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{notice.title}</div>
                                                <div className="text-[11px] text-[var(--text-secondary)] truncate">{notice.message}</div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0 opacity-40" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}



                    {/* Contribution Section */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 font-['Poppins',sans-serif]">Want to contribute?</h3>
                        <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">Help us grow by submitting new apps, extensions, or sending feedback.</p>
                        <div className="flex flex-col gap-2.5">
                            <button
                                onClick={() => onNavigate('/contribute')}
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

                    {/* Social Links */}
                    <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 font-['Poppins',sans-serif]">
                            Be part of {SITE_NAME}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mb-4">
                            Join our community servers and stay updated.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://www.youtube.com/@iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF0000] hover:border-[#FF0000] hover:-translate-y-1 transition-all shadow-sm">
                                <Youtube className="w-5 h-5" />
                            </a>
                            <a href="https://discord.gg/hfYtH9hrRm" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#5865F2] hover:border-[#5865F2] hover:-translate-y-1 transition-all shadow-sm">
                                <DiscordIcon className="w-5 h-5" />
                            </a>
                            <a href="https://t.me/iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#0088cc] hover:border-[#0088cc] hover:-translate-y-1 transition-all shadow-sm">
                                <TelegramIcon className="w-5 h-5" />
                            </a>
                            <a href="https://github.com/miyomiorg/Miyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:-translate-y-1 transition-all shadow-sm">
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>
                </aside>
            </div>

            {isFeedbackOpen && (
                <FeedbackPanel page="blog" onClose={() => setIsFeedbackOpen(false)} />
            )}
        </div>
    );
}
