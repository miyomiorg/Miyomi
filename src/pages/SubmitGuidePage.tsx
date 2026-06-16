import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Save, ArrowLeft, Loader2, User, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import Turnstile from 'react-turnstile';
import { supabase } from '../integrations/supabase/client';
import { dataService } from '../services/dataService';
import { AdminRichTextEditor } from '../components/admin/AdminRichTextEditor';

interface SubmitGuidePageProps {
  onNavigate?: (path: string) => void;
}

export function SubmitGuidePage({ onNavigate }: SubmitGuidePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editId = searchParams.get('editId');
  const isEdit = !!editId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');

  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  const [submitterNotes, setSubmitterNotes] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(import.meta.env.VITE_DISABLE_TURNSTILE === 'true' ? 'dummy-token' : '');

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [originalDataSnapshot, setOriginalDataSnapshot] = useState<any>(null);

  useEffect(() => {
    async function init() {
      try {
        // Fetch categories dynamically
        const catData = await dataService.getGuideCategories();
        if (catData) setCategories(catData.map(c => ({ id: c.id, name: c.id })));

        if (isEdit) {
          const { data: guide } = await supabase.from('guides').select('*').eq('id', editId).single();
          if (guide) {
            setTitle(guide.title || '');
            setCategory(guide.category || '');
            setSummary(guide.description || '');
            setContent(guide.content || '');
            setOriginalDataSnapshot(guide);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [editId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !content) {
      toast.error('Please fill in Title, Category, and Content');
      return;
    }
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA');
      return;
    }

    setSubmitting(true);
    try {
      const submittedData = {
        title,
        category,
        description: summary,
        content,
        author: submitterName.trim() || (isEdit ? originalDataSnapshot?.author : null) || 'Anonymous Contributor',
        name: title, // for edge function duplicate check
      };

      let invokeFn = 'submit-content';
      let payload: any = {
        submissionType: 'guide',
        submittedData,
        turnstileToken,
        submitterName,
        submitterContact,
        submitterNotes,
      };

      if (isEdit && originalDataSnapshot) {
        invokeFn = 'edit-suggestion';
        payload = {
          targetType: 'guide',
          targetId: editId,
          originalDataSnapshot,
          submittedData,
          turnstileToken,
          submitterName,
          submitterContact,
          submitterNotes,
        };
      }

      const { data, error } = await supabase.functions.invoke(invokeFn, {
        body: payload
      });

      if (error) {
        throw new Error(data?.error || error.message);
      }
      if (!data.success) {
        throw new Error(data.error || "Submission failed");
      }

      toast.success(isEdit ? "Edit suggestion submitted successfully!" : "Guide submitted successfully!");
      if (onNavigate) {
        onNavigate('/guides');
      } else {
        navigate('/guides');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-3xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)]">
          {isEdit ? 'Suggest an Edit' : 'Write a Guide'}
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          {isEdit ? 'Submit improvements or corrections for this guide.' : 'Share your knowledge with the community by writing a new guide or tutorial.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Guide Information</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="How to install extensions on Android"
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                required
              />
            </div>
            <div>
              <input
                type="text"
                list="category-suggestions"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Getting Started"
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                required
              />
              <datalist id="category-suggestions">
                {categories.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Summary</label>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="A brief description of what this guide covers..."
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
              <FileText className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Guide Content <span className="text-red-500">*</span></h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            Use the editor below to write the content of the guide. You can insert images, videos, and styled containers.
          </p>
          <div className="border border-[var(--divider)] rounded-2xl overflow-hidden bg-[var(--bg-elev-1)]">
            <AdminRichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your guide content here..."
            />
          </div>
        </div>

        {/* Contributor Details */}
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Contributor Details</h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Your Name (Optional)</label>
              <input
                type="text"
                value={submitterName}
                onChange={e => setSubmitterName(e.target.value)}
                placeholder="Anonymous"
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Contact Info (Optional)</label>
              <input
                type="text"
                value={submitterContact}
                onChange={e => setSubmitterContact(e.target.value)}
                placeholder="Email or Discord/Telegram"
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Notes for Admin (Optional)</label>
              <textarea
                value={submitterNotes}
                onChange={e => setSubmitterNotes(e.target.value)}
                placeholder="Any message or context for the moderators reviewing this submission..."
                className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none min-h-[100px]"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="bg-[var(--bg-surface)] border border-[var(--divider)] rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          {import.meta.env.VITE_DISABLE_TURNSTILE !== 'true' ? (
            <Turnstile
              sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
              onVerify={(token) => setTurnstileToken(token)}
              theme="auto"
            />
          ) : (
            <div className="text-sm text-[var(--text-secondary)] italic">Captcha Disabled in Dev</div>
          )}

          <button
            type="submit"
            disabled={submitting || !turnstileToken}
            className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 bg-[var(--brand)] text-white font-medium rounded-xl hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-[var(--brand)]/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {isEdit ? 'Submit Edit Suggestion' : 'Submit Guide'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
