import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { MessageSquare, Check, Trash2 } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { EndpointToggle } from '@/components/admin/EndpointToggle';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';

export function AdminFeedbacksPage() {
  const { logAction } = useAdminLogger();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await (supabase as any).from('feedbacks').select('*').order('created_at', { ascending: false });
    setFeedbacks(data || []);
    setLoading(false);
  }

  async function handleAcknowledge(id: string) {
    try {
      await (supabase as any).from('feedbacks').update({ status: 'acknowledged' }).eq('id', id);
      await logAction('acknowledge' as any, 'feedback' as any, id, 'Acknowledged feedback');
      toast.success('Feedback acknowledged.');
      fetchData();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    }
  }

  async function handleClearAll() {
    try {
      const { error, count } = await (supabase as any).from('feedbacks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      await logAction('delete' as any, 'feedback' as any, 'bulk', 'Cleared all feedbacks', { count });
      toast.success('All feedbacks cleared.');
      setShowClearConfirm(false);
      fetchData();
    } catch (err: any) {
      toast.error('Clear failed: ' + err.message);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">Feedbacks</h1>
          <p className="text-[var(--text-secondary)] mt-1">Review user feedback and issues.</p>
        </div>
        {feedbacks.length > 0 && (
          <AdminButton variant="destructive" onClick={() => setShowClearConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear All Feedbacks
          </AdminButton>
        )}
      </div>

      <EndpointToggle 
        endpointKey="feedback"
        title="Accept Feedbacks"
        description="When enabled, users can submit feedback via the site-wide feedback panel."
      />

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : feedbacks.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No feedbacks" description="User feedbacks will appear here" />
      ) : (
        <div className="grid gap-4">
          {feedbacks.map(feedback => (
            <div key={feedback.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] bg-[var(--bg-surface)] border-[var(--divider)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-[var(--text-primary)] capitalize">{feedback.feedback_type}</h3>
                    <StatusBadge status={feedback.status} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{feedback.message}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Submitter: {feedback.user_name || 'Anonymous'}</p>
                </div>
                <div className="text-right text-xs font-medium opacity-60 text-[var(--text-secondary)]">
                  {new Date(feedback.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                {feedback.status === 'new' && (
                  <AdminButton
                    onClick={() => handleAcknowledge(feedback.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-none"
                  >
                    <Check className="w-4 h-4 mr-2" /> Acknowledge
                  </AdminButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAll}
        title="Clear All Feedbacks"
        message="Are you sure you want to permanently delete ALL feedbacks? This cannot be undone."
        confirmLabel="Delete All"
        destructive={true}
      />
    </div>
  );
}
