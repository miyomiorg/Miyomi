import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface FeedbackPanelProps {
  page: string;
  onClose: () => void;
}

export function FeedbackPanel({ page, onClose }: FeedbackPanelProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          type: 'general',
          message: message.trim(),
          page,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success('Thank you for your feedback!');
        setMessage('');
        onClose();
      } else {
        toast.error('Failed to send feedback. Please try again.');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] p-5 shadow-[0_8px_20px_rgba(0,0,0,0.12)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-['Inter',sans-serif] text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">
              Feedback
            </p>
            <h3
              className="mt-2 font-['Poppins',sans-serif] text-[var(--text-primary)]"
              style={{
                fontSize: '24px',
                fontWeight: 600,
                letterSpacing: '-0.015em',
              }}
            >
              Your Feedback
            </h3>
            <p className="mt-2 font-['Inter',sans-serif] text-sm text-[var(--text-secondary)]">
              Let us know your thoughts or report an issue.
            </p>
          </div>
          <button
            onClick={() => {
              setMessage('');
              onClose();
            }}
            className="rounded-xl p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--chip-bg)] hover:text-[var(--text-primary)]"
            aria-label="Close feedback panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Textarea */}
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Tell us what you think or report an issue with the website..."
            className="w-full rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] p-4 font-['Inter',sans-serif] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--brand)] focus:outline-none"
            style={{ minHeight: '130px', resize: 'vertical' }}
          />

          {/* Footer Text */}
          <p className="font-['Inter',sans-serif] text-sm text-[var(--text-secondary)]">
            If you want a reply to your feedback, feel free to mention a contact in the message.
          </p>

          {/* Action Buttons */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting}
              className="flex items-center justify-center rounded-xl bg-[var(--brand)] px-5 py-2 font-['Inter',sans-serif] text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Feedback'}
              <Send className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}