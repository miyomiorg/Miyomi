import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminFaqsApi } from '@/services/api';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { useAdminCache } from '@/hooks/useAdminCache';
import type { Tables } from '@/types/db';
import { Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminButton, EmptyState } from '@/components/admin/AdminFormElements';

export function AdminFAQsPage() {
  const navigate = useNavigate();
  const { logAction } = useAdminLogger();
  const { data: faqs, loading, invalidateCache } = useAdminCache<Tables<'faqs'>>({ table: 'faqs', orderBy: 'order_index' });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() =>
    faqs.filter(f => f.question.toLowerCase().includes(search.toLowerCase())),
    [faqs, search]
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
    await adminFaqsApi.remove(deleteTarget.id);

    await logAction('delete', 'faq', deleteTarget.id, deleteTarget.name).catch(err => {
      console.error('Failed to log delete action:', err);
    });

    setDeleteTarget(null); await invalidateCache();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete FAQ');
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>FAQs</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search FAQs…" />
          <AdminButton onClick={() => navigate('/admin/faqs/new')}><Plus className="w-4 h-4" /> Add</AdminButton>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs found" description={search ? 'Try a different search term' : 'Add your first FAQ'} />
      ) : (
        <div className="space-y-3">
          {filtered.map((faq, i) => (
            <div key={faq.id} className="rounded-xl border p-4 flex items-start gap-4 transition-colors cursor-pointer"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
              onClick={() => navigate(`/admin/faqs/${faq.id}/edit`)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev-1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                style={{ background: 'var(--chip-bg)', color: 'var(--brand)' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{faq.question}</h3>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{faq.answer}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/faqs/${faq.id}/edit`);
                }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ id: faq.id, name: faq.question });
                }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete FAQ" message={`Are you sure you want to delete this FAQ?`} />
    </div>
  );
}
