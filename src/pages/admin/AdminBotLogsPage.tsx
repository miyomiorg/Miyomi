import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { EmptyState } from '@/components/admin/AdminFormElements';
import { Bot, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BotLog {
    id: string;
    ip_address: string;
    country: string;
    user_agent: string;
    headers_dump: any;
    reason: string;
    created_at: string;
}

export function AdminBotLogsPage() {
    const { isAdmin, isSuperAdmin } = useAdmin();
    const [logs, setLogs] = useState<BotLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [isAdmin]);

    async function fetchLogs() {
        setLoading(true);
        try {
            // @ts-ignore
            const { data, error } = await supabase
                .from('bot_attack_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching bot logs:', error);
            } else {
                setLogs((data as any) || []);
            }
        } catch (error) {
            console.error('Error fetching bot logs:', error);
        } finally {
            setLoading(false);
        }
    }

    if (!isAdmin) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                Access denied
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                    Bot Attacks Log
                </h1>
                <div className="flex gap-2">
                    {isSuperAdmin && (
                        <button
                            onClick={async () => {
                                if (!window.confirm('Are you sure you want to clear all bot logs? This action cannot be undone.')) {
                                    return;
                                }

                                setLoading(true);
                                try {
                                    // @ts-ignore
                                    const { error } = await supabase.from('bot_attack_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                    if (error) throw error;
                                    fetchLogs();
                                } catch (error) {
                                    console.error('Error clearing bot logs:', error);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-500 border border-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Clean All Logs</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                    Loading...
                </div>
            ) : logs.length === 0 ? (
                <EmptyState
                    icon={Bot}
                    title="No bot attacks"
                    description="No suspicious attacks have been recorded yet"
                />
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="rounded-xl border p-4 space-y-3"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                            {log.reason}
                                        </span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>IP Address:</span>{' '}
                                            <span className="font-mono">{log.ip_address}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Country:</span>{' '}
                                            <span>{log.country || 'Unknown'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 text-sm">
                                        <span style={{ color: 'var(--text-secondary)' }}>User Agent:</span>{' '}
                                        <span className="font-mono text-xs break-all">{log.user_agent}</span>
                                    </div>
                                    
                                    {log.headers_dump && (
                                        <details className="mt-2">
                                            <summary className="text-xs cursor-pointer select-none" style={{ color: 'var(--brand)' }}>View Headers</summary>
                                            <pre className="mt-2 p-2 rounded-lg text-xs font-mono overflow-x-auto border" style={{ background: 'var(--bg-page)', borderColor: 'var(--divider)', color: 'var(--text-primary)' }}>
                                                {JSON.stringify(log.headers_dump, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
