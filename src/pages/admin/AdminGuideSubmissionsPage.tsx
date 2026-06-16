import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Inbox, User, Check, X as XIcon, Eye, Trash2, AlertTriangle, RotateCcw, FileText, StickyNote } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

export function AdminGuideSubmissionsPage() {
  const navigate = useNavigate();
  const { logAction } = useAdminLogger();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'approve' | 'reject'; type: 'new' | 'edit'; data?: any; } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'edit'>('all');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: newSubs, error: err1 } = await supabase.from('submissions').select('*').eq('submission_type', 'guide').order('created_at', { ascending: false });
      if (err1) throw err1;

      const { data: editSubs, error: err2 } = await supabase.from('public_edit_suggestions').select('*').eq('target_type', 'guide').order('created_at', { ascending: false });
      if (err2) throw err2;

      const combined = [
        ...(newSubs || []).map(s => ({ ...s, _type: 'new' })),
        ...(editSubs || []).map(s => ({ ...s, _type: 'edit' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSubmissions(combined);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch guide submissions');
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  async function handleAction() {
    if (!actionTarget) return;
    try {
      if (actionTarget.action === 'approve' && actionTarget.data) {
        const sub = actionTarget.data;
        const submittedData = sub.submitted_data as any;

        if (actionTarget.type === 'new') {
          // INSERT new guide
          let slug = generateSlug(submittedData.title || '');
          const payload: any = {
            title: submittedData.title,
            slug: slug,
            category: submittedData.category,
            description: submittedData.description || null,
            content: submittedData.content,
            author: sub.author || submittedData.author,
          };

          const { data: insertedData, error: insertError } = await supabase.from('guides').insert(payload).select().single();
          if (insertError) {
            if (insertError.code === '23505') {
              // try appending random string
              payload.slug = slug + '-' + Math.floor(Math.random() * 1000);
              const { error: retryErr } = await supabase.from('guides').insert(payload);
              if (retryErr) throw retryErr;
            } else {
              throw insertError;
            }
          }

          await supabase.from('submissions').update({ status: 'approved' }).eq('id', sub.id);
          await logAction('approve', 'submission', sub.id, 'Guide submission', {
            approved_as: 'guides',
            resource_name: payload.title
          }).catch(console.error);

          toast.success(`Published guide: ${payload.title}`);
        } else {
          // UPDATE existing guide
          const payload: any = {
            title: submittedData.title,
            category: submittedData.category,
            description: submittedData.description,
            content: submittedData.content,
            author: submittedData.author,
          };

          if (submittedData.title && submittedData.title !== sub.original_data_snapshot?.title) {
             payload.slug = generateSlug(submittedData.title);
          }

          const { error: updateError } = await supabase.from('guides').update(payload).eq('id', sub.target_id);
          if (updateError) throw updateError;

          await supabase.from('public_edit_suggestions').update({ status: 'approved' }).eq('id', sub.id);
          await logAction('approve', 'edit_suggestion', sub.id, 'Guide edit suggestion').catch(console.error);
          toast.success(`Updated guide: ${payload.title}`);
        }
      } else {
        // Reject
        const table = actionTarget.type === 'new' ? 'submissions' : 'public_edit_suggestions';
        await supabase.from(table).update({ status: 'rejected' }).eq('id', actionTarget.id);
        
        await logAction('reject', actionTarget.type === 'new' ? 'submission' : 'edit_suggestion', actionTarget.id, 'Rejected guide submission', {
          reason: 'Rejected by admin'
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
    : submissions.filter(s => s._type === typeFilter);

  const counts = {
    active: typeFiltered.filter(s => s.status === 'approved').length,
    rejected: typeFiltered.filter(s => s.status === 'rejected').length,
    pending: typeFiltered.filter(s => s.status === 'pending').length,
    all: typeFiltered.length
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

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Guide Submissions</h1>
          <p className="text-[var(--text-secondary)] mt-1">Review user-submitted new guides and edits.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
           <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)]">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === 'all' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('new')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === 'new' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}
            >
              New Guides
            </button>
            <button
              onClick={() => setTypeFilter('edit')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === 'edit' ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}
            >
              Edits
            </button>
          </div>

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
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      ) : submissions.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions" description="User submissions will appear here" />
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map(sub => {
            const data = (sub.submitted_data as any) || {};
            const isEdit = sub._type === 'edit';
            return (
              <div key={sub.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] hover:shadow-lg hover:shadow-[var(--brand)]/5 group bg-[var(--bg-surface)] border-[var(--divider)]">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg group-hover:text-[var(--brand)] transition-colors" style={{ color: 'var(--text-primary)' }}>
                        {data.title || 'Untitled'}
                      </h3>
                      <StatusBadge status={sub.status} />
                      <span className={`text-xs px-2.5 py-1 rounded-full border uppercase font-semibold tracking-wider ${isEdit ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                        {isEdit ? 'Edit Suggestion' : 'New Guide'}
                      </span>
                    </div>
                    <p className="text-sm line-clamp-2 max-w-2xl leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{data.description}</p>
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
                  {(sub.author || data.author) && (
                    <div className="flex items-center gap-2 px-3 border-l border-[var(--divider)]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="opacity-70">Author:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{sub.author || data.author}</span>
                    </div>
                  )}
                  {data.category && (
                    <div className="flex items-center gap-2 px-3 border-l border-[var(--divider)]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="opacity-70">Category:</span>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{data.category}</span>
                    </div>
                  )}
                </div>

                {data.submitter_notes && (
                  <div className="mb-4 p-3 rounded-lg bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-start gap-2">
                    <FileText className="w-4 h-4 text-[var(--brand)] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] block mb-1">Submitter Note</span>
                      <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{data.submitter_notes}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3 border-t border-[var(--divider)] pt-4">
                  {sub.status === 'pending' && (
                    <>
                      <AdminButton
                        onClick={() => setActionTarget({ id: sub.id, action: 'approve', type: sub._type, data: sub })}
                        className="bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-500/20"
                      >
                        <Check className="w-4 h-4 mr-2" /> Publish Guide
                      </AdminButton>

                      <AdminButton
                        variant="destructive"
                        onClick={() => setActionTarget({ id: sub.id, action: 'reject', type: sub._type })}
                      >
                        <XIcon className="w-4 h-4 mr-2" /> Reject
                      </AdminButton>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={actionTarget?.action === 'approve' ? 'Publish Guide' : 'Reject Submission'}
        message={actionTarget?.action === 'approve'
          ? 'This will push the guide content live. Are you sure?'
          : 'Are you sure you want to reject this submission?'}
        confirmLabel={actionTarget?.action === 'approve' ? 'Publish' : 'Reject'}
        destructive={actionTarget?.action === 'reject'}
      />
    </div>
  );
}
