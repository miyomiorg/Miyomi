import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import type { Tables } from '@/integrations/supabase/types';
import { Inbox, User, Check, X as XIcon, Eye, Trash2, AlertTriangle, RotateCcw, Package, Puzzle, StickyNote, FileText } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EndpointToggle } from '@/components/admin/EndpointToggle';
import { toast } from 'sonner';
import { upsertContributor } from '@/utils/contributors';

export function AdminSubmissionsPage() {
  const navigate = useNavigate();
  const { logAction } = useAdminLogger();
  const [submissions, setSubmissions] = useState<Tables<'submissions'>[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'approve' | 'reject'; submission?: Tables<'submissions'> } | null>(null);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<'approved' | 'rejected' | 'pending' | 'all' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'app' | 'extension'>('all');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      try {
        await supabase.rpc('cleanup_old_rejected' as any);
      } catch (rpcErr) {
        console.error('Cleanup RPC failed:', rpcErr);
      }

      const { data, error } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handleBulkDelete() {
    if (!bulkDeleteTarget) return;
    try {
      let query = supabase.from('submissions').delete();
      if (bulkDeleteTarget === 'all') {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        query = query.eq('status', bulkDeleteTarget);
      }
      const { error, count } = await query;
      if (error) throw error;
      await logAction('delete', 'submission', 'bulk', `Bulk delete ${bulkDeleteTarget}`, { count, target: bulkDeleteTarget });
      toast.success(`Cleared ${bulkDeleteTarget} submissions (${count} removed)`);
      setBulkDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk delete failed: ' + err.message);
    }
  }

  async function handleRestore(sub: Tables<'submissions'>) {
    try {
      await supabase.from('submissions').update({ status: 'pending' }).eq('id', sub.id);
      await logAction('restore', 'submission', sub.id, 'Restored to pending', {
        submission_name: (sub.submitted_data as any)?.name
      });
      toast.success('Submission restored to pending.');
      fetchData();
    } catch (err: any) {
      toast.error('Restore failed: ' + err.message);
    }
  }

  async function handleAction() {
    if (!actionTarget) return;
    try {
      if (actionTarget.action === 'approve' && actionTarget.submission) {
        const sub = actionTarget.submission;
        const data = sub.submitted_data as any;
        const targetTable = sub.submission_type === 'app' ? 'apps' : 'extensions';

        const payload: any = {
          name: data.name,
          description: data.description,
          short_description: data.short_description || null,
          slug: generateSlug(data.name),
          repo_url: data.repo_url || data.url,
          author: sub.author || data.author,
          status: 'approved',
          tags: data.tags || [],
          icon_url: data.icon_url,
          icon_color: data.icon_color,
          website_url: data.website_url,
          social_urls: Array.isArray(data.social_urls) ? data.social_urls.filter((u: string) => u?.trim()) : [],
        };

        if (sub.submission_type === 'app') {
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
            toast.error(`Slug conflict: '${payload.slug}' already exists.`);
            return;
          }
          throw insertError;
        }

        await supabase.from('submissions').delete().eq('id', sub.id);

        if (insertedData) {
          // Save contributor profile
          await upsertContributor(
            sub.submitter_name,
            sub.submitter_email,
            sub.submitter_contact,
            { type: sub.submission_type as 'app' | 'extension', id: insertedData.id, name: data.name }
          ).catch(console.error);

          await logAction('approve', 'submission', sub.id, `${sub.submission_type} submission`, {
            approved_as: targetTable,
            resource_id: insertedData.id,
            resource_name: data.name
          }).catch(console.error);
        }

        toast.success(`Published ${data.name} to ${targetTable}!`);
      } else {
        const sub = actionTarget.submission;
        const data = sub ? (sub.submitted_data as any) : {};

        await supabase.from('submissions').update({ status: 'rejected' }).eq('id', actionTarget.id);

        await logAction('reject', 'submission', actionTarget.id, sub ? `${sub.submission_type} submission` : 'submission', {
          reason: 'Rejected by admin',
          submission_name: data?.name
        }).catch(console.error);

        toast.success('Submission rejected.');
      }

      setActionTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Action failed: ' + err.message);
    }
  }

  const typeFiltered = typeFilter === 'all'
    ? submissions
    : submissions.filter(s => s.submission_type === typeFilter);

  const counts = {
    active: typeFiltered.filter(s => s.status === 'approved').length,
    rejected: typeFiltered.filter(s => s.status === 'rejected').length,
    pending: typeFiltered.filter(s => s.status === 'pending').length,
    all: typeFiltered.length
  };

  const typeCounts = {
    all: submissions.length,
    app: submissions.filter(s => s.submission_type === 'app').length,
    extension: submissions.filter(s => s.submission_type === 'extension').length,
  };

  const filteredSubmissions = statusFilter === 'all'
    ? typeFiltered
    : typeFiltered.filter(s => s.status === statusFilter);

  const filterTabs = [
    { key: 'all' as const, label: 'All', count: counts.all },
    { key: 'pending' as const, label: 'Pending', count: counts.pending },
    { key: 'approved' as const, label: 'Approved', count: counts.active },
    { key: 'rejected' as const, label: 'Rejected', count: counts.rejected },
  ].filter(t => t.key === 'all' || t.count > 0);

  const typeTabs = [
    { key: 'all' as const, label: 'All', count: typeCounts.all, icon: null },
    { key: 'app' as const, label: 'Apps', count: typeCounts.app, icon: Package },
    { key: 'extension' as const, label: 'Extensions', count: typeCounts.extension, icon: Puzzle },
  ].filter(t => t.key === 'all' || t.count > 0);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Submissions</h1>
          <p className="text-[var(--text-secondary)] mt-1">Review user-submitted new apps and extensions.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Type Filter */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)]">
            {typeTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === tab.key
                    ? 'bg-[var(--brand)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                    }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {tab.label}
                  <span className={`text-xs ${typeFilter === tab.key ? 'opacity-80' : 'opacity-50'}`}>({tab.count})</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${statusFilter === tab.key
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-md shadow-[var(--brand)]/20'
                  : 'bg-[var(--bg-elev-1)] text-[var(--text-secondary)] border-[var(--divider)] hover:border-[var(--brand)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${statusFilter === tab.key ? 'opacity-80' : 'opacity-60'}`}>({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-3">
          {counts.pending > 0 && (
            <AdminButton variant="secondary" onClick={() => setBulkDeleteTarget('pending')}
              className="hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600 transition-all font-medium">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Pending ({counts.pending})
            </AdminButton>
          )}
          {counts.rejected > 0 && (
            <AdminButton variant="secondary" onClick={() => setBulkDeleteTarget('rejected')}
              className="hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-medium">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Rejected ({counts.rejected})
            </AdminButton>
          )}
          {counts.active > 0 && (
            <AdminButton variant="secondary" onClick={() => setBulkDeleteTarget('approved')}
              className="hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-500 transition-all font-medium">
              <Trash2 className="w-4 h-4 mr-2" /> Clear Approved ({counts.active})
            </AdminButton>
          )}
          {counts.all > 0 && (
            <AdminButton variant="destructive" onClick={() => setBulkDeleteTarget('all')}
              className="shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:scale-105">
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </AdminButton>
          )}
        </div>
      </div>

      <EndpointToggle 
        endpointKey="submissions"
        title="Accept Content Submissions"
        description="When enabled, users can submit new apps and extensions."
      />

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : submissions.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions" description="User submissions will appear here" />
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map(sub => {
            const data = (sub.submitted_data as any) || {};
            return (
              <div key={sub.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] hover:shadow-lg hover:shadow-[var(--brand)]/5 group bg-[var(--bg-surface)] border-[var(--divider)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg group-hover:text-[var(--brand)] transition-colors" style={{ color: 'var(--text-primary)' }}>{data.name || 'Untitled'}</h3>
                      <StatusBadge status={sub.status} />
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] uppercase font-semibold tracking-wider text-[var(--text-secondary)]">
                        {sub.submission_type}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{data.short_description || data.description}</p>
                  </div>
                  <div className="text-right text-xs font-medium opacity-60" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="mb-5 p-3 rounded-lg flex flex-wrap gap-4 text-sm bg-[var(--bg-elev-1)] border border-[var(--divider)]/50">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--text-secondary)] opacity-70" />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.submitter_name || 'Anonymous'}</span>
                  </div>
                  {sub.author && (
                    <div className="flex items-center gap-2 px-3 border-l border-[var(--divider)]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="opacity-70">Author:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.author}</span>
                    </div>
                  )}
                </div>

                {/* Admin notes in list */}
                {sub.admin_notes && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-[var(--text-primary)] line-clamp-2">{sub.admin_notes}</p>
                  </div>
                )}

                {/* Submitter notes */}
                {data.submitter_notes && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] block mb-1">Submitter Note</span>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{data.submitter_notes}</p>
                    </div>
                  </div>
                )}

                {/* Duplicate check warning */}
                {sub.duplicate_check_results && (
                  <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-medium text-orange-500">Potential duplicates detected</span>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                  <AdminButton variant="secondary" onClick={() => navigate(`/admin/submissions/${sub.id}`)} className="mr-auto hover:bg-[var(--bg-elev-2)]">
                    <Eye className="w-4 h-4 mr-2" /> View & Edit
                  </AdminButton>

                  {sub.status === 'pending' && (
                    <>
                      <AdminButton
                        onClick={() => setActionTarget({ id: sub.id, action: 'approve', submission: sub })}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                      >
                        <Check className="w-4 h-4 mr-2" /> Publish
                      </AdminButton>
                      <AdminButton
                        variant="destructive"
                        onClick={() => setActionTarget({ id: sub.id, action: 'reject' })}
                        className="hover:scale-105 transition-transform"
                      >
                        <XIcon className="w-4 h-4 mr-2" /> Reject
                      </AdminButton>
                    </>
                  )}

                  {sub.status === 'rejected' && (
                    <>
                      <AdminButton variant="secondary" onClick={() => handleRestore(sub)}
                        className="hover:border-yellow-500/50 hover:bg-yellow-500/10 hover:text-yellow-600 transition-all">
                        <RotateCcw className="w-4 h-4 mr-2" /> Make Pending
                      </AdminButton>
                      <AdminButton
                        onClick={() => setActionTarget({ id: sub.id, action: 'approve', submission: sub })}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                      >
                        <Check className="w-4 h-4 mr-2" /> Publish
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={actionTarget?.action === 'approve' ? 'Publish Submission' : 'Reject Submission'}
        message={actionTarget?.action === 'approve'
          ? 'This will create a new entry in the live database. Are you sure?'
          : 'Are you sure you want to reject this submission?'}
        confirmLabel={actionTarget?.action === 'approve' ? 'Publish' : 'Reject'}
        destructive={actionTarget?.action === 'reject'}
      />

      <ConfirmDialog
        open={!!bulkDeleteTarget}
        onClose={() => setBulkDeleteTarget(null)}
        onConfirm={handleBulkDelete}
        title={`Clear ${bulkDeleteTarget === 'all' ? 'All' : bulkDeleteTarget} Submissions`}
        message={`Are you sure you want to delete all ${bulkDeleteTarget} submissions? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
