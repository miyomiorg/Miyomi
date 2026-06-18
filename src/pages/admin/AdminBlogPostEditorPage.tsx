import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminRichTextEditor } from '@/components/admin/AdminRichTextEditor';
import { AdminInput, AdminButton, AdminSelect, AdminTextarea, AdminFormField, Label, AdminToggle } from '@/components/admin/AdminFormElements';
import { ArrowLeft, Save, AlertCircle, Trash2, Globe, FileText, Check, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = ['Announcements', 'Updates', 'Community', 'Transparency', 'Devlog', 'News', 'Editorial', 'Guides', 'Apps', 'Extensions'];

const emptyPost = {
    title: '', slug: '', excerpt: '', content: '', category: '', tags: [] as string[],
    status: 'draft', is_pinned: false,
    author_id: '', author_name: '', author_avatar_url: '', author_role: '',
    thumbnail_url: '', thumbnail_alt: '', seo_title: '', seo_description: '', og_image_url: '',
    published_at: null as string | null
};

export function AdminBlogPostEditorPage() {
    const { id: routeId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [insertedId, setInsertedId] = useState<string | null>(null);
    const activeId = routeId || insertedId;
    const [form, setForm] = useState(emptyPost);
    const [loading, setLoading] = useState(!!routeId);
    const [saving, setSaving] = useState(false);
    const [slugTouched, setSlugTouched] = useState(!!routeId);
    const [slugError, setSlugError] = useState('');
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    
    // Auto-save logic
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    function generateSlug(text: string): string {
        return text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '');
    }

    function isValidSlug(slug: string): boolean {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    }

    function validateSlug(slug: string) {
        if (!slug) { setSlugError(''); return; }
        if (!isValidSlug(slug)) setSlugError('Invalid slug format');
        else setSlugError('');
    }

    useEffect(() => {
        async function fetchCategories() {
            const { data } = await supabase.from('blog_posts').select('category');
            if (data) {
                const fetched = data.map(p => p.category).filter(Boolean);
                const unique = [...new Set([...DEFAULT_CATEGORIES, ...fetched])] as string[];
                setExistingCategories(unique.sort());
            } else {
                setExistingCategories([...DEFAULT_CATEGORIES].sort());
            }
        }
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!routeId) return;
        async function fetchPost() {
            try {
                const { data, error } = await supabase.from('blog_posts').select('*').eq('id', routeId).single();
                if (error) {
                    toast.error('Failed to load blog post');
                    navigate('/admin/blog-posts');
                    return;
                }
                setForm({
                    title: data.title || '',
                    slug: data.slug || '',
                    excerpt: data.excerpt || '',
                    content: data.content || '',
                    category: data.category || '',
                    tags: data.tags || [],
                    status: data.status || 'draft',
                    is_pinned: data.is_pinned || false,
                    author_id: data.author_id || '',
                    author_name: data.author_name || '',
                    author_avatar_url: data.author_avatar_url || '',
                    author_role: data.author_role || '',
                    thumbnail_url: data.thumbnail_url || '',
                    thumbnail_alt: data.thumbnail_alt || '',
                    seo_title: data.seo_title || '',
                    seo_description: data.seo_description || '',
                    og_image_url: data.og_image_url || '',
                    published_at: data.published_at || null
                });
            } catch (error) {
                console.error(error);
                toast.error('Failed to load blog post');
            } finally {
                setLoading(false);
            }
        }
        fetchPost();
    }, [routeId, navigate]);

    const handleSave = async (isAutoSave = false, targetStatus?: string) => {
        if (!form.title && isAutoSave) return; // Don't auto-save empty posts
        if (!form.title) { toast.error('Title is required'); return; }

        const finalSlug = form.slug || generateSlug(form.title);
        if (!finalSlug) { if(!isAutoSave) toast.error('Slug is required'); return; }
        if (!isValidSlug(finalSlug)) { if(!isAutoSave) toast.error('Invalid slug'); return; }

        const finalStatus = targetStatus || form.status;

        if (!isAutoSave) setSaving(true);

        try {
            const payload = {
                title: form.title,
                slug: finalSlug,
                excerpt: form.excerpt,
                content: form.content,
                content_format: 'html',
                category: form.category || 'Updates',
                tags: form.tags,
                status: finalStatus,
                is_pinned: form.is_pinned,
                author_id: form.author_id || null,
                author_name: form.author_name || null,
                author_avatar_url: form.author_avatar_url || null,
                author_role: form.author_role || null,
                thumbnail_url: form.thumbnail_url || null,
                thumbnail_alt: form.thumbnail_alt || null,
                seo_title: form.seo_title || null,
                seo_description: form.seo_description || null,
                og_image_url: form.og_image_url || null,
                updated_at: new Date().toISOString(),
                ...(finalStatus === 'published' && !form.published_at ? { published_at: new Date().toISOString() } : {})
            };

            let returnedId = activeId;

            if (activeId) {
                const { error } = await supabase.from('blog_posts').update(payload).eq('id', activeId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('blog_posts').insert([payload]).select('id').single();
                if (error) throw error;
                if (data) {
                    setInsertedId(data.id);
                    if (!isAutoSave) {
                        navigate(`/admin/blog-posts/${data.id}/edit`, { replace: true });
                    }
                    returnedId = data.id;
                }
            }

            setLastSaved(new Date());
            if (!isAutoSave) {
                setForm(prev => ({ ...prev, slug: finalSlug, status: finalStatus, published_at: finalStatus === 'published' && !prev.published_at ? new Date().toISOString() : prev.published_at }));
                toast.success(finalStatus === 'published' ? 'Post published!' : 'Draft saved!');
            }
        } catch (error: any) {
            console.error('Save error:', error);
            if (error.code === '23505') {
                if(!isAutoSave) toast.error('This slug is already used by another post. Please choose a different one.');
                setSlugError('Slug already exists');
            } else {
                if(!isAutoSave) toast.error('Failed to save post: ' + error.message);
            }
        } finally {
            if (!isAutoSave) setSaving(false);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (loading) return; // Don't auto-save while initially loading
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        
        autoSaveTimerRef.current = setTimeout(() => {
            if (form.title && form.status === 'draft') {
                handleSave(true);
            }
        }, 15000); // Auto save every 15 seconds of inactivity
        
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [form, loading]);

    if (loading) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto pb-24">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/blog-posts')} className="p-2 hover:bg-[var(--bg-elev-1)] rounded-xl transition-colors text-[var(--text-secondary)]">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{activeId ? 'Edit Blog Post' : 'New Blog Post'}</h1>
                        <div className="text-sm text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                            {form.status === 'published' ? (
                                <span className="flex items-center gap-1 text-green-500"><Globe className="w-3.5 h-3.5"/> Published</span>
                            ) : (
                                <span className="flex items-center gap-1 text-yellow-500"><FileText className="w-3.5 h-3.5"/> Draft</span>
                            )}
                            {lastSaved && <span>• Last saved {lastSaved.toLocaleTimeString()}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {form.status === 'published' ? (
                        <>
                            <AdminButton variant="secondary" onClick={() => handleSave(false, 'draft')} disabled={saving}>
                                Unpublish to Draft
                            </AdminButton>
                            <AdminButton onClick={() => handleSave(false, 'published')} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" /> Update Post
                            </AdminButton>
                        </>
                    ) : (
                        <>
                            <AdminButton variant="secondary" onClick={() => handleSave(false, 'draft')} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" /> Save Draft
                            </AdminButton>
                            <AdminButton onClick={() => handleSave(false, 'published')} disabled={saving}>
                                <Globe className="w-4 h-4 mr-2" /> Publish Post
                            </AdminButton>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-surface)] border rounded-2xl p-6" style={{ borderColor: 'var(--divider)' }}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Content</h2>
                        <div className="space-y-4">
                            <AdminFormField label="Post Title" required>
                                <AdminInput 
                                    value={form.title} 
                                    onChange={(e) => {
                                        setForm(prev => ({...prev, title: e.target.value}));
                                        if (!slugTouched && !activeId) {
                                            const newSlug = generateSlug(e.target.value);
                                            setForm(prev => ({...prev, slug: newSlug}));
                                            validateSlug(newSlug);
                                        }
                                    }}
                                    placeholder="Enter post title..." 
                                />
                            </AdminFormField>

                            <AdminFormField label="URL Slug" required>
                                <AdminInput 
                                    value={form.slug} 
                                    onChange={(e) => {
                                        setSlugTouched(true);
                                        setForm(prev => ({...prev, slug: e.target.value}));
                                        validateSlug(e.target.value);
                                    }}
                                    placeholder="e.g. my-awesome-post" 
                                />
                            </AdminFormField>

                            <AdminFormField label="Excerpt">
                                <AdminTextarea 
                                    value={form.excerpt} 
                                    onChange={(e) => setForm(prev => ({...prev, excerpt: e.target.value}))}
                                    placeholder="Short summary for the blog feed..." 
                                    rows={2}
                                />
                            </AdminFormField>

                            <div className="pt-2">
                                <Label>Post Body</Label>
                                <div className="mt-2 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--divider)', minHeight: '400px' }}>
                                    <AdminRichTextEditor
                                        value={form.content}
                                        onChange={(html) => setForm(prev => ({...prev, content: html}))}
                                        placeholder="Write your post content here..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[var(--bg-surface)] border rounded-2xl p-6" style={{ borderColor: 'var(--divider)' }}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Settings</h2>
                        <div className="space-y-4">
                            <AdminFormField label="Category" required>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={form.category}
                                        onChange={(e) => {
                                            setForm(prev => ({...prev, category: e.target.value}));
                                            setIsCategoryOpen(true);
                                        }}
                                        onFocus={() => setIsCategoryOpen(true)}
                                        onBlur={() => setTimeout(() => setIsCategoryOpen(false), 200)}
                                        placeholder="Type or select a category..."
                                        className="w-full bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                                    />
                                    {isCategoryOpen && (
                                        <div className="absolute z-50 mt-1 w-full bg-[var(--bg-elev-2)] border border-[var(--divider)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {existingCategories
                                                .filter(cat => cat.toLowerCase().includes((form.category || '').toLowerCase()))
                                                .map(cat => (
                                                <div 
                                                    key={cat}
                                                    onClick={() => {
                                                        setForm(prev => ({...prev, category: cat}));
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className="px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--chip-bg)] cursor-pointer transition-colors"
                                                >
                                                    {cat}
                                                </div>
                                            ))}
                                            {form.category && !existingCategories.some(c => c.toLowerCase() === form.category.toLowerCase()) && (
                                                <div 
                                                    onClick={() => {
                                                        const newCat = form.category.trim();
                                                        if (newCat) {
                                                            setExistingCategories(prev => [...prev, newCat].sort());
                                                            setForm(prev => ({...prev, category: newCat}));
                                                        }
                                                        setIsCategoryOpen(false);
                                                    }}
                                                    className="px-4 py-2 text-sm text-[var(--brand)] hover:bg-[var(--chip-bg)] cursor-pointer transition-colors border-t border-[var(--divider)] flex items-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    Create "{form.category}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </AdminFormField>

                            <AdminFormField label="Tags">
                                <AdminInput 
                                    value={form.tags.join(', ')} 
                                    onChange={(e) => setForm(prev => ({
                                        ...prev, 
                                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                    }))}
                                    placeholder="e.g. update, new-feature, community" 
                                />
                                <p className="text-xs text-[var(--text-secondary)] mt-1.5">Separate tags with commas</p>
                            </AdminFormField>

                            <div className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'var(--divider)' }}>
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">Pin Post</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Featured at top of the blog</p>
                                </div>
                                <AdminToggle checked={form.is_pinned} onChange={(checked) => setForm(prev => ({...prev, is_pinned: checked}))} label="" />
                            </div>

                            <AdminFormField label="Thumbnail URL">
                                <AdminInput 
                                    value={form.thumbnail_url} 
                                    onChange={(e) => setForm(prev => ({...prev, thumbnail_url: e.target.value}))}
                                    placeholder="https://..." 
                                />
                            </AdminFormField>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] border rounded-2xl p-6" style={{ borderColor: 'var(--divider)' }}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Author Profile Override</h2>
                        <p className="text-xs text-[var(--text-secondary)] mb-4">Leave blank to use the default Miyomi Admin or your signed-in user.</p>
                        <div className="space-y-4">
                            <AdminFormField label="Author Name">
                                <AdminInput value={form.author_name} onChange={(e) => setForm(prev => ({...prev, author_name: e.target.value}))} placeholder="e.g. tas33n" />
                            </AdminFormField>
                            <AdminFormField label="Author Role">
                                <AdminInput value={form.author_role} onChange={(e) => setForm(prev => ({...prev, author_role: e.target.value}))} placeholder="e.g. Lead Developer" />
                            </AdminFormField>
                            <AdminFormField label="Avatar URL">
                                <AdminInput value={form.author_avatar_url} onChange={(e) => setForm(prev => ({...prev, author_avatar_url: e.target.value}))} placeholder="https://..." />
                            </AdminFormField>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] border rounded-2xl p-6" style={{ borderColor: 'var(--divider)' }}>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">SEO Metadata</h2>
                        <div className="space-y-4">
                            <AdminFormField label="SEO Title">
                                <AdminInput value={form.seo_title} onChange={(e) => setForm(prev => ({...prev, seo_title: e.target.value}))} placeholder="Optional override" />
                            </AdminFormField>
                            <AdminFormField label="SEO Description">
                                <AdminTextarea value={form.seo_description} onChange={(e) => setForm(prev => ({...prev, seo_description: e.target.value}))} rows={2} placeholder="Optional override" />
                            </AdminFormField>
                            <AdminFormField label="OG Image URL">
                                <AdminInput value={form.og_image_url} onChange={(e) => setForm(prev => ({...prev, og_image_url: e.target.value}))} placeholder="https://... (Optional override)" />
                            </AdminFormField>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
