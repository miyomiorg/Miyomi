import { useEffect, useState, useMemo } from 'react';
import { adminNoticesApi } from '@/services/api';
import type { Tables } from '@/types/db';
import { Plus, Pencil, Trash2, Bell, CalendarDays } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { normalizeNoticeType, noticeTypeOptions, noticeTypeStyles } from '@/components/noticeTypes';

const emptyNotice = { title: '', message: '', type: 'info', active: true, dismissible: true, priority: 0, start_date: '', end_date: '' };

function noticeTimestamp(notice: Tables<'notices'>) {
  const time = new Date(notice.created_at).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatNoticeDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function AdminNoticesPage() {
  const [notices, setNotices] = useState<Tables<'notices'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyNotice);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setNotices(await adminNoticesApi.list());
    } catch (error) {
      console.error('Failed to load notices:', error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() =>
    notices
      .filter(n => n.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => noticeTimestamp(b) - noticeTimestamp(a)),
    [notices, search]
  );

  function openCreate() { setForm(emptyNotice); setEditingId(null); setModalOpen(true); }

  function openEdit(n: Tables<'notices'>) {
    setForm({
      title: n.title, message: n.message, type: normalizeNoticeType(n.type), active: n.active,
      dismissible: n.dismissible, priority: n.priority,
      start_date: n.start_date || '', end_date: n.end_date || '',
    });
    setEditingId(n.id);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      title: form.title, message: form.message, type: form.type, active: form.active,
      dismissible: form.dismissible, priority: form.priority,
      startDate: form.start_date || null, endDate: form.end_date || null,
    };
    if (editingId) {
      await adminNoticesApi.update(editingId, payload);
    } else {
      await adminNoticesApi.create(payload);
    }
    setSaving(false); setModalOpen(false); fetchData();
  }

  async function toggleActive(id: string, active: boolean) {
    await adminNoticesApi.update(id, { active: !active });
    fetchData();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await adminNoticesApi.remove(deleteTarget.id);
    setDeleteTarget(null); fetchData();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Notices</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search notices…" />
          <AdminButton onClick={openCreate}><Plus className="w-4 h-4" /> Add</AdminButton>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="No notices found" description={search ? 'Try a different search term' : 'Create your first notice'} />
      ) : (
        <div className="space-y-3">
          {filtered.map(notice => {
            const type = normalizeNoticeType(notice.type);
            const config = noticeTypeStyles[type];
            const Icon = config.icon;
            return (
              <div key={notice.id} data-notice-type={type} className="rounded-xl border p-4 flex items-start gap-4 transition-colors cursor-pointer"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
                onClick={() => openEdit(notice)}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev-1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
              >
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${config.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{notice.title}</h3>
                    <StatusBadge active={notice.active} />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{notice.message}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <CalendarDays className="h-3.5 w-3.5" />
                    Published {formatNoticeDate(notice.start_date || notice.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    toggleActive(notice.id, notice.active);
                  }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors"
                    style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
                  >
                    {notice.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    openEdit(notice);
                  }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: notice.id, name: notice.title });
                  }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Notice' : 'Add Notice'}>
        <div className="space-y-4">
          <AdminFormField label="Title" required>
            <AdminInput value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Notice title" />
          </AdminFormField>
          <AdminFormField label="Message" required>
            <AdminTextarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Notice message…" />
          </AdminFormField>
          <div className="grid grid-cols-2 gap-4">
            <AdminFormField label="Type">
              <AdminSelect value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {noticeTypeOptions.map(type => (
                  <option key={type} value={type}>{noticeTypeStyles[type].label}</option>
                ))}
              </AdminSelect>
            </AdminFormField>
            <AdminFormField label="Priority">
              <AdminInput type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
            </AdminFormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AdminFormField label="Start Date">
              <AdminInput type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </AdminFormField>
            <AdminFormField label="End Date">
              <AdminInput type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </AdminFormField>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.dismissible} onChange={e => setForm(f => ({ ...f, dismissible: e.target.checked }))} className="rounded" />
              Dismissible
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleSave} disabled={!form.title || !form.message || saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</AdminButton>
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Notice" message={`Are you sure you want to delete "${deleteTarget?.name}"?`} />
    </div>
  );
}
