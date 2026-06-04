import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Layers, Plus, Trash2, Edit2, Save, X, Puzzle, Package } from 'lucide-react';
import { AdminButton, EmptyState, Label } from '@/components/admin/AdminFormElements';
import { AdminInput, AdminTextarea } from '@/components/admin/AdminFormElements';
import { AdminSmartSelect } from '@/components/admin/AdminSmartSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface CompatGroup {
    id: string;
    name: string;
    description: string;
    color: string;
    icon_url: string;
    created_at: string;
    app_count?: number;
    ext_count?: number;
}

interface GroupFormState {
    name: string;
    description: string;
    color: string;
    icon_url: string;
    app_ids: string[];
    ext_ids: string[];
}

const emptyForm: GroupFormState = {
    name: '', description: '', color: '#6366F1', icon_url: '',
    app_ids: [], ext_ids: []
};

export function AdminCompatGroupsPage() {
    const { logAction } = useAdminLogger();
    const [groups, setGroups] = useState<CompatGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null); // null = creating new
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<GroupFormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

    // Options for smart selects
    const [appOptions, setAppOptions] = useState<{ value: string; label: string }[]>([]);
    const [extOptions, setExtOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);

        // Fetch groups
        const { data: groupsData, error } = await (supabase as any)
            .from('compatibility_groups')
            .select('*')
            .order('name');
        if (error) { toast.error('Failed to load groups'); setLoading(false); return; }

        // Fetch membership counts
        const { data: appMemberships } = await (supabase as any).from('app_group_memberships').select('group_id');
        const { data: extMemberships } = await (supabase as any).from('extension_group_memberships').select('group_id');

        const appCounts: Record<string, number> = {};
        const extCounts: Record<string, number> = {};
        (appMemberships || []).forEach((m: any) => { appCounts[m.group_id] = (appCounts[m.group_id] || 0) + 1; });
        (extMemberships || []).forEach((m: any) => { extCounts[m.group_id] = (extCounts[m.group_id] || 0) + 1; });

        const enriched = (groupsData || []).map((g: any) => ({
            ...g,
            app_count: appCounts[g.id] || 0,
            ext_count: extCounts[g.id] || 0,
        }));
        setGroups(enriched);

        // Fetch app and extension options
        const { data: apps } = await (supabase as any).from('apps').select('id, name').order('name');
        const { data: exts } = await (supabase as any).from('extensions').select('id, name').order('name');

        setAppOptions((apps || []).map((a: any) => ({ value: a.id, label: a.name })));
        setExtOptions((exts || []).map((e: any) => ({ value: e.id, label: e.name })));

        setLoading(false);
    }

    async function openEditForm(groupId: string) {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;

        // Fetch current memberships
        const [{ data: appMems }, { data: extMems }] = await Promise.all([
            (supabase as any).from('app_group_memberships').select('app_id').eq('group_id', groupId),
            (supabase as any).from('extension_group_memberships').select('extension_id').eq('group_id', groupId),
        ]);

        setForm({
            name: group.name,
            description: group.description || '',
            color: group.color || '#6366F1',
            icon_url: group.icon_url || '',
            app_ids: (appMems || []).map((m: any) => m.app_id),
            ext_ids: (extMems || []).map((m: any) => m.extension_id),
        });
        setEditingId(groupId);
        setShowForm(true);
    }

    function openCreateForm() {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(true);
    }

    async function handleSave() {
        if (!form.name.trim()) {
            toast.error('Group name is required');
            return;
        }

        setSaving(true);
        try {
            let groupId = editingId;

            if (editingId) {
                // Update group
                const { error } = await (supabase as any)
                    .from('compatibility_groups')
                    .update({ name: form.name, description: form.description, color: form.color, icon_url: form.icon_url })
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create group
                const { data, error } = await (supabase as any)
                    .from('compatibility_groups')
                    .insert({ name: form.name, description: form.description, color: form.color, icon_url: form.icon_url })
                    .select('id')
                    .single();
                if (error) throw error;
                groupId = data.id;
            }

            // Update app memberships
            await (supabase as any).from('app_group_memberships').delete().eq('group_id', groupId);
            if (form.app_ids.length > 0) {
                await (supabase as any).from('app_group_memberships').insert(
                    form.app_ids.map(aid => ({ app_id: aid, group_id: groupId }))
                );
            }

            // Update extension memberships
            await (supabase as any).from('extension_group_memberships').delete().eq('group_id', groupId);
            if (form.ext_ids.length > 0) {
                await (supabase as any).from('extension_group_memberships').insert(
                    form.ext_ids.map(eid => ({ extension_id: eid, group_id: groupId }))
                );
            }

            // Sync compatible_with arrays bidirectionally
            // For each app in the group, update their compatible_with to include all extensions in the group
            if (form.app_ids.length > 0 && form.ext_ids.length > 0) {
                const extNames = extOptions.filter(e => form.ext_ids.includes(e.value)).map(e => e.label);
                const appNames = appOptions.filter(a => form.app_ids.includes(a.value)).map(a => a.label);

                // Update each app's compatible_with
                for (const appId of form.app_ids) {
                    const { data: appData } = await (supabase as any).from('apps').select('compatible_with').eq('id', appId).single();
                    const currentCompat: string[] = appData?.compatible_with || [];
                    const merged = [...new Set([...currentCompat, ...extNames])];
                    await (supabase as any).from('apps').update({ compatible_with: merged }).eq('id', appId);
                }

                // Update each extension's compatible_with
                for (const extId of form.ext_ids) {
                    const { data: extData } = await (supabase as any).from('extensions').select('compatible_with').eq('id', extId).single();
                    const currentCompat: string[] = extData?.compatible_with || [];
                    const merged = [...new Set([...currentCompat, ...appNames])];
                    await (supabase as any).from('extensions').update({ compatible_with: merged }).eq('id', extId);
                }
            }

            await logAction(editingId ? 'update' as any : 'create' as any, 'app' as any, groupId, `${editingId ? 'Updated' : 'Created'} compatibility group: ${form.name}`);
            toast.success(editingId ? 'Group updated!' : 'Group created!');
            setShowForm(false);
            fetchData();
        } catch (err: any) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            const group = groups.find(g => g.id === deleteTarget);
            const { error } = await (supabase as any).from('compatibility_groups').delete().eq('id', deleteTarget);
            if (error) throw error;
            await logAction('delete' as any, 'app' as any, deleteTarget, `Deleted compatibility group: ${group?.name}`);
            toast.success('Group deleted');
            fetchData();
        } catch (err: any) {
            toast.error('Failed to delete: ' + err.message);
        } finally {
            setDeleteTarget(null);
        }
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">Compatibility Groups</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Manage app–extension compatibility through group tags.</p>
                </div>
                <AdminButton onClick={openCreateForm}>
                    <Plus className="w-4 h-4" /> New Group
                </AdminButton>
            </div>

            {/* Groups List */}
            {loading ? (
                <div className="text-center py-12 text-[var(--text-secondary)] flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                    Loading groups...
                </div>
            ) : groups.length === 0 ? (
                <EmptyState icon={Layers} title="No groups yet" description="Create a compatibility group to start linking apps and extensions." />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map(group => (
                        <motion.div
                            key={group.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] hover:shadow-lg transition-all group cursor-pointer"
                            onClick={() => openEditForm(group.id)}
                        >
                            <div className="flex items-start gap-3 mb-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: `${group.color}20`, color: group.color }}
                                >
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-[var(--text-primary)] truncate">{group.name}</h3>
                                    {group.description && (
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">{group.description}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                                <span className="flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" />
                                    {group.app_count} Apps
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Puzzle className="w-3.5 h-3.5" />
                                    {group.ext_count} Extensions
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showForm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowForm(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl sm:max-h-[85vh] z-50 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] shadow-2xl overflow-y-auto"
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between p-6 pb-4 border-b border-[var(--divider)] bg-[var(--bg-surface)]">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                    {editingId ? 'Edit Group' : 'Create Group'}
                                </h2>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--chip-bg)] transition-colors text-[var(--text-secondary)]"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Name & Color */}
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <Label>Group Name *</Label>
                                        <AdminInput
                                            value={form.name}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="e.g. Mihon Family"
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <Label>Color</Label>
                                        <div className="relative mt-1.5 w-full h-[42px] rounded-xl border border-[var(--divider)] overflow-hidden">
                                            <input
                                                type="color"
                                                value={form.color}
                                                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                                className="absolute -top-2 -left-2 w-28 h-20 p-0 border-0 cursor-pointer"
                                            />
                                            <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: form.color }} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label>Description</Label>
                                    <AdminTextarea
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Optional description of this compatibility group..."
                                        className="mt-1.5"
                                        rows={2}
                                    />
                                </div>

                                {/* Apps */}
                                <div>
                                    <Label className="mb-1.5">Apps in this Group</Label>
                                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                                        Select apps that belong to this compatibility family.
                                    </div>
                                    <AdminSmartSelect
                                        value={appOptions.filter(o => form.app_ids.includes(o.value)).map(o => o.label)}
                                        onChange={(selectedLabels) => {
                                            const selectedIds = appOptions
                                                .filter(o => selectedLabels.includes(o.label))
                                                .map(o => o.value);
                                            setForm(f => ({ ...f, app_ids: selectedIds }));
                                        }}
                                        options={appOptions.map(o => o.label)}
                                        placeholder="Search apps..."
                                    />
                                </div>

                                {/* Extensions */}
                                <div>
                                    <Label className="mb-1.5">Extensions in this Group</Label>
                                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                                        Select extensions compatible with the apps above.
                                    </div>
                                    <AdminSmartSelect
                                        value={extOptions.filter(o => form.ext_ids.includes(o.value)).map(o => o.label)}
                                        onChange={(selectedLabels) => {
                                            const selectedIds = extOptions
                                                .filter(o => selectedLabels.includes(o.label))
                                                .map(o => o.value);
                                            setForm(f => ({ ...f, ext_ids: selectedIds }));
                                        }}
                                        options={extOptions.map(o => o.label)}
                                        placeholder="Search extensions..."
                                    />
                                </div>
                            </div>

                            <div className="sticky bottom-0 flex items-center justify-between p-6 pt-4 border-t border-[var(--divider)] bg-[var(--bg-surface)]">
                                <div>
                                    {editingId && (
                                        <AdminButton
                                            variant="destructive"
                                            onClick={() => { setShowForm(false); setDeleteTarget(editingId); }}
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete
                                        </AdminButton>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <AdminButton variant="secondary" onClick={() => setShowForm(false)}>Cancel</AdminButton>
                                    <AdminButton onClick={handleSave} disabled={saving}>
                                        {saving ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        {editingId ? 'Update Group' : 'Create Group'}
                                    </AdminButton>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Compatibility Group"
                message="This will remove the group and all its memberships. The compatible_with arrays on apps/extensions will NOT be cleared."
                confirmLabel="Delete"
                destructive={true}
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
