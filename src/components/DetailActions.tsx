import React, { useState } from 'react';
import { MoreHorizontal, Share, Edit2, Flag, PlusCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface DetailActionsProps {
  targetType: 'app' | 'extensions' | 'guide';
  targetId: string;
  targetName: string;
  onReportClick: () => void;
  onShareClick: () => void;
}

export function DetailActions({ targetType, targetId, targetName, onReportClick, onShareClick }: DetailActionsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleEditClick = () => {
    if (targetType === 'guide') {
      navigate(`/submit-guide?editId=${targetId}`);
    } else {
      const routeType = targetType === 'app' ? 'software' : 'extensions';
      navigate(`/contribute?type=${routeType}&mode=edit&id=${targetId}&step=form`);
    }
    setDropdownOpen(false);
  };

  const handleAddNewClick = () => {
    if (targetType === 'guide') {
      navigate(`/submit-guide`);
    } else {
      navigate(`/contribute?step=select`);
    }
    setDropdownOpen(false);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const baseButtonClass = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm";
  const iconButtonClass = "flex items-center justify-center w-10 h-10 rounded-full border border-[var(--divider)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elev-1)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] shadow-sm transition-all";

  if (isMobile) {
    return (
      <div className="flex items-center gap-2 relative">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)} 
          className={iconButtonClass}
          aria-label="More actions"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        <button 
          onClick={onShareClick} 
          className={iconButtonClass}
          aria-label="Share"
        >
          <Share className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40" 
                onClick={() => setDropdownOpen(false)} 
              />
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-12 right-12 mt-1 w-48 rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)]/80 backdrop-blur-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="flex flex-col py-2">
                  <button onClick={handleEditClick} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)] transition-colors">
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => { onReportClick(); setDropdownOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)] transition-colors">
                    <Flag className="w-4 h-4" /> Report
                  </button>
                  <div className="h-px bg-[var(--divider)] my-1 mx-4" />
                  <button onClick={handleAddNewClick} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--brand)] transition-colors">
                    <PlusCircle className="w-4 h-4" /> Add New
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={handleEditClick} className={baseButtonClass}>
        <Edit2 className="w-4 h-4" /> Edit
      </button>
      <button onClick={onReportClick} className={baseButtonClass}>
        <Flag className="w-4 h-4" /> Report
      </button>
      <button onClick={handleAddNewClick} className={baseButtonClass}>
        <PlusCircle className="w-4 h-4" /> Add New
      </button>
      <button onClick={onShareClick} className={baseButtonClass}>
        <Share className="w-4 h-4" /> Share
      </button>
    </div>
  );
}
