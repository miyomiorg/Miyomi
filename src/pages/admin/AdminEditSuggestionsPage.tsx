import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { PenTool, Check, X as XIcon, Trash2, Eye } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

export function AdminEditSuggestionsPage() {
  const { logAction } = useAdminLogger();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'approve' | 'reject'; suggestion?: any } | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await (supabase as any).from('public_edit_suggestions').select('*').order('created_at', { ascending: false });
    setSuggestions(data || []);
    setLoading(false);
  }

  async function handleAction() {
    if (!actionTarget) return;

    try {
      if (actionTarget.action === 'approve' && actionTarget.suggestion) {
        const sub = actionTarget.suggestion;
        const targetTable = sub.target_type === 'app' ? 'apps' : 'extensions';
        
        // In a real scenario, you might merge data or let admin review diffs.
        // Here we just approve and overwrite (simplified).
        const { error: updateError } = await (supabase as any)
          .from(targetTable)
          .update(sub.suggested_data)
          .eq('id', sub.target_id);

        if (updateError) throw updateError;

        await (supabase as any).from('public_edit_suggestions').update({ status: 'approved' }).eq('id', sub.id);

        await logAction('approve' as any, 'edit_suggestion' as any, sub.id, `Approved edit for ${sub.target_type}`);
        toast.success(`Edit suggestion approved and applied!`);
      } else {
        await (supabase as any).from('public_edit_suggestions').update({ status: 'rejected' }).eq('id', actionTarget.id);
        await logAction('reject' as any, 'edit_suggestion' as any, actionTarget.id, 'Rejected edit suggestion');
        toast.success('Edit suggestion rejected.');
      }

      setActionTarget(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Action failed: ' + err.message);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">Edit Suggestions</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : suggestions.length === 0 ? (
        <EmptyState icon={PenTool} title="No suggestions" description="User edit suggestions will appear here" />
      ) : (
        <div className="grid gap-4">
          {suggestions.map(sub => (
            <div key={sub.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] bg-[var(--bg-surface)] border-[var(--divider)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Edit for {sub.target_type}</h3>
                    <StatusBadge status={sub.status} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Submitter: {sub.submitter_name || 'Anonymous'}</p>
                </div>
                <div className="text-right text-xs font-medium opacity-60 text-[var(--text-secondary)]">
                  {new Date(sub.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                {sub.status === 'pending' && (
                  <>
                    <AdminButton
                      onClick={() => setActionTarget({ id: sub.id, action: 'approve', suggestion: sub })}
                      className="bg-green-600 hover:bg-green-700 text-white border-none"
                    >
                      <Check className="w-4 h-4 mr-2" /> Approve & Apply
                    </AdminButton>
                    <AdminButton
                      variant="destructive"
                      onClick={() => setActionTarget({ id: sub.id, action: 'reject' })}
                    >
                      <XIcon className="w-4 h-4 mr-2" /> Reject
                    </AdminButton>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={actionTarget?.action === 'approve' ? 'Approve Edit' : 'Reject Edit'}
        message={actionTarget?.action === 'approve' ? 'This will overwrite the public data. Proceed?' : 'Are you sure you want to reject this suggestion?'}
      />
    </div>
  );
}
