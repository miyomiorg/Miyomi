import { useEffect, useState } from 'react';
import { adminLogsApi } from '@/services/api';
import { useAdmin } from '@/hooks/useAdmin';
import { EmptyState } from '@/components/admin/AdminFormElements';
import { FileText, Filter, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminLog {
    id: string;
    action: string;
    resource_type: string;
    resource_name: string;
    details: any;
    created_at: string;
    admin_id: string;
    admins: {
        email: string;
        display_name: string | null;
    } | null;
}

export function AdminLogsPage() {
    const { isAdmin, isSuperAdmin } = useAdmin();
    const [logs, setLogs] = useState<AdminLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [resourceFilter, setResourceFilter] = useState<string>('all');

    useEffect(() => {
        if (isAdmin) {
            fetchLogs();
        }
    }, [isAdmin, filter, resourceFilter]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const data = await adminLogsApi.list({
                action: filter !== 'all' ? filter : undefined,
                resourceType: resourceFilter !== 'all' ? resourceFilter : undefined,
                limit: 100,
            });
            setLogs(data as unknown as AdminLog[]);
        } catch (error) {
            console.error('Error fetching logs:', error);
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

    const getActionColor = (action: string) => {
        const colors: Record<string, string> = {
            create: '#10b981',
            update: '#facc15',
            delete: '#f97316',
            approve: '#a855f7',
            reject: '#fb7185',
        };
        return colors[action] || 'var(--text-secondary)';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                    Activity Logs
                </h1>
                <div className="flex gap-2">
                    {isSuperAdmin && (
                        <button
                            onClick={async () => {
                                if (!window.confirm('Are you sure you want to clear all activity logs? This action cannot be undone.')) {
                                    return;
                                }

                                setLoading(true);
                                try {
                                    await adminLogsApi.clear();
                                    fetchLogs();
                                } catch (error) {
                                    console.error('Error clearing logs:', error);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 text-red-500 border border-red-500/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Clean All Logs</span>
                        </button>
                    )}

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{
                            background: 'var(--bg-surface)',
                            borderColor: 'var(--divider)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <option value="all">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="approve">Approve</option>
                        <option value="reject">Reject</option>
                    </select>

                    <select
                        value={resourceFilter}
                        onChange={(e) => setResourceFilter(e.target.value)}
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{
                            background: 'var(--bg-surface)',
                            borderColor: 'var(--divider)',
                            color: 'var(--text-primary)',
                        }}
                    >
                        <option value="all">All Resources</option>
                        <option value="app">Apps</option>
                        <option value="extension">Extensions</option>
                        <option value="guide">Guides</option>
                        <option value="faq">FAQs</option>
                        <option value="submission">Submissions</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                    Loading...
                </div>
            ) : logs.length === 0 ? (
                <EmptyState
                    icon={FileText}
                    title="No activity logs"
                    description="Admin actions will appear here once they start making changes"
                />
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="rounded-xl border p-4"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                                            style={{
                                                background: `color-mix(in srgb, ${getActionColor(log.action)} 15%, transparent)`,
                                                color: getActionColor(log.action),
                                            }}
                                        >
                                            {log.action}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                                            {log.resource_type}
                                        </span>
                                    </div>

                                    <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                        {log.resource_name}
                                    </p>

                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {log.admins?.display_name || log.admins?.email || 'Unknown admin'} •{' '}
                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
