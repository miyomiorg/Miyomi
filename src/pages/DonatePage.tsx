import React from 'react';
import {
  Heart,
  Sparkles,
  ExternalLink,
  Wallet,
  Bitcoin,
  Coffee,
  CreditCard,
  Gift,
  DollarSign,
  Smartphone,
  Star,
  Clock,
  Server,
  Globe2,
  HardDrive,
  Users,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useDonations } from '../hooks/useDonations';
import type { Donator } from '../hooks/useDonations';
import { type PaymentMethod } from '@/integrations/supabase/types';

/* ───── helper: pick icon by hint ───── */
function PaymentIcon({ hint }: { hint: PaymentMethod['iconHint'] }) {
  const cls = 'w-5 h-5';
  switch (hint) {
    case 'paypal':
      return <CreditCard className={cls} />;
    case 'gcash':
      return <Smartphone className={cls} />;
    case 'crypto':
      return <Bitcoin className={cls} />;
    case 'kofi':
      return <Coffee className={cls} />;
    case 'buymeacoffee':
      return <Coffee className={cls} />;
    case 'patreon':
      return <Star className={cls} />;
    case 'stripe':
      return <CreditCard className={cls} />;
    case 'bank':
      return <Wallet className={cls} />;
    default:
      return <DollarSign className={cls} />;
  }
}

/* ───── helper: transparency icon ───── */
function TransparencyIcon({ label }: { label: string }) {
  const cls = 'w-4 h-4 text-[var(--brand)] flex-shrink-0';
  if (label.toLowerCase().includes('hosting')) return <Server className={cls} />;
  if (label.toLowerCase().includes('domain')) return <Globe2 className={cls} />;
  if (label.toLowerCase().includes('storage')) return <HardDrive className={cls} />;
  if (label.toLowerCase().includes('community')) return <Users className={cls} />;
  return <DollarSign className={cls} />;
}

/* ───── Chip (reusable, same as AboutPage) ───── */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--chip-bg)] text-[var(--text-secondary)] font-['Inter',sans-serif] text-xs uppercase tracking-wide">
      <Heart className="w-4 h-4 text-[var(--brand)]" />
      {children}
    </span>
  );
}

/* ───── Card (reusable, same as AboutPage) ───── */
function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl ${className}`}
      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
    >
      {children}
    </div>
  );
}

/* ───── Donator Card ───── */
function DonatorCard({ donator, index, showDonationAmounts }: { donator: Donator; index: number; showDonationAmounts: boolean }) {
  const initials = donator.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="flex items-start gap-3 p-4 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl hover:border-[var(--brand)]/30 transition-colors">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--chart-3)] flex items-center justify-center text-white text-sm font-bold">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-sm font-semibold truncate">
              {donator.name}
            </span>
            {showDonationAmounts && donator.showAmount && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--brand)] font-medium">
                ${donator.amount}
              </span>
            )}
          </div>
          {donator.message && (
            <p className="text-[var(--text-secondary)] text-xs mt-1 leading-relaxed line-clamp-2">
              "{donator.message}"
            </p>
          )}
          <span className="text-[var(--text-secondary)] text-[10px] mt-1 block opacity-60">
            {donator.date}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════
   DONATE PAGE
   ═══════════════════════════════════════════════ */
export function DonatePage() {
  const {
    donators,
    goal: donationGoal,
    paymentMethods,
    transparencyItems,
    showDonationAmounts,
    transparencyLastUpdated,
    loading,
  } = useDonations();
  const [showAllDonators, setShowAllDonators] = useState(false);

  const progressPercent = donationGoal.targetAmount > 0
    ? Math.min((donationGoal.currentAmount / donationGoal.targetAmount) * 100, 100)
    : 0;

  const enabledMethods = paymentMethods.filter((m) => m.enabled);
  const visibleDonators = showAllDonators ? donators : donators.slice(0, 6);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12">
      {/* ── HERO ── */}
      <section className="mb-10 md:mb-14 text-center">
        <Chip>Support Miyomi</Chip>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mt-4 mb-3"
          style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: '1.1',
            fontWeight: 700,
          }}
        >
          Keep Miyomi{' '}
          <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--chart-3)] bg-clip-text text-transparent">
            Alive
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-2xl mx-auto text-[15.5px] leading-7"
        >
          Miyomi is a free, community-driven library for apps, extensions,
          repositories, guides, and tutorials. As the platform keeps growing,
          infrastructure and hosting costs are becoming harder to sustain on
          free-tier services alone.
        </motion.p>
      </section>

      {/* ── GOAL PROGRESS ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-8"
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--brand)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
                {donationGoal.title}
              </h2>
              <p className="text-[var(--text-secondary)] text-xs">
                {donationGoal.description}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative w-full h-5 bg-[var(--chip-bg)] rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--chart-3)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${progressPercent}%`,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1.5 }}
            />
          </div>

          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="text-[var(--text-secondary)] font-['Inter',sans-serif]">
              <span className="text-[var(--brand)] font-semibold">
                ${donationGoal.currentAmount}
              </span>{' '}
              raised of ${donationGoal.targetAmount}
            </span>
            <span className="text-[var(--text-secondary)] text-xs font-medium px-2 py-0.5 bg-[var(--chip-bg)] rounded-full">
              {progressPercent.toFixed(0)}%
            </span>
          </div>
        </Card>
      </motion.section>

      {/* ── PAYMENT METHODS ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
              Support Miyomi
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-5">
            Donations are completely optional and help us maintain hosting,
            bandwidth, storage, and future improvements.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {enabledMethods.map((method, i) => (
              <motion.a
                key={method.id}
                href={method.url}
                target={method.url !== '#' ? '_blank' : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] hover:border-[var(--brand)] hover:shadow-lg transition-all text-center"
              >
                {/* Gradient hover glow */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--chart-3)] opacity-0 group-hover:opacity-[0.06] transition-opacity" />
                <div className="relative z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-[var(--chip-bg)] text-[var(--brand)] group-hover:scale-110 transition-transform">
                  <PaymentIcon hint={method.iconHint} />
                </div>
                <div className="relative z-10">
                  <span className="block text-[var(--text-primary)] text-sm font-semibold font-['Poppins',sans-serif]">
                    {method.label}
                  </span>
                  <span className="block text-[var(--text-secondary)] text-[10px] mt-0.5 leading-tight">
                    {method.description}
                  </span>
                </div>
                <ExternalLink className="absolute top-2 right-2 w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 transition-opacity" />
              </motion.a>
            ))}
          </div>

          <p className="text-[var(--text-secondary)] text-xs mt-5 flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-[var(--brand)]" />
            No paywalls. No premium access. Miyomi will remain free for everyone.
          </p>
        </Card>
      </motion.section>

      {/* ── TRANSPARENCY ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
              Transparency
            </h2>
          </div>

          <div className="space-y-0">
            {transparencyItems.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between py-3 ${
                  i < transparencyItems.length - 1
                    ? 'border-b border-[var(--divider)]'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TransparencyIcon label={item.label} />
                  <span className="text-[var(--text-primary)] text-sm font-['Inter',sans-serif]">
                    {item.label}
                  </span>
                </div>
                <span className="text-[var(--text-secondary)] text-sm font-medium">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[var(--text-secondary)] text-xs mt-4 opacity-60">
            Last updated: {transparencyLastUpdated}
          </p>
        </Card>
      </motion.section>

      {/* ── DONATORS WALL ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
              Our Supporters
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-5">
            Thank you to everyone who has contributed to keeping Miyomi alive.
          </p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-[var(--chip-bg)] animate-pulse"
                />
              ))}
            </div>
          ) : donators.length === 0 ? (
            <div className="text-center py-10">
              <Heart className="w-10 h-10 text-[var(--text-secondary)] opacity-30 mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">
                Be the first to support Miyomi!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleDonators.map((donator, i) => (
                  <DonatorCard key={`${donator.name}-${i}`} donator={donator} index={i} showDonationAmounts={showDonationAmounts} />
                ))}
              </div>

              {donators.length > 6 && (
                <button
                  onClick={() => setShowAllDonators(!showAllDonators)}
                  className="mt-4 mx-auto flex items-center gap-1.5 text-sm text-[var(--brand)] hover:text-[var(--brand-strong)] transition-colors font-medium"
                >
                  {showAllDonators ? (
                    <>
                      Show Less <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Show All ({donators.length}) <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </Card>
      </motion.section>

      {/* ── TEAM MESSAGE ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-14"
      >
        <Card className="text-center bg-gradient-to-br from-[var(--bg-surface)] to-[var(--chip-bg)]/30">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--chart-3)] shadow-lg">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-xl font-semibold mb-2">
            Message From The Team
          </h2>
          <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-xl mx-auto text-[15px] leading-7">
            What started as a small project became a growing platform used by
            thousands of people discovering apps, repositories, and tutorials.
            Thank you for supporting Miyomi and helping us keep the project alive.
          </p>
          <div className="mt-4 flex items-center justify-center gap-1 text-[var(--brand)] text-sm font-medium">
            <Heart className="w-4 h-4 fill-current" />
            <span>The Miyomi Team</span>
          </div>
        </Card>
      </motion.section>
    </div>
  );
}
