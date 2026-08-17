import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', destructive = true, children }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm rounded-2xl border shadow-2xl p-6 animate-fade-in"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: destructive ? 'color-mix(in srgb, var(--destructive) 15%, transparent)' : 'var(--chip-bg)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: destructive ? 'var(--destructive)' : 'var(--brand)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{message}</p>
          </div>
        </div>
        {children && <div className="mb-4">{children}</div>}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--divider)', color: 'var(--text-primary)', background: 'var(--bg-elev-1)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: destructive ? 'var(--destructive)' : 'var(--brand)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
