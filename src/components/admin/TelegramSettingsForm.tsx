import { useState, useEffect } from 'react';
import { adminSettingsApi } from '@/services/api';
import { toast } from 'sonner';
import { Plus, X, Send } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { AdminButton, AdminFormField, AdminInput } from './AdminFormElements';

export function TelegramSettingsForm() {
    const { isSuperAdmin } = useAdmin();
    const [botToken, setBotToken] = useState('');
    const [chatIds, setChatIds] = useState<string[]>([]);
    const [newChatId, setNewChatId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        if (isSuperAdmin) {
            loadSettings();
        }
    }, [isSuperAdmin]);

    async function loadSettings() {
        setLoading(true);
        try {
            const all = await adminSettingsApi.list();
            const tokenData = all.find((s) => s.key === 'telegram_bot_token');
            if (tokenData?.value) {
                setBotToken(tokenData.value as string);
            }

            const chatIdsData = all.find((s) => s.key === 'telegram_chat_ids');
            if (chatIdsData?.value && Array.isArray(chatIdsData.value)) {
                setChatIds(chatIdsData.value as string[]);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            toast.error('Failed to load Telegram settings');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!isSuperAdmin) return;

        setSaving(true);
        try {
            await adminSettingsApi.upsert('telegram_bot_token', { value: botToken });
            await adminSettingsApi.upsert('telegram_chat_ids', { value: chatIds });

            toast.success('Telegram settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save Telegram settings');
        } finally {
            setSaving(false);
        }
    }

    async function handleTest() {
        if (chatIds.length === 0) {
            toast.error('Please add at least one chat ID');
            return;
        }

        setTesting(true);
        try {
            await adminSettingsApi.telegramTest();
            toast.success('Test message sent successfully!');
        } catch (error: any) {
            console.error('Error sending test message:', error);
            toast.error(error?.message || 'Failed to send test message');
        } finally {
            setTesting(false);
        }
    }

    function handleAddChatId() {
        if (!newChatId.trim()) {
            toast.error('Please enter a chat ID');
            return;
        }

        if (chatIds.includes(newChatId.trim())) {
            toast.error('This chat ID is already added');
            return;
        }

        setChatIds([...chatIds, newChatId.trim()]);
        setNewChatId('');
    }

    function handleRemoveChatId(chatId: string) {
        setChatIds(chatIds.filter((id) => id !== chatId));
    }

    if (!isSuperAdmin) {
        return (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Only superadmins can manage Telegram settings.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                Loading...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                Telegram Integration
            </h2>

            <AdminFormField label="Bot Token">
                <AdminInput
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Enter Telegram bot token"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Get your bot token from @BotFather on Telegram
                </p>
            </AdminFormField>

            <AdminFormField label="Chat IDs">
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <AdminInput
                            type="text"
                            value={newChatId}
                            onChange={(e) => setNewChatId(e.target.value)}
                            placeholder="Enter chat ID"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddChatId();
                                }
                            }}
                        />
                        <AdminButton onClick={handleAddChatId} variant="secondary">
                            <Plus className="w-4 h-4" />
                        </AdminButton>
                    </div>

                    {chatIds.length > 0 && (
                        <div className="space-y-2">
                            {chatIds.map((chatId) => (
                                <div
                                    key={chatId}
                                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                                    style={{ background: 'var(--bg-elev-1)', borderColor: 'var(--divider)' }}
                                >
                                    <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
                                        {chatId}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveChatId(chatId)}
                                        className="p-1 rounded hover:bg-[var(--chip-bg)] transition-colors"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Notifications are sent to all configured chat IDs for new submissions, reports,
                        feedback, edit suggestions, and failed admin login attempts.
                    </p>
                </div>
            </AdminFormField>

            <div className="flex gap-3">
                <AdminButton onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </AdminButton>
                <AdminButton onClick={handleTest} disabled={testing || chatIds.length === 0} variant="secondary">
                    <Send className="w-4 h-4 mr-2" />
                    {testing ? 'Sending...' : 'Send Test Message'}
                </AdminButton>
            </div>
        </div>
    );
}
