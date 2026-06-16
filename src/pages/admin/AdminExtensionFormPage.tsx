import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, Label } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { ArrowLeft, Save, Loader2, Palette, Github, Download, Copy, Check, Link2, HelpCircle, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { extractColorFromImage } from '@/utils/extractColorFromImage';
import { SocialUrlsInput } from '@/components/admin/SocialUrlsInput';
import { detectGitProvider } from '@/utils/gitProviders';
import { InstallUrlsInput, type InstallUrlEntry } from '@/components/admin/InstallUrlsInput';
import { FlagDisplay } from '@/components/FlagDisplay';
import { SharedExtensionForm } from '@/components/forms/SharedExtensionForm';
import { getGroupsForExtension, setExtensionGroups, syncExtensionCompatibility, fetchAllGroups } from '@/utils/compatSync';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s.-]/g, '')
        .replace(/[\s]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const emptyExt = {
    name: '', slug: '', short_description: '', description: '', author: '', category: '', language: '',
    status: 'approved', platforms: [] as string[], tags: [] as string[],
    types: [] as string[],
    compatible_with: [] as string[], repo_url: '', source_url: '',
    icon_url: '', icon_color: '',
    auto_url: '', manual_url: '', social_urls: [] as string[],
    install_urls: [] as InstallUrlEntry[],
    tutorials: [] as any[],
    download_count: 0, likes_count: 0,
    last_updated: ''
};
export function AdminExtensionFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logAction } = useAdminLogger();
    const [form, setForm] = useState(emptyExt);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    useEffect(() => {
        if (id) {
            fetchExt(id);
        }
    }, [id]);

    useEffect(() => {
        if (!slugManuallyEdited && form.name) {
            setForm(f => ({ ...f, slug: slugify(f.name) }));
        }
    }, [form.name, slugManuallyEdited]);

    // Real-time Duplicate Checking
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.name.trim()) {
                const dup = await checkDuplicate('name', form.name);
                setErrors(prev => ({
                    ...prev,
                    name: dup ? `An extension with the name "${form.name}" already exists.` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.name]);

    // repo_url duplicate check removed — same repo can serve multiple apps

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (form.slug.trim()) {
                const dup = await checkDuplicate('slug', form.slug);
                setErrors(prev => ({
                    ...prev,
                    slug: dup ? `An extension with the slug "${form.slug}" already exists (${dup.name}).` : ''
                }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [form.slug]);


    async function fetchExt(extId: string) {
        try {
            const { data, error } = await (supabase.from('extensions') as any).select('*').eq('id', extId).single();
            if (error) throw error;
            if (data) {
                const extData = data as any;
                const loadedTutorials = Array.isArray(extData.tutorials) ? extData.tutorials : [];
                // Migrate install_urls from metadata or legacy fields
                const meta = extData.metadata as any;
                let loadedInstallUrls: InstallUrlEntry[] = [];
                if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
                    loadedInstallUrls = meta.install_urls;
                } else {
                    if (extData.auto_url) loadedInstallUrls.push({ label: 'Auto Install', url: extData.auto_url, type: 'auto' });
                    if (extData.manual_url) loadedInstallUrls.push({ label: 'Copy URL', url: extData.manual_url, type: 'copy' });
                }
                // Fetch groups
                const groupIds = await getGroupsForExtension(extId);
                const allGroups = await fetchAllGroups();
                const selectedGroupNames = allGroups
                    .filter((g: any) => groupIds.includes(g.id))
                    .map((g: any) => g.name);

                setForm({
                    ...emptyExt,
                    ...extData,
                    _selectedGroupIds: groupIds,
                    _selectedGroupNames: selectedGroupNames,
                    name: extData.name || '',
                    tags: extData.tags || [],
                    types: extData.types || [],
                    compatible_with: extData.compatible_with || [],
                    social_urls: extData.social_urls || [],
                    tutorials: loadedTutorials,
                    download_count: extData.download_count || 0,
                    likes_count: extData.likes_count || 0,
                    install_urls: loadedInstallUrls,
                    last_updated: extData.last_updated || '',
                    git_provider: meta?.git_provider || ''
                });
            }
        } catch (err: any) {
            toast.error('Failed to load extension: ' + err.message);
            navigate('/admin/extensions');
        } finally {
            setLoading(false);
        }
    }

    async function checkDuplicate(field: 'name' | 'slug' | 'repo_url', value: string) {
        if (!value) return false;
        let query = (supabase.from('extensions') as any).select('id, name').eq(field, value);
        if (id) query = query.neq('id', id);
        const { data } = await query.maybeSingle();
        return data;
    }

    async function handleSave() {
        setSaving(true);
        // Errors are updated in real-time by useEffect
        if (Object.values(errors).some(v => !!v)) {
            toast.error("Please fix duplicate entries before saving.");
            setSaving(false);
            return;
        }

        try {
            // Final safety check
            const dupName = await checkDuplicate('name', form.name);
            if (dupName) {
                toast.error(`An extension with the name "${form.name}" already exists.`);
                setSaving(false);
                return;
            }


            // Sync legacy fields from install_urls for backward compat
            const validInstallUrls = form.install_urls.filter((u: InstallUrlEntry) => u.url.trim());
            const firstAuto = validInstallUrls.find((u: InstallUrlEntry) => u.type === 'auto');
            const firstCopy = validInstallUrls.find((u: InstallUrlEntry) => u.type === 'copy');

            const payload = {
                name: form.name,
                slug: form.slug || slugify(form.name) || null,
                short_description: form.short_description || null,
                description: form.description || null,
                author: form.author || null,
                category: form.category || null,
                language: form.language || null,
                status: form.status,
                platforms: form.platforms?.length ? form.platforms : null,
                tags: form.tags?.length ? form.tags : null,
                // @ts-ignore
                types: form.types?.length ? form.types : null,
                compatible_with: form.compatible_with?.length ? form.compatible_with : null,
                repo_url: form.repo_url || null,
                source_url: form.source_url || null,
                icon_url: form.icon_url || null,
                icon_color: form.icon_color || null,
                auto_url: firstAuto?.url || null,
                manual_url: firstCopy?.url || null,
                metadata: { 
                    install_urls: validInstallUrls,
                    git_provider: form.git_provider || (form.repo_url ? detectGitProvider(form.repo_url).toLowerCase() : null)
                },
                social_urls: form.social_urls.filter((u: string) => u.trim()) || [],
                discord_url: form.social_urls.filter((u: string) => u.trim())[0] || null,
                tutorials: form.tutorials,
                download_count: form.download_count || 0,
                likes_count: form.likes_count || 0,
                last_updated: form.last_updated || null
            };


            let savedId = id;

            if (id) {
                const { error } = await (supabase.from('extensions') as any).update(payload).eq('id', id);
                if (error) throw error;

                // Log update action
                await logAction('update', 'extension', id, form.name).catch(err => {
                    console.error('Failed to log update action:', err);
                });

                toast.success('Extension updated successfully');
            } else {
                const { data, error } = await (supabase.from('extensions') as any).insert(payload).select().single();
                if (error) throw error;

                // Log create action
                if (data) {
                    savedId = data.id;
                    await logAction('create', 'extension', data.id, form.name).catch(err => {
                        console.error('Failed to log create action:', err);
                    });
                }

                toast.success('Extension created successfully');
            }

            // Sync groups and compatibility
            if (savedId) {
                const groupIds = form._selectedGroupIds || [];
                const manualApps = form.compatible_with || [];
                await setExtensionGroups(savedId, groupIds);
                await syncExtensionCompatibility(savedId, form.name, groupIds, manualApps);
            }

            navigate('/admin/extensions');
        } catch (err: any) {
            toast.error('Failed to save extension: ' + err.message);
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
                    <button onClick={() => navigate('/admin/extensions')} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">
                        {id ? 'Edit Extension' : 'New Extension'}
                    </h1>
                </div>
                <div className="flex gap-3">
                    <AdminButton variant="secondary" onClick={() => navigate('/admin/extensions')}>Cancel</AdminButton>
                    <AdminButton onClick={handleSave} disabled={!form.name || saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Extension
                    </AdminButton>
                </div>
            </div>

            <SharedExtensionForm 
                form={form} 
                setForm={setForm} 
                errors={errors} 
                setErrors={setErrors} 
                isAdmin={true} 
            />
        </div>
    );
}
