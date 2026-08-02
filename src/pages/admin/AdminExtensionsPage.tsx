import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Plus, Pencil, Trash2, Puzzle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { useAdminCache } from '@/hooks/useAdminCache';

export function AdminExtensionsPage() {
  const navigate = useNavigate();
  const { data: extensions, loading, invalidateCache, updateCacheOptimistically } = useAdminCache<Tables<'extensions'>>({
    table: 'extensions',
    orderBy: 'name'
  });
  const [search, setSearch] = useState(() => sessionStorage.getItem('admin_extensions_search') || '');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    sessionStorage.setItem('admin_extensions_search', val);
  };

  const filtered = useMemo(() =>
    extensions.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || (e.author || '').toLowerCase().includes(search.toLowerCase())),
    [extensions, search]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Extensions</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AdminSearchBar value={search} onChange={handleSearchChange} placeholder="Search extensions…" />
          <AdminButton onClick={() => navigate('/admin/extensions/new')}><Plus className="w-4 h-4" /> Add</AdminButton>
        </div>
      </div>


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
          icon={Puzzle}
          title="No extensions found"
          description={search ? "Try a different search term" : "Add your first extension"}
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-surface)", borderColor: "var(--divider)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-elev-1)" }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-12" style={{ color: "var(--text-secondary)" }}>#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>Language</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ext, i) => (
                  <tr
                    key={ext.id}
                    className="border-t transition-colors cursor-pointer"
                    style={{ borderColor: "var(--divider)" }}
                    onClick={() => navigate(`/admin/extensions/${ext.id}/edit`)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elev-1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-secondary)] text-xs">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>
                      {ext.name}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>
                      {ext.language || "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge status={ext.status || "pending"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/extensions/${ext.id}/edit`);
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: ext.id, name: ext.name });
                          }}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

          // Optimistic update
          const prevExtensions = [...extensions];
          updateCacheOptimistically((prev) => prev.filter((e) => e.id !== deleteTarget.id));
          setDeleteTarget(null);

          const { error } = await supabase.from("extensions").delete().eq("id", deleteTarget.id);

          if (error) {
            // Revert on error
            updateCacheOptimistically(() => prevExtensions);
            toast.error("Failed to delete extension");
          } else {
            toast.success("Extension deleted");
            invalidateCache();
          }
        }}
        title="Delete Extension"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
