import { AlertCircle, Smartphone, Puzzle, BookOpen, Link as LinkIcon, Heart, Users, Github, ArrowUpRight, UploadCloud, Coffee } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { Link } from 'react-router-dom';

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl ${className}`}
      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
    >
      {children}
    </div>
  );
}

const teamMembers = [
  {
    name: 'Tas33n',
    role: 'Maintainer',
    description: 'Builds and maintains Miyomi.',
    avatar: 'https://github.com/tas33n.png',
    link: 'https://github.com/tas33n',
  },
  {
    name: 'Mikiko',
    role: 'Manager',
    description: 'Manages the community.',
    avatar: 'https://github.com/mikkiio.png',
    link: 'https://github.com/mikkiio',
  },
  {
    name: 'Saf',
    role: 'Community Admin',
    description: 'Works on data verification, approvals, and entries.',
    avatar: 'https://github.com/ghost.png',
    link: null,
  },
];

export function AboutPage() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12">
      {isFeedbackOpen && (
        <FeedbackPanel page="about" onClose={() => setIsFeedbackOpen(false)} />
      )}

      {/* HERO */}
      <section className="mb-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mt-3 md:mt-4 mb-4"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: '1.1', fontWeight: 800 }}
        >
          Miyomi
        </motion.h1>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-2xl mx-auto text-lg leading-relaxed">
          A directory of manga, anime, and novel apps, extensions, and more.
        </p>
      </section>

      {/* DISCLAIMER */}
      <section id="disclaimer" className="mb-12">
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20">
          <div className="flex gap-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-2 text-lg">Disclaimer of Liability & Affiliation</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
                Miyomi is simply a directory. We have <strong>no affiliation</strong> with the developers or creators of the apps, extensions, or resources listed here. We do not build, host, or distribute any of this content.
              </p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
                <strong>Limitation of Liability:</strong> Miyomi provides this directory on an "as-is" and "as-available" basis. We do not warrant that external links, extensions, or applications indexed here are safe, secure, or compatible with your device. We expressly disclaim all liability for any technical disruptions, system errors, data loss, or other adverse effects arising from your interaction with third-party tools.
              </p>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                <strong>Help us keep the community safe:</strong> If you notice any suspicious or compromised listings, please use the <button onClick={() => setIsFeedbackOpen(true)} className="font-bold underline text-amber-600 dark:text-amber-400">Feedback button</button> to report them for immediate investigation.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* OVERVIEW */}
      <section className="mb-16">
        <div className="mb-8">
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl md:text-3xl font-bold mb-4">
            Overview
          </h2>
          <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-3xl">
            Finding the right app can be a hassle. They are scattered across various platforms and forums. Miyomi pulls everything into one searchable directory. You can find:
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="flex flex-col items-center text-center hover:border-blue-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Software</h3>
            <p className="text-sm text-[var(--text-secondary)]">Reading apps and trackers.</p>
          </Card>

          <Card className="flex flex-col items-center text-center hover:border-purple-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Puzzle className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Extensions</h3>
            <p className="text-sm text-[var(--text-secondary)]">Sources and plugin repos.</p>
          </Card>

          <Card className="flex flex-col items-center text-center hover:border-green-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Guides</h3>
            <p className="text-sm text-[var(--text-secondary)]">Setup and troubleshooting.</p>
          </Card>

          <Card className="flex flex-col items-center text-center hover:border-orange-500/50 transition-colors group">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LinkIcon className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">Resources</h3>
            <p className="text-sm text-[var(--text-secondary)]">Helpful links and sites.</p>
          </Card>
        </div>
      </section>

      {/* COMMUNITY DRIVEN */}
      <section className="mb-16">
        <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
          <div className="max-w-3xl">
            <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-[var(--brand)]" />
              Community-Driven
            </h2>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-6">
              Miyomi is an independent fan-run project. The directory currently grows almost entirely through your help. If you find any errors or are willing to add more entries, please help us out:
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/contribute"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--brand)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                <UploadCloud className="w-5 h-5" />
                Use the Contribute page
              </Link>
              <a
                href="https://github.com/tas33n/miyomi/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-elev-2)] transition-colors shadow-sm"
              >
                <Github className="w-5 h-5" />
                Open a GitHub issue
              </a>
            </div>
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* MIYOMI TEAM */}
        <section>
          <Card className="h-full">
            <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-bold mb-6 flex items-center gap-2">
              <Heart className="w-6 h-6 text-pink-500" />
              Miyomi Team
            </h2>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.name} className="flex items-center p-4 bg-[var(--bg-elev-1)] rounded-xl border border-[var(--divider)] gap-4 transition-transform hover:-translate-y-0.5">
                  <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full border border-[var(--divider)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{member.name}</span>
                      {member.link && (
                        <a href={member.link} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors">
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs font-medium text-[var(--brand)] mb-0.5">{member.role}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{member.description}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-4 bg-[var(--brand)]/10 rounded-xl border border-[var(--brand)]/20">
                <span className="font-bold text-lg text-[var(--brand)] flex items-center gap-2">
                  and YOU <Heart className="w-5 h-5 fill-current" />
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* SUPPORT */}
        <section>
          <Card className="h-full bg-gradient-to-br from-pink-50/50 to-rose-50/50 dark:from-pink-900/10 dark:to-rose-900/10">
            <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-bold mb-4 flex items-center gap-2">
              <Coffee className="w-6 h-6 text-rose-500" />
              Support the Project
            </h2>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
              If you find Miyomi helpful, consider supporting the project to help cover ongoing hosting and operational costs.
            </p>
            <Link
              to="/donate"
              className="inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-sm text-lg"
            >
              <Heart className="w-5 h-5 fill-current" />
              Support Us
            </Link>
          </Card>
        </section>
      </div>

    </div>
  );
}
