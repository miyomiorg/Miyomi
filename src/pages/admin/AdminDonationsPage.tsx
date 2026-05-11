import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, Heart, Settings, DollarSign, CreditCard, Users, Eye, EyeOff } from 'lucide-react';
import { AdminSearchBar } from '@/components/admin/AdminSearchBar';
import { AdminModal } from '@/components/admin/AdminModal';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminFormField, AdminInput, AdminTextarea, AdminButton, StatusBadge, EmptyState } from '@/components/admin/AdminFormElements';
import { toast } from 'sonner';

/* ─── types ─── */
interface DonationRow {
  id: string; donor_name: string; amount: number; currency: string;
  message: string; payment_method: string; is_public: boolean;
  show_amount: boolean; date: string; created_at: string;
}
interface GoalSettings {
  title: string; description: string; targetAmount: number; currentAmount: number; currency: string;
}
interface PaymentMethodItem {
  id: string; label: string; description: string; url: string; enabled: boolean; iconHint: string;
}
interface TransparencyItem { label: string; value: string; }
interface DisplaySettings { showDonationAmounts: boolean; transparencyLastUpdated: string; }

const emptyDonor = { donor_name: '', amount: 0, currency: 'USD', message: '', payment_method: '', is_public: true, show_amount: true, date: '' };

/* ═══════════════════════════════════════════════ */
export function AdminDonationsPage() {
  const [tab, setTab] = useState<'donators' | 'goal' | 'methods' | 'transparency' | 'display'>('donators');

  // ── donators state ──
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [search, setSearch] = useState('');
  const [loadingD, setLoadingD] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDonor);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // ── settings state ──
  const [goal, setGoal] = useState<GoalSettings>({ title: '', description: '', targetAmount: 25, currentAmount: 0, currency: 'USD' });
  const [methods, setMethods] = useState<PaymentMethodItem[]>([]);
  const [transparency, setTransparency] = useState<TransparencyItem[]>([]);
  const [display, setDisplay] = useState<DisplaySettings>({ showDonationAmounts: true, transparencyLastUpdated: '' });
  const [loadingS, setLoadingS] = useState(true);
  const [savingS, setSavingS] = useState(false);

  // method editor
  const [methodModalOpen, setMethodModalOpen] = useState(false);
  const [editMethodIdx, setEditMethodIdx] = useState<number | null>(null);
  const [methodForm, setMethodForm] = useState<PaymentMethodItem>({ id: '', label: '', description: '', url: '#', enabled: true, iconHint: 'paypal' });

  // transparency editor
  const [transModalOpen, setTransModalOpen] = useState(false);
  const [editTransIdx, setEditTransIdx] = useState<number | null>(null);
  const [transForm, setTransForm] = useState<TransparencyItem>({ label: '', value: '' });

  useEffect(() => { fetchDonations(); fetchSettings(); }, []);

  /* ─── data fetchers ─── */
  async function fetchDonations() {
    const { data } = await supabase.from('donations').select('*').order('created_at', { ascending: false });
    setDonations((data as DonationRow[]) || []);
    setLoadingD(false);
  }

  async function fetchSettings() {
    const { data } = await supabase.from('donation_settings').select('*');
    if (data) {
      for (const s of data) {
        const v = s.value as any;
        if (s.key === 'goal' && v) setGoal(v);
        if (s.key === 'payment_methods' && Array.isArray(v)) setMethods(v);
        if (s.key === 'transparency' && Array.isArray(v)) setTransparency(v);
        if (s.key === 'display' && v) setDisplay(v);
      }
    }
    setLoadingS(false);
  }

  /* ─── donation CRUD ─── */
  const filtered = donations.filter(d => d.donor_name.toLowerCase().includes(search.toLowerCase()));

  function openCreate() { setForm(emptyDonor); setEditingId(null); setModalOpen(true); }
  function openEdit(d: DonationRow) {
    setForm({ donor_name: d.donor_name, amount: d.amount, currency: d.currency, message: d.message || '', payment_method: d.payment_method || '', is_public: d.is_public, show_amount: d.show_amount, date: d.date || '' });
    setEditingId(d.id); setModalOpen(true);
  }

  async function handleSaveDonor() {
    setSaving(true);
    const payload = { ...form, amount: Number(form.amount) };
    if (editingId) {
      await supabase.from('donations').update(payload).eq('id', editingId);
      toast.success('Donor updated');
    } else {
      await supabase.from('donations').insert(payload);
      toast.success('Donor added');
    }
    setSaving(false); setModalOpen(false); fetchDonations();
  }

  async function togglePublic(id: string, current: boolean) {
    await supabase.from('donations').update({ is_public: !current }).eq('id', id);
    fetchDonations();
  }

  async function handleDeleteDonor() {
    if (!deleteTarget) return;
    await supabase.from('donations').delete().eq('id', deleteTarget.id);
    setDeleteTarget(null); fetchDonations(); toast.success('Donor removed');
  }

  /* ─── settings save helpers ─── */
  async function saveSetting(key: string, value: any) {
    setSavingS(true);
    await supabase.from('donation_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSavingS(false); toast.success(`${key} settings saved`);
  }

  /* ─── method helpers ─── */
  function openMethodCreate() { setMethodForm({ id: '', label: '', description: '', url: '#', enabled: true, iconHint: 'paypal' }); setEditMethodIdx(null); setMethodModalOpen(true); }
  function openMethodEdit(idx: number) { setMethodForm({ ...methods[idx] }); setEditMethodIdx(idx); setMethodModalOpen(true); }
  function saveMethod() {
    const updated = [...methods];
    if (editMethodIdx !== null) { updated[editMethodIdx] = methodForm; } else { updated.push({ ...methodForm, id: methodForm.id || methodForm.label.toLowerCase().replace(/\s+/g, '') }); }
    setMethods(updated); setMethodModalOpen(false); saveSetting('payment_methods', updated);
  }
  function removeMethod(idx: number) { const updated = methods.filter((_, i) => i !== idx); setMethods(updated); saveSetting('payment_methods', updated); }
  function toggleMethod(idx: number) { const updated = [...methods]; updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled }; setMethods(updated); saveSetting('payment_methods', updated); }

  /* ─── transparency helpers ─── */
  function openTransCreate() { setTransForm({ label: '', value: '' }); setEditTransIdx(null); setTransModalOpen(true); }
  function openTransEdit(idx: number) { setTransForm({ ...transparency[idx] }); setEditTransIdx(idx); setTransModalOpen(true); }
  function saveTrans() {
    const updated = [...transparency];
    if (editTransIdx !== null) { updated[editTransIdx] = transForm; } else { updated.push(transForm); }
    setTransparency(updated); setTransModalOpen(false); saveSetting('transparency', updated);
  }
  function removeTrans(idx: number) { const updated = transparency.filter((_, i) => i !== idx); setTransparency(updated); saveSetting('transparency', updated); }

  /* ─── tab styles ─── */
  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)]'}`;

  const totalRaised = donations.reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>Donations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {donations.length} donors · ${totalRaised} raised
          </p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--divider)' }}>
        <button className={tabCls('donators')} onClick={() => setTab('donators')}><Users className="w-4 h-4 inline mr-1.5" />Donators</button>
        <button className={tabCls('goal')} onClick={() => setTab('goal')}><DollarSign className="w-4 h-4 inline mr-1.5" />Goal</button>
        <button className={tabCls('methods')} onClick={() => setTab('methods')}><CreditCard className="w-4 h-4 inline mr-1.5" />Payment Methods</button>
        <button className={tabCls('transparency')} onClick={() => setTab('transparency')}><Eye className="w-4 h-4 inline mr-1.5" />Transparency</button>
        <button className={tabCls('display')} onClick={() => setTab('display')}><Settings className="w-4 h-4 inline mr-1.5" />Display</button>
      </div>

      {/* ════════ DONATORS TAB ════════ */}
      {tab === 'donators' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <AdminSearchBar value={search} onChange={setSearch} placeholder="Search donors…" />
            <AdminButton onClick={openCreate}><Plus className="w-4 h-4" /> Add</AdminButton>
          </div>

          {loadingD ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Heart} title="No donors" description={search ? 'Try a different search' : 'Add your first donor'} />
          ) : (
            <div className="space-y-2">
              {filtered.map(d => (
                <div key={d.id} className="rounded-xl border p-4 flex items-center gap-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--chart-3)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {d.donor_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{d.donor_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--chip-bg)', color: 'var(--brand)' }}>${d.amount}</span>
                      <StatusBadge active={d.is_public} />
                    </div>
                    {d.message && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{d.message}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => togglePublic(d.id, d.is_public)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }} title={d.is_public ? 'Make private' : 'Make public'}>
                      {d.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(d)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteTarget({ id: d.id, name: d.donor_name })} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Donor modal */}
          <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Donor' : 'Add Donor'} maxWidth="520px">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Name" required><AdminInput value={form.donor_name} onChange={e => setForm(f => ({ ...f, donor_name: e.target.value }))} placeholder="Donor name" /></AdminFormField>
                <AdminFormField label="Amount" required><AdminInput type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} /></AdminFormField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Currency"><AdminInput value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></AdminFormField>
                <AdminFormField label="Date"><AdminInput value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} placeholder="2026-05-01" /></AdminFormField>
              </div>
              <AdminFormField label="Message"><AdminTextarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Optional message…" rows={2} /></AdminFormField>
              <AdminFormField label="Payment Method"><AdminInput value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="PayPal, Ko-fi, etc." /></AdminFormField>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))} className="rounded" /> Public
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={form.show_amount} onChange={e => setForm(f => ({ ...f, show_amount: e.target.checked }))} className="rounded" /> Show Amount
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</AdminButton>
                <AdminButton onClick={handleSaveDonor} disabled={!form.donor_name || saving}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</AdminButton>
              </div>
            </div>
          </AdminModal>
          <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteDonor} title="Delete Donor" message={`Remove "${deleteTarget?.name}" from the list?`} />
        </>
      )}

      {/* ════════ GOAL TAB ════════ */}
      {tab === 'goal' && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Donation Goal</h2>
          <div className="space-y-4">
            <AdminFormField label="Title"><AdminInput value={goal.title} onChange={e => setGoal(g => ({ ...g, title: e.target.value }))} /></AdminFormField>
            <AdminFormField label="Description"><AdminInput value={goal.description} onChange={e => setGoal(g => ({ ...g, description: e.target.value }))} /></AdminFormField>
            <div className="grid grid-cols-3 gap-4">
              <AdminFormField label="Target ($)"><AdminInput type="number" value={goal.targetAmount} onChange={e => setGoal(g => ({ ...g, targetAmount: parseFloat(e.target.value) || 0 }))} /></AdminFormField>
              <AdminFormField label="Current ($)"><AdminInput type="number" value={goal.currentAmount} onChange={e => setGoal(g => ({ ...g, currentAmount: parseFloat(e.target.value) || 0 }))} /></AdminFormField>
              <AdminFormField label="Currency"><AdminInput value={goal.currency} onChange={e => setGoal(g => ({ ...g, currency: e.target.value }))} /></AdminFormField>
            </div>
            {/* Progress preview */}
            <div className="mt-2">
              <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Preview: {goal.targetAmount > 0 ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(0) : 0}%</div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--chip-bg)' }}>
                <div className="h-full rounded-full" style={{ width: `${goal.targetAmount > 0 ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100) : 0}%`, background: 'var(--brand)' }} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <AdminButton onClick={() => saveSetting('goal', goal)} disabled={savingS}>{savingS ? 'Saving…' : 'Save Goal'}</AdminButton>
            </div>
          </div>
        </div>
      )}

      {/* ════════ PAYMENT METHODS TAB ════════ */}
      {tab === 'methods' && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Payment Methods</h2>
            <AdminButton onClick={openMethodCreate}><Plus className="w-4 h-4" /> Add</AdminButton>
          </div>
          {methods.length === 0 ? (
            <EmptyState icon={CreditCard} title="No methods" description="Add a payment method" />
          ) : (
            <div className="space-y-2">
              {methods.map((m, i) => (
                <div key={m.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ background: 'var(--bg-page)', borderColor: 'var(--divider)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                      <StatusBadge active={m.enabled} />
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{m.url === '#' ? 'No URL set' : m.url}</p>
                  </div>
                  <button onClick={() => toggleMethod(i)} className="px-2.5 py-1 text-xs rounded-lg border font-medium" style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}>{m.enabled ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => openMethodEdit(i)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => removeMethod(i)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <AdminModal open={methodModalOpen} onClose={() => setMethodModalOpen(false)} title={editMethodIdx !== null ? 'Edit Method' : 'Add Method'}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <AdminFormField label="Label" required><AdminInput value={methodForm.label} onChange={e => setMethodForm(f => ({ ...f, label: e.target.value }))} /></AdminFormField>
                <AdminFormField label="Icon Hint"><AdminInput value={methodForm.iconHint} onChange={e => setMethodForm(f => ({ ...f, iconHint: e.target.value }))} placeholder="paypal, crypto, kofi…" /></AdminFormField>
              </div>
              <AdminFormField label="Description"><AdminInput value={methodForm.description} onChange={e => setMethodForm(f => ({ ...f, description: e.target.value }))} /></AdminFormField>
              <AdminFormField label="URL"><AdminInput value={methodForm.url} onChange={e => setMethodForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></AdminFormField>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={methodForm.enabled} onChange={e => setMethodForm(f => ({ ...f, enabled: e.target.checked }))} className="rounded" /> Enabled
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton variant="secondary" onClick={() => setMethodModalOpen(false)}>Cancel</AdminButton>
                <AdminButton onClick={saveMethod} disabled={!methodForm.label}>Save</AdminButton>
              </div>
            </div>
          </AdminModal>
        </div>
      )}

      {/* ════════ TRANSPARENCY TAB ════════ */}
      {tab === 'transparency' && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Transparency Items</h2>
            <AdminButton onClick={openTransCreate}><Plus className="w-4 h-4" /> Add</AdminButton>
          </div>
          {transparency.length === 0 ? (
            <EmptyState icon={Eye} title="No items" description="Add transparency line items" />
          ) : (
            <div className="space-y-2">
              {transparency.map((t, i) => (
                <div key={i} className="rounded-xl border p-3 flex items-center gap-3" style={{ background: 'var(--bg-page)', borderColor: 'var(--divider)' }}>
                  <div className="flex-1"><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</span></div>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t.value}</span>
                  <button onClick={() => openTransEdit(i)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => removeTrans(i)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
          <AdminModal open={transModalOpen} onClose={() => setTransModalOpen(false)} title={editTransIdx !== null ? 'Edit Item' : 'Add Item'}>
            <div className="space-y-4">
              <AdminFormField label="Label" required><AdminInput value={transForm.label} onChange={e => setTransForm(f => ({ ...f, label: e.target.value }))} placeholder="Hosting & Infrastructure" /></AdminFormField>
              <AdminFormField label="Value" required><AdminInput value={transForm.value} onChange={e => setTransForm(f => ({ ...f, value: e.target.value }))} placeholder="$25/month" /></AdminFormField>
              <div className="flex justify-end gap-2 pt-2">
                <AdminButton variant="secondary" onClick={() => setTransModalOpen(false)}>Cancel</AdminButton>
                <AdminButton onClick={saveTrans} disabled={!transForm.label || !transForm.value}>Save</AdminButton>
              </div>
            </div>
          </AdminModal>
        </div>
      )}

      {/* ════════ DISPLAY TAB ════════ */}
      {tab === 'display' && (
        <div className="rounded-xl border p-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
          <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Display Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={display.showDonationAmounts} onChange={e => setDisplay(d => ({ ...d, showDonationAmounts: e.target.checked }))} className="rounded" />
              Show donation amounts on public page
            </label>
            <AdminFormField label="Transparency Last Updated"><AdminInput value={display.transparencyLastUpdated} onChange={e => setDisplay(d => ({ ...d, transparencyLastUpdated: e.target.value }))} placeholder="May 2026" /></AdminFormField>
            <div className="flex justify-end pt-2">
              <AdminButton onClick={() => saveSetting('display', display)} disabled={savingS}>{savingS ? 'Saving…' : 'Save Display Settings'}</AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
