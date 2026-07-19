import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Trash2, Users, UserPlus, Loader2, ShieldCheck, ShieldOff, CheckCircle2, Pencil, KeyRound, Crown, Shield, ChevronUp, ChevronDown, UserX, User, Search, Globe, Mail } from 'lucide-react';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminSelect, AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

/* ── Types ── */
type AdminWithRole = Tables<'admins'> & { role?: string };

type AuthUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_admin: boolean;
  admin_display_name: string | null;
  admin_is_active: boolean | null;
};

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
        style={{
          background: 'color-mix(in srgb, #6B7280 15%, transparent)',
          color: '#6B7280',
        }}
      >
        <User className="w-3 h-3" />
        User
      </span>
    );
  }
  const isSuperAdmin = role === 'super_admin';
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5"
      style={{
        background: isSuperAdmin
          ? 'color-mix(in srgb, #8B5CF6 15%, transparent)'
          : 'color-mix(in srgb, #3B82F6 15%, transparent)',
        color: isSuperAdmin ? '#8B5CF6' : '#3B82F6',
      }}
    >
      {isSuperAdmin ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
      {isSuperAdmin ? 'Super Admin' : 'Admin'}
    </span>
  );
}

/* ── Provider Badge ── */
function ProviderBadge({ provider }: { provider: string }) {
  const isOAuth = provider !== 'email';
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 uppercase tracking-wider"
      style={{
        background: isOAuth
          ? 'color-mix(in srgb, #F59E0B 12%, transparent)'
          : 'color-mix(in srgb, #6B7280 12%, transparent)',
        color: isOAuth ? '#F59E0B' : '#6B7280',
      }}
    >
      {isOAuth ? <Globe className="w-2.5 h-2.5" /> : <Mail className="w-2.5 h-2.5" />}
      {provider}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  /* All Users state */
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  /* Create modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'admin' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* Edit modal */
  const [editTarget, setEditTarget] = useState<AdminWithRole | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', role: 'admin', password: '' });
  const [editPerms, setEditPerms] = useState<Record<string, { read: boolean; write: boolean; delete: boolean }>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  /* Delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  /* Toggle loading */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  /* User actions loading */
  const [userActionId, setUserActionId] = useState<string | null>(null);

  /* Promote modal */
  const [promoteTarget, setPromoteTarget] = useState<AuthUser | null>(null);
  const [promoteRole, setPromoteRole] = useState('admin');
  const [promotePerms, setPromotePerms] = useState<Record<string, { read: boolean; write: boolean; delete: boolean }>>({});
  const [promoteSaving, setPromoteSaving] = useState(false);

  /* Delete user confirm */
  const [deleteUserTarget, setDeleteUserTarget] = useState<AuthUser | null>(null);

  /* Demote confirm */
  const [demoteTarget, setDemoteTarget] = useState<AuthUser | null>(null);

  useEffect(() => { fetchData(); fetchUsers(); }, []);

  /* ── Fetch admins with roles ── */
  async function fetchData() {
    const { data: adminRows } = await supabase.from('admins').select('*').order('email');
    if (!adminRows) { setAdmins([]); setLoading(false); return; }

    const userIds = adminRows.filter(a => a.user_id).map(a => a.user_id!);
    let roleMap: Record<string, string> = {};
    if (userIds.length) {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      if (roles) {
        roleMap = Object.fromEntries(roles.map(r => [r.user_id, r.role]));
      }
    }

    const merged: AdminWithRole[] = adminRows.map(a => ({
      ...a,
      role: a.user_id ? roleMap[a.user_id] ?? 'admin' : 'admin',
    }));
    setAdmins(merged);
    setLoading(false);
  }

  /* ── Fetch all auth users ── */
  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list_users', per_page: 100 },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setAllUsers(data.users || []);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      toast.error('Failed to fetch users');
    } finally {
      setUsersLoading(false);
    }
  }

  /* ── Toggle active ── */
  async function toggleActive(id: string, email: string, active: boolean) {
    setTogglingId(id);
    try {
      const { error: err } = await supabase.from('admins').update({ is_active: !active }).eq('id', id);
      if (err) throw err;
      toast.success(
        !active ? `${email} activated` : `${email} deactivated`,
        { icon: !active ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" /> }
      );
      fetchData();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  }

  /* ── Create admin ── */
  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'create', email: form.email, password: form.password, display_name: form.display_name || null, role: form.role },
      });
      if (fnError) throw fnError;
      
      setModalOpen(false);
      setForm({ email: '', password: '', display_name: '', role: 'admin' });
      toast.success(`Admin "${form.email}" created successfully!`, { icon: <CheckCircle2 className="w-4 h-4" /> });
      fetchData();
      fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to create admin';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  /* ── Edit admin ── */
  async function openEdit(admin: AdminWithRole) {
    setEditTarget(admin);
    setEditForm({
      display_name: admin.display_name || '',
      role: admin.role || 'admin',
      password: '',
    });
    setEditError('');

    if (admin.role === 'moderator' && admin.user_id) {
      try {
        const { data } = await (supabase as any).from('moderator_permissions').select('*').eq('user_id', admin.user_id);
        if (data) {
          const perms: any = {};
          data.forEach(d => {
            perms[d.resource] = { read: d.can_read, write: d.can_write, delete: d.can_delete };
          });
          setEditPerms(perms);
        }
      } catch (e) {
        console.error('Failed to load perms', e);
      }
    } else {
      setEditPerms({});
    }
  }

  async function handleEdit() {
    if (!editTarget?.user_id) return;
    setEditSaving(true);
    setEditError('');
    try {
      const body: Record<string, any> = {
        action: 'update',
        user_id: editTarget.user_id,
        display_name: editForm.display_name,
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        if (editForm.password.length < 6) {
          setEditError('Password must be at least 6 characters');
          setEditSaving(false);
          return;
        }
        body.password = editForm.password;
      }
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', { body });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (editForm.role === 'moderator') {
        const updates = Object.entries(editPerms).map(([res, p]: [string, any]) => ({
          user_id: editTarget.user_id,
          resource: res,
          can_read: p.read,
          can_write: p.write,
          can_delete: p.delete,
        }));
        if (updates.length > 0) {
          await (supabase as any).from('moderator_permissions').upsert(updates, { onConflict: 'user_id,resource' });
        }
      }

      setEditTarget(null);
      toast.success(`Admin "${editTarget.email}" updated`, { icon: <Pencil className="w-4 h-4" /> });
      fetchData();
      fetchUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to update admin';
      setEditError(msg);
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Delete admin ── */
  async function handleDelete() {
    if (!deleteTarget) return;
    const email = deleteTarget.email;
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'delete', email },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast.success(`Admin "${email}" removed`, { icon: <Trash2 className="w-4 h-4" /> });
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove admin');
    }
    setDeleteTarget(null);
    fetchData();
    fetchUsers();
  }

  /* ── Promote user to admin ── */
  async function handlePromote() {
    if (!promoteTarget) return;
    setPromoteSaving(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'promote', user_id: promoteTarget.id, role: promoteRole },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (promoteRole === 'moderator') {
        const updates = Object.entries(promotePerms).map(([res, p]: [string, any]) => ({
          user_id: promoteTarget.id,
          resource: res,
          can_read: p.read,
          can_write: p.write,
          can_delete: p.delete,
        }));
        if (updates.length > 0) {
          await (supabase as any).from('moderator_permissions').upsert(updates, { onConflict: 'user_id,resource' });
        }
      }

      toast.success(`${promoteTarget.email} promoted to ${promoteRole}`, {
        icon: <ChevronUp className="w-4 h-4" />,
      });
      setPromoteTarget(null);
      setPromoteRole('admin');
      fetchData();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to promote user');
    } finally {
      setPromoteSaving(false);
    }
  }

  /* ── Demote user ── */
  async function handleDemote() {
    if (!demoteTarget) return;
    setUserActionId(demoteTarget.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'demote', user_id: demoteTarget.id },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast.success(`${demoteTarget.email} demoted to user`, { icon: <ChevronDown className="w-4 h-4" /> });
      fetchData();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to demote user');
    } finally {
      setUserActionId(null);
      setDemoteTarget(null);
    }
  }

  /* ── Delete user from auth ── */
  async function handleDeleteUser() {
    if (!deleteUserTarget) return;
    setUserActionId(deleteUserTarget.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'delete_user', user_id: deleteUserTarget.id },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      toast.success(`${deleteUserTarget.email} deleted permanently`, { icon: <UserX className="w-4 h-4" /> });
      fetchData();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setUserActionId(null);
      setDeleteUserTarget(null);
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

  const promoteHover = useHoverStyle(
    { color: '#10B981', background: 'color-mix(in srgb, #10B981 6%, transparent)', borderColor: 'color-mix(in srgb, #10B981 40%, var(--divider))' },
    { color: '#10B981', background: 'color-mix(in srgb, #10B981 18%, transparent)', borderColor: '#10B981', transform: 'translateY(-1px)', boxShadow: '0 4px 12px color-mix(in srgb, #10B981 20%, transparent)' },
  );

  const demoteHover = useHoverStyle(
    { color: '#F59E0B', background: 'color-mix(in srgb, #F59E0B 6%, transparent)', borderColor: 'color-mix(in srgb, #F59E0B 40%, var(--divider))' },
    { color: '#F59E0B', background: 'color-mix(in srgb, #F59E0B 18%, transparent)', borderColor: '#F59E0B', transform: 'translateY(-1px)', boxShadow: '0 4px 12px color-mix(in srgb, #F59E0B 20%, transparent)' },
  );

  /* ── Filtered users ── */
  const filteredUsers = allUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.provider?.toLowerCase().includes(q) ||
      (u.role || 'user').toLowerCase().includes(q)
    );
  });

  /* ━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━ */
  return (
    <div>
      {/* ═══════════════════════════════════════ ADMIN MANAGEMENT ═══════════════════════════════════════ */}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Admin Users</h1>
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

      {/* ═══════════════════════════════════════ ALL USERS ═══════════════════════════════════════ */}
      <div className="mt-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
              All Users
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {allUsers.length} registered user{allUsers.length !== 1 ? 's' : ''} • Promote, demote, or remove users
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border outline-none transition-all focus:ring-2"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--divider)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {usersLoading ? (
          <div className="text-center py-12 flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Loading users…
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description={userSearch ? 'Try a different search' : 'No registered users'} />
        ) : (
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-elev-1)' }}>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>User</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Provider</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Role</th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Last Sign In</th>
                    <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const isActioning = userActionId === user.id;
                    return (
                      <tr
                        key={user.id}
                        className="border-t transition-colors"
                        style={{ borderColor: 'var(--divider)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev-1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        {/* User info */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                style={{ border: '2px solid var(--divider)' }}
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                  background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                  color: 'var(--accent)',
                                }}
                              >
                                {(user.email || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {user.full_name || user.admin_display_name || user.email}
                              </div>
                              {(user.full_name || user.admin_display_name) && (
                                <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                  {user.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <ProviderBadge provider={user.provider} />
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Last sign in */}
                        <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : 'Never'}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isActioning ? (
                              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-secondary)' }} />
                            ) : (
                              <>
                                {/* Promote / Demote */}
                                {!user.role ? (
                                  <button
                                    onClick={() => { setPromoteTarget(user); setPromoteRole('admin'); }}
                                    className="px-3 py-1.5 text-xs rounded-lg border font-semibold inline-flex items-center gap-1.5"
                                    title="Promote to Admin"
                                    {...promoteHover}
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                    Promote
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setDemoteTarget(user)}
                                    className="px-3 py-1.5 text-xs rounded-lg border font-semibold inline-flex items-center gap-1.5"
                                    title="Demote to User"
                                    {...demoteHover}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                    Demote
                                  </button>
                                )}

                                {/* Delete user */}
                                <button
                                  onClick={() => setDeleteUserTarget(user)}
                                  className="p-2 rounded-lg"
                                  title={`Delete ${user.email}`}
                                  {...deleteHover}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
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
      </div>

      {/* ── Create Modal ── */}
      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Admin User">
        <div className="space-y-4">
          <AdminFormField label="Email" required>
            <AdminInput type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
          </AdminFormField>
          <AdminFormField label="Password" required>
            <AdminInput type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 characters" />
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
            <AdminSelect value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
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

      {/* ── Promote Modal ── */}
      <AdminModal open={!!promoteTarget} onClose={() => setPromoteTarget(null)} title="Promote User to Admin">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-elev-1)' }}>
            {promoteTarget?.avatar_url ? (
              <img src={promoteTarget.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: '2px solid var(--divider)' }} />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                {(promoteTarget?.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {promoteTarget?.full_name || promoteTarget?.email}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {promoteTarget?.email}
              </div>
            </div>
          </div>

          <AdminFormField label="Assign Role">
            <AdminSelect value={promoteRole} onChange={e => setPromoteRole(e.target.value)}>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </AdminSelect>
          </AdminFormField>

          {promoteRole === 'moderator' && (
            <PermissionsPanel perms={promotePerms} onChange={setPromotePerms} />
          )}

          <div className="px-3 py-2.5 rounded-lg text-sm" style={{
            background: 'color-mix(in srgb, #10B981 10%, transparent)',
            color: '#10B981',
          }}>
            This will give the user admin access to the dashboard.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <AdminButton variant="secondary" onClick={() => setPromoteTarget(null)}>Cancel</AdminButton>
            <AdminButton onClick={handlePromote} disabled={promoteSaving}>
              {promoteSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Promoting…</> : 'Promote User'}
            </AdminButton>
          </div>
        </div>
      </AdminModal>

      {/* ── Delete Admin Confirm ── */}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Remove Admin" message={`Remove ${deleteTarget?.email} from admin access? Their auth account will remain but they'll lose admin privileges.`}
        confirmLabel="Remove" />

      {/* ── Demote Confirm ── */}
      <ConfirmDialog open={!!demoteTarget} onClose={() => setDemoteTarget(null)} onConfirm={handleDemote}
        title="Demote to User" message={`Remove admin privileges from ${demoteTarget?.email}? They will lose all admin access.`}
        confirmLabel="Demote" />

      {/* ── Delete User Confirm ── */}
      <ConfirmDialog open={!!deleteUserTarget} onClose={() => setDeleteUserTarget(null)} onConfirm={handleDeleteUser}
        title="Delete User Permanently" message={`Permanently delete ${deleteUserTarget?.email}? This will remove them from the authentication system entirely. This cannot be undone.`}
        confirmLabel="Delete Permanently" />
    </div>
  );
}
