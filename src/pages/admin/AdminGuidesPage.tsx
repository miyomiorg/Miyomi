import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { useAdminCache } from '@/hooks/useAdminCache';
import type { Tables } from '@/integrations/supabase/types';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect, AdminButton, StatusBadge, EmptyState, AdminToggle } from '@/components/admin/AdminFormElements';
import { AdminMarkdownEditor } from '@/components/admin/AdminMarkdownEditor';

const emptyGuide = { title: '', description: '', content: '', author: '', category: '', slug: '', status: 'approved', tags: [] as string[] };

export function AdminGuidesPage() {
  const { logAction } = useAdminLogger();
  const { data: guides, loading, invalidateCache } = useAdminCache<Tables<'guides'>>({ table: 'guides', orderBy: 'title' });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'list' | 'settings'>('list');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [noticeContent, setNoticeContent] = useState('');

  // Fetch settings when tab changes to settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data: enabledData } = await supabase.from('settings').select('value').eq('key', 'guide_notice_enabled').single();
      const { data: contentData } = await supabase.from('settings').select('value').eq('key', 'guide_notice_content').single();
      
      setNoticeEnabled(enabledData?.value === 'true' || enabledData?.value === true);
      setNoticeContent(contentData?.value || '');
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSettingsLoading(true);
    try {
      await supabase.from('settings').upsert([
        { key: 'guide_notice_enabled', value: noticeEnabled },
        { key: 'guide_notice_content', value: noticeContent }
      ], { onConflict: 'key' });
      await logAction('update' as any, 'system' as any, 'guide_settings', 'Updated guide notice settings');
      toast.success('Guide settings saved successfully');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSettingsLoading(false);
    }
  };

  const filtered = useMemo(() =>
    guides.filter(g => g.title.toLowerCase().includes(search.toLowerCase())),
    [guides, search]
  );

  function openCreate() {
    navigate('/admin/guides/new');
  }

  function openEdit(g: Tables<'guides'>) {
    navigate(`/admin/guides/${g.id}/edit`);
  }



  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from('guides').delete().eq('id', deleteTarget.id);

    // Log delete action
    await logAction('delete', 'guide', deleteTarget.id, deleteTarget.name).catch(err => {
      console.error('Failed to log delete action:', err);
    });

    setDeleteTarget(null); invalidateCache();
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Guides</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === 'list' && (
            <>
              <AdminSearchBar value={search} onChange={setSearch} placeholder="Search guides…" />
              <AdminButton onClick={openCreate}><Plus className="w-4 h-4" /> Add</AdminButton>
            </>
          )}
        </div>
      </div>

      <div className="flex border-b border-[var(--divider)] mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-[var(--brand)] text-[var(--brand)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--divider)]'
          }`}
          onClick={() => setActiveTab('list')}
        >
          All Guides
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-[var(--brand)] text-[var(--brand)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--divider)]'
          }`}
          onClick={() => {
            setActiveTab('settings');
            fetchSettings();
          }}
        >
          Settings
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="max-w-3xl space-y-8 animate-in fade-in duration-300">
          <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-4">Global Guide Notice Box</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">This notice will appear at the top of the public Guides directory page.</p>
            
            <div className="space-y-6">
              <AdminToggle
                checked={noticeEnabled}
                onChange={setNoticeEnabled}
                label="Enable Guide Notice"
                description="Show the notice box above the guides."
              />
              
              {noticeEnabled && (
                <AdminFormField label="Notice HTML Content" required>
                  <AdminTextarea 
                    value={noticeContent}
                    onChange={(e) => setNoticeContent(e.target.value)}
                    placeholder="<div class='...'>Guides is under active development.</div>"
                    rows={8}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-[var(--text-secondary)] mt-2">You can use raw HTML here to perfectly style the notice box.</p>
                </AdminFormField>
              )}
              
              <div className="pt-4 border-t border-[var(--divider)] flex justify-end">
                <AdminButton onClick={saveSettings} disabled={settingsLoading}>
                  {settingsLoading ? 'Saving...' : 'Save Settings'}
                </AdminButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <>
          {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No guides found" description={search ? 'Try a different search term' : 'Create your first guide'} />
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-elev-1)' }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider w-12" style={{ color: 'var(--text-secondary)' }}>#</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => (
                  <tr key={g.id} className="border-t transition-colors cursor-pointer" style={{ borderColor: 'var(--divider)' }}
                    onClick={() => openEdit(g)}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elev-1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-secondary)] text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{g.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{g.category || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={g.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          openEdit(g);
                        }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: g.id, name: g.title });
                        }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}


      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Guide" message={`Are you sure you want to delete "${deleteTarget?.name}"?`} />
    </div>
  );
}
