import { useEffect, useState } from 'react';
import { Loader2, Palette, Github, Download, Copy, Check, Link2, StickyNote } from 'lucide-react';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { extractColorFromImage } from '@/utils/extractColorFromImage';
import { toast } from 'sonner';
import { SocialUrlsInput } from '@/components/admin/SocialUrlsInput';
import { InstallUrlsInput, type InstallUrlEntry } from '@/components/admin/InstallUrlsInput';

const PLATFORM_OPTIONS = ['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'Web'];
const CONTENT_TYPE_OPTIONS = ['Anime', 'Manga', 'Light Novel', 'Multi'];
const EXT_TYPE_OPTIONS = ['Anime', 'Manga', 'Light Novel'];
const TAG_OPTIONS = ['Free', 'Paid', 'Open Source', 'Ad-free', 'NSFW', 'Reader', 'Tracker', 'Downloader'];
const EXT_TAG_OPTIONS = ['NSFW', 'SFW', 'Official', 'Fan Source'];

interface SubmissionEditFormProps {
    type: 'app' | 'extension';
    data: any;
    onChange: (newData: any) => void;
}

export function SubmissionEditForm({ type, data, onChange }: SubmissionEditFormProps) {
    const [form, setForm] = useState(data);
    const [fetchingGithub, setFetchingGithub] = useState(false);
    const [extractingColor, setExtractingColor] = useState(false);
    const [copiedManual, setCopiedManual] = useState(false);
    const [appOptions, setAppOptions] = useState<string[]>([]);

    useEffect(() => {
        const initData = { ...data };
        if (!initData.install_urls || !Array.isArray(initData.install_urls) || initData.install_urls.length === 0) {
            const legacy: InstallUrlEntry[] = [];
            if (initData.auto_url) legacy.push({ label: 'Auto Install', url: initData.auto_url, type: 'auto' });
            if (initData.manual_url) legacy.push({ label: 'Copy URL', url: initData.manual_url, type: 'copy' });
            initData.install_urls = legacy;
        }
        setForm(initData);
    }, [data.id]);

    useEffect(() => {
        async function fetchApps() {
            const { data: apps } = await (await import('@/integrations/supabase/client')).supabase.from('apps').select('name').order('name');
            if (apps) setAppOptions(apps.map((a: any) => a.name));
        }
        if (type === 'extension') fetchApps();
    }, [type]);

    function updateField(field: string, value: any) {
        const newData = { ...form, [field]: value };
        setForm(newData);
        onChange(newData);
    }

    async function handleColorExtraction(url: string) {
        setExtractingColor(true);
        try {
            const color = await extractColorFromImage(url);
            if (color) updateField('icon_color', color);
        } catch (e) {
            console.error(e);
        } finally {
            setExtractingColor(false);
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
            const ghData = await res.json();

            let version = form.version;
            if (type === 'app') {
                try {
                    const relRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
                    if (relRes.ok) {
                        const relData = await relRes.json();
                        if (relData.tag_name) version = relData.tag_name;
                    }
                } catch (e) { console.warn(e); }
            }

            const merged = {
                ...form,
                name: form.name || ghData.name,
                description: type === 'app' ? (ghData.description || form.description) : form.description,
                short_description: type === 'extension' ? (ghData.description || form.short_description) : form.short_description,
                website_url: ghData.homepage || form.website_url,
                source_url: type === 'extension' ? (ghData.homepage || form.source_url) : undefined,
                tags: [...new Set([...(form.tags || []), ...(ghData.topics || [])])],
                author: ghData.owner?.login || form.author,
                icon_url: form.icon_url || ghData.owner?.avatar_url || '',
                version: version
            };

            setForm(merged);
            onChange(merged);
            toast.success("Fetched metadata from GitHub");
        } catch (err: any) {
            toast.error("Failed to fetch from GitHub: " + err.message);
        } finally {
            setFetchingGithub(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Github className="w-4 h-4" /> Import from GitHub
                        </h3>
                        <div className="flex gap-2">
                            <AdminInput
                                value={form.repo_url || ''}
                                onChange={e => updateField('repo_url', e.target.value)}
                                placeholder="https://github.com/owner/repo"
                                className="text-xs"
                            />
                            <AdminButton onClick={handleGithubFetch} disabled={fetchingGithub || !form.repo_url} variant="secondary" className="px-2">
                                {fetchingGithub ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            </AdminButton>
                        </div>
                    </div>

                    <AdminFormField label="Name" required>
                        <AdminInput value={form.name || ''} onChange={e => updateField('name', e.target.value)} />
                    </AdminFormField>

                    <div className="grid grid-cols-2 gap-4">
                        <AdminFormField label="Author">
                            <AdminInput value={form.author || ''} onChange={e => updateField('author', e.target.value)} />
                        </AdminFormField>
                        {type === 'app' && (
                            <AdminFormField label="Version">
                                <AdminInput value={form.version || ''} onChange={e => updateField('version', e.target.value)} />
                            </AdminFormField>
                        )}
                        {type === 'extension' && (
                            <AdminFormField label="Language">
                                <AdminInput value={form.language || ''} onChange={e => updateField('language', e.target.value)} />
                            </AdminFormField>
                        )}
                    </div>

                    <AdminFormField label="Short Description (Bio)">
                        <AdminTextarea
                            className="h-16"
                            value={form.short_description || ''}
                            onChange={e => updateField('short_description', e.target.value)}
                            placeholder="Brief one-line summary..."
                        />
                    </AdminFormField>

                    <AdminFormField label="Long Description">
                        <AdminTextarea
                            className="h-24"
                            value={form.description || ''}
                            onChange={e => updateField('description', e.target.value)}
                            placeholder="Detailed description of features..."
                        />
                    </AdminFormField>
                </div>

                <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] space-y-3">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Palette className="w-4 h-4" /> Appearance
                        </h3>
                        <div className="flex items-center gap-3">
                            {form.icon_url && <img src={form.icon_url} className="w-10 h-10 rounded-lg bg-black/20" />}
                            <div className="flex-1 space-y-2">
                                <AdminInput value={form.icon_url || ''} onChange={e => updateField('icon_url', e.target.value)} placeholder="Icon URL" className="text-xs" />
                                <div className="flex gap-2">
                                    <div className="relative w-8 h-8 rounded border overflow-hidden">
                                        <input type="color" value={form.icon_color || '#ffffff'} onChange={e => updateField('icon_color', e.target.value)} className="absolute -top-1 -left-1 w-12 h-12 p-0 border-0" />
                                    </div>
                                    <AdminButton variant="secondary" className="px-2" onClick={() => handleColorExtraction(form.icon_url)} disabled={extractingColor || !form.icon_url}>
                                        Auto-Extract
                                    </AdminButton>
                                </div>
                            </div>
                        </div>
                    </div>

                    <AdminSmartSelect
                        label={type === 'app' ? "Content Types" : "Types"}
                        value={type === 'app' ? (form.content_types || []) : (form.types || [])}
                        onChange={val => updateField(type === 'app' ? 'content_types' : 'types', val)}
                        options={type === 'app' ? CONTENT_TYPE_OPTIONS : EXT_TYPE_OPTIONS}
                        placeholder="Select types..."
                    />

                    <AdminSmartSelect
                        label="Platforms"
                        value={form.platforms || []}
                        onChange={val => updateField('platforms', val)}
                        options={PLATFORM_OPTIONS}
                        placeholder="Select platforms..."
                    />

                    <AdminSmartSelect
                        label="Tags"
                        value={form.tags || []}
                        onChange={val => updateField('tags', val)}
                        options={type === 'app' ? TAG_OPTIONS : EXT_TAG_OPTIONS}
                        placeholder="Add tags..."
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--divider)]">
                <AdminFormField label="Website / Source URL">
                    <AdminInput
                        value={type === 'app' ? (form.website_url || '') : (form.source_url || '')}
                        onChange={e => updateField(type === 'app' ? 'website_url' : 'source_url', e.target.value)}
                        placeholder="https://..."
                    />
                </AdminFormField>
                <AdminFormField label="Social / Community Links">
                    <SocialUrlsInput
                        value={(() => {
                            if (Array.isArray(form.social_urls) && form.social_urls.length > 0) return form.social_urls;
                            if (form.discord_url) return [form.discord_url];
                            return [''];
                        })()}
                        onChange={(urls) => {
                            updateField('social_urls', urls);
                            updateField('discord_url', urls.filter((u: string) => u.trim())[0] || '');
                        }}
                        placeholder="https://discord.gg/... or https://t.me/..."
                        max={5}
                    />
                </AdminFormField>
                {type === 'app' && (
                    <AdminFormField label="Download URL">
                        <AdminInput value={form.download_url || ''} onChange={e => updateField('download_url', e.target.value)} placeholder="https://..." />
                    </AdminFormField>
                )}
                {type === 'extension' && (
                    <AdminFormField label="Compatible With (Parent Apps)">
                        <AdminSmartSelect
                            value={form.compatible_with || []}
                            onChange={val => updateField('compatible_with', val)}
                            options={appOptions}
                            placeholder="Select apps..."
                            creatable={true}
                        />
                    </AdminFormField>
                )}
            </div>

            {type === 'extension' && (
                <div className="pt-4 border-t border-[var(--divider)] space-y-4">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--text-secondary)]">
                        <Link2 className="w-4 h-4" /> Install URLs
                    </h4>
                    <InstallUrlsInput
                        value={form.install_urls || []}
                        onChange={urls => {
                            updateField('install_urls', urls);
                            // Sync legacy fields
                            const firstAuto = urls.find((u: InstallUrlEntry) => u.type === 'auto');
                            const firstCopy = urls.find((u: InstallUrlEntry) => u.type === 'copy');
                            updateField('auto_url', firstAuto?.url || '');
                            updateField('manual_url', firstCopy?.url || '');
                        }}
                        compact
                    />
                    <AdminFormField label="Additional Info">
                        <AdminTextarea className="h-16" value={form.info || ''} onChange={e => updateField('info', e.target.value)} placeholder="Installation notes, requirements..." />
                    </AdminFormField>
                </div>
            )}

            {form.submitter_notes && (
                <div className="pt-4 border-t border-[var(--divider)]">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--text-secondary)] mb-2">
                        <StickyNote className="w-4 h-4" /> Contributor Notes
                    </h4>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {form.submitter_notes}
                    </div>
                </div>
            )}
        </div>
    );
}
