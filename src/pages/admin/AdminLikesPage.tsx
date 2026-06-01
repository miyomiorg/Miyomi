import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, TrendingUp, Search, Download, User, Monitor } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LikeData {
    id: string;
    item_id: string;
    item_type: string;
    liked_at: string;
    anonymous_id: string | null;
    device_fingerprint: string;
    browser: string | null;
    os: string | null;
    device_type: string | null;
    ip_address: string | null;
    screen_resolution: string | null;
    timezone: string | null;
    language: string | null;
}

interface LikeStats {
    total: number;
    byType: Record<string, number>;
    byBrowser: Record<string, number>;
    byOS: Record<string, number>;
    byDeviceType: Record<string, number>;
}

export function AdminLikesPage() {
    const [likes, setLikes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<LikeStats>({
        total: 0,
        byType: {},
        byBrowser: {},
        byOS: {},
        byDeviceType: {}
    });

    const [search, setSearch] = useState('');
    const [browserFilter, setBrowserFilter] = useState('');
    const [osFilter, setOSFilter] = useState('');
    const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    // Fetch latest 100 likes and global stats via RPC
    useEffect(() => {
        const fetchLikesAndStats = async () => {
            setLoading(true);
            try {
                // Fetch the latest 100 likes for the table
                const { data: latestLikes, error: likesError } = await supabase
                    .from('likes')
                    .select('*')
                    .order('liked_at', { ascending: false })
                    .limit(100);

                if (likesError) throw likesError;
                setLikes(latestLikes || []);

                const { data: statsData, error: statsError } = await (supabase.rpc as any)('get_likes_stats');

                if (statsError) {
                    console.error("Failed to fetch likes stats via RPC:", statsError);
                } else if (statsData) {
                    setStats(statsData as LikeStats);
                }
            } catch (err) {
                console.error("Failed to fetch likes or stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLikesAndStats();
    }, []);

    // Filtered likes
    const filtered = useMemo(() => {
        return likes.filter((like: any) => {
            const matchesSearch = !search ||
                like.item_id?.toLowerCase().includes(search.toLowerCase()) ||
                like.anonymous_id?.toLowerCase().includes(search.toLowerCase()) ||
                like.device_fingerprint?.toLowerCase().includes(search.toLowerCase()) ||
                like.item_type?.toLowerCase().includes(search.toLowerCase());

            const matchesBrowser = !browserFilter || like.browser === browserFilter;
            const matchesOS = !osFilter || like.os === osFilter;
            const matchesDeviceType = !deviceTypeFilter || like.device_type === deviceTypeFilter;

            return matchesSearch && matchesBrowser && matchesOS && matchesDeviceType;
        });
    }, [likes, search, browserFilter, osFilter, deviceTypeFilter]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, browserFilter, osFilter, deviceTypeFilter, rowsPerPage]);

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    const paginatedLikes = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // Export to CSV
    const handleExport = () => {
        const headers = ['Item ID', 'Type', 'Anonymous ID', 'Browser', 'OS', 'Device Type', 'IP', 'Resolution', 'Timezone', 'Language', 'Liked At'];
        const rows = filtered.map((like: any) => [
            like.item_id,
            like.item_type,
            like.anonymous_id || like.device_fingerprint || '',
            like.browser || '',
            like.os || '',
            like.device_type || '',
            like.ip_address || '',
            like.screen_resolution || '',
            like.timezone || '',
            like.language || '',
            new Date(like.liked_at).toLocaleString(),
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `likes-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Likes</h1>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
            ) : (
                <>
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, #EF4444 15%, transparent)' }}>
                                    <Heart className="w-5 h-5" style={{ color: '#EF4444' }} />
                                </div>
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Likes</span>
                            </div>
                            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
                        </div>

                        {Object.entries(stats.byType).map(([type, count]) => (
                            <div key={type} className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--chip-bg)' }}>
                                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                                    </div>
                                    <span className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>{type} Likes</span>
                                </div>
                                <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</div>
                            </div>
                        ))}
                    </div>

                    {/* Analytics - Browser & OS Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Monitor className="w-4 h-4" /> Browser Breakdown
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(stats.byBrowser || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([browser, count]) => (
                                    <div key={browser} className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{browser}</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Monitor className="w-4 h-4" /> OS Breakdown
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(stats.byOS || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 5).map(([os, count]) => (
                                    <div key={os} className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>{os}</span>
                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="mb-6 space-y-4">
                        <AdminSearchBar value={search} onChange={setSearch} placeholder="Search by item ID, anonymous ID, or type..." />

                        <div className="flex flex-wrap gap-3">
                            <select
                                value={browserFilter}
                                onChange={(e) => setBrowserFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg border bg-transparent"
                                style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                            >
                                <option value="">All Browsers</option>
                                {Object.keys(stats.byBrowser).map(browser => (
                                    <option key={browser} value={browser}>{browser}</option>
                                ))}
                            </select>

                            <select
                                value={osFilter}
                                onChange={(e) => setOSFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg border bg-transparent"
                                style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                            >
                                <option value="">All OS</option>
                                {Object.keys(stats.byOS).map(os => (
                                    <option key={os} value={os}>{os}</option>
                                ))}
                            </select>

                            <select
                                value={deviceTypeFilter}
                                onChange={(e) => setDeviceTypeFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg border bg-transparent"
                                style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)' }}
                            >
                                <option value="">All Devices</option>
                                {Object.keys(stats.byDeviceType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>

                            {(browserFilter || osFilter || deviceTypeFilter) && (
                                <button
                                    onClick={() => {
                                        setBrowserFilter('');
                                        setOSFilter('');
                                        setDeviceTypeFilter('');
                                    }}
                                    className="px-4 py-2 rounded-lg"
                                    style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Likes Table */}
                    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ background: 'var(--bg-elev-1)' }}>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Item ID</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Type</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Anonymous ID</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Browser</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>OS</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Device</th>
                                        <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedLikes.map((like: any) => (
                                        <tr key={like.id} className="border-t" style={{ borderColor: 'var(--divider)' }}>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{like.item_id.slice(0, 8)}…</td>
                                            <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>{like.item_type}</td>
                                            <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {like.anonymous_id ? `${like.anonymous_id.slice(0, 8)}…` : (like.device_fingerprint ? `${like.device_fingerprint.slice(0, 8)}…` : '-')}
                                            </td>
                                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                                                {like.browser ? `${like.browser} ${like.browser_version || ''}`.trim() : '-'}
                                            </td>
                                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                                                {like.os ? `${like.os} ${like.os_version || ''}`.trim() : '-'}
                                            </td>
                                            <td className="px-4 py-3 capitalize" style={{ color: 'var(--text-secondary)' }}>
                                                {like.device_type || '-'}
                                            </td>
                                            <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                                                {new Date(like.liked_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-secondary)', background: 'var(--bg-elev-1)' }}>
                            Showing top {filtered.length} recent likes
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
