import { Plus, X } from 'lucide-react';
import { CommunityUrlInput } from './CommunityUrlInput';
import { AdminButton } from './AdminFormElements';

interface SocialUrlsInputProps {
    value: string[];
    onChange: (urls: string[]) => void;
    max?: number;
    placeholder?: string;
}

export function SocialUrlsInput({ value, onChange, max = 5, placeholder }: SocialUrlsInputProps) {
    // Ensure at least one empty entry if the array is empty
    const safeValue = Array.isArray(value) ? value : [];
    const urls = safeValue.length > 0 ? safeValue : [''];

    function handleChange(index: number, url: string) {
        const updated = [...urls];
        updated[index] = url;
        onChange(updated);
    }

    function handleAdd() {
        if (urls.length >= max) return;
        onChange([...urls, '']);
    }

    function handleRemove(index: number) {
        if (urls.length <= 1) {
            // Clear the only entry instead of removing
            onChange(['']);
            return;
        }
        const updated = urls.filter((_, i) => i !== index);
        onChange(updated);
    }

    return (
        <div className="space-y-2">
            {urls.map((url, index) => (
                <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex-1">
                        <CommunityUrlInput
                            value={url}
                            onChange={(newUrl) => handleChange(index, newUrl)}
                            placeholder={placeholder || 'https://discord.gg/... or https://t.me/...'}
                        />
                    </div>
                    {urls.length > 1 && (
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            className="p-2 rounded-lg border border-[var(--divider)] text-[var(--text-secondary)] hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all shrink-0"
                            title="Remove this link"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
            {urls.length < max && (
                <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={handleAdd}
                    className="w-full !py-2 !text-xs border-dashed hover:border-[var(--brand)] hover:text-[var(--brand)] transition-all"
                >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Social Link ({urls.length}/{max})
                </AdminButton>
            )}
        </div>
    );
}
