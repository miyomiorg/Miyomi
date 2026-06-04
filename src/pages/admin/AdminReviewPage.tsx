import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { ArrowLeft, Save, Loader2, Check, X as XIcon, RotateCcw, User, StickyNote, AlertTriangle, FileText } from 'lucide-react';
import { AdminButton, StatusBadge } from '@/components/admin/AdminFormElements';
import { getGroupsForApp, setAppGroups, syncAppCompatibility, getGroupsForExtension, setExtensionGroups, syncExtensionCompatibility, fetchAllGroups } from '@/utils/compatSync';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SharedAppForm } from '@/components/forms/SharedAppForm';
import { SharedExtensionForm } from '@/components/forms/SharedExtensionForm';
import { toast } from 'sonner';

interface ReviewPageProps {
    mode: 'submission' | 'edit-suggestion';
}

export function AdminReviewPage({ mode }: ReviewPageProps) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { logAction } = useAdminLogger();
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editedData, setEditedData] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [actionTarget, setActionTarget] = useState<{ action: 'approve' | 'reject' } | null>(null);
    const [saving, setSaving] = useState(false);

    const tableName = mode === 'submission' ? 'submissions' : 'public_edit_suggestions';
    const backPath = mode === 'submission' ? '/admin/submissions' : '/admin/edit-suggestions';
    const pageTitle = mode === 'submission' ? 'Review Submission' : 'Review Edit Suggestion';

    useEffect(() => {
        if (id) fetchRecord();
    }, [id]);

    useEffect(() => {
        if (record) {
            let rawData = mode === 'submission' ? record.submitted_data : record.submitted_data;
            rawData = rawData || {};

            // If it's an extension, map install_urls properly for the form
            const isExt = mode === 'submission' ? record.submission_type === 'extension' : record.target_type === 'extension';
            if (isExt && rawData) {
                const meta = rawData.metadata as any;
                let loadedInstallUrls: any[] = [];
                if (rawData.install_urls && Array.isArray(rawData.install_urls) && rawData.install_urls.length > 0) {
                    loadedInstallUrls = rawData.install_urls;
                } else if (meta?.install_urls && Array.isArray(meta.install_urls) && meta.install_urls.length > 0) {
                    loadedInstallUrls = meta.install_urls;
                } else {
                    if (rawData.auto_url) loadedInstallUrls.push({ label: 'Auto Install', url: rawData.auto_url, type: 'auto' });
                    if (rawData.manual_url) loadedInstallUrls.push({ label: 'Copy URL', url: rawData.manual_url, type: 'copy' });
                }
                rawData = { ...rawData, install_urls: loadedInstallUrls };
            }

            setEditedData(rawData);
        }
    }, [record]);

    async function fetchRecord() {
        try {
            const { data, error } = await (supabase as any).from(tableName).select('*').eq('id', id).single();
            if (error) throw error;
            setRecord(data);
        } catch (err: any) {
            toast.error('Failed to load: ' + err.message);
            navigate(backPath);
        } finally {
            setLoading(false);
        }
    }

    function getItemType(): 'app' | 'extension' {
        if (mode === 'submission') return record?.submission_type || 'app';
        return record?.target_type || 'app';
    }

    function getItemName(): string {
        const data = editedData || {};
        if (data.name) return data.name;
        if (mode === 'edit-suggestion' && record?.original_data_snapshot) {
            return (record.original_data_snapshot as any)?.name || 'Unknown';
        }
        return 'Untitled';
    }

    async function handleSaveEdits() {
        if (!record || !editedData) return;
        setSaving(true);
        try {
            const dataField = mode === 'submission' ? 'submitted_data' : 'submitted_data';
            await (supabase as any).from(tableName).update({ [dataField]: editedData }).eq('id', record.id);
            toast.success('Changes saved!');
            fetchRecord();
        } catch (err: any) {
            toast.error('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleRestore() {
        if (!record) return;
        try {
            await (supabase as any).from(tableName).update({ status: 'pending' }).eq('id', record.id);
            await logAction('restore' as any, (mode === 'submission' ? 'submission' : 'edit_suggestion') as any, record.id, 'Restored to pending');
            toast.success('Restored to pending.');
            fetchRecord();
        } catch (err: any) {
            toast.error('Failed: ' + err.message);
        }
    }

    async function handleAction() {
        if (!actionTarget || !record) return;

        try {
            if (actionTarget.action === 'approve') {
                if (mode === 'submission') {
                    // INSERT into apps/extensions
                    const data = editedData || record.submitted_data || {};
                    const targetTable = record.submission_type === 'app' ? 'apps' : 'extensions';

                    const slug = (data.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    const payload: any = {
                        name: data.name,
                        description: data.description,
                        short_description: data.short_description || null,
                        slug,
                        repo_url: data.repo_url || data.url,
                        author: record.author || data.author,
                        submitter_name: record.submitter_name,
                        submitter_contact: record.submitter_contact,
                        submitter_email: record.submitter_email,
                        status: 'approved',
                        tags: data.tags || [],
                        icon_url: data.icon_url,
                        icon_color: data.icon_color,
                        website_url: data.website_url,
                        social_urls: Array.isArray(data.social_urls) ? data.social_urls.filter((u: string) => u?.trim()) : [],
                    };

                    if (record.submission_type === 'app') {
                        payload.platforms = data.platforms || [];
                        payload.download_url = data.download_url;
                        payload.version = data.version;
                        payload.content_types = data.content_types || [];
                        payload.tutorials = data.tutorials || [];
                        payload.fork_of = data.fork_of;
                        payload.upstream_url = data.upstream_url;
                    } else {
                        const installUrls = data.install_urls || [];
                        const firstAuto = installUrls.find((u: any) => u.type === 'auto');
                        const firstCopy = installUrls.find((u: any) => u.type === 'copy');
                        payload.compatible_with = data.compatible_with || [];
                        payload.types = data.types || data.content_types || [];
                        payload.source_url = data.source_url;
                        payload.language = data.language;
                        payload.auto_url = firstAuto?.url || data.auto_url || null;
                        payload.manual_url = firstCopy?.url || data.manual_url || null;
                        payload.metadata = installUrls.length > 0 ? { install_urls: installUrls } : null;
                        payload.tutorials = data.tutorials || [];
                    }
                    const { data: insertedData, error: insertError } = await supabase.from(targetTable).insert(payload).select().single();
                    if (insertError) {
                        if (insertError.code === '23505') {
                            toast.error(`Slug conflict: '${slug}' already exists.`);
                            setActionTarget(null);
                            return;
                        }
                        throw insertError;
                    }

                    // Handle groups
                    if (insertedData) {
                        const groupIds = data._selectedGroupIds || [];
                        if (record.submission_type === 'app') {
                            const manualExts = data.compatible_with || [];
                            await setAppGroups(insertedData.id, groupIds);
                            await syncAppCompatibility(insertedData.id, insertedData.name, groupIds, manualExts);
                        } else {
                            const manualApps = data.compatible_with || [];
                            await setExtensionGroups(insertedData.id, groupIds);
                            await syncExtensionCompatibility(insertedData.id, insertedData.name, groupIds, manualApps);
                        }
                    }

                    await (supabase as any).from('submissions').delete().eq('id', record.id);
                    await logAction('approve', 'submission', record.id, `${record.submission_type} submission`).catch(console.error);
                    toast.success(`Published ${data.name}!`);
                } else {
                    // UPDATE existing app/extension
                    const data = editedData || record.submitted_data || {};
                    const targetTable = record.target_type === 'app' ? 'apps' : 'extensions';
                    const payload = { ...data };
                    delete payload.id;
                    delete payload.created_at;
                    
                    // Extract group info before saving to DB
                    const groupIds = payload._selectedGroupIds;
                    delete payload._selectedGroupIds;
                    delete payload._selectedGroupNames;

                    const { error: updateError } = await (supabase as any).from(targetTable).update(payload).eq('id', record.target_id);
                    if (updateError) throw updateError;

                    // Sync groups if provided
                    if (groupIds !== undefined) {
                        if (record.target_type === 'app') {
                            const manualExts = payload.compatible_with || [];
                            await setAppGroups(record.target_id, groupIds);
                            await syncAppCompatibility(record.target_id, payload.name || data.name, groupIds, manualExts);
                        } else {
                            const manualApps = payload.compatible_with || [];
                            await setExtensionGroups(record.target_id, groupIds);
                            await syncExtensionCompatibility(record.target_id, payload.name || data.name, groupIds, manualApps);
                        }
                    }

                    await (supabase as any).from('public_edit_suggestions').delete().eq('id', record.id);
                    await logAction('approve' as any, 'edit_suggestion' as any, record.id, `${record.target_type} edit suggestion`).catch(console.error);
                    toast.success(`Updated ${data.name || 'item'}!`);
                }
            } else {
                // Reject
                await (supabase as any).from(tableName).update({ status: 'rejected' }).eq('id', record.id);
                const logType = mode === 'submission' ? 'submission' : 'edit_suggestion';
                await logAction('reject' as any, logType as any, record.id, 'Rejected').catch(console.error);
                toast.success('Rejected.');
            }

            setActionTarget(null);
            fetchRecord();
        } catch (err: any) {
            console.error(err);
            toast.error('Action failed: ' + err.message);
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-96 text-[var(--text-secondary)]"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;
    }

    if (!record) {
        return <div className="text-center py-12 text-[var(--text-secondary)]">Record not found.</div>;
    }

    const itemType = getItemType();
    const itemName = getItemName();

    return (
        <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(backPath)} className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">
                            {pageTitle}
                        </h1>
                        <p className="text-xs font-mono opacity-50 text-[var(--text-secondary)] mt-0.5">ID: {record.id}</p>
                    </div>
                    <StatusBadge status={record.status} />
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] uppercase font-semibold tracking-wider text-[var(--text-secondary)]">
                        {itemType}
                    </span>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <AdminButton variant="secondary" onClick={() => navigate(backPath)}>Cancel</AdminButton>
                    <AdminButton onClick={handleSaveEdits} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Edits
                    </AdminButton>
                </div>
            </div>

            {/* Contributor Info Banner */}
            <div className="mb-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)] overflow-hidden">
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Submitter</span>
                        <div className="font-medium flex items-center gap-2 text-sm text-[var(--text-primary)]">
                            <User className="w-3.5 h-3.5 opacity-70" /> {record.submitter_name || 'Anonymous'}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">Contact</span>
                        <div className="font-medium text-sm text-[var(--text-primary)]">
                            {record.submitter_contact || 'N/A'}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-1">
                            {mode === 'submission' ? 'Email' : 'Submitted'}
                        </span>
                        <div className="font-medium text-sm text-[var(--text-primary)]">
                            {mode === 'submission'
                                ? (record.submitter_email || 'N/A')
                                : new Date(record.created_at).toLocaleString()
                            }
                        </div>
                    </div>
                </div>

                {/* Submitter Note */}
                {record.submitted_data?.submitter_notes && (
                    <div className="px-5 py-4 bg-[var(--brand)]/5 border-t border-[var(--brand)]/10">
                        <h4 className="text-[10px] text-[var(--brand)] uppercase tracking-wider font-bold block mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Note for Admin
                        </h4>
                        <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{record.submitted_data.submitter_notes}</div>
                    </div>
                )}
            </div>

            {/* Admin Note */}
            {(record.admin_note || record.admin_notes) && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-[var(--text-secondary)] mb-2">
                        <StickyNote className="w-4 h-4" /> Admin Note
                    </h4>
                    <div className="text-sm text-[var(--text-primary)]">{record.admin_note || record.admin_notes}</div>
                </div>
            )}



            {/* Submission-specific: Duplicate Check */}
            {mode === 'submission' && record.duplicate_check_results && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400">
                    <h4 className="flex items-center gap-2 font-bold mb-2 text-sm">
                        <AlertTriangle className="w-4 h-4" /> Potential Duplicates Detected
                    </h4>
                    <pre className="text-[11px] whitespace-pre-wrap font-mono bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                        {JSON.stringify(record.duplicate_check_results, null, 2)}
                    </pre>
                </div>
            )}

            {/* Edit Suggestion specific: show changed fields summary */}
            {mode === 'edit-suggestion' && record.original_data_snapshot && (
                <div className="mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-500 mb-3">
                        <FileText className="w-4 h-4" /> Changed Fields Summary
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {(() => {
                            const orig = (record.original_data_snapshot as any) || {};
                            const submitted = (editedData || record.submitted_data || {}) as any;
                            const changedKeys = Object.keys(submitted).filter(key => {
                                if (['id', 'created_at', 'updated_at'].includes(key)) return false;
                                return JSON.stringify(orig[key]) !== JSON.stringify(submitted[key]);
                            });
                            if (changedKeys.length === 0) {
                                return <span className="text-xs text-[var(--text-secondary)]">No changes detected</span>;
                            }
                            return changedKeys.map(key => (
                                <span key={key} className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-medium border border-blue-500/20">
                                    {key.replace(/_/g, ' ')}
                                </span>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {/* Action bar */}
            <div className="mb-8 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)] flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-[var(--text-secondary)] mr-auto">Actions</span>

                {record.status === 'pending' && (
                    <>
                        <AdminButton
                            onClick={() => setActionTarget({ action: 'approve' })}
                            className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                        >
                            <Check className="w-4 h-4 mr-2" /> {mode === 'submission' ? 'Publish' : 'Approve & Apply'}
                        </AdminButton>
                        <AdminButton
                            variant="destructive"
                            onClick={() => setActionTarget({ action: 'reject' })}
                        >
                            <XIcon className="w-4 h-4 mr-2" /> Reject
                        </AdminButton>
                    </>
                )}

                {record.status === 'rejected' && (
                    <>
                        <AdminButton variant="secondary" onClick={handleRestore}
                            className="hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600 transition-all"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" /> Make Pending
                        </AdminButton>
                        <AdminButton
                            onClick={() => setActionTarget({ action: 'approve' })}
                            className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                        >
                            <Check className="w-4 h-4 mr-2" /> {mode === 'submission' ? 'Publish' : 'Approve & Apply'}
                        </AdminButton>
                    </>
                )}

                {record.status === 'approved' && (
                    <div className="px-4 py-2 rounded-lg bg-green-500/10 text-green-500 font-medium flex items-center gap-2 border border-green-500/20">
                        <Check className="w-4 h-4" /> Already {mode === 'submission' ? 'Published' : 'Applied'}
                    </div>
                )}
            </div>

            {/* Editable Form */}
            <div className="flex items-center gap-4 mb-6 pb-2 border-b border-[var(--divider)]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">Editable Data</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] font-medium">
                    Live Edit Mode
                </span>
            </div>



            {itemType === 'app' ? (
                <SharedAppForm
                    form={editedData || {}}
                    setForm={setEditedData}
                    errors={errors}
                    setErrors={setErrors}
                    isAdmin={true}
                />
            ) : (
                <SharedExtensionForm
                    form={editedData || {}}
                    setForm={setEditedData}
                    errors={errors}
                    setErrors={setErrors}
                    isAdmin={true}
                />
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                open={!!actionTarget}
                onClose={() => setActionTarget(null)}
                onConfirm={handleAction}
                title={actionTarget?.action === 'approve'
                    ? (mode === 'submission' ? 'Publish Submission' : 'Approve Edit Suggestion')
                    : 'Reject'
                }
                message={actionTarget?.action === 'approve'
                    ? (mode === 'submission'
                        ? 'This will create a new entry in the live database. Are you sure?'
                        : 'This will update the existing app/extension with these changes. Are you sure?')
                    : 'Are you sure you want to reject this?'
                }
                confirmLabel={actionTarget?.action === 'approve' ? (mode === 'submission' ? 'Publish' : 'Apply') : 'Reject'}
                destructive={actionTarget?.action === 'reject'}
            />
        </div>
    );
}
