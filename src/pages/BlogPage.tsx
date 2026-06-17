import { useState, useMemo, useRef } from 'react';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { useNotices } from '../hooks/useNotices';
import { BlogCard } from '../components/BlogCard';
import { BlogSortDropdown, SortMode } from '../components/BlogSortDropdown';
import { FileText, ChevronRight, Search, Clock, Pin, ChevronDown, Sparkles, Info, AlertTriangle, AlertCircle, BookOpen, Smartphone, Puzzle, Package, Heart, Search as SearchIcon, Megaphone, Wrench, Newspaper, PenTool, LucideIcon, Eye } from 'lucide-react';
import { SITE_NAME } from '../../functions/_lib/seo';

const CATEGORIES = ['All', 'Announcements', 'Updates', 'Community', 'Transparency', 'Devlog', 'News', 'Editorial'];

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Guides': BookOpen,
    'Apps': Smartphone,
    'Extensions': Puzzle,
    'Updates': Package,
    'Community': Heart,
    'Transparency': SearchIcon,
    'Announcements': Megaphone,
    'Devlog': Wrench,
    'News': Newspaper,
    'Editorial': PenTool,
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
        // 'newest' is already the default order from the hook

        return result;
    }, [posts, search, sortMode]);

    const pinnedPost = useMemo(() => posts.find(p => p.is_pinned), [posts]);
    const regularPosts = useMemo(() => filteredPosts.filter(p => p.id !== pinnedPost?.id), [filteredPosts, pinnedPost]);

    // Category counts from all posts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        if (!posts) return counts;
        posts.forEach(p => {
            counts[p.category] = (counts[p.category] || 0) + 1;
        });
        return counts;
    }, [posts]);

    const pinnedDate = pinnedPost ? new Date(pinnedPost.published_at || pinnedPost.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
    }) : '';

    // Estimate read time for pinned post
    const pinnedReadTime = pinnedPost ? (() => {
        const text = (pinnedPost.excerpt || pinnedPost.content || '').replace(/<[^>]*>?/gm, '');
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
                        {SITE_NAME} Journal
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

            {/* Category Pills */}
            <div className="relative mb-8 group/cats">
                <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-[var(--bg-page)] to-transparent z-10 pointer-events-none hidden sm:block"></div>
                <button
                    onClick={() => scrollCategories('left')}
                    className="absolute left-0 top-1/2 -translate-y-[calc(50%+4px)] -ml-4 z-20 w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--divider)] shadow-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-all opacity-0 group-hover/cats:opacity-100 hidden sm:flex"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                </button>

                <div 
                    ref={categoryContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-8 scrollbar-hide gap-2.5 relative z-0 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                >
                    {CATEGORIES.map(c => {
                        const Icon = CATEGORY_ICONS[c];
                        const isActive = selectedCategory === c;
                        const catColor = CATEGORY_COLORS[c] || 'var(--brand)';
                        return (
                            <button
                                key={c}
                                onClick={(e) => {
                                    if (dragged) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                    setSelectedCategory(c);
                                }}
                                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-medium transition-all border ${
                                    isActive
                                        ? 'bg-transparent border-[var(--brand)] shadow-[0_0_15px_rgba(var(--brand-rgb),0.1)]'
                                        : 'bg-[var(--bg-surface)] border-[var(--divider)] hover:border-[var(--text-secondary)] hover:bg-[var(--chip-bg)]'
                                }`}
                                style={isActive && c !== 'All' ? { borderColor: catColor, color: catColor } : isActive ? { color: 'var(--brand)' } : { color: 'var(--text-secondary)' }}
                            >
                                {Icon && <Icon className="w-4 h-4" style={{ color: isActive ? 'inherit' : catColor }} />}
                                {c}
                            </button>
                        );
                    })}
                </div>

                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-[var(--bg-page)] to-transparent z-10 pointer-events-none hidden sm:block"></div>
                <button
                    onClick={() => scrollCategories('right')}
                    className="absolute right-0 top-1/2 -translate-y-[calc(50%+4px)] -mr-4 z-20 w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--divider)] shadow-md flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)] transition-all opacity-0 group-hover/cats:opacity-100 hidden sm:flex"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
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
                                            <span className="text-[var(--brand)] text-xs font-bold flex items-center gap-1">
                                                <Pin className="w-3 h-3" /> PINNED
                                            </span>
                                        </div>
                                        <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-[var(--brand)] transition-colors line-clamp-2 font-['Poppins',sans-serif]">
                                            {pinnedPost.title}
                                        </h2>
                                        <p className="text-sm text-[var(--text-secondary)] mb-5 line-clamp-3 leading-relaxed">
                                            {pinnedPost.excerpt || 'Read the full post for more details...'}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                            <span
                                                className="text-white font-semibold px-2.5 py-1 rounded-md"
                                                style={{ backgroundColor: catColor(pinnedPost.category) }}
                                            >
                                                {pinnedPost.category}
                                            </span>
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

                        {/* Categories Card */}
                        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 font-['Poppins',sans-serif]">Categories</h3>
                            <div className="space-y-2">
                                {Object.entries(categoryCounts).map(([cat, count]) => {
                                    const Icon = CATEGORY_ICONS[cat] || FileText;
                                    const catColor = CATEGORY_COLORS[cat] || 'var(--brand)';
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                                                selectedCategory === cat
                                                    ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                                                    : 'hover:bg-[var(--chip-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Icon className="w-4 h-4" style={{ color: catColor }} />
                                                <span className="font-medium">{cat}</span>
                                            </span>
                                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                                selectedCategory === cat
                                                    ? 'bg-[var(--brand)]/20 text-[var(--brand)]'
                                                    : 'bg-[var(--bg-elev-1)] text-[var(--text-secondary)] border border-[var(--divider)]'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedCategory !== 'All' && (
                                <button
                                    onClick={() => setSelectedCategory('All')}
                                    className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-[var(--brand)] font-medium hover:underline"
                                >
                                    View all categories <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Community CTA */}
                        <div
                            className="relative rounded-2xl p-5 border border-[var(--divider)] overflow-hidden min-h-[220px] flex flex-col justify-end"
                            style={{
                                background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.1) 100%)'
                            }}
                        >
                            <img 
                                src="/inaread.png" 
                                alt="Miyomi Mascot" 
                                className="absolute bottom-0 right-0 w-[140px] pointer-events-none drop-shadow-lg opacity-90"
                                style={{ 
                                    zIndex: 0,
                                    maskImage: 'linear-gradient(to top, transparent 0%, black 15%)',
                                    WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)'
                                }}
                            />
                            <div className="relative z-10 w-[75%] mb-4">
                                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 font-['Poppins',sans-serif]">
                                    Share your knowledge.
                                </h3>
                                <p className="text-base font-semibold text-[var(--text-primary)] mb-2 font-['Poppins',sans-serif] leading-tight">
                                    Help the community grow.
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    Write a guide or share a post and make an impact!
                                </p>
                            </div>
                            <button
                                onClick={() => onNavigate('/submit-guide')}
                                className="relative z-10 w-[75%] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#a855f7] text-white text-[13px] font-semibold rounded-xl hover:bg-[#9333ea] transition-colors shadow-lg shadow-[#a855f7]/25"
                            >
                                ✏️ Submit a Guide / Post
                            </button>
                        </div>

                        {/* Social Links */}
                        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1 font-['Poppins',sans-serif]">
                                Be part of {SITE_NAME}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] mb-4">
                                Join our community servers and stay updated.
                            </p>
                            <div className="flex items-center gap-3">
                                <a
                                    href="https://discord.gg/miyomi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#5865F2] hover:border-[#5865F2]/50 transition-all hover:-translate-y-0.5"
                                    title="Discord"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                                </a>
                                <a
                                    href="https://reddit.com/r/miyomi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF5700] hover:border-[#FF5700]/50 transition-all hover:-translate-y-0.5"
                                    title="Reddit"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                                </a>
                                <a
                                    href="https://t.me/miyomi"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[#26A5E4] hover:border-[#26A5E4]/50 transition-all hover:-translate-y-0.5"
                                    title="Telegram"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0 12 12 0 0 0 11.944 0Zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                </a>
                            </div>
                        </div>
                    </aside>
            </div>
        </div>
    );
}
