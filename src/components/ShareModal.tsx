import React, { useState } from 'react';
import { Copy, Share, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
}

export function ShareModal({ isOpen, onClose, title, url }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm rounded-3xl border border-[var(--divider)] bg-[var(--bg-surface)] shadow-2xl p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)]">
                  <Share className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Share</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Share <strong>{title}</strong> with others:
            </p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-elev-1)] border border-[var(--divider)]">
              <div className="flex-1 overflow-hidden px-2">
                <p className="truncate text-sm text-[var(--text-primary)] font-mono">{url}</p>
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center justify-center p-2 rounded-lg bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)] transition-colors shrink-0"
              >
                {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
