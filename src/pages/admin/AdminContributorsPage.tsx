import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Loader2, Pencil, Search, Users, ExternalLink } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminButton, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

type Contributor = {
  id: string;
  name: string;
  email: string | null;
  contact: string | null;
  contributions: { type: 'app' | 'extension'; id: string; name: string }[];
  created_at: string;
};

export function AdminContributorsPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  /* Edit modal */
  const [editTarget, setEditTarget] = useState<Contributor | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', contact: '' });
  const [editSaving, setEditSaving] = useState(false);

  /* Delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<Contributor | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contributors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContributors(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to fetch contributors');
    } finally {
      setLoading(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { error } = await (supabase as any).from('contributors').delete().eq('id', deleteTarget.id);
      if (error) throw error;

      toast.success(`Deleted contributor: ${deleteTarget.name}`);
      setContributors(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Failed to delete contributor');
    } finally {
      setDeleteLoading(false);
    }
  }

  /* ── Edit ── */
  function openEdit(c: Contributor) {
    setEditTarget(c);
    setEditForm({ name: c.name, email: c.email || '', contact: c.contact || '' });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setEditSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('contributors')
        .update({
          name: editForm.name,
          email: editForm.email || null,
          contact: editForm.contact || null
        })
        .eq('id', editTarget.id);

      if (error) throw error;

      toast.success('Contributor updated');
      setContributors(prev => prev.map(c => 
        c.id === editTarget.id 
          ? { ...c, name: editForm.name, email: editForm.email, contact: editForm.contact } 
          : c
      ));
      setEditTarget(null);
    } catch (err: any) {
      toast.error('Failed to update contributor');
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Search Filter ── */
  const filtered = contributors.filter(c => {
    const s = search.toLowerCase();
    return c.name?.toLowerCase().includes(s) || c.email?.toLowerCase().includes(s) || c.contact?.toLowerCase().includes(s);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-['Poppins',sans-serif]">Contributors</h1>
          <p className="text-[var(--text-secondary)] mt-1">Manage user profiles who submitted apps and extensions.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--divider)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by name, email, or contact..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
        </div>
        <div className="text-sm text-[var(--text-secondary)] flex items-center">
          {filtered.length} {filtered.length === 1 ? 'contributor' : 'contributors'} found
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--divider)] overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)] mb-4" />
            <p>Loading contributors...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contributors found"
            description={search ? `No results for "${search}"` : "Nobody has contributed yet."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-elev-1)] text-[var(--text-secondary)] border-b border-[var(--divider)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Contact</th>
                  <th className="px-6 py-4 font-medium">Contributions</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--divider)]">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-[var(--bg-elev-1)]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{c.name}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{c.email || '-'}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{c.contact || '-'}</td>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-[var(--brand)]/10 text-[var(--brand)] rounded-md font-semibold text-xs">
                          {c.contributions?.length || 0}
                        </span>
                        {/* Optionally list the first few contributions */}
                        {c.contributions && c.contributions.length > 0 && (
                          <div className="text-xs space-y-1">
                            {c.contributions.slice(0, 2).map((contrib, idx) => (
                              <div key={idx} className="opacity-70 truncate max-w-[150px]" title={contrib.name}>
                                {contrib.type === 'app' ? '📱' : '🧩'} {contrib.name}
                              </div>
                            ))}
                            {c.contributions.length > 2 && <div className="opacity-50">+ {c.contributions.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdminButton variant="secondary" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </AdminButton>
                        <AdminButton variant="destructive" onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="w-4 h-4" />
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AdminModal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Contributor">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <AdminFormField label="Display Name">
            <AdminInput
              value={editForm.name}
              onChange={(e: any) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Contributor Name"
            />
          </AdminFormField>
          
          <AdminFormField label="Email Address">
            <AdminInput
              type="email"
              value={editForm.email}
              onChange={(e: any) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Email"
            />
          </AdminFormField>

          <AdminFormField label="Contact Info (Discord, Twitter, etc)">
            <AdminInput
              value={editForm.contact}
              onChange={(e: any) => setEditForm({ ...editForm, contact: e.target.value })}
              placeholder="Contact (e.g. @username)"
            />
          </AdminFormField>

          <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-[var(--divider)]">
            <AdminButton type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</AdminButton>
            <AdminButton type="submit" variant="primary" disabled={editSaving}>
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Contributor"
        message={`Are you sure you want to delete ${deleteTarget?.name}? Their contributions array will be lost (but the actual apps/extensions will remain live).`}
        confirmLabel="Delete Contributor"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        destructive={true}
      />
    </div>
  );
}
