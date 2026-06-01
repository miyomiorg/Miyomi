import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, Label } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { ArrowLeft, Save, Loader2, Github, Download, Palette, HelpCircle, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { extractColorFromImage } from '@/utils/extractColorFromImage';
import { SocialUrlsInput } from '@/components/admin/SocialUrlsInput';
import { detectGitProvider } from '@/utils/gitProviders';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s.-]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function formatSlugInput(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s.-]/g, '')
        .replace(/[\s]+/g, '-');
}

const emptyApp = {
    name: '', slug: '', description: '', short_description: '', author: '', category: '', version: '',
    status: 'approved', platforms: [] as string[], tags: [] as string[],
    content_types: [] as string[],
    repo_url: '', download_url: '', website_url: '', icon_url: '', icon_color: '',
    fork_of: '', upstream_url: '', social_urls: [] as string[],
    tutorials: [] as any[],
    download_count: 0, likes_count: 0
};

const PLATFORM_OPTIONS = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Web'];
const CONTENT_TYPE_OPTIONS = ['Anime', 'Manga', 'Light Novel', 'Webtoon', 'Comics'];
const TAG_OPTIONS = ['Free', 'Paid', 'Open Source', 'Ad-free', 'NSFW', 'Reader', 'Tracker', 'Downloader'];

export function AdminAppFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logAction } = useAdminLogger();
    const [form, setForm] = useState(emptyApp);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [fetchingGithub, setFetchingGithub] = useState(false);
    const [extractingColor, setExtractingColor] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [repoProvider, setRepoProvider] = useState('github');

    const [guideOptions, setGuideOptions] = useState<string[]>([]);
    const [guidesData, setGuidesData] = useState<any[]>([]);
    const [selectedGuideTitles, setSelectedGuideTitles] = useState<string[]>([]);

    useEffect(() => {
        if (id) {
            fetchApp(id);
        }
        fetchGuides();
    }, [id]);

    useEffect(() => {
        if (form.icon_url && !form.icon_color) {
            handleColorExtraction(form.icon_url);
        }
    }, [form.icon_url]);

    useEffect(() => {
        if (!slugManuallyEdited && form.name) {
            setForm(f => ({ ...f, slug: slugify(f.name) }));
        }
    }, [form.name, slugManuallyEdited]);

    async function handleColorExtraction(url: string) {
        setExtractingColor(true);
        const color = await extractColorFromImage(url);
        if (color) {
            setForm(f => ({ ...f, icon_color: color }));
        }
        setExtractingColor(false);
    }

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.name.trim()) {
                const dup = await checkDuplicate('name', form.name);
                setErrors(prev => ({
                    ...prev,
                    name: dup ? `An app with the name "${form.name}" already exists.` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.name]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.repo_url.trim()) {
                const dup = await checkDuplicate('repo_url', form.repo_url);
                setErrors(prev => ({
                    ...prev,
                    repo_url: dup ? `An app with this Repository URL already exists (${dup.name}).` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.repo_url]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.website_url.trim()) {
                const dup = await checkDuplicate('website_url', form.website_url);
                setErrors(prev => ({
                    ...prev,
                    website_url: dup ? `An app with this Website URL already exists (${dup.name}).` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.website_url]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.slug.trim()) {
                const dup = await checkDuplicate('slug', form.slug);
                setErrors(prev => ({
                    ...prev,
                    slug: dup ? `An app with the slug "${form.slug}" already exists (${dup.name}).` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.slug]);

    async function fetchGuides() {
        const { data } = await supabase.from('guides').select('title, slug').order('title');
        if (data) {
            setGuidesData(data);
            setGuideOptions(data.map(g => g.title));
        }
    }

    useEffect(() => {
        if (form.repo_url && !form.download_url) {
            const match = form.repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
            if (match) {
                const [_, owner, repo] = match;
                const cleanRepo = repo.replace(/\.git$/, '').split('#')[0].split('?')[0];
                setForm(f => ({ ...f, download_url: `https://github.com/${owner}/${cleanRepo}/releases/latest` }));
            }
        }
    }, [form.repo_url, form.download_url]);

    async function fetchApp(appId: string) {
        try {
            const { data, error } = await (supabase.from('apps') as any).select('*').eq('id', appId).single();
            if (error) throw error;
            if (data) {
                const appData = data as any;
                const loadedTutorials = Array.isArray(appData.tutorials) ? appData.tutorials : [];
                setForm({
                    name: appData.name,
                    slug: appData.slug || '',
                    short_description: appData.short_description || '',
                    description: appData.description || '',
                    author: appData.author || '',
                    category: appData.category || '',
                    version: appData.version || '',
                    status: appData.status,
                    platforms: appData.platforms || [],
                    tags: appData.tags || [],
                    content_types: appData.content_types || [],
                    repo_url: appData.repo_url || '',
                    download_url: appData.download_url || '',
                    website_url: appData.website_url || '',
                    icon_url: appData.icon_url || '',
                    icon_color: appData.icon_color || '',
                    fork_of: appData.fork_of || '',
                    upstream_url: appData.upstream_url || '',
                    social_urls: (Array.isArray(appData.social_urls) && appData.social_urls.length > 0)
                        ? appData.social_urls.filter((u: string) => u)
                        : (appData.discord_url ? [appData.discord_url] : []),
                    tutorials: loadedTutorials,
                    download_count: appData.download_count || 0,
                    likes_count: appData.likes_count || 0
                });
                if (appData.repo_url) {
                    setRepoProvider(detectGitProvider(appData.repo_url).toLowerCase());
                }
                setSelectedGuideTitles(loadedTutorials.map((t: any) => t.title).filter(Boolean));
            }
        } catch (err: any) {
            toast.error('Failed to load app: ' + err.message);
            navigate('/admin/apps');
        } finally {
            setLoading(false);
        }
    }

    async function handleGithubFetch() {
        if (!form.repo_url) {
            toast.error("Please enter a GitHub URL first");
            return;
        }

        const match = form.repo_url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            toast.error("Invalid GitHub URL format");
            return;
        }

        const [_, owner, repo] = match;
        setFetchingGithub(true);

        try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
            if (!res.ok) throw new Error("GitHub API error: " + res.statusText);
            const data = await res.json();

            let version = form.version;
            let downloadUrl = form.download_url;
            try {
                const relRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
                if (relRes.ok) {
                    const relData = await relRes.json();
                    if (relData.tag_name) version = relData.tag_name;
                    if (!downloadUrl) {
                        downloadUrl = `https://github.com/${owner}/${repo}/releases/latest`;
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch releases", e);
            }

            setForm(prev => ({
                ...prev,
                name: prev.name || data.name,
                short_description: data.description || prev.short_description,
                website_url: data.homepage || prev.website_url,
                download_url: prev.download_url || downloadUrl,
                tags: [...new Set([...prev.tags, ...(data.topics || [])])],
                author: data.owner?.login || prev.author,
                icon_url: prev.icon_url || data.owner?.avatar_url || '',
                version: version
            }));

            toast.success("Fetched metadata from GitHub");
        } catch (err: any) {
            toast.error("Failed to fetch from GitHub: " + err.message);
        } finally {
            setFetchingGithub(false);
        }
    }

    async function checkDuplicate(field: 'name' | 'slug' | 'repo_url' | 'website_url', value: string) {
        if (!value) return false;
        let query = supabase.from('apps').select('id, name').eq(field, value);
        if (id) query = query.neq('id', id);
        const { data } = await query.maybeSingle();
        return data;
    }

    async function handleSave() {
        setSaving(true);
        if (Object.values(errors).some(v => !!v)) {
            toast.error("Please fix duplicate entries before saving.");
            setSaving(false);
            return;
        }

        try {
            const dupName = await checkDuplicate('name', form.name);
            if (dupName) {
                toast.error(`An app with the name "${form.name}" already exists.`);
                setSaving(false);
                return;
            }

            const finalTutorials = selectedGuideTitles.map(title => {
                const guide = guidesData.find(g => g.title === title);
                if (guide) {
                    return { title: guide.title, url: `/guides/${guide.slug}`, type: 'guide' };
                }
                return { title: title, url: '#', type: 'custom' };
            });

            const payload = {
                name: form.name,
                slug: form.slug || slugify(form.name) || null,
                short_description: form.short_description || null,
                description: form.description || null,
                author: form.author || null,
                category: form.category || null,
                version: form.version || null,
                status: form.status,
                platforms: form.platforms.length ? form.platforms : null,
                tags: form.tags.length ? form.tags : null,
                // @ts-ignore
                content_types: form.content_types.length ? form.content_types : null,
                repo_url: form.repo_url || null,
                download_url: form.download_url || null,
                website_url: form.website_url || null,
                icon_url: form.icon_url || null,
                icon_color: form.icon_color || null,
                fork_of: form.fork_of || null,
                upstream_url: form.upstream_url || null,
                social_urls: form.social_urls.filter(u => u.trim()) || [],
                discord_url: form.social_urls.filter(u => u.trim())[0] || null,
                tutorials: finalTutorials,
                download_count: form.download_count || 0,
                likes_count: form.likes_count || 0
            };


            if (id) {
                const { error } = await (supabase.from('apps') as any).update(payload).eq('id', id);
                if (error) throw error;

                await logAction('update', 'app', id, form.name).catch(err => {
                    console.error('Failed to log update action:', err);
                });

                toast.success('App updated successfully');
            } else {
                const { data, error } = await (supabase.from('apps') as any).insert(payload).select().single();
                if (error) throw error;

                if (data) {
                    await logAction('create', 'app', data.id, form.name).catch(err => {
                        console.error('Failed to log create action:', err);
                    });
                }

                toast.success('App created successfully');
            }
            navigate('/admin/apps');
        } catch (err: any) {
            toast.error('Failed to save app: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-96 text-[var(--text-secondary)]"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;
    }

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/apps')} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">
                        {id ? 'Edit App' : 'New App'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <AdminButton variant="secondary" onClick={() => navigate('/admin/apps')}>Cancel</AdminButton>
                    <AdminButton onClick={handleSave} disabled={!form.name || saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save App
                    </AdminButton>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Source Repository */}
                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <GitBranch className="w-5 h-5" /> Source Repository
                        </h3>
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                            <AdminFormField label="Provider" className="w-full sm:w-40">
                                <AdminSelect
                                    value={repoProvider}
                                    onChange={e => setRepoProvider(e.target.value)}
                                >
                                    <option value="github">GitHub</option>
                                    <option value="gitlab">GitLab</option>
                                    <option value="codeberg">Codeberg</option>
                                    <option value="bitbucket">Bitbucket</option>
                                    <option value="forgejo">Forgejo</option>
                                    <option value="gitea">Gitea</option>
                                    <option value="other">Other</option>
                                </AdminSelect>
                            </AdminFormField>
                            <AdminFormField label="Repository URL" className="flex-1 w-full">
                                {errors.repo_url && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.repo_url}</div>}
                                <AdminInput
                                    value={form.repo_url}
                                    onChange={e => {
                                        setForm(f => ({ ...f, repo_url: e.target.value }));
                                        if (errors.repo_url) setErrors(prev => ({ ...prev, repo_url: '' }));
                                    }}
                                    placeholder={
                                        repoProvider === 'github' ? "https://github.com/owner/repo" :
                                        repoProvider === 'gitlab' ? "https://gitlab.com/owner/repo" :
                                        repoProvider === 'codeberg' ? "https://codeberg.org/owner/repo" :
                                        "https://git.example.com/owner/repo"
                                    }
                                    className={errors.repo_url ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                                />
                            </AdminFormField>
                            {repoProvider === 'github' && (
                                <AdminButton onClick={handleGithubFetch} disabled={fetchingGithub || !form.repo_url} variant="secondary" className="w-full sm:w-auto">
                                    {fetchingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    <span className="ml-2 hidden sm:inline">Fetch Data</span>
                                </AdminButton>
                            )}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Basic Information</h3>
                        <AdminFormField label="Name" required>
                            {errors.name && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.name}</div>}
                            <AdminInput
                                value={form.name}
                                onChange={e => {
                                    setForm(f => ({ ...f, name: e.target.value }));
                                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                }}
                                placeholder="App Name"
                                className={errors.name ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                            />
                        </AdminFormField>
                        <AdminFormField label="Slug (URL identifier)" required>
                            {errors.slug && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.slug}</div>}
                            <AdminInput
                                value={form.slug}
                                onChange={e => {
                                    setSlugManuallyEdited(true);
                                    setForm(f => ({ ...f, slug: formatSlugInput(e.target.value) }));
                                    if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }));
                                }}
                                placeholder="auto-generated-from-name"
                                className={errors.slug ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Used in the URL: /software/<strong>{form.slug || '...'}</strong></p>
                        </AdminFormField>
                        <AdminFormField label="Short Description (Bio)">
                            <AdminTextarea className="h-20" value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} placeholder="Brief summary displayed in header..." />
                        </AdminFormField>
                        <AdminFormField label="Overview (Long Description)">
                            <AdminTextarea className="h-32" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the app..." />
                        </AdminFormField>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AdminSmartSelect
                                label="Content Types (Category)"
                                value={form.content_types}
                                onChange={(val) => setForm(f => ({ ...f, content_types: val }))}
                                options={CONTENT_TYPE_OPTIONS}
                                placeholder="Select content types..."
                            />
                            <AdminFormField label="Version">
                                <AdminInput value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0.0" />
                            </AdminFormField>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--divider)] mt-2">
                            <AdminFormField label="Fork Of (Parent App)">
                                <AdminInput value={form.fork_of} onChange={e => setForm(f => ({ ...f, fork_of: e.target.value }))} placeholder="e.g. Mihon" />
                            </AdminFormField>
                            <AdminFormField label="Upstream URL">
                                <AdminInput value={form.upstream_url} onChange={e => setForm(f => ({ ...f, upstream_url: e.target.value }))} placeholder="https://github.com/parent/repo" />
                            </AdminFormField>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">URLs & Resources</h3>
                        {/* ... URLs section unchanged ... */}
                        <AdminFormField label="Website URL">
                            {errors.website_url && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.website_url}</div>}
                            <AdminInput
                                value={form.website_url}
                                onChange={e => {
                                    setForm(f => ({ ...f, website_url: e.target.value }));
                                    if (errors.website_url) setErrors(prev => ({ ...prev, website_url: '' }));
                                }}
                                placeholder="https://myapp.com"
                                className={errors.website_url ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                            />
                        </AdminFormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AdminFormField label="Social / Community Links">
                                <SocialUrlsInput
                                    value={form.social_urls}
                                    onChange={(urls) => setForm(f => ({ ...f, social_urls: urls }))}
                                    placeholder="https://discord.gg/... or https://t.me/..."
                                    max={5}
                                />
                            </AdminFormField>
                            <AdminFormField label="Download URL">
                                <AdminInput value={form.download_url} onChange={e => setForm(f => ({ ...f, download_url: e.target.value }))} placeholder="https://..." />
                            </AdminFormField>
                        </div>
                    </div>

                    {/* Tutorials / Guides Section */}
                    {/* ... unchanged ... */}
                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4" /> Tutorials & Guides
                        </h3>
                        <div className="space-y-4">
                            <AdminSmartSelect
                                label="Linked Guides & Tutorials"
                                value={selectedGuideTitles}
                                onChange={setSelectedGuideTitles}
                                options={guideOptions}
                                placeholder="Search and select guides..."
                                creatable={true}
                            />
                            <div className="text-xs text-[var(--text-secondary)]">
                                Select existing guides from the database. Type to create a new custom entry title.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Metadata */}
                <div className="space-y-6">
                    {/* ... Appearance unchanged ... */}
                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Appearance</h3>
                        <AdminFormField label="Icon URL">
                            <AdminInput value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="https://..." />
                        </AdminFormField>
                        <div className="flex items-center gap-4">
                            {form.icon_url && <img src={form.icon_url} alt="Icon Preview" className="w-12 h-12 rounded-xl object-cover bg-gray-100 dark:bg-gray-800" />}
                        </div>
                        <AdminFormField label="Icon Color">
                            <div className="flex gap-2 items-center">
                                <div className="relative w-12 h-10 rounded-lg border border-[var(--divider)] overflow-hidden cursor-pointer shadow-sm">
                                    <input
                                        type="color"
                                        value={form.icon_color || '#ffffff'}
                                        onChange={e => setForm(f => ({ ...f, icon_color: e.target.value }))}
                                        className="absolute -top-2 -left-2 w-20 h-20 p-0 border-0 cursor-pointer"
                                    />
                                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: form.icon_color || 'transparent' }}></div>
                                </div>
                                <AdminInput value={form.icon_color} onChange={e => setForm(f => ({ ...f, icon_color: e.target.value }))} placeholder="#3B82F6" className="font-mono flex-1" />
                                <AdminButton type="button" variant="secondary" onClick={() => handleColorExtraction(form.icon_url)} disabled={!form.icon_url || extractingColor} title="Auto-extract from Icon" className="px-3">
                                    {extractingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                                </AdminButton>
                            </div>
                        </AdminFormField>
                    </div>

                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Status & Metadata</h3>
                        <AdminFormField label="Status">
                            <AdminSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </AdminSelect>
                        </AdminFormField>
                        <AdminFormField label="Author">
                            <AdminInput value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Author Name" />
                        </AdminFormField>
                        <div className="grid grid-cols-2 gap-4">
                            <AdminFormField label="Downloads">
                                <AdminInput type="number" value={form.download_count} onChange={e => setForm(f => ({ ...f, download_count: parseInt(e.target.value) || 0 }))} placeholder="0" />
                            </AdminFormField>
                            <AdminFormField label="Likes">
                                <AdminInput type="number" value={form.likes_count} onChange={e => setForm(f => ({ ...f, likes_count: parseInt(e.target.value) || 0 }))} placeholder="0" />
                            </AdminFormField>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Discovery</h3>
                        <AdminSmartSelect
                            label="Platforms"
                            value={form.platforms}
                            onChange={(val) => setForm(f => ({ ...f, platforms: val }))}
                            options={PLATFORM_OPTIONS}
                            placeholder="Select platforms..."
                        />
                        <div className="pt-2">
                            <AdminSmartSelect
                                label="Tags"
                                value={form.tags}
                                onChange={(val) => setForm(f => ({ ...f, tags: val }))}
                                options={TAG_OPTIONS}
                                placeholder="Add tags..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
