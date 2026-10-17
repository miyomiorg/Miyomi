import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminAppsApi, adminGroupsApi } from '@/services/api';
import { collectPages } from '@/services/api/pagination';
import { contentPayload } from '@/services/api/contentPayload';
import { invalidateTableCache } from '@/hooks/useAdminCache';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, Label } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { ArrowLeft, Save, Loader2, Github, Download, Palette, HelpCircle, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { extractColorFromImage } from '@/utils/extractColorFromImage';
import { SocialUrlsInput } from '@/components/admin/SocialUrlsInput';
import { detectGitProvider } from '@/utils/gitProviders';

import { SharedAppForm } from '@/components/forms/SharedAppForm';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s.-]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

const appDefaults = {
    name: '', slug: '', description: '', short_description: '', author: '', category: '', version: '',
    status: 'approved', platforms: [] as string[], tags: [] as string[],
    content_types: [] as string[],
    repo_url: '', download_url: '', website_url: '', icon_url: '', icon_color: '',
    fork_of: '', upstream_url: '', social_urls: [] as string[],
    tutorials: [] as any[],
    download_count: 0, likes_count: 0, last_release_date: '',
    dev_status: 'active', metadata: {} as any
};

export type AppFormState = typeof appDefaults & {
    compatible_with?: string[];
    git_provider?: string;
    _selectedGroupIds?: string[];
    _selectedGroupNames?: string[];
};
export const emptyApp: AppFormState = appDefaults;

export function AdminAppFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logAction } = useAdminLogger();
    const [form, setForm] = useState(emptyApp);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!id);

    useEffect(() => {
        if (id) {
            fetchApp(id);
        }
    }, [id]);

    useEffect(() => {
        if (!id && !slugManuallyEdited && form.name) {
            setForm(f => ({ ...f, slug: slugify(f.name) }));
        }
    }, [form.name, slugManuallyEdited, id]);

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



    async function fetchApp(appId: string) {
        try {
            const data = await adminAppsApi.get(appId);
            if (data) {
                const appData = data as any;
                const loadedTutorials = Array.isArray(appData.tutorials) ? appData.tutorials : [];
                
                // Fetch groups & unified compatibility
                const allGroups = await adminGroupsApi.list();
                const groupIds = allGroups.filter(g => g.app_ids.includes(appId)).map(g => g.id);
                const selectedGroupNames = allGroups
                    .filter((g: any) => groupIds.includes(g.id))
                    .map((g: any) => g.name);
                const unifiedCompat = appData.compatible_with || [];

                setSlugManuallyEdited(true);
                setForm({
                    ...emptyApp,
                    ...appData,
                    _selectedGroupIds: groupIds,
                    _selectedGroupNames: selectedGroupNames,
                    compatible_with: unifiedCompat,
                    name: appData.name || '',
                    slug: appData.slug || '',
                    short_description: appData.short_description || '',
                    description: appData.description || '',
                    author: appData.author || '',
                    category: appData.category || '',
                    version: appData.version || '',
                    status: ['approved', 'pending', 'rejected'].includes((appData.status || '').toLowerCase()) ? (appData.status.toLowerCase() as any) : 'approved',
                    platforms: appData.platforms || [],
                    tags: appData.tags || [],
                    content_types: appData.content_types || [],
                    repo_url: appData.repo_url || '',
                    download_url: appData.download_url || '',
                    website_url: appData.website_url || '',
                    social_urls: appData.social_urls || [],
                    tutorials: loadedTutorials,
                    download_count: appData.download_count || 0,
                    likes_count: appData.likes_count || 0,
                    last_release_date: appData.last_release_date || '',
                    metadata: appData.metadata || {},
                    dev_status: appData.metadata?.dev_status || 'active',
                    git_provider: appData.metadata?.git_provider || ''
                });
            }
        } catch (err: any) {
            toast.error('Failed to load app: ' + err.message);
            navigate('/admin/apps');
        } finally {
            setLoading(false);
        }
    }

    async function checkDuplicate(field: 'name' | 'slug' | 'repo_url' | 'website_url', value: string) {
        if (!value) return false;
        const rows = await collectPages(adminAppsApi.list);
        return rows.find(row => row.id !== id && row[field] === value);
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

            const payload = {
                name: form.name.trim(),
                slug: form.slug || slugify(form.name) || null,
                short_description: form.short_description || null,
                description: form.description || null,
                author: form.author || null,
                category: form.category || null,
                version: form.version || null,
                status: ['approved', 'pending', 'rejected'].includes((form.status || '').toLowerCase()) ? form.status.toLowerCase() : 'approved',
                platforms: form.platforms?.length ? form.platforms : null,
                tags: form.tags?.length ? form.tags : null,
                // @ts-ignore
                content_types: form.content_types?.length ? form.content_types : null,
                compatible_with: form.compatible_with?.length ? form.compatible_with : null,
                repo_url: form.repo_url || null,
                download_url: form.download_url || null,
                website_url: form.website_url || null,
                icon_url: form.icon_url || null,
                icon_color: form.icon_color || null,
                fork_of: form.fork_of || null,
                upstream_url: form.upstream_url || null,
                social_urls: (form.social_urls || []).filter((u: string) => u && u.trim()) || [],
                discord_url: (form.social_urls || []).filter((u: string) => u && u.trim())[0] || null,
                tutorials: form.tutorials || [],
                download_count: form.download_count || 0,
                likes_count: form.likes_count || 0,
                last_release_date: form.last_release_date || null,
                metadata: {
                    ...form.metadata,
                    dev_status: form.dev_status,
                    git_provider: form.git_provider || (form.repo_url ? detectGitProvider(form.repo_url).toLowerCase() : null)
                }
            };

            let savedId = id;

            if (id) {
                await adminAppsApi.update(id, contentPayload(payload, form._selectedGroupIds || []));

                await logAction('update', 'app', id, form.name).catch(err => {
                    console.error('Failed to log update action:', err);
                });

                toast.success('App updated successfully');
            } else {
                const data = await adminAppsApi.create(contentPayload(payload, form._selectedGroupIds || []));

                if (data) {
                    savedId = data.id;
                    await logAction('create', 'app', data.id, form.name).catch(err => {
                        console.error('Failed to log create action:', err);
                    });
                }

                toast.success('App created successfully');
            }

            invalidateTableCache('apps');
            invalidateTableCache('extensions');

            if (!id) {
                navigate(`/admin/apps/${savedId}`, { replace: true });
            }
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

            <SharedAppForm 
                form={form} 
                setForm={setForm} 
                errors={errors} 
                setErrors={setErrors} 
                isAdmin={true} 
            />
        </div>
    );
}
