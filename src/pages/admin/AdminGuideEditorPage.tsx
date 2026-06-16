import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminRichTextEditor } from '@/components/admin/AdminRichTextEditor';
import { AdminInput, AdminButton, AdminSelect, AdminTextarea, AdminFormField, Label } from '@/components/admin/AdminFormElements';
import { ArrowLeft, Save, AlertCircle, ChevronsUpDown, Check, PlusCircle, X, HelpCircle, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

const emptyGuide = {
    title: '', description: '', content: '', author: '', category: '',
    slug: '', status: 'draft', tags: [] as string[],
    content_mode: 'html', readTime: '', metadata: {} as Record<string, any>
};

export function AdminGuideEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyGuide);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [slugTouched, setSlugTouched] = useState(!!id); // true when editing existing guide
    const [slugError, setSlugError] = useState('');
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [categoryInput, setCategoryInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [showGuidelines, setShowGuidelines] = useState(false);

    function generateSlug(text: string): string {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    function isValidSlug(slug: string): boolean {
        return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
    }

    function validateSlug(slug: string) {
        if (!slug) {
            setSlugError('');
            return;
        }
        if (!isValidSlug(slug)) {
            setSlugError('Slug must only contain lowercase letters, numbers, and hyphens (no spaces or special characters)');
        } else {
            setSlugError('');
        }
    }

    function calculateReadTime(html: string) {
        if (!html) return '1 min read';
        const text = html.replace(/<[^>]*>?/gm, '');
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const minutes = Math.ceil(words / 200) || 1;
        return `${minutes} min read`;
    }

    const llmContextString = `You are writing an HTML guide for Miyomi.
Guidelines:
1. ONLY output valid HTML. Do not use Markdown.
2. The platform automatically wraps your output in a \`.guide-content\` container which handles basic typography (H1-H4, p, a, ul, ol, li, img).
3. Allowed tags: p, h1, h2, h3, h4, ul, ol, li, strong, em, u, a, img, iframe, table, thead, tbody, tr, th, td, div, span, details, summary.
4. You can use standard Tailwind utility classes or inline CSS styles (e.g., style="color: red;") if necessary, but standard HTML elements are already styled decently.
5. For callouts, use: <div data-callout="true" data-callout-type="info">...</div> (types: info, warning, tip, danger).
6. For custom boxes, use: <div data-container="card">...</div> (variants: card, highlight, steps).
7. To deep link into the app, you can use schemes like \`tachiyomi://\`, \`mihon://\`, \`cloudstream://\`.`;

    function copyLLMContext() {
        navigator.clipboard.writeText(llmContextString);
        toast.success('LLM Context copied to clipboard!');
    }

    useEffect(() => {
        async function fetchCategories() {
            const { data } = await supabase.from('guides').select('category');
            if (data) {
                const unique = [...new Set(data.map(g => g.category).filter(Boolean))] as string[];
                setExistingCategories(unique.sort());
            }
        }
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!id) return;

        async function fetchGuide() {
            try {
                const { data, error } = await supabase.from('guides').select('*').eq('id', id).single();
                if (error) {
                    toast.error('Failed to load guide');
                    navigate('/admin/guides');
                    return;
                }
                setForm({
                    title: data.title,
                    description: data.description || '',
                    content: data.content_html || data.content || '',
                    author: data.author || '',
                    category: data.category || '',
                    slug: data.slug || '',
                    status: data.status,
                    tags: data.tags || [],
                    content_mode: data.content_mode || 'html',
                    readTime: (data.metadata as any)?.readTime || '',
                    metadata: (data.metadata as any) || {},
                });
            } catch (error) {
                console.error(error);
                toast.error('Failed to load guide');
            } finally {
                setLoading(false);
            }
        }

        fetchGuide();
    }, [id, navigate]);

    async function handleSave() {
        if (!form.title) {
            toast.error('Title is required');
            return;
        }

        const finalSlug = form.slug || generateSlug(form.title);
        if (!finalSlug) {
            toast.error('Slug is required');
            return;
        }
        if (!isValidSlug(finalSlug)) {
            toast.error('Please fix the slug before saving — it contains invalid characters');
            setSlugError('Slug must only contain lowercase letters, numbers, and hyphens');
            return;
        }

        setSaving(true);
        const payload = {
            title: form.title,
            description: form.description || null,
            content: form.content || null,
            author: form.author || null,
            category: form.category || null,
            slug: finalSlug,
            status: form.status,
            tags: form.tags.length ? form.tags : null,
            content_mode: form.content_mode,
            author_name: form.author || null,
            published_at: form.status === 'published' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
            metadata: {
                ...form.metadata,
                readTime: form.readTime || calculateReadTime(form.content || '')
            }
        };

        try {
            if (id) {
                const { data, error } = await supabase.from('guides').update(payload).eq('id', id).select();
                if (error) throw error;
                if (!data || data.length === 0) throw new Error('Update failed — check RLS policies.');
                toast.success('Guide saved!');
            } else {
                const { data, error } = await supabase.from('guides').insert(payload).select();
                if (error) throw error;
                toast.success('Guide created!');
                navigate('/admin/guides');
            }
        } catch (error: any) {
            console.error('Save Error:', error);
            toast.error(error.message || 'Failed to save guide');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading...</div>;

    return (
        <div className="max-w-[1400px] mx-auto pb-20">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <button
                    onClick={() => navigate('/admin/guides')}
                    className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">ID: {id || 'NEW'}</span>
                    <AdminButton onClick={handleSave} disabled={saving}>
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Guide'}
                    </AdminButton>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                {/* Main editor column */}
                <div className="space-y-4 min-w-0">
                    <input
                        type="text"
                        value={form.title}
                        onChange={e => {
                            const newTitle = e.target.value;
                            setForm(f => ({
                                ...f,
                                title: newTitle,
                                ...(slugTouched ? {} : { slug: generateSlug(newTitle) }),
                            }));
                            if (!slugTouched) {
                                setSlugError('');
                            }
                        }}
                        placeholder="Guide Title"
                        className="w-full bg-transparent text-3xl font-bold border-none focus:outline-none focus:ring-0 px-0 placeholder-[var(--text-secondary)]"
                        style={{ color: 'var(--text-primary)' }}
                    />

                    {/* Writer Guidelines */}
                    <div className="border rounded-xl bg-[var(--bg-elev-1)] overflow-hidden" style={{ borderColor: 'var(--divider)' }}>
                        <button
                            onClick={() => setShowGuidelines(!showGuidelines)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--chip-bg)] transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-[var(--brand)]" />
                                Writer Guidelines & LLM Context
                            </span>
                            {showGuidelines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {showGuidelines && (
                            <div className="p-4 border-t text-sm space-y-4" style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-[var(--text-primary)]">How to write guides:</h4>
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li><strong>HTML Only:</strong> Do not write in Markdown. Use the Visual or HTML editor.</li>
                                        <li><strong>Styling:</strong> Basic tags (<code>p</code>, <code>h1</code>, <code>a</code>) are automatically styled. You can use inline CSS (<code>style="..."</code>) or Tailwind classes if needed.</li>
                                        <li><strong>Callouts:</strong> Use the editor toolbar to insert Info/Warning/Tip boxes.</li>
                                        <li><strong>Iframes:</strong> Only YouTube, Google Drive, Facebook, X, Instagram, TikTok, Vimeo, and Reddit are allowed.</li>
                                        <li><strong>Deep Links:</strong> Standard schemes like <code>mihon://</code> or <code>tachiyomi://</code> will work safely.</li>
                                    </ul>
                                </div>
                                <div className="bg-[var(--bg-surface)] border rounded-lg p-4 space-y-2" style={{ borderColor: 'var(--divider)' }}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-[var(--text-primary)]">LLM Prompt Context</h4>
                                        <button onClick={copyLLMContext} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--brand)] text-white text-xs rounded hover:bg-[var(--brand-strong)] transition-colors">
                                            <Copy className="w-3 h-3" /> Copy Prompt
                                        </button>
                                    </div>
                                    <p className="text-xs">Paste this context into ChatGPT or Claude to have it generate perfectly formatted HTML guides for Miyomi.</p>
                                    <pre className="text-[10px] p-3 rounded bg-[var(--bg-elev-1)] overflow-x-auto border" style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}>
                                        {llmContextString}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </div>

                    <AdminRichTextEditor
                        value={form.content}
                        onChange={content => setForm(f => ({ ...f, content }))}
                        placeholder="Start writing your guide..."
                    />
                </div>

                {/* Sidebar settings */}
                <div className="space-y-6">
                    <div className="p-4 rounded-xl border space-y-4 sticky top-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                        <h3 className="font-semibold text-[var(--text-primary)]">Settings</h3>

                        <AdminFormField label="Status">
                            <AdminSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </AdminSelect>
                        </AdminFormField>

                        <AdminFormField label="Slug">
                            <AdminInput
                                value={form.slug}
                                onChange={e => {
                                    const val = e.target.value;
                                    setSlugTouched(true);
                                    setForm(f => ({ ...f, slug: val }));
                                    validateSlug(val);
                                }}
                                onBlur={() => {
                                    if (form.slug && !isValidSlug(form.slug)) {
                                        const fixed = generateSlug(form.slug);
                                        setForm(f => ({ ...f, slug: fixed }));
                                        setSlugError('');
                                        toast.info('Slug auto-corrected');
                                    }
                                }}
                                placeholder="url-slug"
                                className={slugError ? '!border-red-500' : ''}
                            />
                            {slugError && (
                                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {slugError}
                                </div>
                            )}
                            {!form.slug && form.title && (
                                <div className="text-xs text-[var(--text-secondary)] mt-1">
                                    Will auto-generate: <span className="font-mono text-[var(--brand)]">{generateSlug(form.title)}</span>
                                </div>
                            )}
                        </AdminFormField>

                        <AdminFormField label="Read Time">
                            <div className="flex gap-2">
                                <AdminInput
                                    value={form.readTime}
                                    onChange={e => setForm(f => ({ ...f, readTime: e.target.value }))}
                                    placeholder={`Auto: ${calculateReadTime(form.content || '')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, readTime: calculateReadTime(f.content || '') }))}
                                    className="px-3 py-2 bg-[var(--bg-elev-1)] hover:bg-[var(--chip-bg)] text-[var(--brand)] text-sm font-semibold rounded-lg transition-colors border border-[var(--divider)]"
                                >
                                    Auto
                                </button>
                            </div>
                        </AdminFormField>

                        <AdminFormField label="Category">
                            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        role="combobox"
                                        aria-expanded={categoryOpen}
                                        className="flex h-10 w-full items-center justify-between rounded-lg border border-[var(--divider)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                                    >
                                        <span className={form.category ? '' : 'text-[var(--text-secondary)]'}>
                                            {form.category || 'Select or create...'}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search or type new..."
                                            value={categoryInput}
                                            onValueChange={setCategoryInput}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && categoryInput) {
                                                    e.preventDefault();
                                                    setForm(f => ({ ...f, category: categoryInput }));
                                                    if (!existingCategories.includes(categoryInput)) {
                                                        setExistingCategories(prev => [...prev, categoryInput].sort());
                                                    }
                                                    setCategoryInput('');
                                                    setCategoryOpen(false);
                                                }
                                            }}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {categoryInput ? (
                                                    <button
                                                        className="w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-[var(--bg-elev-1)] flex items-center"
                                                        onClick={() => {
                                                            setForm(f => ({ ...f, category: categoryInput }));
                                                            setExistingCategories(prev => [...prev, categoryInput].sort());
                                                            setCategoryInput('');
                                                            setCategoryOpen(false);
                                                        }}
                                                    >
                                                        <PlusCircle className="mr-2 h-4 w-4" />
                                                        Create "{categoryInput}"
                                                    </button>
                                                ) : 'No categories found.'}
                                            </CommandEmpty>
                                            <CommandGroup heading="Existing Categories">
                                                {existingCategories.map(cat => (
                                                    <CommandItem
                                                        key={cat}
                                                        value={cat}
                                                        onSelect={() => {
                                                            setForm(f => ({ ...f, category: cat }));
                                                            setCategoryInput('');
                                                            setCategoryOpen(false);
                                                        }}
                                                        className="flex justify-between"
                                                    >
                                                        {cat}
                                                        {form.category === cat && <Check className="h-4 w-4 opacity-50" />}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </AdminFormField>

                        <AdminFormField label="Author">
                            <AdminInput value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
                        </AdminFormField>

                        <AdminFormField label="Description">
                            <AdminTextarea
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={3}
                            />
                        </AdminFormField>

                        <AdminFormField label="Tags">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {form.tags.map((tag, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))}
                                            className="hover:bg-[var(--brand)]/20 rounded-full p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <AdminInput
                                value={tagInput}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val.endsWith(',')) {
                                        const newTag = val.slice(0, -1).trim();
                                        if (newTag && !form.tags.includes(newTag)) {
                                            setForm(f => ({ ...f, tags: [...f.tags, newTag] }));
                                        }
                                        setTagInput('');
                                    } else {
                                        setTagInput(val);
                                    }
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const newTag = tagInput.trim();
                                        if (newTag && !form.tags.includes(newTag)) {
                                            setForm(f => ({ ...f, tags: [...f.tags, newTag] }));
                                        }
                                        setTagInput('');
                                    }
                                    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
                                        setForm(f => ({ ...f, tags: f.tags.slice(0, -1) }));
                                    }
                                }}
                                placeholder={form.tags.length ? 'Add more...' : 'Type a tag and press comma or Enter'}
                            />
                        </AdminFormField>
                    </div>
                </div>
            </div>
        </div>
    );
}
