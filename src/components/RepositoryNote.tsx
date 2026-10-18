import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { repositoryNotesApi } from '@/services/api';
import { toast } from 'sonner';

export function RepositoryNote({ id, note, severity, canEdit = false, targetType = 'extension' }: {
  id: string; note?: string | null; severity?: string | null; canEdit?: boolean; targetType?: 'app' | 'extension';
}) {
  const [saved, setSaved] = useState(note || '');
  const [text, setText] = useState(note || '');
  const [level, setLevel] = useState(severity || 'warning');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setSaved(note || ''); setText(note || ''); setLevel(severity || 'warning'); }, [id, note, severity]);
  if (!saved && !canEdit) return null;
  async function save() {
    setSaving(true);
    try {
      await repositoryNotesApi.save(targetType === 'app' ? 'apps' : 'extensions', id, text, level);
      setSaved(text.trim());
      toast.success(text.trim() ? 'Repository note saved' : 'Repository note removed');
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save note'); }
    finally { setSaving(false); }
  }
  return <span onClick={event => event.stopPropagation()}>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-1 text-xs text-amber-600 dark:text-amber-400" aria-label="Repository moderator note">
          <AlertTriangle className="h-4 w-4" /> {saved ? 'Moderator note' : 'Add note'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Repository moderator note</DialogTitle></DialogHeader>
        {canEdit ? <div className="space-y-4">
          <label className="block">Severity
            <select className="block w-full rounded border bg-[var(--bg-surface)] p-2" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="info">Information</option><option value="warning">Warning</option><option value="danger">High severity</option>
            </select>
          </label>
          <label className="block">Public note
            <textarea className="block w-full rounded border bg-[var(--bg-surface)] p-2" rows={5} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Write a custom warning or moderator note…" />
          </label>
          <p className="text-xs text-[var(--text-secondary)]">Everyone can read this note. Clear the text and save to remove it. Public caches may take a few minutes to update.</p>
          <button type="button" onClick={save} disabled={saving} className="rounded bg-[var(--brand)] px-4 py-2 text-white">{saving ? 'Saving…' : 'Save note'}</button>
        </div> : <div><p className="mb-2 text-sm font-semibold capitalize">{level === 'danger' ? 'High severity' : level}</p><p className="whitespace-pre-wrap break-words">{saved}</p></div>}
      </DialogContent>
    </Dialog>
  </span>;
}
