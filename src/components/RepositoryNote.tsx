import { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { repositoryNotesApi } from '@/services/api';
import { toast } from 'sonner';
import { normalizeNoticeSeverity, noticeSeverityOptions, noticeSeverityStyles } from './noticeSeverity';

/**
 * Admin/moderator-only note editor (the per-entry "Notice" content).
 * Public visitors read the note via the EntryNotice banner instead.
 */
export function RepositoryNote({ id, note, severity, sticky: initialSticky = false, canEdit = false, targetType = 'extension' }: {
  id: string; note?: string | null; severity?: string | null; sticky?: boolean; canEdit?: boolean; targetType?: 'app' | 'extension';
}) {
  const [saved, setSaved] = useState({ text: note || '', severity: normalizeNoticeSeverity(severity), sticky: initialSticky });
  const [text, setText] = useState(note || '');
  const [level, setLevel] = useState(normalizeNoticeSeverity(severity));
  const [sticky, setSticky] = useState(initialSticky);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const severityId = useId();
  useEffect(() => {
    setSaved({ text: note || '', severity: normalizeNoticeSeverity(severity), sticky: initialSticky });
    setText(note || ''); setLevel(normalizeNoticeSeverity(severity)); setSticky(initialSticky);
  }, [id, note, severity, initialSticky]);
  if (!saved.text && !canEdit) return null;
  const savedStyle = noticeSeverityStyles[saved.severity];
  const SavedIcon = savedStyle.icon;
  async function save() {
    setSaving(true);
    try {
      await repositoryNotesApi.save(targetType === 'app' ? 'apps' : 'extensions', id, text, level, sticky);
      setSaved({ text: text.trim(), severity: level, sticky });
      toast.success(text.trim() ? 'Notice saved' : 'Notice removed');
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to save notice'); }
    finally { setSaving(false); }
  }
  return <span onClick={event => event.stopPropagation()}>
    <Dialog open={open} onOpenChange={nextOpen => {
      if (nextOpen) { setText(saved.text); setLevel(saved.severity); setSticky(saved.sticky); }
      setOpen(nextOpen);
    }}>
      <DialogTrigger asChild>
        <button type="button" className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${savedStyle.tone}`} aria-label={`${savedStyle.label} notice`}>
          <SavedIcon aria-hidden="true" className="h-4 w-4" /> {saved.text ? 'Notice' : 'Add notice'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Entry notice</DialogTitle>
          <DialogDescription>Choose how this notice appears on the public entry page.</DialogDescription>
        </DialogHeader>
        {canEdit ? <div className="space-y-4">
          <fieldset disabled={saving}>
            <legend className="mb-3 text-sm font-medium">Severity</legend>
            <div className="flex flex-wrap gap-6">
              {noticeSeverityOptions.map(value => {
                const style = noticeSeverityStyles[value];
                const Icon = style.icon;
                const selected = level === value;
                return <label key={value} className="flex cursor-pointer flex-col items-center gap-2">
                  <input type="radio" name={severityId} value={value} checked={selected} onChange={() => setLevel(value)} className="peer sr-only" />
                  <span className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-shadow peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-disabled:opacity-50 ${style.tone} ${selected ? 'ring-2 ring-current ring-offset-2 ring-offset-[var(--bg-surface)]' : 'hover:ring-2 hover:ring-current'}`}>
                    <Icon aria-hidden="true" className="h-6 w-6" />
                    {selected && <Check aria-hidden="true" className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border bg-[var(--bg-surface)] p-0.5" />}
                  </span>
                  <span className={`text-xs ${selected ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{style.label}</span>
                </label>;
              })}
            </div>
          </fieldset>
          <label className="block">Notice text
            <textarea disabled={saving} className="block w-full rounded border bg-[var(--bg-surface)] p-2" rows={4} maxLength={2000} value={text} onChange={e => setText(e.target.value)} placeholder="Shown below the main notice on this entry's page…" />
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <input type="checkbox" disabled={saving} checked={sticky} onChange={e => setSticky(e.target.checked)} className="rounded" />
            Sticky (always visible, no dismiss "x")
          </label>
          <p className="text-xs text-[var(--text-secondary)]">Everyone can read this notice. Clear the text and save to remove it.</p>
          <button type="button" onClick={save} disabled={saving} className="rounded bg-[var(--brand)] px-4 py-2 text-white">{saving ? 'Saving…' : 'Save notice'}</button>
        </div> : <div><p className="mb-2 text-sm font-semibold">{savedStyle.label}</p><p className="whitespace-pre-wrap break-words">{saved.text}</p></div>}
      </DialogContent>
    </Dialog>
  </span>;
}
