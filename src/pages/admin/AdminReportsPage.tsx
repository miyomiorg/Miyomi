import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Flag, Check, Trash2 } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

export function AdminReportsPage() {
  const { logAction } = useAdminLogger();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await (supabase as any).from('reports').select('*').order('created_at', { ascending: false });
    setReports(data || []);
    setLoading(false);
  }

  async function handleResolve(id: string) {
    try {
      await (supabase as any).from('reports').update({ status: 'resolved' }).eq('id', id);
      await logAction('resolve' as any, 'report' as any, id, 'Resolved report');
      toast.success('Report resolved.');
      fetchData();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">Reports</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">Loading...</div>
      ) : reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="User reports will appear here" />
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div key={report.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] bg-[var(--bg-surface)] border-[var(--divider)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">{report.reason}</h3>
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{report.message}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Target: {report.target_type} - {report.target_id}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Submitter: {report.reporter_name || 'Anonymous'}</p>
                </div>
                <div className="text-right text-xs font-medium opacity-60 text-[var(--text-secondary)]">
                  {new Date(report.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                {report.status === 'pending' && (
                  <AdminButton
                    onClick={() => handleResolve(report.id)}
                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                  >
                    <Check className="w-4 h-4 mr-2" /> Mark Resolved
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
