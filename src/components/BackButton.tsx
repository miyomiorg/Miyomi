import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface BackButtonProps {
  onClick: () => void;
  label?: React.ReactNode;
  className?: string;
}

export function BackButton({ onClick, label = "Back", className = "" }: BackButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      onClick={onClick}
      className={`group flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-all font-medium outline-none sm:px-4 sm:py-2 sm:rounded-xl sm:text-sm sm:border sm:border-[var(--divider)] sm:bg-[var(--bg-surface)] sm:hover:bg-[var(--bg-elev-1)] sm:hover:border-[var(--brand)] sm:shadow-sm ${className}`}
    >
      {/* Mobile View: Circular button */}
      <div className="flex sm:hidden items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-surface)] border border-[var(--divider)] group-hover:border-[var(--brand)] shadow-sm transition-all">
        <ArrowLeft className="w-5 h-5" />
      </div>
      
      {/* Desktop View: Icon */}
      <ArrowLeft className="hidden sm:block w-4 h-4" />
      
      {/* Desktop View: Label */}
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}
