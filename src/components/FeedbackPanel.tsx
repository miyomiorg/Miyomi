import { useState } from 'react';
import { X, Send, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface FeedbackPanelProps {
  page: string;
  onClose: () => void;
}

export function FeedbackPanel({ page, onClose }: FeedbackPanelProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
          message: message.trim(),
          page,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setMessage('');
          onClose();
        }, 3000);
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
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Blurry Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isSubmitting) {
              setMessage('');
              onClose();
            }
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
          className="relative w-full max-w-lg z-10"
        >
          <div className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] p-6 shadow-2xl overflow-hidden">
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4 text-green-500">
                  <Smile className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-2">
                  Thank you!
                </h3>
                <p className="text-[var(--text-secondary)] font-['Inter',sans-serif]">
                  Your feedback helps us improve Miyomi for everyone.
                </p>
              </motion.div>
            ) : (
              <>
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
            </>
          )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}