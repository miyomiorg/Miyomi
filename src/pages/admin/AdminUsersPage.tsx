import React, { useEffect, useState } from 'react';
import { adminUsersApi, type AdminAccountRow } from '@/services/api';
import { Trash2, Users, UserPlus, Loader2, ShieldCheck, ShieldOff, Pencil, Crown, Shield, User, KeyRound } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminSelect, AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

/* ── Types ── */
type AdminWithRole = AdminAccountRow & { role?: string };
type Role = 'super_admin' | 'admin' | 'moderator';

/* ── Subcomponents ── */
const RESOURCES = [
  'apps', 'extensions', 'guides', 'blog_posts', 'faqs', 'contributors',
  'submissions', 'guide_submissions', 'edit_suggestions', 'reports',
  'feedbacks', 'notices', 'donations', 'themes'
];

function PermissionsPanel({
  perms,
  onChange
}: {
  perms: Record<string, { read: boolean; write: boolean; delete: boolean }>;
  onChange: (p: any) => void;
}) {
  const togglePerm = (resource: string, action: 'read' | 'write' | 'delete', val: boolean) => {
    if (action === 'delete' && val) {
      if (!window.confirm(`WARNING: Granting delete permission allows this moderator to permanently remove ${resource}. Are you absolutely sure?`)) {
        return;
      }
    }
    const current = perms[resource] || { read: true, write: false, delete: false };
    onChange({ ...perms, [resource]: { ...current, [action]: val } });
  };

  return (
    <div className="space-y-3 mt-4 border rounded-xl p-4 bg-[var(--bg-elev-1)] border-[var(--divider)]">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Moderator Permissions</h3>
      <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {RESOURCES.map(res => {
          const p = perms[res] || { read: true, write: false, delete: false };
          return (
            <div key={res} className="flex items-center justify-between py-2 border-b border-[var(--divider)] last:border-0">
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-32 truncate">{res.replace('_', ' ')}</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[var(--divider)] text-[var(--brand)] focus:ring-[var(--brand)]"
                    checked={p.read} onChange={e => togglePerm(res, 'read', e.target.checked)} />
                  Read
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[var(--divider)] text-[var(--brand)] focus:ring-[var(--brand)]"
                    checked={p.write} onChange={e => togglePerm(res, 'write', e.target.checked)} />
                  Write
                </label>
                <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-[var(--divider)] text-red-500 focus:ring-red-500"
                    checked={p.delete} onChange={e => togglePerm(res, 'delete', e.target.checked)} />
                  Delete
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Inline CSS for action buttons ── */
const btnBase: React.CSSProperties = { transition: 'all 0.2s ease' };

function useHoverStyle(
  defaultStyle: React.CSSProperties,
  hoverStyle: React.CSSProperties,
  pressStyle?: React.CSSProperties,
) {
  return {
    style: { ...btnBase, ...defaultStyle },
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, hoverStyle),
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, { ...btnBase, ...defaultStyle }),
    onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, pressStyle ?? { transform: 'translateY(0) scale(0.95)' }),
    onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => Object.assign(e.currentTarget.style, { transform: hoverStyle.transform ?? '' }),
  };
}

/* ── Role Badge ── */
function RoleBadge({ role }: { role?: string | null }) {
  if (!role) {
    return (
      <span
        className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
        style={{ background: 'color-mix(in srgb, #6B7280 15%, transparent)', color: '#6B7280' }}
      >
        <User className="w-3 h-3" />
        User
      </span>
    );
  }
  const isSuperAdmin = role === 'super_admin';
  const isModerator = role === 'moderator';
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
      style={{
        background: isSuperAdmin
          ? 'color-mix(in srgb, #8B5CF6 15%, transparent)'
          : isModerator
            ? 'color-mix(in srgb, #10B981 15%, transparent)'
            : 'color-mix(in srgb, #3B82F6 15%, transparent)',
        color: isSuperAdmin ? '#8B5CF6' : isModerator ? '#10B981' : '#3B82F6',
      }}
    >
      {isSuperAdmin ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
      {isSuperAdmin ? 'Super Admin' : isModerator ? 'Moderator' : 'Admin'}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  /* Create modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* Edit modal */
  const [editTarget, setEditTarget] = useState<AdminWithRole | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', role: 'admin' as Role, password: '' });
  const [editPerms, setEditPerms] = useState<Record<string, { read: boolean; write: boolean; delete: boolean }>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  /* Delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  /* Toggle loading */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  /* ── Fetch admins with roles ── */
  async function fetchData() {
    setLoading(true);
    try {
      const rows = await adminUsersApi.list();
      setAdmins(rows.map(r => ({ ...r, role: r.roles?.[0] ?? 'admin' })));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }

  /* ── Create admin ── */
  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      await adminUsersApi.create({
        email: form.email.trim(),
        password: form.password,
        displayName: form.display_name.trim() || undefined,
        role: form.role as Role,
      });
      toast.success(`Admin ${form.email} created`, { icon: <UserPlus className="w-4 h-4" /> });
      setModalOpen(false);
      setForm({ email: '', password: '', display_name: '', role: 'admin' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  }

  /* ── Open edit modal ── */
  function openEdit(admin: AdminWithRole) {
    setEditTarget(admin);
    setEditError('');
    setEditForm({
      display_name: admin.display_name || '',
      role: (admin.role as Role) || 'admin',
      password: '',
    });
    const perms: Record<string, { read: boolean; write: boolean; delete: boolean }> = {};
    (admin.permissions ?? []).forEach(p => {
      perms[p.resource] = { read: p.can_read, write: p.can_write, delete: p.can_delete };
    });
    setEditPerms(perms);
  }

  /* ── Save admin edits ── */
  async function handleEdit() {
    if (!editTarget) return;
    setEditSaving(true);
    setEditError('');
    try {
      const id = editTarget.id;

      if (editForm.role !== (editTarget.role || 'admin')) {
        await adminUsersApi.setRole(id, editForm.role);
      }

      if (editForm.role === 'moderator') {
        const permissions = Object.entries(editPerms).map(([resource, p]) => {
          const perm = p as { read: boolean; write: boolean; delete: boolean };
          return {
            resource,
            can_read: perm.read,
            can_write: perm.write,
            can_delete: perm.delete,
          };
        });
        await adminUsersApi.setPermissions(id, permissions);
      }

      if (editForm.display_name.trim() !== (editTarget.display_name || '')) {
        await adminUsersApi.updateProfile(id, editForm.display_name.trim() || null);
      }

      if (editForm.password) {
        await adminUsersApi.resetPassword(id, editForm.password);
      }

      toast.success(`Updated ${editTarget.email}`);
      setEditTarget(null);
      fetchData();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update admin');
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Toggle active ── */
  async function toggleActive(id: string, email: string, isActive: boolean) {
    setTogglingId(id);
    try {
      await adminUsersApi.setActive(id, !isActive);
      toast.success(`${email} ${isActive ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  /* ── Delete admin ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await adminUsersApi.remove(deleteTarget.id);
      toast.success(`Removed ${deleteTarget.email} from admins`, { icon: <Trash2 className="w-4 h-4" /> });
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove admin');
    }
  }

  /* ── Hover helpers ── */
  const toggleHover = (active: boolean) =>
    useHoverStyle(
      {
        borderColor: active ? 'color-mix(in srgb, #F59E0B 40%, var(--divider))' : 'color-mix(in srgb, #10B981 40%, var(--divider))',
        color: active ? '#F59E0B' : '#10B981',
        background: active ? 'color-mix(in srgb, #F59E0B 6%, transparent)' : 'color-mix(in srgb, #10B981 6%, transparent)',
      },
      {
        background: active ? 'color-mix(in srgb, #F59E0B 18%, transparent)' : 'color-mix(in srgb, #10B981 18%, transparent)',
        borderColor: active ? '#F59E0B' : '#10B981',
        transform: 'translateY(-1px)',
        boxShadow: active ? '0 4px 12px color-mix(in srgb, #F59E0B 20%, transparent)' : '0 4px 12px color-mix(in srgb, #10B981 20%, transparent)',
      },
    );

  const editHover = useHoverStyle(
    { color: 'var(--text-secondary)', background: 'transparent' },
    { color: '#3B82F6', background: 'color-mix(in srgb, #3B82F6 12%, transparent)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px color-mix(in srgb, #3B82F6 15%, transparent)' },
  );

  const deleteHover = useHoverStyle(
    { color: 'var(--text-secondary)', background: 'transparent' },
    { color: '#EF4444', background: 'color-mix(in srgb, #EF4444 12%, transparent)', transform: 'translateY(-1px)', boxShadow: '0 4px 12px color-mix(in srgb, #EF4444 15%, transparent)' },
  );

  /* ━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━ */
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Admin Users</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {admins.length} admin{admins.length !== 1 ? 's' : ''} • Manage roles and moderator permissions
          </p>
        </div>
        <AdminButton onClick={() => { setError(''); setModalOpen(true); }}>
          <UserPlus className="w-4 h-4" /> Add Admin
        </AdminButton>
      </div>

      {/* Admin Table */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : admins.length === 0 ? (
        <EmptyState icon={Users} title="No admins" description="Add your first admin user" />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elev-1)' }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => {
                  const tHover = toggleHover(admin.is_active);
                  return (
                    <tr key={admin.id} className="border-t transition-colors" style={{ borderColor: 'var(--divider)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{admin.email}</td>
                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{admin.display_name || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><RoleBadge role={admin.role} /></td>
                      <td className="px-4 py-3"><StatusBadge active={admin.is_active} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle */}
                          <button
                            onClick={() => toggleActive(admin.id, admin.email, admin.is_active)}
                            disabled={togglingId === admin.id}
                            className="px-3 py-1.5 text-xs rounded-lg border font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            {...tHover}
                          >
                            {togglingId === admin.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : admin.is_active ? (
                              <ShieldOff className="w-3.5 h-3.5" />
                            ) : (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            )}
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(admin)}
                            className="p-2 rounded-lg"
                            title={`Edit ${admin.email}`}
                            {...editHover}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget({ id: admin.id, email: admin.email })}
                            className="p-2 rounded-lg"
                            title={`Remove ${admin.email}`}
                            {...deleteHover}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Admin User">
        <div className="space-y-4">
          <AdminFormField label="Email" required>
            <AdminInput type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
          </AdminFormField>
          <AdminFormField label="Password" required>
            <AdminInput type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" />
          </AdminFormField>
          <AdminFormField label="Display Name">
            <AdminInput value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="John Doe" />
          </AdminFormField>
          <AdminFormField label="Role">
            <AdminSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </AdminSelect>
          </AdminFormField>
          {form.role === 'moderator' && (
            <div className="text-xs text-amber-500 mb-2">Note: Please create the user first, then edit them to configure their moderator permissions.</div>
          )}
          {error && (
            <div className="px-3 py-2.5 rounded-lg text-sm" style={{
              background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              color: 'var(--destructive)',
            }}>{error}</div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
            <AdminButton onClick={handleCreate} disabled={!form.email || !form.password || saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Admin'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* ── Edit Modal ── */}
      <AdminModal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Admin">
        <div className="space-y-4">
          {/* Email (read-only) */}
          <AdminFormField label="Email">
            <AdminInput value={editTarget?.email ?? ''} disabled className="opacity-60 cursor-not-allowed" />
          </AdminFormField>

          <AdminFormField label="Display Name">
            <AdminInput
              value={editForm.display_name}
              onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="John Doe"
            />
          </AdminFormField>

          <AdminFormField label="Role">
            <AdminSelect value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as Role }))}>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </AdminSelect>
          </AdminFormField>

          {editForm.role === 'moderator' && (
            <PermissionsPanel perms={editPerms} onChange={setEditPerms} />
          )}

          {/* Optional password reset */}
          <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: 'var(--divider)', background: 'var(--bg-elev-1)' }}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
              <span className="text-[10px] font-normal normal-case tracking-normal px-1.5 py-0.5 rounded-full"
                style={{ background: 'color-mix(in srgb, var(--text-secondary) 12%, transparent)' }}>
                Optional
              </span>
            </div>
            <AdminInput
              type="password"
              value={editForm.password}
              onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Leave empty to keep current password"
            />
          </div>

          {editError && (
            <div className="px-3 py-2.5 rounded-lg text-sm" style={{
              background: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              color: 'var(--destructive)',
            }}>{editError}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="secondary" onClick={() => setEditTarget(null)}>Cancel</AdminButton>
            <AdminButton onClick={handleEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save Changes'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* ── Delete Admin Confirm ── */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Remove Admin" message={`Remove ${deleteTarget?.email} from admin access? They will lose all admin privileges and be signed out everywhere.`}
        confirmLabel="Remove" />
    </div>
  );
}
