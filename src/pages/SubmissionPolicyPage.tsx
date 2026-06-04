import React from 'react';
import { ArrowLeft, Compass, CheckCircle2, XCircle, AlertTriangle, Shield, CheckSquare, Search, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function SubmissionPolicyPage() {
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
          <Compass className="w-8 h-8 text-[var(--brand)]" />
        </div>
        <h1 className="text-4xl font-bold font-['Poppins',sans-serif] text-[var(--text-primary)] mb-4">
          Miyomi Submission Policy
        </h1>
        <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
          Guidelines and rules for submitting apps, repositories, and tools to the Miyomi directory.
        </p>
      </div>

      <div className="space-y-8 text-[var(--text-primary)] font-['Inter',sans-serif] leading-relaxed">

        {/* 1. Core Rule */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">1</span>
            Core Rule (Golden Filter)
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            We only accept submissions that are:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)] mb-4">
            <li>Useful</li>
            <li>Safe to reference</li>
            <li>Clearly understood by reviewers</li>
          </ul>
          <div className="p-4 bg-[var(--chip-bg)] rounded-xl text-[var(--text-primary)] font-medium border-l-4 border-yellow-500">
            If we cannot understand what it does in under 5 minutes → it is rejected or put on hold.
          </div>
        </section>

        {/* 2. What We Accept */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">2</span>
            What We Accept
          </h2>
          <div className="flex items-center gap-2 text-green-500 mb-4 font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Allowed submissions
          </div>
          <ul className="space-y-3">
            {[
              "Open-source apps or tools (GitHub, GitLab, etc.)",
              "Android APK sources (official or trusted releases)",
              "Extensions / scripts (only if reviewed)",
              "Apps in any language if purpose is clear"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 3. What Gets Auto-Rejected */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-red-500/20">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold">3</span>
            What Gets Auto-Rejected
          </h2>
          <div className="flex items-center gap-2 text-red-500 mb-4 font-semibold">
            <XCircle className="w-5 h-5" /> Immediate rejection
          </div>
          <ul className="space-y-3">
            {[
              "Obfuscated / unclear purpose repos",
              "“Vibe code” / random experimental dumps with no description",
              "APKs with no source or no release page",
              "Warez, cracked apps, pirated content",
              "Short-lived spam repos made only for traffic",
              "Links that redirect to unknown download sites",
              "Anything requiring disabled security / weird installation steps"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Closed Source Rule */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">4</span>
            Closed Source Rule
          </h2>

          <div className="mb-6">
            <div className="flex items-center gap-2 text-yellow-500 mb-3 font-semibold">
              <AlertTriangle className="w-5 h-5" /> Closed source is allowed ONLY if:
            </div>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>The developer is identifiable (GitHub profile, website, or known brand)</li>
              <li>The app is publicly available and stable (Play Store / official site / trusted platform)</li>
              <li>It has real documentation or user base</li>
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2 text-red-500 mb-3 font-semibold">
              <XCircle className="w-5 h-5" /> Closed source is rejected if:
            </div>
            <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)]">
              <li>It's a random download link with no identity</li>
              <li>No reputation / no external presence</li>
              <li>Suspicious hosting or forced installers</li>
            </ul>
          </div>
        </section>

        {/* 5. Language & Accessibility */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">5</span>
            Language & Accessibility Rule
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Non-English projects are allowed, BUT must include:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-[var(--text-secondary)] mb-4">
            <li>A clear description in English OR translated summary by team</li>
          </ul>
          <div className="p-4 bg-[var(--chip-bg)] rounded-xl text-[var(--text-primary)] font-medium border-l-4 border-yellow-500">
            If the purpose cannot be understood → reject or hold.
          </div>
        </section>

        {/* 6. Safety Rule */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">6</span>
            Safety Rule (No Deep Testing Policy)
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-6 rounded-xl bg-red-500/5 border border-red-500/10">
              <h3 className="font-semibold text-red-400 mb-3">Miyomi team does NOT:</h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>• install APKs blindly</li>
                <li>• run unknown executables</li>
                <li>• execute scripts locally</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-green-500/5 border border-green-500/10">
              <h3 className="font-semibold text-green-400 mb-3">Instead we only:</h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>• review source code (if available)</li>
                <li>• check community reputation</li>
                <li>• check release safety signals</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-[var(--chip-bg)] rounded-xl text-[var(--text-primary)] font-medium border-l-4 border-red-500">
            If anything requires installation to "understand it" → we reject.
          </div>
        </section>

        {/* 7. Trust Signals */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">7</span>
            Trust Signals Checklist (Required)
          </h2>
          <p className="text-[var(--text-secondary)] mb-4 font-medium">
            A submission is only approved if <span className="text-[var(--text-primary)] font-bold">2+</span> of these are true:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Active GitHub history (recent commits)",
              "Many stars/forks OR real community usage",
              "Clear README + documentation",
              "Known developer or identity",
              "External mentions (Reddit, forums, etc.)",
              "Play Store / official distribution"
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--chip-bg)] border border-[var(--divider)] text-[var(--text-secondary)]">
                <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 8. Risk Levels */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-6 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">8</span>
            Risk Levels System
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-5 rounded-xl border border-green-500/20 bg-green-500/5">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-500 mb-1">Green (Auto Accept after quick check)</h3>
                <p className="text-sm text-[var(--text-secondary)]">Known apps/tools, clear GitHub repos, stable web apps.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-500 mb-1">Yellow (Needs review / team vote)</h3>
                <p className="text-sm text-[var(--text-secondary)]">New projects with low activity, closed-source but legit-looking apps, non-English tools.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-xl border border-red-500/20 bg-red-500/5">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-500 mb-1">Red (Reject)</h3>
                <p className="text-sm text-[var(--text-secondary)]">No documentation, suspicious downloads, fork spam / copy-paste repos, unknown APK sources, anything unclear or misleading.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Editorial Rule */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">9</span>
            Miyomi Editorial Rule
          </h2>
          <p className="text-[var(--text-primary)] font-medium text-lg mb-6 text-center">
            "We are a curation platform, not an index dump."
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 text-center rounded-xl bg-[var(--chip-bg)]">
              <div className="font-semibold text-[var(--text-primary)]">Clarity</div>
              <div className="text-sm text-[var(--text-secondary)]">over quantity</div>
            </div>
            <div className="p-4 text-center rounded-xl bg-[var(--chip-bg)]">
              <div className="font-semibold text-[var(--text-primary)]">Safety</div>
              <div className="text-sm text-[var(--text-secondary)]">over hype</div>
            </div>
            <div className="p-4 text-center rounded-xl bg-[var(--chip-bg)]">
              <div className="font-semibold text-[var(--text-primary)]">Usefulness</div>
              <div className="text-sm text-[var(--text-secondary)]">over trends</div>
            </div>
          </div>
          <div className="p-4 bg-[var(--chip-bg)] rounded-xl text-[var(--text-primary)] font-medium border-l-4 border-yellow-500">
            If something is "possibly good but unclear" → we do NOT list it.
          </div>
        </section>

        {/* 10. Final Decision */}
        <section className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--divider)]">
          <h2 className="text-2xl font-semibold mb-4 text-[var(--text-primary)] flex items-center gap-3">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--brand)] text-white text-sm font-bold">10</span>
            Final Decision Rule
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            If the team is unsure, we ask ourselves one question:
          </p>
          <blockquote className="p-6 rounded-xl bg-[var(--chip-bg)] italic text-[var(--text-primary)] mb-6 text-center font-medium border-l-4 border-[var(--brand)]">
            "If we had to explain this to a random user in 1 sentence and feel confident — would we?"
          </blockquote>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/10 text-green-500 font-semibold border border-green-500/20">
              <CheckCircle2 className="w-5 h-5" /> Yes → accept
            </div>
            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
              <XCircle className="w-5 h-5" /> No → reject or hold
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
