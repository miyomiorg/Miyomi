import { ArrowLeft, BookOpen, Clock, Tag, List, ThumbsUp, ThumbsDown, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import DOMPurify from 'dompurify';
import { BackButton } from '../components/BackButton';
import { DetailActions } from '../components/DetailActions';
import { ReportModal } from '../components/ReportModal';
import { toast } from 'sonner';

// Allow deep links
const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|mihon|tachiyomi|aniyomi|tachi|cloudstream):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

let headingCount = 0;

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'h2' || data.tagName === 'h3') {
    const el = node as Element;
    if (!el.id) {
      el.id = `toc-heading-${headingCount++}`;
    }
  }
  if (data.tagName === 'iframe') {
    const el = node as Element;
    const src = el.getAttribute('src');
    if (!src) {
      node.parentNode?.removeChild(node);
      return;
    }
    const allowedDomains = [
      'youtube.com', 'youtube-nocookie.com', 'drive.google.com',
      'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
      'tiktok.com', 'vimeo.com', 'reddit.com'
    ];
    try {
      const url = new URL(src, window.location.origin);
      if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
        node.parentNode?.removeChild(node);
      }
    } catch {
      node.parentNode?.removeChild(node);
    }
  }
});

interface GuideDetailPageProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export function GuideDetailPage({ slug: propSlug, onNavigate }: GuideDetailPageProps) {
  const params = useParams<{ slug: string }>();
  const slug = propSlug || params.slug;
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');
  const [showMobileToc, setShowMobileToc] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleShare = async (title: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      console.error("Failed to copy", e);
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this guide: ${title}`,
          url
        });
      } catch (err) {
        toast.success("Link copied to clipboard!");
      }
    } else {
      toast.success("Link copied to clipboard!");
    }
  };

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    dataService.getGuideBySlug(slug)
      .then(setGuide)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  // Extract ToC from DOM after render
  useEffect(() => {
    if (loading || !guide || !contentRef.current) return;

    // Use a short timeout to let dangerouslySetInnerHTML finish rendering
    const timer = setTimeout(() => {
      if (!contentRef.current) return;
      const headings = Array.from(contentRef.current.querySelectorAll('h2, h3')) as HTMLElement[];
      const newToc = headings.map((el) => {
        // Ensure ID exists (in case DOMPurify missed it)
        if (!el.id) {
          el.id = `toc-heading-${headingCount++}`;
        }
        return {
          id: el.id,
          text: el.textContent || '',
          level: el.tagName === 'H2' ? 2 : 3
        };
      });
      setToc(newToc);
    }, 100);
    return () => clearTimeout(timer);
  }, [guide, loading]);

  // Handle Scroll Spy for ToC
  useEffect(() => {
    if (loading || !guide || toc.length === 0) return;

    const handleScroll = () => {
      const headings = toc.map(h => document.getElementById(h.id)).filter(Boolean) as HTMLElement[];
      const scrollPosition = window.scrollY + 100;

      let current = headings[0]?.id || '';
      for (const heading of headings) {
        if (heading.offsetTop <= scrollPosition) {
          current = heading.id;
        } else {
          break;
        }
      }
      setActiveHeadingId(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, guide, toc]);

  // Reset DOMPurify heading count before render
  headingCount = 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand)]"></div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16 sm:py-24">
          <div className="text-6xl sm:text-8xl mb-6 opacity-50">📖</div>
          <h3 className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2" style={{ fontSize: '20px', fontWeight: 600 }}>
            Guide not found
          </h3>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-6">
            This guide is coming soon or doesn't exist yet.
          </p>
          <button
            onClick={() => onNavigate?.('/guides')}
            className="px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-strong)] text-white rounded-xl transition-all font-['Inter',sans-serif]"
            style={{ fontWeight: 600 }}
          >
            Back to Guides
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} targetType="guide" targetId={guide.id} targetName={guide.title} pageUrl={window.location.href} />

      {/* Top Bar (Back Button + Actions) */}
      <div className="flex items-center justify-between mb-4 sm:mb-8">
        <BackButton
          onClick={() => onNavigate?.('/guides')}
          label="Back to Guides"
        />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DetailActions
            targetType="guide"
            targetId={guide.id}
            targetName={guide.title}
            onReportClick={() => setIsReportOpen(true)}
            onShareClick={() => handleShare(guide.title, window.location.href)}
          />
        </motion.div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-2 sm:mb-8"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-['Inter',sans-serif] text-white"
            style={{ backgroundColor: '#6366F1', fontSize: '13px', fontWeight: 600 }}
          >
            <BookOpen className="h-4 w-4" />
            {guide.category}
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-['Inter',sans-serif]" style={{ fontSize: '14px' }}>
            <Clock className="h-4 w-4" />
            {guide.readTime}
          </span>
        </div>

        <h1
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-3 sm:mb-4"
          style={{ fontSize: 'clamp(24px, 5vw, 40px)', lineHeight: '1.2', fontWeight: 700 }}
        >
          {guide.title}
        </h1>

        {/* Author / Metadata */}
        {(guide.author_name || guide.author || guide.published_at) && (
          <div className="flex flex-wrap items-center gap-3 mb-6 font-['Inter',sans-serif] text-sm">
            {(guide.author_name || guide.author) && (
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">Written by</span>
                <span className="font-semibold text-[var(--brand)]">
                  {guide.author_name || guide.author}
                </span>
              </div>
            )}
            {((guide.author_name || guide.author) && guide.published_at) && (
              <span className="text-[var(--text-secondary)] opacity-50">·</span>
            )}
            {guide.published_at && (
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Updated {new Date(guide.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {guide.tags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--chip-bg)] px-2.5 py-1 font-['Inter',sans-serif] text-[var(--text-secondary)] px-2"
              style={{ fontSize: '12px' }}
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div
            ref={contentRef}
            className="sm:rounded-2xl sm:border sm:border-[var(--divider)] sm:bg-[var(--bg-surface)] sm:shadow-[0_6px_20px_0_rgba(0,0,0,0.08)] py-0 sm:p-8 mb-6 sm:mb-8"
          >
            <div
              className="guide-content prose prose-invert max-w-none prose-headings:font-['Poppins',sans-serif] prose-headings:scroll-mt-24 prose-h2:text-2xl sm:prose-h2:text-3xl prose-h3:text-xl sm:prose-h3:text-2xl prose-h2:mt-6 prose-h2:mb-4 prose-p:font-['Inter',sans-serif] prose-a:text-[var(--brand)] prose-img:rounded-xl prose-img:shadow-lg prose-headings:text-[var(--text-primary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--brand)] prose-code:bg-[var(--chip-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-[var(--bg-elev-1)] prose-pre:border prose-pre:border-[var(--divider)] prose-pre:rounded-xl prose-blockquote:border-l-[var(--brand)] prose-blockquote:bg-[var(--chip-bg)] prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-hr:border-[var(--divider)] [&>*:first-child]:mt-0"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(
                  guide.content || '',
                  {
                    ADD_TAGS: ['iframe', 'style', 'div', 'details', 'summary'],
                    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'class', 'id', 'target', 'open', 'data-callout', 'data-callout-type', 'data-container', 'src', 'width', 'height', 'title'],
                    ALLOWED_URI_REGEXP,
                  }
                )
              }}
            />
          </div>

          {/* Feedback Widget */}
          <div className="mb-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.05)' }}>
            <div>
              <h3 className="text-[var(--text-primary)] font-['Poppins',sans-serif] font-semibold mb-1">Was this guide helpful?</h3>
              <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm">Your feedback helps us improve our documentation.</p>
            </div>
            {!feedbackGiven ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFeedbackGiven(true); toast.success('Thanks for your feedback!'); }}
                  className="p-3 rounded-xl border border-[var(--divider)] hover:border-[var(--brand)] hover:text-[var(--brand)] text-[var(--text-secondary)] bg-[var(--bg-elev-1)] hover:bg-[var(--chip-bg)] transition-all"
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setFeedbackGiven(true); toast.success('Thanks for your feedback! We will try to improve this guide.'); }}
                  className="p-3 rounded-xl border border-[var(--divider)] hover:border-red-500 hover:text-red-500 text-[var(--text-secondary)] bg-[var(--bg-elev-1)] hover:bg-red-50 transition-all dark:hover:bg-red-950/30"
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="px-4 py-2 bg-[var(--chip-bg)] text-[var(--brand)] font-medium rounded-lg text-sm flex items-center gap-2">
                Feedback received. Thank you! 🎉
              </div>
            )}
          </div>

          {/* Related Guides */}
          <div className="rounded-2xl bg-[var(--bg-elev-1)] p-6 text-center">
            <h3
              className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-2"
              style={{ fontSize: '18px', fontWeight: 600 }}
            >
              Need more help?
            </h3>
            <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] mb-4" style={{ fontSize: '14px' }}>
              Check out our FAQ or join the community for support.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate?.('/faq')}
                className="px-4 py-2 bg-[var(--bg-surface)] border border-[var(--divider)] hover:border-[var(--brand)] text-[var(--text-primary)] rounded-xl transition-all font-['Inter',sans-serif]"
                style={{ fontWeight: 500, fontSize: '14px' }}
              >
                View FAQ
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar ToC */}
        {toc.length > 0 && (
          <div className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--divider)]" style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.05)' }}>
              <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                <List className="w-4 h-4" /> On this page
              </h3>
              <nav className="space-y-1 text-sm font-['Inter',sans-serif]">
                {toc.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => {
                      document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`block w-full text-left py-1.5 transition-colors ${heading.level === 3 ? 'pl-4' : ''
                      } ${activeHeadingId === heading.id
                        ? 'text-[var(--brand)] font-medium'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Mobile FAB for ToC */}
      {toc.length > 0 && (
        <div className="lg:hidden fixed bottom-[90px] right-6 z-50">
          <button
            onClick={() => setShowMobileToc(true)}
            className="w-14 h-14 bg-[var(--brand)] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform"
          >
            <List className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Mobile ToC Bottom Sheet */}
      <AnimatePresence>
        {showMobileToc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileToc(false)}
              className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] rounded-t-3xl z-50 p-6 max-h-[80vh] overflow-y-auto lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-['Poppins',sans-serif] text-xl text-[var(--text-primary)] font-semibold flex items-center gap-2">
                  <List className="w-5 h-5" /> On this page
                </h3>
                <button
                  onClick={() => setShowMobileToc(false)}
                  className="p-2 rounded-full bg-[var(--bg-elev-1)] text-[var(--text-secondary)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-2 font-['Inter',sans-serif]">
                {toc.map((heading) => (
                  <button
                    key={heading.id}
                    onClick={() => {
                      setShowMobileToc(false);
                      setTimeout(() => {
                        document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' });
                      }, 300);
                    }}
                    className={`block w-full text-left p-3 rounded-xl transition-colors ${heading.level === 3 ? 'ml-4 w-[calc(100%-1rem)]' : ''
                      } ${activeHeadingId === heading.id
                        ? 'bg-[var(--chip-bg)] text-[var(--brand)] font-medium'
                        : 'bg-[var(--bg-elev-1)] text-[var(--text-secondary)]'
                      }`}
                  >
                    {heading.text}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
