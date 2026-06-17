import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { useAdminCache } from '@/hooks/useAdminCache';
import type { Tables } from '@/integrations/supabase/types';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

export function AdminBlogPostsPage() {
  const { logAction } = useAdminLogger();
  const { data: blogPosts, loading, invalidateCache } = useAdminCache<any>({ table: 'blog_posts' as any, orderBy: 'created_at' });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    if (!blogPosts) return [];
    return blogPosts.filter(b => b.title?.toLowerCase().includes(search.toLowerCase()) || b.slug?.toLowerCase().includes(search.toLowerCase()));
  }, [blogPosts, search]);

  function openCreate() {
    navigate('/admin/blog-posts/new');
  }

  function openEdit(b: any) {
    navigate(`/admin/blog-posts/${b.id}/edit`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.from('blog_posts').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      await logAction('delete', 'blog_post' as any, deleteTarget.id, deleteTarget.title).catch(err => {
        console.error('Failed to log delete action:', err);
      });

      setDeleteTarget(null);
      invalidateCache();
    } catch (err: any) {
      console.error('Delete failed', err);
      toast.error('Failed to delete post: ' + err.message);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Blog Posts</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search posts…" />
          <AdminButton onClick={openCreate}><Plus className="w-4 h-4" /> Add Post</AdminButton>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border rounded-xl overflow-hidden" style={{ borderColor: 'var(--divider)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--chip-bg)] text-[var(--text-secondary)] border-b" style={{ borderColor: 'var(--divider)' }}>
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Title</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Category</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--divider)' }}>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--text-secondary)]">Loading posts...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12">
                    <EmptyState
                      icon={FileText}
                      title="No blog posts found"
                      description="Get started by creating a new blog post."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-[var(--chip-bg)] transition-colors text-[var(--text-primary)]">
                    <td className="px-6 py-4 font-medium">{b.title} {b.is_pinned && '📌'}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{b.category}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => openEdit(b)} className="p-2 hover:bg-[var(--bg-elev-1)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget({ id: b.id, title: b.title })} className="p-2 hover:bg-[var(--bg-elev-1)] rounded-lg text-[var(--text-secondary)] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Blog Post"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive={true}
      />
    </div>
  );
}
