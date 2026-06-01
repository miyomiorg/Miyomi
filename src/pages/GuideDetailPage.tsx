import { ArrowLeft, BookOpen, Clock, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import type { GuideData } from '../types/data';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { DevBanner } from '../components/DevBanner';

marked.setOptions({ breaks: true, gfm: true });

interface GuideDetailPageProps {
  slug?: string;
  onNavigate?: (path: string) => void;
}

export function GuideDetailPage({ slug: propSlug, onNavigate }: GuideDetailPageProps) {
  const params = useParams<{ slug: string }>();
  const slug = propSlug || params.slug;
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    dataService.getGuideBySlug(slug)
      .then(setGuide)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

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
      {/* Back Button */}
      <button
        onClick={() => onNavigate?.('/guides')}
        className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors mb-6 sm:mb-8 font-['Inter',sans-serif] group"
        style={{ fontWeight: 500 }}
      >
        <div className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto rounded-full bg-[var(--bg-surface)] sm:bg-transparent border border-[var(--divider)] sm:border-transparent group-hover:border-[var(--brand)] shadow-sm sm:shadow-none transition-all">
          <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4" />
        </div>
        <span className="hidden sm:inline">Back to Guides</span>
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
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
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mb-4"
          style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: '1.2', fontWeight: 700 }}
        >
          {guide.title}
        </h1>

        <div className="flex flex-wrap gap-2">
          {guide.tags.map((tag) => (
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

      {/* Content */}
      <div
        className="rounded-2xl border border-[var(--divider)] bg-[var(--bg-surface)] p-6 sm:p-8"
        style={{ boxShadow: '0 6px 20px 0 rgba(0,0,0,0.08)' }}
      >
        <div
          className="prose prose-invert max-w-none prose-headings:font-['Poppins',sans-serif] prose-p:font-['Inter',sans-serif] prose-a:text-[var(--brand)] prose-img:rounded-xl prose-img:shadow-lg prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)] prose-strong:text-[var(--text-primary)] prose-code:text-[var(--brand)] prose-code:bg-[var(--chip-bg)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-pre:bg-[var(--bg-elev-1)] prose-pre:border prose-pre:border-[var(--divider)] prose-pre:rounded-xl prose-blockquote:border-l-[var(--brand)] prose-blockquote:bg-[var(--chip-bg)] prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-hr:border-[var(--divider)]"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              (guide as any).content_format === 'markdown'
                ? (marked.parse(guide.content) as string)
                : guide.content,
              {
                ADD_TAGS: ['iframe', 'style', 'div', 'details', 'summary'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'style', 'class', 'target', 'open'],
              }
            )
          }}
        />
      </div>

      {/* Related Guides */}
      <div className="mt-8 rounded-2xl bg-[var(--bg-elev-1)] p-6 text-center">
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
  );
}
