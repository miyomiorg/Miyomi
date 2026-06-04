import React from 'react';
import { ArrowLeft, Shield, Eye, Lock, Server } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 animate-in fade-in duration-500">
      <button 
        onClick={() => navigate('/')} 
        className="mb-8 p-2 -ml-2 rounded-lg hover:bg-[var(--bg-elev-1)] text-[var(--text-secondary)] transition-colors inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-[var(--chip-bg)] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-[var(--brand)]" />
        </div>
        <h1 className="text-4xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-4">
          Privacy Policy
        </h1>
        <p className="text-[var(--text-secondary)]">
          Last updated: June 4, 2026
        </p>
      </div>

      <div className="space-y-8 text-[var(--text-primary)] font-['Inter',sans-serif] leading-relaxed">
        
        {/* Introduction */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">Introduction</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Welcome to Miyomi.app. We respect your privacy and are committed to protecting any personal information you may provide while using our website. This Privacy Policy explains what information we collect, why we collect it, and how we safeguard it.
          </p>
          <p className="text-[var(--text-secondary)]">
            By using Miyomi.app, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        {/* Information Collection */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-[var(--brand)]" />
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Information We Collect</h2>
          </div>
          
          <h3 className="font-semibold mt-6 mb-2">1. Form Submissions</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            When you submit an app, extension, guide, or provide feedback through our forms, we collect the information you voluntarily provide. This may include your name, email address, Discord handle, or other contact details. This data is strictly used to review your submissions and contact you regarding them.
          </p>

          <h3 className="font-semibold mt-6 mb-2">2. Automated Data & Security</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            We use Cloudflare Turnstile to protect our forms from spam and abuse. This service may analyze traffic and user interactions to verify human behavior. Please refer to Cloudflare's privacy policy for more details.
          </p>

          <h3 className="font-semibold mt-6 mb-2">3. Cookies and Local Storage</h3>
          <p className="text-[var(--text-secondary)] mb-4">
            We use local storage mechanisms to save your theme preferences (e.g., dark or light mode) and temporarily cache data to speed up your browsing experience. We do not use tracking cookies for targeted advertising.
          </p>
        </section>

        {/* How We Use Information */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-[var(--brand)]" />
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">How We Use Your Information</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
            <li>To review, verify, and publish community submissions to our directory.</li>
            <li>To communicate with you regarding your feedback, bug reports, or edits.</li>
            <li>To ensure the security and integrity of our platform.</li>
            <li>To maintain and improve the performance and usability of Miyomi.app.</li>
          </ul>
        </section>

        {/* Data Security */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-6 h-6 text-[var(--brand)]" />
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Data Security & Sharing</h2>
          </div>
          <p className="text-[var(--text-secondary)] mb-4">
            The security of your data is important to us. Our backend infrastructure is hosted on Supabase, which provides robust security measures. We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties.
          </p>
          <p className="text-[var(--text-secondary)]">
            We may disclose your personal information only if required to do so by law or in response to valid requests by public authorities.
          </p>
        </section>

        {/* Third Party Links */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">Third-Party Links</h2>
          <p className="text-[var(--text-secondary)]">
            Miyomi.app acts as a directory and contains links to third-party applications, extensions, and websites. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services. We encourage you to read their respective privacy policies.
          </p>
        </section>

        {/* Changes */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">Changes to This Privacy Policy</h2>
          <p className="text-[var(--text-secondary)] mb-4">
            We may update our Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.
          </p>
        </section>

        {/* Contact Us */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)]">Contact Us</h2>
          <p className="text-[var(--text-secondary)]">
            If you have any questions about this Privacy Policy or wish to request the removal of your data, please contact us via our GitHub repository or use our feedback forms available on the site.
          </p>
        </section>

      </div>
    </div>
  );
}
