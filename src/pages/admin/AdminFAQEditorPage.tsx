import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminFaqsApi } from '@/services/api';
import { invalidateTableCache } from '@/hooks/useAdminCache';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { AdminRichTextEditor } from '@/components/admin/AdminRichTextEditor';
import { AdminMarkdownEditor } from '@/components/admin/AdminMarkdownEditor';
import { AdminInput, AdminButton, AdminFormField } from '@/components/admin/AdminFormElements';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyFaq = {
    question: '',
    answer: '',
    category: '',
    order_index: 0,
    content_format: 'markdown' as 'html' | 'markdown',
};

export function AdminFAQEditorPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { logAction } = useAdminLogger();
    const [form, setForm] = useState(emptyFaq);
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;

        async function fetchFaq() {
            try {
                const data = (await adminFaqsApi.list()).find(row => row.id === id);
                if (!data) throw new Error('FAQ not found');
                setForm({
                    question: data.question,
                    answer: data.answer || '',
                    category: data.category || '',
                    order_index: data.order_index,
                    content_format: (data as any).content_format || 'markdown',
                });
            } catch (error) {
                console.error(error);
                toast.error('Failed to load FAQ');
            } finally {
                setLoading(false);
            }
        }

        fetchFaq();
    }, [id, navigate]);

    async function handleSave() {
        if (!form.question) {
            toast.error('Question is required');
            return;
        }

        setSaving(true);
        const payload = {
            question: form.question,
            answer: form.answer,
            category: form.category || null,
            orderIndex: form.order_index,
            contentFormat: form.content_format,
        };

        try {
            if (id) {
                await adminFaqsApi.update(id, payload);
                invalidateTableCache('faqs');

                await logAction('update', 'faq', id, form.question).catch(err => {
                    console.error('Failed to log update action:', err);
                });

                toast.success('FAQ updated!');
            } else {
                const data = await adminFaqsApi.create(payload);
                invalidateTableCache('faqs');

                if (data) {
                    await logAction('create', 'faq', data.id, form.question).catch(err => {
                        console.error('Failed to log create action:', err);
                    });
                }

                toast.success('FAQ created!');
                navigate('/admin/faqs');
            }
        } catch (error: any) {
            console.error('Save Error:', error);
            toast.error(error.message || 'Failed to save FAQ');
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="flex items-center justify-center h-96 text-[var(--text-secondary)]"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...</div>;

    return (
        <div className="max-w-[1400px] mx-auto pb-20">
            {/* Top bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <button
                    onClick={() => navigate('/admin/faqs')}
                    className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">ID: {id || 'NEW'}</span>
                    <AdminButton onClick={handleSave} disabled={saving || !form.question}>
                        <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save FAQ'}
                    </AdminButton>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
                {/* Main editor column */}
                <div className="space-y-4 min-w-0">
                    <input
                        type="text"
                        value={form.question}
                        onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                        placeholder="FAQ Question"
                        className="w-full bg-transparent text-3xl font-bold border-none focus:outline-none focus:ring-0 px-0 placeholder-[var(--text-secondary)]"
                        style={{ color: 'var(--text-primary)' }}
                    />

                    <label className="block text-sm text-[var(--text-secondary)]">
                        Answer format
                        <select value={form.content_format} onChange={e => setForm(f => ({ ...f, content_format: e.target.value as 'html' | 'markdown' }))} className="ml-3 bg-[var(--bg-surface)] rounded p-2">
                            <option value="markdown">Markdown</option>
                            <option value="html">HTML</option>
                        </select>
                    </label>
                    {form.content_format === 'markdown' ? (
                        <AdminMarkdownEditor value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} placeholder="Write the answer here..." />
                    ) : <AdminRichTextEditor
                        value={form.answer}
                        onChange={answer => setForm(f => ({ ...f, answer }))}
                        placeholder="Write the answer here..."
                    />}
                </div>

                {/* Sidebar settings */}
                <div className="space-y-6">
                    <div className="p-4 rounded-xl border space-y-4 sticky top-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
                        <h3 className="font-semibold text-[var(--text-primary)]">Settings</h3>

                        <AdminFormField label="Category">
                            <AdminInput value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="General" />
                        </AdminFormField>

                        <AdminFormField label="Display Order">
                            <AdminInput type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))} />
                        </AdminFormField>
                    </div>
                </div>
            </div>
        </div>
    );
}
