import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Shield, LogIn, LogOut, MapPin, Monitor, AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AdminSession {
    id: string;
    session_type: 'login' | 'logout';
    ip_address: string;
    user_agent: string;
    browser: string | null;
    browser_version: string | null;
    os: string | null;
    os_version: string | null;
    device_type: string;
    device_vendor: string | null;
    device_model: string | null;
    device_fingerprint: string;
    country: string | null;
    city: string | null;
    created_at: string;
    admin_email?: string;
}

export function AdminSessionsPage() {
    const { isSuperAdmin } = useAdmin();
    const [sessions, setSessions] = useState<AdminSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'login' | 'logout'>('all');
    const [knownFingerprints, setKnownFingerprints] = useState<Set<string>>(new Set());
    const [knownCountries, setKnownCountries] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchSessions();
    }, [filter, isSuperAdmin]);

    async function fetchSessions() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: adminData } = await supabase.from('admins').select('id').eq('user_id', user.id).single();
            if (!adminData) return;

            // Build query
            let query = supabase
                .from('admin_sessions')
                .select('*, admins!inner(email)')
                .order('created_at', { ascending: false })
                .limit(100);

            // Filter by session type
            if (filter !== 'all') {
                query = query.eq('session_type', filter);
            }

            // Regular admins only see their own sessions (RLS handles this, but explicit for clarity)
            if (!isSuperAdmin) {
                query = query.eq('admin_id', adminData.id);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching sessions:', error);
                return;
            }

            const sessionsData: AdminSession[] = (data || []).map(session => ({
                ...session,
                admin_email: (session.admins as any)?.email || 'Unknown',
            }) as AdminSession);

            setSessions(sessionsData);

            // Track known fingerprints and countries for security flagging
            const fingerprints = new Set<string>();
            const countries = new Set<string>();

            sessionsData.forEach(session => {
                if (session.device_fingerprint) fingerprints.add(session.device_fingerprint);
                if (session.country) countries.add(session.country);
            });

            setKnownFingerprints(fingerprints);
            setKnownCountries(countries);
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    }

    function isNewDevice(fingerprint: string, index: number): boolean {
        // Check if this fingerprint appears for the first time
        const firstOccurrence = sessions.findIndex(s => s.device_fingerprint === fingerprint);
        return firstOccurrence === index;
    }

    function isUnusualLocation(country: string | null, index: number): boolean {
        if (!country) return false;
        // Check if this country appears for the first time
        const firstOccurrence = sessions.findIndex(s => s.country === country);
        return firstOccurrence === index && sessions.length > 1;
    }

    return (
        <div>
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <Shield className="w-6 h-6" style={{ color: 'var(--brand)' }} />
                    <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                        {isSuperAdmin ? 'Admin Sessions' : 'My Sessions'}
                    </h1>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Track login and logout activity with device information
                </p>
            </div>

            {/* Filters */}
            <div className="rounded-xl border p-4 mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Filters</span>
                    </div>

                    {isSuperAdmin && (
                        <button
                            onClick={async () => {
                                if (!window.confirm('Are you sure you want to clear all session logs? This action cannot be undone.')) {
                                    return;
                                }

                                setLoading(true);
                                try {
                                    const { error } = await supabase.rpc('clear_admin_data', {
                                        target_table: 'sessions'
                                    });

                                    if (error) throw error;
                                    fetchSessions();
                                } catch (error) {
                                    console.error('Error clearing sessions:', error);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10 text-red-500 border border-red-500/20"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clean All Sessions</span>
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {[
                        { value: 'all', label: 'All Sessions' },
                        { value: 'login', label: 'Logins Only' },
                        { value: 'logout', label: 'Logouts Only' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setFilter(option.value as typeof filter)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: filter === option.value ? 'var(--brand)' : 'var(--chip-bg)',
                                color: filter === option.value ? 'white' : 'var(--text-secondary)',
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sessions List */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--brand)' }} />
                    <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="rounded-xl border p-12 text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                    <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No sessions found</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>There are no sessions matching your filter criteria</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map((session, index) => {
                        const isLogin = session.session_type === 'login';
                        const newDevice = isNewDevice(session.device_fingerprint, index);
                        const unusualLocation = isUnusualLocation(session.country, index);
                        const hasSuspiciousFlag = newDevice || unusualLocation;

                        return (
                            <div
                                key={session.id}
                                className="rounded-xl border p-5"
                                style={{
                                    background: 'var(--bg-surface)',
                                    borderColor: hasSuspiciousFlag ? '#F59E0B' : 'var(--divider)',
                                    borderWidth: hasSuspiciousFlag ? '2px' : '1px',
                                }}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                                            style={{
                                                background: isLogin ? '#10B98118' : '#EF444418',
                                            }}
                                        >
                                            {isLogin ? (
                                                <LogIn className="w-5 h-5" style={{ color: '#10B981' }} />
                                            ) : (
                                                <LogOut className="w-5 h-5" style={{ color: '#EF4444' }} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                                                    {session.session_type}
                                                </span>
                                                {hasSuspiciousFlag && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ background: '#F59E0B18', color: '#F59E0B' }}>
                                                        <AlertTriangle className="w-3 h-3" />
                                                        <span>Flagged</span>
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                    {isSuperAdmin && (
                                        <div className="text-right">
                                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {session.admin_email}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Admin</div>
                                        </div>
                                    )}
                                </div>

                                {/* Security Flags */}
                                {hasSuspiciousFlag && (
                                    <div className="mb-4 p-3 rounded-lg" style={{ background: '#F59E0B08', borderLeft: '3px solid #F59E0B' }}>
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: '#F59E0B' }} />
                                            <div>
                                                <p className="text-sm font-medium mb-1" style={{ color: '#F59E0B' }}>Security Notice</p>
                                                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                                    {newDevice && <li>• First time seeing this device (fingerprint: {session.device_fingerprint.slice(0, 12)}...)</li>}
                                                    {unusualLocation && <li>• New location detected: {session.city}, {session.country}</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Session Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Device Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Monitor className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                                Device
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 pl-6">
                                            <div className="flex justify-between">
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Browser</span>
                                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {session.browser || 'Unknown'} {session.browser_version ? `v${session.browser_version}` : ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>OS</span>
                                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {session.os || 'Unknown'} {session.os_version || ''}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type</span>
                                                <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                                                    {session.device_type}
                                                </span>
                                            </div>
                                            {session.device_vendor && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vendor</span>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {session.device_vendor} {session.device_model || ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location & Network */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                                                Location
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 pl-6">
                                            <div className="flex justify-between">
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>IP Hash</span>
                                                <span className="text-sm font-mono font-medium cursor-pointer" style={{ color: 'var(--text-primary)' }}
                                                    title={session.ip_address}
                                                    onClick={() => { navigator.clipboard.writeText(session.ip_address); }}
                                                >
                                                    {session.ip_address?.length > 16 ? `${session.ip_address.slice(0, 16)}…` : session.ip_address}
                                                </span>
                                            </div>
                                            {session.country && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Country</span>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {session.country}
                                                    </span>
                                                </div>
                                            )}
                                            {session.city && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>City</span>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {session.city}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fingerprint</span>
                                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                                    {session.device_fingerprint.slice(0, 16)}...
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* User Agent (collapsed, small text) */}
                                <details className="mt-4">
                                    <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                                        View user agent
                                    </summary>
                                    <pre className="mt-2 p-2 rounded text-xs overflow-x-auto" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>
                                        {session.user_agent}
                                    </pre>
                                </details>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
