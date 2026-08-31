import { useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Plus, Pencil, Trash2, AppWindow } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { useAdminCache } from '@/hooks/useAdminCache';
import { useAdmin } from '@/hooks/useAdmin';

export function AdminAppsPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAdmin();
  const { data: apps, loading, invalidateCache, updateCacheOptimistically } = useAdminCache<Tables<'apps'>>({
    table: 'apps',
    orderBy: 'name'
  });
  const [search, setSearch] = useState(() => sessionStorage.getItem('admin_apps_search') || '');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState(() => sessionStorage.getItem('admin_apps_status') || 'all');

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    sessionStorage.setItem('admin_apps_status', val);
  };

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    apps.forEach(a => { if (a.status) statuses.add(a.status); });
    return Array.from(statuses).sort();
  }, [apps]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: apps.length };
    apps.forEach(a => {
      const s = a.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [apps]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    sessionStorage.setItem('admin_apps_search', val);
  };

  const filtered = useMemo(() =>
    apps
      .filter(a => statusFilter === 'all' || (a.status || 'pending') === statusFilter)
      .filter(a => (a.name || '').toLowerCase().includes(search.toLowerCase()) || (a.author || '').toLowerCase().includes(search.toLowerCase()))
      .slice()
      .sort((a, b) => (a.name || '').trim().localeCompare((b.name || '').trim(), undefined, { sensitivity: 'base' })),
    [apps, search, statusFilter]
  );

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Apps</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage and organize your apps catalog
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <AdminSearchBar value={search} onChange={handleSearchChange} placeholder="Search apps…" />
            {hasPermission('apps', 'write') && (
              <AdminButton onClick={() => navigate('/admin/apps/new')}>
                <Plus className="w-4 h-4" /> Add
              </AdminButton>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        {statusOptions.length > 1 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <Filter className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            {['all', ...statusOptions].map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: statusFilter === status ? 'var(--brand)' : 'var(--bg-elev-1)',
                  color: statusFilter === status ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${statusFilter === status ? 'var(--brand)' : 'var(--divider)'}`,
                }}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="ml-1.5 opacity-70">{statusCounts[status] || 0}</span>
              </button>
            ))}
          </div>
        )}


      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="border rounded-lg p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title="No apps found"
          description={search ? "Try a different search term" : "Add your first app to get started"}
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-surface)", borderColor: "var(--divider)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-elev-1)" }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-12" style={{ color: "var(--text-secondary)" }}>#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>Author</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: "var(--text-secondary)" }}>Platforms</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => (
                  <tr
                    key={app.id}
                    className="border-t transition-colors cursor-pointer"
                    style={{ borderColor: "var(--divider)" }}
                    onClick={() => navigate(`/admin/apps/${app.id}/edit`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elev-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-secondary)] text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {app.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {app.author || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge status={app.status || "pending"} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {(app.platforms || []).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission('apps', 'write') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/apps/${app.id}/edit`);
                            }}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('apps', 'delete') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: app.id, name: app.name });
                            }}
                            className="p-2 rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                            style={{ color: "var(--text-secondary)" }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;

          // Optimistic update - remove from UI immediately
          const prevApps = [...apps];
          updateCacheOptimistically((prev) => prev.filter((a) => a.id !== deleteTarget.id));
          setDeleteTarget(null);

          const { error } = await supabase.from("apps").delete().eq("id", deleteTarget.id);

          if (error) {
            // Revert on error
            updateCacheOptimistically(() => prevApps);
            toast.error("Failed to delete app");
          } else {
            toast.success("App deleted");
            // Invalidate cache to ensure consistency
            invalidateCache();
          }
        }}
        title="Delete App"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
}
