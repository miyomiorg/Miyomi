import { useState, useEffect } from 'react';
import { adminSettingsApi, authApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Send, Save, Info } from 'lucide-react';
import { AdminButton, AdminFormField, AdminInput } from './AdminFormElements';

/**
 * Telegram notifications configuration.
 * The GLOBAL bot token + chat IDs come from the environment (TELEGRAM_BOT_TOKEN
 * secret + TELEGRAM_CHAT_IDS var). Each admin sets their own chat ID here; it is
 * appended to the global list when notifications are sent.
 */
export function TelegramSettingsForm() {
    const { user, refreshSession } = useAuth();
    const [chatId, setChatId] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        setChatId(user?.telegramChatId ?? '');
    }, [user?.telegramChatId]);

    async function handleSave() {
        setSaving(true);
        try {
            const trimmed = chatId.trim();
            await authApi.setTelegramChatId(trimmed === '' ? null : trimmed);
            await refreshSession();
            toast.success('Telegram chat ID saved');
        } catch (error: any) {
            console.error('Error saving chat ID:', error);
            toast.error(error?.message || 'Failed to save chat ID');
        } finally {
            setSaving(false);
        }
    }

    async function handleTest() {
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

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold font-['Poppins',sans-serif]" style={{ color: 'var(--text-primary)' }}>
                Telegram Notifications
            </h2>

            <div className="flex items-start gap-2 p-3 rounded-lg border" style={{ background: 'var(--chip-bg)', borderColor: 'var(--divider)' }}>
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    The global bot token (<code>TELEGRAM_BOT_TOKEN</code> secret) and global chat IDs
                    (<code>TELEGRAM_CHAT_IDS</code> var) are configured in Cloudflare. Your chat ID below is
                    <strong> appended</strong> to the global list. Notifications cover new submissions, reports,
                    feedback, edit suggestions, and failed admin logins.
                </p>
            </div>

            <AdminFormField label="Your chat ID">
                <AdminInput
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 123456789 or @mychannel"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Leave empty to only receive the global notifications.
                </p>
            </AdminFormField>

            <div className="flex gap-3">
                <AdminButton onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : <Save className="w-4 h-4 mr-2" />}
                    {saving ? 'Saving...' : 'Save'}
                </AdminButton>
                <AdminButton onClick={handleTest} disabled={testing} variant="secondary">
                    <Send className="w-4 h-4 mr-2" />
                    {testing ? 'Sending...' : 'Send Test Message'}
                </AdminButton>
            </div>
        </div>
    );
}