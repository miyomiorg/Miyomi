import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, Label } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { SocialUrlsInput } from '@/components/admin/SocialUrlsInput';
import { Download, Palette, HelpCircle, GitBranch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { extractColorFromImage } from '@/utils/extractColorFromImage';
import { detectGitProvider } from '@/utils/gitProviders';

function formatSlugInput(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s.-]/g, '')
        .replace(/[\s]+/g, '-');
}

const PLATFORM_OPTIONS = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Web'];
const CONTENT_TYPE_OPTIONS = ['Anime', 'Manga', 'Light Novel', 'Webtoon', 'Comics'];
const TAG_OPTIONS = ['Free', 'Paid', 'Open Source', 'Ad-free', 'NSFW', 'Reader', 'Tracker', 'Downloader'];

export function SharedAppForm({ form, setForm, errors, setErrors, isAdmin = true }: { form: any, setForm: any, errors: any, setErrors: any, isAdmin?: boolean }) {
    const [fetchingGithub, setFetchingGithub] = useState(false);
    const [extractingColor, setExtractingColor] = useState(false);
    const [repoProvider, setRepoProvider] = useState('github');
    const [guideOptions, setGuideOptions] = useState<string[]>([]);
    const [guidesData, setGuidesData] = useState<any[]>([]);
    const [selectedGuideTitles, setSelectedGuideTitles] = useState<string[]>([]);

    useEffect(() => {
        fetchGuides();
    }, []);

    useEffect(() => {
        if (form.tutorials && Array.isArray(form.tutorials)) {
            setSelectedGuideTitles(form.tutorials.map((t: any) => t.title).filter(Boolean));
        }
    }, [form.tutorials]);

    useEffect(() => {
        if (form.icon_url && !form.icon_color) {
            handleColorExtraction(form.icon_url);
        }
    }, [form.icon_url]);

    useEffect(() => {
        if (form.repo_url) {
            setRepoProvider(detectGitProvider(form.repo_url).toLowerCase());
        }
    }, [form.repo_url]);

    async function fetchGuides() {
        const { data } = await supabase.from('guides').select('title, slug').order('title');
        if (data) {
            setGuidesData(data);
            setGuideOptions(data.map(g => g.title));
        }
    }

    // Pass guides back up via setForm
    useEffect(() => {
        const finalTutorials = selectedGuideTitles.map(title => {
            const guide = guidesData.find(g => g.title === title);
            if (guide) {
                return { title: guide.title, url: `/guides/${guide.slug}`, type: 'guide' };
            }
            return { title: title, url: '#', type: 'custom' };
        });
        // Avoid infinite loop by only updating if different
        const isDifferent = JSON.stringify(finalTutorials) !== JSON.stringify(form.tutorials);
        if (isDifferent && guidesData.length > 0) {
            setForm((f: any) => ({ ...f, tutorials: finalTutorials }));
        }
    }, [selectedGuideTitles, guidesData]);


    async function handleColorExtraction(url: string) {
        setExtractingColor(true);
        const color = await extractColorFromImage(url);
        if (color) {
            setForm((f: any) => ({ ...f, icon_color: color }));
        }
        setExtractingColor(false);
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

            setForm((prev: any) => ({
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
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
                                    setForm((f: any) => ({ ...f, repo_url: e.target.value }));
                                    if (errors.repo_url) setErrors((prev: any) => ({ ...prev, repo_url: '' }));
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
                                setForm((f: any) => ({ ...f, name: e.target.value }));
                                if (errors.name) setErrors((prev: any) => ({ ...prev, name: '' }));
                            }}
                            placeholder="App Name"
                            className={errors.name ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                        />
                    </AdminFormField>
                    {isAdmin && (
                        <AdminFormField label="Slug (URL identifier)" required>
                            {errors.slug && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.slug}</div>}
                            <AdminInput
                                value={form.slug}
                                onChange={e => {
                                    setForm((f: any) => ({ ...f, slug: formatSlugInput(e.target.value) }));
                                    if (errors.slug) setErrors((prev: any) => ({ ...prev, slug: '' }));
                                }}
                                placeholder="auto-generated-from-name"
                                className={errors.slug ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                            />
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Used in the URL: /software/<strong>{form.slug || '...'}</strong></p>
                        </AdminFormField>
                    )}
                    <AdminFormField label="Short Description (Bio)">
                        <AdminTextarea className="h-20" value={form.short_description} onChange={e => setForm((f: any) => ({ ...f, short_description: e.target.value }))} placeholder="Brief summary displayed in header..." />
                    </AdminFormField>
                    <AdminFormField label="Overview (Long Description)">
                        <AdminTextarea className="h-32" value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Detailed description of the app..." />
                    </AdminFormField>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AdminSmartSelect
                            label="Content Types (Category)"
                            value={form.content_types}
                            onChange={(val) => setForm((f: any) => ({ ...f, content_types: val }))}
                            options={CONTENT_TYPE_OPTIONS}
                            placeholder="Select content types..."
                        />
                        <AdminFormField label="Version">
                            <AdminInput value={form.version} onChange={e => setForm((f: any) => ({ ...f, version: e.target.value }))} placeholder="1.0.0" />
                        </AdminFormField>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--divider)] mt-2">
                        <AdminFormField label="Fork Of (Parent App)">
                            <AdminInput value={form.fork_of} onChange={e => setForm((f: any) => ({ ...f, fork_of: e.target.value }))} placeholder="e.g. Mihon" />
                        </AdminFormField>
                        <AdminFormField label="Upstream URL">
                            <AdminInput value={form.upstream_url} onChange={e => setForm((f: any) => ({ ...f, upstream_url: e.target.value }))} placeholder="https://github.com/parent/repo" />
                        </AdminFormField>
                    </div>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">URLs & Resources</h3>
                    <AdminFormField label="Website URL">
                        {errors.website_url && <div className="text-red-500 text-xs font-semibold mb-1 animate-pulse">⚠️ {errors.website_url}</div>}
                        <AdminInput
                            value={form.website_url}
                            onChange={e => {
                                setForm((f: any) => ({ ...f, website_url: e.target.value }));
                                if (errors.website_url) setErrors((prev: any) => ({ ...prev, website_url: '' }));
                            }}
                            placeholder="https://myapp.com"
                            className={errors.website_url ? 'border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]' : ''}
                        />
                    </AdminFormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AdminFormField label="Social / Community Links">
                            <SocialUrlsInput
                                value={form.social_urls}
                                onChange={(urls) => setForm((f: any) => ({ ...f, social_urls: urls }))}
                                placeholder="https://discord.gg/... or https://t.me/..."
                                max={5}
                            />
                        </AdminFormField>
                        <AdminFormField label="Download URL">
                            <AdminInput value={form.download_url} onChange={e => setForm((f: any) => ({ ...f, download_url: e.target.value }))} placeholder="https://..." />
                        </AdminFormField>
                    </div>
                </div>

                {isAdmin && (
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
                )}
            </div>

            {/* Sidebar Metadata */}
            <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Appearance</h3>
                    <AdminFormField label="Icon URL">
                        <AdminInput value={form.icon_url} onChange={e => setForm((f: any) => ({ ...f, icon_url: e.target.value }))} placeholder="https://..." />
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
                                    onChange={e => setForm((f: any) => ({ ...f, icon_color: e.target.value }))}
                                    className="absolute -top-2 -left-2 w-20 h-20 p-0 border-0 cursor-pointer"
                                />
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: form.icon_color || 'transparent' }}></div>
                            </div>
                            <AdminInput value={form.icon_color} onChange={e => setForm((f: any) => ({ ...f, icon_color: e.target.value }))} placeholder="#3B82F6" className="font-mono flex-1" />
                            <AdminButton type="button" variant="secondary" onClick={() => handleColorExtraction(form.icon_url)} disabled={!form.icon_url || extractingColor} title="Auto-extract from Icon" className="px-3">
                                {extractingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
                            </AdminButton>
                        </div>
                    </AdminFormField>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Status & Metadata</h3>
                    {isAdmin && (
                        <AdminFormField label="Status">
                            <AdminSelect value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </AdminSelect>
                        </AdminFormField>
                    )}
                    <AdminFormField label="Author">
                        <AdminInput value={form.author} onChange={e => setForm((f: any) => ({ ...f, author: e.target.value }))} placeholder="Author Name" />
                    </AdminFormField>
                    {isAdmin && (
                        <div className="grid grid-cols-2 gap-4">
                            <AdminFormField label="Downloads">
                                <AdminInput type="number" value={form.download_count} onChange={e => setForm((f: any) => ({ ...f, download_count: parseInt(e.target.value) || 0 }))} placeholder="0" />
                            </AdminFormField>
                            <AdminFormField label="Likes">
                                <AdminInput type="number" value={form.likes_count} onChange={e => setForm((f: any) => ({ ...f, likes_count: parseInt(e.target.value) || 0 }))} placeholder="0" />
                            </AdminFormField>
                        </div>
                    )}
                </div>

                <div className="p-6 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] space-y-4">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Discovery</h3>
                    <AdminSmartSelect
                        label="Platforms"
                        value={form.platforms}
                        onChange={(val) => setForm((f: any) => ({ ...f, platforms: val }))}
                        options={PLATFORM_OPTIONS}
                        placeholder="Select platforms..."
                    />
                    <div className="pt-2">
                        <AdminSmartSelect
                            label="Tags"
                            value={form.tags}
                            onChange={(val) => setForm((f: any) => ({ ...f, tags: val }))}
                            options={TAG_OPTIONS}
                            placeholder="Add tags..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
