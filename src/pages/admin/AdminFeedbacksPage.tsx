import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { MessageSquare, Check } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

export function AdminFeedbacksPage() {
  const { logAction } = useAdminLogger();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">Feedbacks</h1>
      </div>

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
    </div>
  );
}
