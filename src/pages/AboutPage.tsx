import { Heart, Compass, Users, Github, ArrowUpRight, Globe2, Sparkles, ScanEye, Mail, MessageCircle, Send, AlertCircle, Code2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface LinkItem {
  label: string;
  href: string;
}

interface TeamMember {
  name: string;
  role: string;
  description: string;
  avatar: string;
  links: LinkItem[];
}

interface CreditItem {
  title: string;
  description: string;
  icon: ReactNode;
}

const team: readonly TeamMember[] = [
  {
    name: 'Tas33n',
    role: 'Developer',
    description: 'Builds and maintains Miyomi so everything keeps working.',
    avatar: 'https://github.com/tas33n.png',
    links: [{ label: 'GitHub', href: 'https://github.com/tas33n/miyomi' }],
  },
  {
    name: 'mikkiio',
    role: 'Supervisor & Data Steward',
    description: 'Checks apps, removes dead links, and keeps info up to date.',
    avatar: 'https://github.com/mikkiio.png',
    links: [{ label: 'GitHub', href: 'https://github.com/mikkiio' }],
  },
] as const;

const pillars = [
  { icon: <Compass className="w-6 h-6" />, title: 'One place for tools', description: 'Find readers, extensions, and guides without 50 tabs.' },
  { icon: <Sparkles className="w-6 h-6" />, title: 'Always current', description: 'We prune broken stuff fast and note what still works.' },
  { icon: <Users className="w-6 h-6" />, title: 'Community-powered', description: 'Fans share what they actually use day to day.' },
  { icon: <ScanEye className="w-6 h-6" />, title: 'Accessible', description: 'Good contrast, keyboard friendly, and screen-reader aware.' },
];

const openSourceCredits: CreditItem[] = [
  {
    icon: <Code2 className="w-6 h-6" />,
    title: 'Open-source developers',
    description: 'They ship the apps, web tools, launchers, resource hubs, and utilities that make discovery effortless.',
  },
  {
    icon: <Globe2 className="w-6 h-6" />,
    title: 'Extension maintainers',
    description: 'They keep sources, mirrors, and feeds alive so the catalog never sleeps.',
  },
  {
    icon: <Sparkles className="w-6 h-6" />,
    title: 'Guide writers',
    description: 'They document installs, safety tips, and advanced tweaks for the whole fandom.',
  },
];

const communityLinks: LinkItem[] = [
  // { label: 'Facebook', href: 'https://www.facebook.com/iitachiyomi' },
  { label: 'YouTube', href: 'https://www.youtube.com/@iitachiyomi' },
  // { label: 'Instagram', href: 'https://www.instagram.com/iitachiyomi/' },
  { label: 'Discord', href: 'https://discord.gg/hfYtH9hrRm' },
  { label: 'Telegram', href: 'https://t.me/iitachiyomi' },
  { label: 'GitHub', href: 'https://github.com/tas33n/miyomi' },
];

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] font-['Inter',sans-serif] text-xs uppercase tracking-wide">
      <Sparkles className="w-4 h-4 text-[var(--brand)]" />
      {children}
    </span>
  );
}

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

export function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
      {/* HERO */}
      <section className="mb-8 md:mb-12">
        <Chip>About Miyomi</Chip>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mt-3 md:mt-4 mb-2 md:mb-3"
          style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: '1.1', fontWeight: 700 }}
        >
          Your simple hub for anime + manga tools
        </motion.h1>
        <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-3xl text-[15.5px] leading-7">
          Miyomi is a clean, updated list of apps, extensions, and helpful links. No fluff. No dead ends. Just what works right now.
        </p>
      </section>

      {/* DISCLAIMER */}
      <section id="disclaimer" className="mb-12">
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20">
          <div className="flex gap-4">
            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[var(--text-primary)] mb-1">Disclaimer: We only index — we don't host</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Miyomi is simply a directory. We do not build, host, or distribute any of the apps listed here, and ownership remains with their original developers. Always download from the official sources we link and follow your local laws.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* PILLARS */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
            >
              <Card>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
                    {pillar.icon}
                  </div>
                  <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] leading-snug font-semibold">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-[var(--text-secondary)] text-sm leading-6">
                  {pillar.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* OPEN SOURCE CREDIT */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Heart className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-semibold">
            Powered by open-source makers
          </h2>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] leading-7 mb-6">
          Huge thanks to the volunteer developers who keep the anime, manga, and light-novel community alive with helpful tools, resources, and rapid fixes.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {openSourceCredits.map((credit) => (
            <Card key={credit.title} className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
                {credit.icon}
              </div>
              <div>
                <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold mb-1">
                  {credit.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-6">
                  {credit.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="mt-6 bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20">
          <p className="text-[var(--text-secondary)] text-sm leading-6">
            Your open-source work powers Miyomi and gives the fandom reliable readers, extensions, and knowledge bases. We see you and appreciate every pull request.
          </p>
        </Card>
      </section>

      {/* TEAM */}
      <section className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-semibold">
            The tiny team
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {team.map((member) => (
            <Card key={member.name} className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-20 h-20 rounded-2xl object-cover border border-[var(--divider)]"
              />
              <div className="text-center sm:text-left">
                <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
                  {member.name}
                </h3>
                <p className="text-[var(--brand)] text-sm font-medium">{member.role}</p>
                <p className="text-[var(--text-secondary)] text-sm mt-2 px-3">{member.description}</p>
                <div className="mt-3">
                  {member.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--brand)] hover:underline"
                      aria-label={`${member.name} on ${link.label}`}
                    >
                      <Github className="w-4 h-4" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 bg-[var(--bg-surface)]/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
                Community contributors
              </h3>
              <p className="text-[var(--text-secondary)] text-sm leading-6">
                Shout-out to everyone leaving feedback, filing GitHub issues, testing updates, and suggesting copy tweaks. Your notes help us ship accurate listings faster.
              </p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm font-medium">
                <a
                  href="https://github.com/tas33n/miyomi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--brand)] hover:underline"
                >
                  GitHub crew <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        {/* Shout-out */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-md">
              <Globe2 className="w-6 h-6 text-[var(--brand)]" />
            </div>
            <div>
              <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] font-semibold">
                Big thanks to{' '}
                <a
                  href="https://wotaku.wiki"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand)] hover:underline"
                >
                  Wotaku Wiki{' '}
                </a>
                &{' '}
                <a
                  href="https://everythingmoe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--brand)] hover:underline"
                >
                  EverythingMoe
                </a>
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                An amazing resource we use often and learned a lot from.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* COMMUNITY */}
      <section className="mb-12">
        <div className="mb-4 flex items-center gap-2">
          <Globe2 className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-semibold">
            Find us
          </h2>
        </div>
        <p className="text-[var(--text-secondary)] text-[15px] leading-7 mb-4">
          Share tips, post releases, and help other fans out.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communityLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl hover:border-[var(--brand)] hover:shadow-lg transition-all flex items-center justify-between gap-4"
              aria-label={link.label}
            >
              <div>
                <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] mb-1 font-semibold">
                  {link.label}
                </h3>
                <p className="text-[var(--text-secondary)] text-xs">
                  {link.href.replace(/^https?:\/\//, '')}
                </p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-[var(--brand)] flex-shrink-0" />
            </a>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section className="mb-12">
        <div className="mb-6 flex items-center gap-2">
          <Mail className="w-5 h-5 text-[var(--brand)]" />
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-semibold">
            Need help?
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Send Feedback</h3>
            <p className="text-sm text-[var(--text-secondary)]">Drop suggestions, flag dead links, or submit new sources right from the feedback bubble.</p>
            <span className="inline-flex items-center gap-1.5 text-[var(--brand)] text-sm mt-2">
              Tap the chat bubble in the corner to start.
            </span>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
              <Github className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">GitHub Issues</h3>
            <p className="text-sm text-[var(--text-secondary)]">Track bugs, request features, or contribute code alongside the rest of the open-source community.</p>
            <a
              href="https://github.com/tas33n/miyomi/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline text-sm mt-1"
            >
              Open an issue <ArrowUpRight className="h-4 w-4" />
            </a>
          </Card>
          <Card className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
              <Globe2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold">Facebook Community</h3>
            <p className="text-sm text-[var(--text-secondary)]">Connect with other readers, share tips, and get notified when new tools land.</p>
            <a
              href="https://www.facebook.com/iitachiyomi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[var(--brand)] hover:underline text-sm mt-1"
            >
              Visit the group <ArrowUpRight className="h-4 w-4" />
            </a>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-14">
        <Card className="text-center">
          <Heart className="w-8 h-8 text-[var(--brand)] mx-auto mb-3" />
          <h3 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-xl font-semibold mb-2">
            Built by fans, for fans
          </h3>
          <p className="text-[var(--text-secondary)] max-w-xl mx-auto">
            Miyomi is driven by passionate readers and developers who believe the fandom deserves a welcoming, <br></br> well-organized home. Share the project with a friend or contribute on GitHub to help shape its future.
          </p>
        </Card>
      </section>
    </div>
  );
}
