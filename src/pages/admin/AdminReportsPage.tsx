import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Flag, Check, Trash2, Eye, ShieldAlert, Monitor, User, Globe, Hash } from 'lucide-react';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface ReportData {
  id: string;
  target_type: string;
  target_id: string;
  page_url: string;
  reason: string;
  message: string;
  reporter_name: string;
  reporter_contact: string;
  status: string;
  created_at: string;
  device_fingerprint: string;
  anonymous_id: string;
  ip_address: string;
  browser: string;
  os: string;
  device_type: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  target_name?: string;
}

export function AdminReportsPage() {
  const { logAction } = useAdminLogger();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [viewReport, setViewReport] = useState<ReportData | null>(null);
  
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'delete' | 'complete' } | null>(null);

  useEffect(() => { 
    fetchData(); 
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: reportsData, error } = await (supabase as any).from('reports').select('*').order('created_at', { ascending: false });
    
    if (error) {
        toast.error('Failed to load reports');
        setLoading(false);
        return;
    }

    const appIds = reportsData.filter((r: any) => r.target_type === 'app').map((r: any) => r.target_id);
    const extIds = reportsData.filter((r: any) => r.target_type === 'extension').map((r: any) => r.target_id);

    const [appsRes, extsRes] = await Promise.all([
        appIds.length > 0 ? (supabase as any).from('apps').select('id, name').in('id', appIds) : { data: [] },
        extIds.length > 0 ? (supabase as any).from('extensions').select('id, name').in('id', extIds) : { data: [] }
    ]);

    const titleMap: Record<string, string> = {};
    (appsRes.data || []).forEach((a: any) => { titleMap[a.id] = a.name; });
    (extsRes.data || []).forEach((e: any) => { titleMap[e.id] = e.name; });

    const enriched = reportsData.map((r: any) => ({
        ...r,
        target_name: titleMap[r.target_id] || 'Unknown Target'
    }));

    setReports(enriched);
    setLoading(false);
  }

  // Calculate Trust Scores (total reports by anonymous_id)
  const trustScores = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
        if (r.anonymous_id) {
            counts[r.anonymous_id] = (counts[r.anonymous_id] || 0) + 1;
        }
    });
    return counts;
  }, [reports]);

  const pendingReports = reports.filter(r => r.status === 'new' || r.status === 'reviewing');
  const historyReports = reports.filter(r => r.status === 'completed' || r.status === 'resolved' || r.status === 'dismissed');

  const displayedReports = activeTab === 'pending' ? pendingReports : historyReports;

  async function handleConfirmAction() {
    if (!actionTarget) return;
    const { id, action } = actionTarget;

    try {
      if (action === 'complete') {
        await (supabase as any).from('reports').update({ status: 'completed' }).eq('id', id);
        await logAction('resolve' as any, 'report' as any, id, 'Completed report');
        toast.success('Report marked as completed.');
      } else if (action === 'delete') {
        await (supabase as any).from('reports').delete().eq('id', id);
        await logAction('delete' as any, 'report' as any, id, 'Deleted report entirely');
        toast.success('Report deleted permanently.');
      }
      fetchData();
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setActionTarget(null);
    }
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
        <div>
            <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">User Reports</h1>
            <p className="text-[var(--text-secondary)] mt-1">Review and manage content reports submitted by users.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[var(--divider)]">
        <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'pending' ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
            Pending ({pendingReports.length})
            {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-t-full" />}
        </button>
        <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${activeTab === 'history' ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
        >
            History ({historyReports.length})
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] rounded-t-full" />}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--text-secondary)] flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
            Loading reports...
        </div>
      ) : displayedReports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description={`No ${activeTab} user reports at this time.`} />
      ) : (
        <div className="grid gap-4">
          {displayedReports.map(report => (
            <div key={report.id} className="rounded-xl border p-5 transition-all hover:border-[var(--brand)] bg-[var(--bg-surface)] border-[var(--divider)]">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-[var(--text-primary)] flex items-center flex-wrap gap-2">
                        {report.target_name}
                        <span className="text-sm font-normal text-[var(--text-secondary)] border-l border-[var(--divider)] pl-2">
                            {report.reason}
                        </span>
                    </h3>
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-2">{report.message}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]" title={report.target_id}>
                          <span className="font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded">TARGET</span>
                          {report.target_type.toUpperCase()}
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                          <span className="font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded">REPORTER</span>
                          {report.reporter_name || 'Anonymous'}
                      </div>
                      
                      {report.anonymous_id && (
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]" title="Total reports submitted by this user device">
                              <span className="font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-500 rounded flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" />
                                  TRUST SCORE
                              </span>
                              {trustScores[report.anonymous_id]} total reports
                          </div>
                      )}
                  </div>
                </div>
                <div className="text-right text-xs font-medium opacity-60 text-[var(--text-secondary)] shrink-0">
                  {new Date(report.created_at).toLocaleString()}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--divider)]">
                <AdminButton
                    variant="secondary"
                    onClick={() => setViewReport(report)}
                    className="mr-auto hover:bg-[var(--bg-elev-2)]"
                >
                    <Eye className="w-4 h-4 mr-2" /> View Details
                </AdminButton>

                {activeTab === 'pending' && (
                  <AdminButton
                    onClick={() => setActionTarget({ id: report.id, action: 'complete' })}
                    className="bg-green-600 hover:bg-green-700 text-white border-none"
                  >
                    <Check className="w-4 h-4 mr-2" /> Mark Done
                  </AdminButton>
                )}
                
                <AdminButton
                    variant="destructive"
                    onClick={() => setActionTarget({ id: report.id, action: 'delete' })}
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!actionTarget}
        title={actionTarget?.action === 'complete' ? "Mark Report as Done" : "Delete Report"}
        message={actionTarget?.action === 'complete' ? "This will move the report to history. Are you sure?" : "This will permanently delete the report from the database. This action cannot be undone."}
        confirmText={actionTarget?.action === 'complete' ? "Mark Done" : "Delete"}
        confirmStyle={actionTarget?.action === 'complete' ? "success" : "danger"}
        onConfirm={handleConfirmAction}
        onCancel={() => setActionTarget(null)}
      />

      {/* View Modal */}
      <AnimatePresence>
        {viewReport && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setViewReport(null)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl rounded-3xl border border-[var(--divider)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-full"
                >
                    <div className="flex items-center justify-between p-6 border-b border-[var(--divider)] shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                <Flag className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Report Details</h2>
                        </div>
                        <StatusBadge status={viewReport.status} />
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            {/* Target Section */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Target</h4>
                                <div className="p-4 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)]">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                        <span className="font-semibold text-sm capitalize">{viewReport.target_type}</span>
                                        <span className="text-[var(--text-primary)] text-sm font-bold">{viewReport.target_name}</span>
                                        <span className="text-[var(--text-secondary)] text-xs font-mono">{viewReport.target_id}</span>
                                    </div>
                                    {viewReport.page_url && (
                                        <a href={viewReport.page_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-sm break-all">
                                            {viewReport.page_url}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Report Details */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Report Info</h4>
                                <div className="p-4 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)]">
                                    <h5 className="font-bold text-[var(--text-primary)] mb-2">{viewReport.reason}</h5>
                                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{viewReport.message}</p>
                                </div>
                            </div>

                            {/* Reporter Info (Anonymity metrics) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Reporter</h4>
                                    <div className="p-4 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)] space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                            <User className="w-4 h-4 opacity-50" />
                                            {viewReport.reporter_name || 'Anonymous'}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                                            <Globe className="w-4 h-4 opacity-50" />
                                            {viewReport.reporter_contact || 'No contact provided'}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Fingerprint & Trust</h4>
                                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Total Reports</span>
                                            <span className="font-bold text-purple-500">{viewReport.anonymous_id ? trustScores[viewReport.anonymous_id] : 0}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Anon ID</span>
                                            <span className="text-[var(--text-primary)] font-mono">{viewReport.anonymous_id?.substring(0,8) || 'N/A'}...</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> System</span>
                                            <span className="text-[var(--text-primary)]">{viewReport.browser || 'Unknown'} / {viewReport.os || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-[var(--text-secondary)] flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> IP</span>
                                            <span className="text-[var(--text-primary)] font-mono">{viewReport.ip_address || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right text-xs text-[var(--text-secondary)]">
                                Submitted on {new Date(viewReport.created_at).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-[var(--divider)] flex justify-end">
                        <AdminButton variant="secondary" onClick={() => setViewReport(null)}>
                            Close
                        </AdminButton>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}
