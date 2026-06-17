import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlogPosts } from '../hooks/useBlogPosts';
import { BlogCard } from '../components/BlogCard';
import { FileText, ChevronRight, Globe } from 'lucide-react';
import { AdminSearchBar } from '../components/admin/AdminSearchBar';
import { SITE_NAME } from '../../functions/_lib/seo';

const CATEGORIES = ['All', 'Announcements', 'Updates', 'Community', 'Transparency', 'Devlog', 'News', 'Editorial'];

export function BlogPage({ onNavigate }: { onNavigate: (path: string) => void }) {
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Fetch published posts
    const { posts, loading } = useBlogPosts({
        category: selectedCategory === 'All' ? undefined : selectedCategory,
        requirePublished: true
    });

    const filteredPosts = useMemo(() => {
        if (!posts) return [];
        return posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.excerpt?.toLowerCase().includes(search.toLowerCase()));
    }, [posts, search]);

    const pinnedPost = useMemo(() => posts.find(p => p.is_pinned), [posts]);
    const regularPosts = useMemo(() => filteredPosts.filter(p => p.id !== pinnedPost?.id), [filteredPosts, pinnedPost]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-2">
                        {SITE_NAME} Blog
                    </h1>
                    <p className="text-[var(--text-secondary)]">The latest news, updates, and community highlights.</p>
                </div>
                <div className="w-full md:w-72">
                    <AdminSearchBar value={search} onChange={setSearch} placeholder="Search posts..." />
                </div>
            </div>

            {/* Categories Carousel */}
            <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-2">
                {CATEGORIES.map(c => (
                    <button
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedCategory === c
                                ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20'
                                : 'bg-[var(--bg-elev-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]'
                            }`}
                    >
                        {c}
                    </button>
                ))}
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
                        <div className="mb-12 cursor-pointer group" onClick={() => onNavigate(`/blog/${pinnedPost.slug}`)}>
                            <div className="bg-[var(--bg-surface)] border rounded-3xl overflow-hidden flex flex-col md:flex-row transition-all hover:border-[var(--brand)]/50 hover:shadow-xl hover:shadow-[var(--brand)]/10" style={{ borderColor: 'var(--divider)' }}>
                                {pinnedPost.thumbnail_url && (
                                    <div className="md:w-1/2 aspect-video md:aspect-auto relative overflow-hidden bg-[var(--bg-elev-1)]">
                                        <img
                                            src={pinnedPost.thumbnail_url}
                                            alt={pinnedPost.thumbnail_alt || pinnedPost.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute top-4 left-4 bg-[var(--brand)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                                            📌 Featured
                                        </div>
                                    </div>
                                )}
                                <div className={`p-8 md:p-12 flex flex-col justify-center ${pinnedPost.thumbnail_url ? 'md:w-1/2' : 'w-full'}`}>
                                    <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)] mb-4">
                                        <span className="bg-[var(--chip-bg)] px-3 py-1 rounded-full font-medium text-[var(--text-primary)]">
                                            {pinnedPost.category}
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(pinnedPost.published_at || pinnedPost.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-4 group-hover:text-[var(--brand)] transition-colors line-clamp-2">
                                        {pinnedPost.title}
                                    </h2>
                                    <p className="text-[var(--text-secondary)] mb-8 line-clamp-3 leading-relaxed">
                                        {pinnedPost.excerpt || 'Read the full post for more details...'}
                                    </p>
                                    <div className="flex items-center text-[var(--brand)] font-semibold mt-auto">
                                        Read Article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No posts found</h3>
                            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                                We couldn't find any blog posts matching your search criteria. Check back later!
                            </p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
