import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { AnimatePresence, m as motion } from 'motion/react';

interface BackToTopButtonProps {
  /**
   * `true` (default): fixed to the bottom-right corner, above the mobile bottom
   * navigation. `false`: render only the button, for stacking inside an
   * existing floating container (e.g. above the guide's "On this page" button).
   */
  floating?: boolean;
  /** Fraction of the scrollable height after which the button appears. */
  threshold?: number;
  className?: string;
}

/** Becomes true once the window has scrolled past `threshold` of its scrollable height. */
function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      // Skip pages that barely scroll; there is nothing to go "back" from.
      const isLongPage = scrollable > window.innerHeight / 2;
      setPast(isLongPage && window.scrollY > scrollable * threshold);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    // Content that loads after mount changes the page height without a scroll event.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [threshold]);

  return past;
}

/** Round "back to top" button that appears after the reader scrolls past half the page. */
export function BackToTopButton({ floating = true, threshold = 0.5, className = '' }: BackToTopButtonProps) {
  const visible = useScrolledPast(threshold);

  const button = (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          type="button"
          initial={{ opacity: 0, scale: 0.6, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          title="Back to top"
          className={`w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--divider)] shadow-xl hover:scale-105 hover:text-[var(--brand)] hover:border-[var(--brand)]/50 transition-[transform,color,border-color] ${floating ? '' : className}`}
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );

  if (!floating) return button;
  return (
    <div className={`fixed z-50 right-6 bottom-[90px] md:right-8 md:bottom-8 ${className}`}>
      {button}
    </div>
  );
}
