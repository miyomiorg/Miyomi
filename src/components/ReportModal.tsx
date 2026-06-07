import React, { useState } from 'react';
import { Flag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import Turnstile from 'react-turnstile';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { collectDeviceInfo } from '@/utils/deviceInfo';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'app' | 'extension' | 'page' | 'other';
  targetId?: string;
  targetName?: string;
  pageUrl?: string;
}

const REPORT_REASONS = [
  'Inappropriate content (NSFW not tagged)',
  'Broken link or download',
  'Outdated or incorrect information',
  'Spam or misleading',
  'DMCA / Copyright violation',
  'Other'
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetName, pageUrl }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [message, setMessage] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [turnstileToken, setTurnstileToken] = useState(import.meta.env.VITE_DISABLE_TURNSTILE === 'true' ? 'dummy-token' : '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnstileToken) {
      toast.error('Please complete the CAPTCHA');
      return;
    }
    if (reason === 'Other' && !otherReason.trim()) {
      toast.error('Please specify the reason.');
      return;
    }
    if (!message.trim()) {
      toast.error('Please provide some details in the message field.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const fingerprintData = await getDeviceFingerprint();
      const deviceInfo = collectDeviceInfo();

      const payload = {
        targetType,
        targetId,
        targetName,
        pageUrl: pageUrl || window.location.href,
        reason: reason === 'Other' ? `(Other) ${otherReason.trim()}` : reason,
        message,
        reporterName,
        reporterContact,
        reporterUserId: user?.id,
        turnstileToken,
        device_fingerprint: fingerprintData.fingerprint,
        anonymousId: deviceInfo.anonymous_id,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device_type: deviceInfo.device_type,
        screen_resolution: deviceInfo.screen_resolution,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language
      };

      const { data, error } = await supabase.functions.invoke('report-content', {
        body: payload
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to submit report');

      setSubmitted(true);
      toast.success('Thanks! Your report was submitted and will be reviewed.');
    } catch (err: any) {
      console.error(err);
      toast.error('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state on close
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setOtherReason('');
      setReporterName('');
      setReporterContact('');
      setTurnstileToken(import.meta.env.VITE_DISABLE_TURNSTILE === 'true' ? 'dummy-token' : '');
    }, 300);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg rounded-3xl border border-[var(--divider)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden flex flex-col max-h-full"
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--divider)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                  <Flag className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Submit a Report</h2>
              </div>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Report Submitted</h3>
                  <p className="text-[var(--text-secondary)] mb-6">Thank you for helping keep Miyomi safe and accurate. Our moderators will review this shortly.</p>
                  <button onClick={handleClose} className="px-6 py-2.5 rounded-xl bg-[var(--brand)] text-white font-medium hover:bg-[var(--brand-strong)] transition-colors">
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Reason</label>
                    <select 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                    >
                      {REPORT_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  {reason === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Specify Reason <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={otherReason}
                        onChange={(e) => setOtherReason(e.target.value)}
                        required
                        placeholder="Briefly describe the reason..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Message / Details <span className="text-red-500">*</span></label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      placeholder="Please provide specific details..."
                      className="w-full px-4 py-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none min-h-[100px] resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Your Name (Optional)</label>
                      <input 
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="Anonymous"
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Contact (Optional)</label>
                      <input 
                        type="text"
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                        placeholder="Email or Telegram"
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--divider)] bg-[var(--bg-elev-1)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all outline-none"
                      />
                    </div>
                  </div>

                  {import.meta.env.VITE_DISABLE_TURNSTILE !== 'true' && (
                    <div className="pt-2 flex justify-center">
                      <Turnstile
                        sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA"}
                        onVerify={(token) => setTurnstileToken(token)}
                        theme="auto"
                      />
                    </div>
                  )}

                  <div className="pt-4 mt-4 border-t border-[var(--divider)] flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-xl border border-[var(--divider)] text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--text-primary)] transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting || !turnstileToken || !message.trim() || (reason === 'Other' && !otherReason.trim())}
                      className="flex items-center px-5 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
                    >
                      {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
                      Submit Report
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
