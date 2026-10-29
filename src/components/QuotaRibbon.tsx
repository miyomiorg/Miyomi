import { useState, useEffect } from 'react';
import { AlertCircle, Heart } from 'lucide-react';
import { m as motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export function QuotaRibbon() {
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleError = (e: Event) => {
      const customEvent = e as CustomEvent;
      setErrorStatus(customEvent.detail?.status || 500);
    };
    const handleQuotaExceeded = () => setErrorStatus(402);

    window.addEventListener('supabase-error', handleError);
    window.addEventListener('supabase-quota-exceeded', handleQuotaExceeded);
    
    return () => {
      window.removeEventListener('supabase-error', handleError);
      window.removeEventListener('supabase-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  let title = "Database Error";
  let subtitle = "An unexpected database error occurred.";
  let message = "Please notify the admins or team members so they can investigate and resolve this issue.";
  let showDonate = false;

  if (errorStatus === 402) {
    title = "Temporary Service Limitation";
    subtitle = "Due to growing community activity, Miyomi has reached its current database resource limits.";
    message = "Miyomi is a free, community-driven open-source platform built for anime and manga fans. Support from contributors and donors helps us improve infrastructure, maintain uptime, and continue development for the community.";
    showDonate = true;
  } else if (errorStatus === 429) {
    title = "Too Many Requests";
    subtitle = "Our database is receiving too many requests right now.";
    message = "Please slow down and try again in a few moments. If the problem persists, please notify the admin team.";
  } else if (errorStatus === 503) {
    title = "Service Unavailable";
    subtitle = "The database service is temporarily overloaded or down for maintenance.";
    message = "We apologize for the inconvenience. Please notify the admins if this outage lasts longer than expected.";
  } else if (errorStatus === 500) {
    title = "Internal Server Error";
    subtitle = "The database encountered an unexpected internal error.";
    message = "Please notify the admin team so they can check the server logs and fix the issue.";
  }

  return (
    <AnimatePresence>
      {errorStatus !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 flex items-start sm:items-center gap-3 px-4 py-3 rounded-xl border bg-[var(--destructive)]/10 border-[var(--destructive)] text-[var(--destructive)]"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-bold text-base">{title}</p>
              <p className="font-medium text-sm">{subtitle}</p>
              <p className="text-sm opacity-80 leading-relaxed">{message}</p>
            </div>
            {showDonate && (
              <button
                onClick={() => {
                  navigate('/donate');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-shrink-0 flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-lg bg-[var(--destructive)] text-white text-sm font-medium hover:bg-[var(--destructive)]/90 transition-colors shadow-sm"
              >
                <Heart className="w-4 h-4 fill-white" />
                Donate to Help
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
