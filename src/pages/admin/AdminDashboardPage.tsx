import { useEffect, useState } from 'react';
import { dashboardApi } from '@/services/api';
import { useAdmin } from '@/hooks/useAdmin';
import { AppWindow, Puzzle, Inbox, Bell, Heart, BookOpen, TrendingUp, Clock, Award, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Metrics {
  apps: number;
  extensions: number;
  guides: number;
  pendingSubmissions: number;
  activeNotices: number;
  totalLikes: number;
}

interface ContributionStats {
  totalActions: number;
  actionBreakdown: { action: string; count: number }[];
  recentLogs: Array<{ id: string; action: string; resource_type: string; resource_name: string; created_at: string; admin_name?: string }>;
  topContributors?: Array<{ admin_name: string; total_actions: number }>;
}

export function AdminDashboardPage() {
  const { isSuperAdmin } = useAdmin();
  const [metrics, setMetrics] = useState<Metrics>({ apps: 0, extensions: 0, guides: 0, pendingSubmissions: 0, activeNotices: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; name: string; date: string }>>([]);
  const [contributionStats, setContributionStats] = useState<ContributionStats>({ totalActions: 0, actionBreakdown: [], recentLogs: [], topContributors: [] });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await dashboardApi.get();

        setMetrics({
          apps: data.counts.approvedApps,
          extensions: data.counts.approvedExtensions,
          guides: data.counts.publishedGuides,
          pendingSubmissions: data.counts.pendingSubmissions,
          activeNotices: data.counts.activeNotices,
          totalLikes: data.counts.totalLikes,
        });

        const activity = [
          ...data.recentApps.map(a => ({ type: 'App', name: a.name, date: a.updatedAt })),
          ...data.recentExtensions.map(e => ({ type: 'Extension', name: e.name, date: e.updatedAt })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

        setRecentActivity(activity);

        setContributionStats({
          totalActions: data.stats.totalActions,
          actionBreakdown: data.stats.actionBreakdown,
          recentLogs: data.stats.recentLogs.map(log => ({
            id: log.id,
            action: log.action,
            resource_type: log.resourceType,
            resource_name: log.resourceName || '',
            created_at: log.createdAt,
            admin_name: log.adminEmail,
          })),
          topContributors: data.stats.topContributors.map(c => ({
            admin_name: c.adminEmail,
            total_actions: c.totalActions,
          })),
        });
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [isSuperAdmin]);

  const cards = [
    { label: 'Apps', value: metrics.apps, icon: AppWindow, color: '#3B82F6' },
    { label: 'Extensions', value: metrics.extensions, icon: Puzzle, color: '#8B5CF6' },
    { label: 'Guides', value: metrics.guides, icon: BookOpen, color: '#06B6D4' },
    { label: 'Pending', value: metrics.pendingSubmissions, icon: Inbox, color: '#F59E0B' },
    { label: 'Notices', value: metrics.activeNotices, icon: Bell, color: '#10B981' },
    { label: 'Likes', value: metrics.totalLikes, icon: Heart, color: '#EF4444' },
  ];

  const actionColors: Record<string, string> = {
    create: '#10B981',
    update: '#3B82F6',
    delete: '#EF4444',
    approve: '#8B5CF6',
    reject: '#F59E0B',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif] mb-1" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Overview of your content and activity</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border p-4"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: card.color + '18' }}
                >
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {loading ? '…' : card.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Contribution Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Your Contributions */}
        <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Your Contributions</h2>
          </div>
          <div className="text-3xl font-bold mb-4" style={{ color: 'var(--brand)' }}>
            {loading ? '…' : contributionStats.totalActions}
          </div>
          <div className="space-y-2">
            {contributionStats.actionBreakdown.map(item => (
              <div key={item.action} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: actionColors[item.action] || 'var(--text-secondary)' }} />
                  <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{item.action}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{item.count}</span>
              </div>
            ))}
            {contributionStats.actionBreakdown.length === 0 && !loading && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No actions yet</p>
            )}
          </div>
        </div>

        {/* Top Contributors (Superadmin only) */}
        {isSuperAdmin && (
          <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Top Contributors</h2>
            </div>
            <div className="space-y-3">
              {contributionStats.topContributors && contributionStats.topContributors.length > 0 ? (
                contributionStats.topContributors.map((contributor, index) => (
                  <div key={contributor.admin_name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : index === 2 ? '#3B82F6' : 'var(--chip-bg)',
                          color: index < 3 ? 'white' : 'var(--text-secondary)'
                        }}
                      >
                        {index + 1}
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{contributor.admin_name}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{contributor.total_actions}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No contributions yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Admin Activity */}
      <div className="rounded-xl border p-5 mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {isSuperAdmin ? 'All Admin Activity' : 'Your Recent Activity'}
          </h2>
        </div>
        {contributionStats.recentLogs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No activity yet</p>
        ) : (
          <div className="space-y-3">
            {contributionStats.recentLogs.map(log => (
              <div key={log.id} className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full mt-1.5" style={{ background: actionColors[log.action] || 'var(--text-secondary)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="capitalize font-medium">{log.action}</span>
                      {' '}<span style={{ color: 'var(--text-secondary)' }}>{log.resource_type}</span>
                      {log.resource_name && (
                        <span> · <span className="font-medium">{log.resource_name}</span></span>
                      )}
                    </p>
                    {isSuperAdmin && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>by {log.admin_name}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Content Activity */}
      <div className="rounded-xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Recent Content Updates</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-medium">{item.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}> · {item.type}</span>
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(item.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
