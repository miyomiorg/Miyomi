import React from 'react';
import { ArrowLeft, Shield, Database, Fingerprint, FileText, Globe, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
      <button
        onClick={() => navigate('/')}
        className="mb-8 p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="mb-10 text-center">
        <div className="w-14 h-14 bg-[var(--chip-bg)] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Shield className="w-7 h-7 text-[var(--brand)]" />
        </div>
        <h1 className="text-3xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Last updated: June 11, 2026
        </p>
      </div>

      {/* TL;DR */}
      <div className="mb-8 p-5 rounded-2xl bg-[var(--chip-bg)] border border-[var(--brand)]/20">
        <h2 className="font-semibold text-[var(--text-primary)] mb-2 text-sm uppercase tracking-wider">TL;DR</h2>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          We don't use analytics, tracking scripts, or advertising cookies. We store your preferences locally in your browser. The only personal info we collect is what you <em>voluntarily</em> type into our forms (like your name or contact info when submitting an app). We never sell your data.
        </p>
      </div>

      <div className="space-y-6 text-[var(--text-primary)] font-['Inter',sans-serif] leading-relaxed">

        {/* What We Store Locally */}
        <section className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <Database className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">What We Store in Your Browser</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-3">
            We use your browser's <strong>localStorage</strong> (not cookies) to remember a few things so the site works smoothly:
          </p>
          <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Your theme choice and display mode (dark/light)</li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Your preferred view layout (grid vs. list)</li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Which items you've liked (so you don't lose your likes)</li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Temporary data caches to speed up page loads</li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Dismissed notice banners</li>
          </ul>
          <p className="text-xs text-[var(--text-secondary)] mt-3 opacity-70">
            This data never leaves your device. Clearing your browser data removes it entirely.
          </p>
        </section>

        {/* Anti-Abuse Fingerprinting */}
        <section className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <Fingerprint className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Anti-Abuse Protection</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            To prevent LIKE manipulation and spam, we generate a <strong>hashed device fingerprint</strong> when you LIKE an item or submit a report. This is a one-way hash — we cannot reverse it to identify you. It's only used to limit duplicate LIKEs and flag abusive reports.
          </p>
          <p className="text-[var(--text-secondary)] text-sm">
            We also use <strong>Cloudflare Turnstile</strong> on submission forms to verify you're human. Turnstile does not track you across sites — see <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] underline underline-offset-2 hover:opacity-80">Cloudflare's privacy policy</a>.
          </p>
        </section>

        {/* Form Submissions */}
        <section className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <FileText className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Form Submissions</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            When you submit an app, extension, feedback, or report, we store the data you type into the form. This may include:
          </p>
          <ul className="space-y-1.5 text-sm text-[var(--text-secondary)] mb-2">
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Your name and contact info <strong>(optional — you can submit anonymously)</strong></li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>The content of your submission or feedback</li>
            <li className="flex items-start gap-2"><span className="text-[var(--brand)] mt-0.5">•</span>Basic device info (browser, OS, screen size) attached to reports for debugging</li>
          </ul>
          <p className="text-xs text-[var(--text-secondary)] opacity-70">
            This data is stored in our database (hosted on Supabase) and is only accessed by site administrators for review purposes.
          </p>
        </section>

        {/* What We DON'T Do */}
        <section className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">What We Don't Do</h2>
          </div>
          <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✗</span>No Google Analytics or any third-party analytics</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✗</span>No tracking cookies or advertising pixels</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✗</span>No selling, renting, or sharing your data with third parties</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✗</span>No cross-site tracking of any kind</li>
            <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✗</span>No user accounts required for browsing</li>
          </ul>
        </section>

        {/* Third-Party Links & Disclaimer */}
        <section id="disclaimer" className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <Globe className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Third-Party Links & Disclaimer</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            Miyomi is a directory — we list apps and extensions but <strong>have no affiliation</strong> with their developers. We don't guarantee external links are safe or functional. Use them at your own discretion.
          </p>
          <p className="text-[var(--text-secondary)] text-sm">
            If you find a suspicious or broken listing, please report it using the feedback button so we can investigate.
          </p>
        </section>

        {/* Contact & Data Removal */}
        <section className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-2.5 mb-3">
            <Mail className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Contact & Data Removal</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            Want your submission data removed? Reach out via our GitHub repository or use the feedback forms on the site. We may update this policy occasionally — the date at the top always reflects the latest version.
          </p>
        </section>

      </div>
    </div>
  );
}
