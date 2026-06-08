import { Plus, X, BookOpen, Video, Link2 } from 'lucide-react';
import { AdminInput, AdminSelect, AdminButton } from './AdminFormElements';

export interface TutorialEntry {
    title: string;
    url: string;
    type: string; // 'guide', 'video', 'custom', 'external'
    description?: string;
}

interface TutorialsInputProps {
    value: TutorialEntry[];
    onChange: (tutorials: TutorialEntry[]) => void;
    guidesData: { title: string; slug: string }[];
}

export function TutorialsInput({ value, onChange, guidesData }: TutorialsInputProps) {
    const safeValue = Array.isArray(value) ? value : [];

    function handleAdd() {
        onChange([...safeValue, { title: '', url: '', type: 'guide' }]);
    }

    function handleRemove(index: number) {
        const updated = safeValue.filter((_, i) => i !== index);
        onChange(updated);
    }

    function handleChange(index: number, field: keyof TutorialEntry, val: string) {
        const updated = [...safeValue];
        
        if (field === 'type') {
            // Reset fields on type change to keep things clean
            updated[index] = { ...updated[index], type: val, title: '', url: '' };
        } else if (field === 'title' && updated[index].type === 'guide') {
            // If selecting an internal guide, auto-fill URL
            const guide = guidesData.find(g => g.title === val);
            if (guide) {
                updated[index] = { ...updated[index], title: val, url: `/guides/${guide.slug}` };
            } else {
                updated[index] = { ...updated[index], title: val, url: '' };
            }
        } else {
            updated[index] = { ...updated[index], [field]: val };
        }
        
        onChange(updated);
    }

    return (
        <div className="space-y-4">
            {safeValue.map((tutorial, index) => {
                const isInternal = tutorial.type === 'guide';
                
                return (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-[var(--bg-elev-1)] border border-[var(--divider)] rounded-xl relative group animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Remove button */}
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="absolute -top-2 -right-2 p-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--divider)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/50 shadow-sm transition-all z-10"
                            title="Remove this tutorial"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Type Selector */}
                        <div className="sm:w-40 flex-shrink-0">
                            <AdminSelect
                                value={tutorial.type}
                                onChange={(e) => handleChange(index, 'type', e.target.value)}
                            >
                                <option value="guide">Internal Guide</option>
                                <option value="external">External Article</option>
                                <option value="video">External Video</option>
                            </AdminSelect>
                        </div>

                        <div className="flex-1 space-y-3">
                            {isInternal ? (
                                <AdminSelect
                                    value={tutorial.title}
                                    onChange={(e) => handleChange(index, 'title', e.target.value)}
                                >
                                    <option value="" disabled>Select a Guide...</option>
                                    {guidesData.map(g => (
                                        <option key={g.slug} value={g.title}>{g.title}</option>
                                    ))}
                                </AdminSelect>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <AdminInput
                                        placeholder="Title (e.g. How to install via SideStore)"
                                        value={tutorial.title}
                                        onChange={(e) => handleChange(index, 'title', e.target.value)}
                                    />
                                    <AdminInput
                                        placeholder="https://..."
                                        value={tutorial.url}
                                        onChange={(e) => handleChange(index, 'url', e.target.value)}
                                    />
                                </div>
                            )}
                            
                            <AdminInput
                                placeholder="Short Description (Optional)"
                                value={tutorial.description || ''}
                                onChange={(e) => handleChange(index, 'description', e.target.value)}
                            />
                        </div>
                    </div>
                );
            })}
            
            <AdminButton
                type="button"
                variant="secondary"
                onClick={handleAdd}
                className="w-full !py-3 border-dashed hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
            >
                <Plus className="w-4 h-4 mr-2" />
                Add Tutorial or Guide Link
            </AdminButton>
        </div>
    );
}
