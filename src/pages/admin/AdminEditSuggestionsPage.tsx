import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { PenTool, User, Check, X as XIcon, Eye, Trash2, RotateCcw, Package, Puzzle, FileText, StickyNote } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

export function AdminEditSuggestionsPage() {
  const navigate = useNavigate();
  const { logAction } = useAdminLogger();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<'approved' | 'rejected' | 'pending' | 'all' | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'app' | 'extension'>('all');
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'approve' | 'reject'; suggestion?: any } | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      try {
        await supabase.rpc('cleanup_old_rejected' as any);
      } catch (rpcErr) {
        console.error('Cleanup RPC failed:', rpcErr);
      }

      const { data, error } = await (supabase as any).from('public_edit_suggestions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function getChangedFieldCount(sub: any): number {
    const orig = (sub.original_data_snapshot as any) || {};
    const submitted = (sub.submitted_data as any) || {};
    return Object.keys(submitted).filter(key => {
      if (['id', 'created_at', 'updated_at'].includes(key)) return false;
      return JSON.stringify(orig[key]) !== JSON.stringify(submitted[key]);
    }).length;
  }

  function getItemName(sub: any): string {
    const submitted = (sub.submitted_data as any) || {};
    if (submitted.name) return submitted.name;
    const orig = (sub.original_data_snapshot as any) || {};
    return orig.name || 'Untitled';
  }

  async function handleBulkDelete() {
    if (!bulkDeleteTarget) return;
    try {
      let query = (supabase as any).from('public_edit_suggestions').delete();
      if (bulkDeleteTarget === 'all') {
        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
      } else {
        query = query.eq('status', bulkDeleteTarget);
      }
      const { error, count } = await query;
      if (error) throw error;
      await logAction('delete' as any, 'edit_suggestion' as any, 'bulk', `Bulk delete ${bulkDeleteTarget}`, { count, target: bulkDeleteTarget });
      toast.success(`Cleared ${bulkDeleteTarget} edit suggestions (${count || 0} removed)`);
      setBulkDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk delete failed: ' + err.message);
    }
  }

  async function handleRestore(sub: any) {
    try {
      await (supabase as any).from('public_edit_suggestions').update({ status: 'pending' }).eq('id', sub.id);
      await logAction('restore' as any, 'edit_suggestion' as any, sub.id, 'Restored to pending');
      toast.success('Restored to pending.');
      fetchData();
    } catch (err: any) {
      toast.error('Restore failed: ' + err.message);
    }
  }

  async function handleAction() {
    if (!actionTarget) return;
    try {
      if (actionTarget.action === 'approve' && actionTarget.suggestion) {
        const sub = actionTarget.suggestion;
        const data = (sub.submitted_data as any) || {};
        const targetTable = sub.target_type === 'app' ? 'apps' : 'extensions';

        const payload = { ...data };
        delete payload.id;
        delete payload.created_at;

        const { error: updateError } = await (supabase as any).from(targetTable).update(payload).eq('id', sub.target_id);
        if (updateError) throw updateError;

        await (supabase as any).from('public_edit_suggestions').delete().eq('id', sub.id);
        await logAction('approve' as any, 'edit_suggestion' as any, sub.id, `${sub.target_type} edit suggestion`).catch(console.error);
        toast.success(`Updated ${data.name || 'item'}!`);
      } else {
        await (supabase as any).from('public_edit_suggestions').update({ status: 'rejected' }).eq('id', actionTarget.id);
        await logAction('reject' as any, 'edit_suggestion' as any, actionTarget.id, 'Rejected').catch(console.error);
        toast.success('Rejected.');
      }
      setActionTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Action failed: ' + err.message);
    }
  }

  const typeFiltered = typeFilter === 'all'
    ? suggestions
    : suggestions.filter(s => s.target_type === typeFilter);

  const counts = {
    active: typeFiltered.filter(s => s.status === 'approved').length,
    rejected: typeFiltered.filter(s => s.status === 'rejected').length,
    pending: typeFiltered.filter(s => s.status === 'pending').length,
    all: typeFiltered.length
  };

  const typeCounts = {
    all: suggestions.length,
    app: suggestions.filter(s => s.target_type === 'app').length,
    extension: suggestions.filter(s => s.target_type === 'extension').length,
  };

  const filteredSuggestions = statusFilter === 'all'
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
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Edit Suggestions</h1>

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
          {counts.all > 0 && (
            <AdminButton variant="destructive" onClick={() => setBulkDeleteTarget('all')}
              className="shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all hover:scale-105">
              <Trash2 className="w-4 h-4 mr-2" /> Clear All
            </AdminButton>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : suggestions.length === 0 ? (
        <EmptyState icon={PenTool} title="No edit suggestions" description="User edit suggestions will appear here" />
      ) : (
        <div className="grid gap-4">
          {filteredSuggestions.map(sub => {
            const name = getItemName(sub);
            const fieldCount = getChangedFieldCount(sub);
            const submitted = (sub.submitted_data as any) || {};
            return (
              <div key={sub.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] hover:shadow-lg hover:shadow-[var(--brand)]/5 group bg-[var(--bg-surface)] border-[var(--divider)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg group-hover:text-[var(--brand)] transition-colors" style={{ color: 'var(--text-primary)' }}>{name}</h3>
                      <StatusBadge status={sub.status} />
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-elev-1)] border border-[var(--divider)] uppercase font-semibold tracking-wider text-[var(--text-secondary)]">
                        {sub.target_type}
                      </span>
                      {fieldCount > 0 && (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {fieldCount} field{fieldCount !== 1 ? 's' : ''} changed
                        </span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {submitted.short_description || submitted.description || '—'}
                    </p>
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
                  {sub.submitter_contact && (
                    <div className="flex items-center gap-2 px-3 border-l border-[var(--divider)]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="opacity-70">Contact:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.submitter_contact}</span>
                    </div>
                  )}
                </div>

                {/* Admin note in list */}
                {sub.admin_note && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
                    <StickyNote className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-[var(--text-primary)] line-clamp-2">{sub.admin_note}</p>
                  </div>
                )}

                {/* Submitter notes */}
                {submitted.submitter_notes && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] block mb-1">Submitter Note</span>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{submitted.submitter_notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                  <AdminButton variant="secondary" onClick={() => navigate(`/admin/edit-suggestions/${sub.id}`)} className="mr-auto hover:bg-[var(--bg-elev-2)]">
                    <Eye className="w-4 h-4 mr-2" /> View & Edit
                  </AdminButton>

                  {sub.status === 'pending' && (
                    <>
                      <AdminButton onClick={() => setActionTarget({ id: sub.id, action: 'approve', suggestion: sub })}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20">
                        <Check className="w-4 h-4 mr-2" /> Approve & Apply
                      </AdminButton>
                      <AdminButton variant="destructive" onClick={() => setActionTarget({ id: sub.id, action: 'reject' })}
                        className="hover:scale-105 transition-transform">
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
                      <AdminButton onClick={() => setActionTarget({ id: sub.id, action: 'approve', suggestion: sub })}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20">
                        <Check className="w-4 h-4 mr-2" /> Approve & Apply
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
        title={actionTarget?.action === 'approve' ? 'Approve Edit Suggestion' : 'Reject Edit Suggestion'}
        message={actionTarget?.action === 'approve'
          ? 'This will update the existing app/extension with the suggested changes. Are you sure?'
          : 'Are you sure you want to reject this edit suggestion?'}
        confirmLabel={actionTarget?.action === 'approve' ? 'Apply' : 'Reject'}
        destructive={actionTarget?.action === 'reject'}
      />

      <ConfirmDialog
        open={!!bulkDeleteTarget}
        onClose={() => setBulkDeleteTarget(null)}
        onConfirm={handleBulkDelete}
        title={`Clear ${bulkDeleteTarget === 'all' ? 'All' : bulkDeleteTarget} Edit Suggestions`}
        message={`Are you sure you want to delete all ${bulkDeleteTarget} edit suggestions? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
