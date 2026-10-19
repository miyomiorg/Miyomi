import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { repositoryNotesApi } from '@/services/api';
import { toast } from 'sonner';

/**
 * Admin/moderator-only note editor (the per-entry "Notice" content).
 * Public visitors read the note via the EntryNotice banner instead.
 */
export function RepositoryNote({ id, note, severity, sticky: initialSticky = false, canEdit = false, targetType = 'extension' }: {
  id: string; note?: string | null; severity?: string | null; sticky?: boolean; canEdit?: boolean; targetType?: 'app' | 'extension';
}) {
  const [saved, setSaved] = useState(note || '');
  const [text, setText] = useState(note || '');
  const [level, setLevel] = useState(severity || 'warning');
  const [sticky, setSticky] = useState(initialSticky);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setSaved(note || ''); setText(note || ''); setLevel(severity || 'warning'); setSticky(initialSticky);
  }, [id, note, severity, initialSticky]);
  if (!saved && !canEdit) return null;
  async function save() {
    setSaving(true);
    try {
      await repositoryNotesApi.save(targetType === 'app' ? 'apps' : 'extensions', id, text, level, sticky);
      setSaved(text.trim());
      toast.success(text.trim() ? 'Notice saved' : 'Notice removed');
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save notice'); }
    finally { setSaving(false); }
  }
  return <span onClick={event => event.stopPropagation()}>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-600 dark:text-amber-400" aria-label="Repository notice">
          <AlertTriangle className="h-4 w-4" /> {saved ? 'Notice' : 'Add notice'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Entry notice</DialogTitle></DialogHeader>
        {canEdit ? <div className="space-y-4">
          <label className="block">Severity
            <select className="block w-full rounded border bg-[var(--bg-surface)] p-2" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="info">Information</option><option value="warning">Warning</option><option value="danger">High severity</option>
            </select>
          </label>
          <label className="block">Notice text
            <textarea className="block w-full rounded border bg-[var(--bg-surface)] p-2" rows={4} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Shown below the main notice on this entry's page…" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" checked={sticky} onChange={e => setSticky(e.target.checked)} className="rounded" />
            Sticky (always visible, no dismiss "x")
          </label>
          <p className="text-xs text-[var(--text-secondary)]">Everyone can read this notice. Clear the text and save to remove it.</p>
          <button type="button" onClick={save} disabled={saving} className="rounded bg-[var(--brand)] px-4 py-2 text-white">{saving ? 'Saving…' : 'Save notice'}</button>
        </div> : <div><p className="mb-2 text-sm font-semibold capitalize">{level === 'danger' ? 'High severity' : level}</p><p className="whitespace-pre-wrap break-words">{saved}</p></div>}
      </DialogContent>
    </Dialog>
  </span>;
}