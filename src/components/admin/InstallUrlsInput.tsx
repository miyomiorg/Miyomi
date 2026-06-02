import { Plus, Trash2, Download, Copy, GripVertical } from 'lucide-react';
import { AdminFormField, AdminInput, AdminSelect, AdminButton } from '@/components/admin/AdminFormElements';

export interface InstallUrlEntry {
    label: string;
    url: string;
    type: 'auto' | 'copy';
}

interface InstallUrlsInputProps {
    value: InstallUrlEntry[];
    onChange: (urls: InstallUrlEntry[]) => void;
    max?: number;
    compact?: boolean;
}

const DEFAULT_ENTRY: InstallUrlEntry = { label: '', url: '', type: 'auto' };

export function InstallUrlsInput({ value, onChange, max = 10, compact = false }: InstallUrlsInputProps) {
    const safeValue = Array.isArray(value) ? value : [];
    const entries = safeValue.length > 0 ? safeValue : [];

    function addEntry() {
        if (entries.length >= max) return;
        onChange([...entries, { ...DEFAULT_ENTRY }]);
    }

    function removeEntry(index: number) {
        onChange(entries.filter((_, i) => i !== index));
    }

    function updateEntry(index: number, field: keyof InstallUrlEntry, val: string) {
        const updated = entries.map((entry, i) =>
            i === index ? { ...entry, [field]: val } : entry
        );
        onChange(updated);
    }

    return (
        <div className="space-y-3">
            {entries.map((entry, index) => (
                <div
                    key={index}
                    className={`flex items-start gap-2 p-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] transition-all hover:border-[var(--brand)]/30 ${compact ? 'p-2' : ''}`}
                >
                    <div className="flex items-center pt-2 text-[var(--text-secondary)] opacity-40">
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2">
                        {/* Label */}
                        <AdminInput
                            value={entry.label}
                            onChange={e => updateEntry(index, 'label', e.target.value)}
                            placeholder="Button label (e.g. Add to Hayase)"
                            className={compact ? 'text-xs' : 'text-sm'}
                        />

                        {/* URL */}
                        <AdminInput
                            value={entry.url}
                            onChange={e => updateEntry(index, 'url', e.target.value)}
                            placeholder={entry.type === 'auto' ? 'tachiyomi://add-repo?url=...' : 'https://raw.githubusercontent.com/...'}
                            className={compact ? 'text-xs' : 'text-sm'}
                        />

                        {/* Type selector */}
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => updateEntry(index, 'type', 'auto')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${entry.type === 'auto'
                                    ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--divider)] hover:border-[var(--brand)]'
                                    }`}
                                title="Auto Install — opens the URL as a deep link"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Auto</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => updateEntry(index, 'type', 'copy')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${entry.type === 'copy'
                                    ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm'
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--divider)] hover:border-[var(--brand)]'
                                    }`}
                                title="Copy URL — copies the URL to clipboard"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Copy</span>
                            </button>
                        </div>
                    </div>

                    {/* Remove */}
                    <button
                        type="button"
                        onClick={() => removeEntry(index)}
                        className="p-2 mt-0.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Remove"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}

            {entries.length < max && (
                <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-[var(--divider)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand)]/5 transition-all text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Install URL
                </button>
            )}

            {entries.length === 0 && (
                <p className="text-xs text-[var(--text-secondary)] opacity-60">
                    No install URLs added. Click "Add Install URL" to create custom install buttons for different apps.
                </p>
            )}
        </div>
    );
}
