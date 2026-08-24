import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { ArrowLeft, Save, Loader2, Check, X as XIcon, RotateCcw, User, StickyNote, AlertTriangle, FileText } from 'lucide-react';
import { AdminButton, StatusBadge } from '@/components/admin/AdminFormElements';
import { useAdmin } from '@/hooks/useAdmin';
import { getGroupsForApp, setAppGroups, syncAppCompatibility, getGroupsForExtension, setExtensionGroups, syncExtensionCompatibility, fetchAllGroups } from '@/utils/compatSync';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { SharedAppForm } from '@/components/forms/SharedAppForm';
import { SharedExtensionForm } from '@/components/forms/SharedExtensionForm';
import { toast } from 'sonner';
import { upsertContributor } from '@/utils/contributors';
import { approveSubmissionRecord, approveEditSuggestionRecord } from '@/utils/approvalUtils';

interface ReviewPageProps {
    mode: 'submission' | 'edit-suggestion';
}

export function AdminReviewPage({ mode }: ReviewPageProps) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAdmin();
    const { logAction } = useAdminLogger();
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editedData, setEditedData] = useState<any>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [actionTarget, setActionTarget] = useState<{ action: 'approve' | 'reject' } | null>(null);
    const [saving, setSaving] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const tableName = mode === 'submission' ? 'submissions' : 'public_edit_suggestions';
    const backPath = mode === 'submission' ? '/admin/submissions' : '/admin/edit-suggestions';
    const pageTitle = mode === 'submission' ? 'Review Submission' : 'Review Edit Suggestion';

    useEffect(() => {
        if (id) fetchRecord();
    }, [id]);

    useEffect(() => {
        if (record) {
            let rawData = mode === 'submission' ? record.submitted_data : record.submitted_data;
            rawData = rawData ? { ...rawData } : {};

            // Repair restricted metadata fields for edit suggestions so they reflect true live data
            // and don't get flagged as "changed" (e.g. if the contributor submitted them as 0)
            if (mode === 'edit-suggestion' && record.original_data_snapshot) {
                const orig = record.original_data_snapshot as any;
                rawData.status = orig.status;
                rawData.likes_count = orig.likes_count;
                rawData.download_count = orig.download_count;
            }

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

            // Normalize all form fields to prevent uncontrolled-to-controlled input warnings
            // Submitted data often has undefined/null for fields the user didn't fill in
            const defaults: Record<string, any> = {
                name: '', slug: '', short_description: '', description: '', author: '',
                category: '', version: '', status: 'pending', repo_url: '', download_url: '',
                website_url: '', icon_url: '', icon_color: '', fork_of: '', upstream_url: '',
                source_url: '', language: '', development_status: '',
                platforms: [], tags: [], content_types: [], types: [], compatible_with: [],
                social_urls: [], tutorials: [], install_urls: [],
                download_count: 0, likes_count: 0,
                git_provider: '', submitter_notes: '',
                _selectedGroupIds: [], _selectedGroupNames: [],
            };
            for (const [key, defaultVal] of Object.entries(defaults)) {
                if (rawData[key] === undefined || rawData[key] === null) {
                    rawData[key] = defaultVal;
                }
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
                    const result = await approveSubmissionRecord(record, editedData);
                    if (!result.success) {
                        toast.error(result.error || 'Approval failed');
                        setActionTarget(null);
                        return;
                    }
                    await logAction('approve', 'submission', record.id, `${record.submission_type} submission`).catch(console.error);
                    toast.success(`Published ${result.name}!`);
                } else {
                    const result = await approveEditSuggestionRecord(record, editedData);
                    if (!result.success) {
                        toast.error(result.error || 'Approval failed');
                        setActionTarget(null);
                        return;
                    }
                    await logAction('approve', 'edit_suggestion' as any, record.id, `${record.target_type} edit suggestion`).catch(console.error);
                    toast.success(`Updated ${result.name}!`);
                }
            } else {
                // Reject — use correct column name per table (admin_notes vs admin_note)
                if (mode === 'submission') {
                    const rejectPayload: any = { status: 'rejected' };
                    if (rejectReason.trim()) {
                        rejectPayload.admin_notes = rejectReason.trim();
                    }
                    await (supabase as any).from('submissions').update(rejectPayload).eq('id', record.id);
                    await logAction('reject', 'submission', record.id, rejectReason.trim() || 'Rejected').catch(console.error);
                } else {
                    const rejectPayload: any = { status: 'rejected' };
                    if (rejectReason.trim()) {
                        rejectPayload.admin_note = rejectReason.trim();
                    }
                    await (supabase as any).from('public_edit_suggestions').update(rejectPayload).eq('id', record.id);
                    await logAction('reject', 'edit_suggestion' as any, record.id, rejectReason.trim() || 'Rejected').catch(console.error);
                }
                setRejectReason('');
                toast.success('Rejected.');
            }

            const wasApprove = actionTarget.action === 'approve';
            setActionTarget(null);
            
            if (wasApprove) {
                navigate(backPath);
            } else {
                fetchRecord();
            }
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
            {mode === 'submission' && record.duplicate_check_results && Array.isArray(record.duplicate_check_results) && record.duplicate_check_results.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <h4 className="flex items-center gap-2 font-bold mb-3 text-sm text-orange-600 dark:text-orange-400">
                        <AlertTriangle className="w-4 h-4" /> Potential Duplicates Detected
                    </h4>
                    <div className="space-y-2">
                        {(record.duplicate_check_results as any[]).map((dup: any, i: number) => {
                            const name = dup.name || dup.id;
                            const source = dup.source || 'live';
                            const status = dup.status;
                            const reason = dup.reason;
                            const slug = dup.slug || dup.id;
                            const itemType = record.submission_type === 'app' ? 'software' : 'extensions';
                            
                            const sourceLabel = source === 'submission' 
                                ? (status === 'rejected' ? 'Rejected Submission' : 'Pending Submission')
                                : 'Live';
                            const sourceColor = source === 'submission'
                                ? (status === 'rejected' ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20')
                                : 'text-green-500 bg-green-500/10 border-green-500/20';

                            return (
                                <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-black/5 dark:bg-black/20">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-sm text-[var(--text-primary)]">{name}</span>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${sourceColor}`}>
                                            {sourceLabel}
                                        </span>
                                        {source !== 'submission' && (
                                            <a
                                                href={`/${itemType}/${slug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs text-[var(--brand)] hover:underline"
                                            >
                                                View →
                                            </a>
                                        )}
                                    </div>
                                    {reason && (
                                        <div className="text-xs text-red-400 mt-1">
                                            <span className="font-semibold">Rejection reason:</span> {reason}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Edit Suggestion specific: show before/after diff */}
            {mode === 'edit-suggestion' && record.original_data_snapshot && (
                <div className="mb-6 rounded-xl bg-blue-500/5 border border-blue-500/20 overflow-hidden p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2 text-blue-500">
                            <FileText className="w-4 h-4" /> Edit Suggestion 
                        </h4>
                        <span className="text-xs text-blue-500/80">
                            Original values are shown below modified fields.
                        </span>
                    </div>
                    {(() => {
                        const orig = (record.original_data_snapshot as any) || {};
                        const submitted = (editedData || record.submitted_data || {}) as any;
                        const skipKeys = ['id', 'created_at', 'updated_at', 'slug', 'likes_count', 'download_count', 'metadata', 'submitter_notes'];
                        const changedKeys = Object.keys(submitted).filter(key => {
                            if (skipKeys.includes(key)) return false;
                            return JSON.stringify(orig[key]) !== JSON.stringify(submitted[key]);
                        });
                        
                        if (changedKeys.length === 0) return null;
                        
                        return (
                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-blue-500/10">
                                <span className="text-xs text-blue-500/70 mr-2 flex items-center">Changed fields:</span>
                                {changedKeys.map(key => (
                                    <span key={key} className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Action bar */}
            <div className="mb-8 p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)] flex flex-wrap gap-3 items-center">
                <span className="text-sm font-semibold text-[var(--text-secondary)] mr-auto">Actions</span>

                {(() => {
                    const canWrite = hasPermission(mode === 'submission' ? 'submissions' : 'edit_suggestions', 'write');
                    const canDelete = hasPermission(mode === 'submission' ? 'submissions' : 'edit_suggestions', 'delete');

                    return (
                        <>
                            {record.status === 'pending' && (
                                <>
                                    <AdminButton
                                        onClick={() => setActionTarget({ action: 'approve' })}
                                        disabled={!canWrite}
                                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                                    >
                                        <Check className="w-4 h-4 mr-2" /> {mode === 'submission' ? 'Publish' : 'Approve & Apply'}
                                    </AdminButton>
                                    <AdminButton
                                        variant="destructive"
                                        disabled={!canWrite && !canDelete} // Rejecting is a status update, usually write, but requires permission
                                        onClick={() => setActionTarget({ action: 'reject' })}
                                    >
                                        <XIcon className="w-4 h-4 mr-2" /> Reject
                                    </AdminButton>
                                </>
                            )}

                            {record.status === 'rejected' && (
                                <>
                                    <AdminButton variant="secondary" onClick={handleRestore} disabled={!canWrite}
                                        className="hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600 transition-all"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" /> Make Pending
                                    </AdminButton>
                                    <AdminButton
                                        onClick={() => setActionTarget({ action: 'approve' })}
                                        disabled={!canWrite}
                                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                                    >
                                        <Check className="w-4 h-4 mr-2" /> {mode === 'submission' ? 'Publish' : 'Approve & Apply'}
                                    </AdminButton>
                                </>
                            )}
                        </>
                    );
                })()}

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
                    originalData={mode === 'edit-suggestion' ? record.original_data_snapshot : undefined}
                />
            ) : (
                <SharedExtensionForm
                    form={editedData || {}}
                    setForm={setEditedData}
                    errors={errors}
                    setErrors={setErrors}
                    isAdmin={true}
                    originalData={mode === 'edit-suggestion' ? record.original_data_snapshot : undefined}
                />
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                open={!!actionTarget}
                onClose={() => { setActionTarget(null); setRejectReason(''); }}
                onConfirm={handleAction}
                title={actionTarget?.action === 'approve'
                    ? (mode === 'submission' ? 'Publish Submission' : 'Approve Edit Suggestion')
                    : 'Reject'
                }
                message={actionTarget?.action === 'approve'
                    ? (mode === 'submission'
                        ? 'This will create a new entry in the live database. Are you sure?'
                        : 'This will update the existing app/extension with these changes. Are you sure?')
                    : 'Are you sure you want to reject this? Provide a reason so re-submitters can see why.'
                }
                confirmLabel={actionTarget?.action === 'approve' ? (mode === 'submission' ? 'Publish' : 'Apply') : 'Reject'}
                destructive={actionTarget?.action === 'reject'}
            >
                {actionTarget?.action === 'reject' && (
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Rejection reason (optional but recommended)…"
                        rows={3}
                        className="w-full rounded-xl border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40"
                        style={{
                            background: 'var(--bg-elev-1)',
                            borderColor: 'var(--divider)',
                            color: 'var(--text-primary)',
                        }}
                    />
                )}
            </ConfirmDialog>
        </div>
    );
}
