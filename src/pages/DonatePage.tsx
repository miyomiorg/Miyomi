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
  X,
  Copy,
  Check,
  Mail,
  Phone,
  Hash,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useDonations } from '../hooks/useDonations';
import type { Donator } from '../hooks/useDonations';
import { type PaymentMethod } from '@/integrations/supabase/types';

/* ───── brand colors per payment provider ───── */
const BRAND_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  bkash:      { bg: '#E2136E', accent: '#C70D5A', text: '#fff' },
  nagad:      { bg: '#F6921E', accent: '#E07D0D', text: '#fff' },
  rocket:     { bg: '#8B2F8B', accent: '#722778', text: '#fff' },
  upay:       { bg: '#00A651', accent: '#008C44', text: '#fff' },
  upi:        { bg: '#5F259F', accent: '#4A1D7D', text: '#fff' },
  paytm:      { bg: '#00BAF2', accent: '#0098C8', text: '#fff' },
  gcash:      { bg: '#007DFE', accent: '#0065CC', text: '#fff' },
  maya:       { bg: '#2BC44D', accent: '#22A33E', text: '#fff' },
  grabpay:    { bg: '#00B14F', accent: '#008D3F', text: '#fff' },
  dana:       { bg: '#118EEA', accent: '#0D73BF', text: '#fff' },
  gopay:      { bg: '#00AED6', accent: '#008EB0', text: '#fff' },
  paypal:     { bg: '#003087', accent: '#002266', text: '#fff' },
  bitcoin:    { bg: '#F7931A', accent: '#D97F15', text: '#fff' },
  ethereum:   { bg: '#627EEA', accent: '#4A65CC', text: '#fff' },
  usdt:       { bg: '#26A17B', accent: '#1E8264', text: '#fff' },
  wise:       { bg: '#9FE870', accent: '#7CC755', text: '#1A1A2E' },
  bank:       { bg: '#1A1A2E', accent: '#111122', text: '#fff' },
  contact:    { bg: '#6C5CE7', accent: '#5A4BD1', text: '#fff' },
  razorpay:   { bg: '#0B6CBB', accent: '#085699', text: '#fff' },
};

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
interface DonatorCardProps {
  donator: Donator;
  index: number;
  showDonationAmounts: boolean;
}

/* generate a consistent random avatar URL from the donor name */
function avatarUrl(name: string) {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

const DonatorCard: React.FC<DonatorCardProps> = ({ donator, index, showDonationAmounts }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.6) }}
      className="h-full"
    >
      <div className="flex gap-3 p-3 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-xl hover:border-[var(--brand)]/30 transition-colors h-full">
        {/* Avatar */}
        <img
          src={avatarUrl(donator.name)}
          alt={donator.name}
          className="w-9 h-9 rounded-full flex-shrink-0 bg-[var(--chip-bg)] mt-0.5"
          loading="lazy"
        />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Row 1: Name */}
          <span className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-[13px] font-semibold truncate leading-tight">
            {donator.name}
          </span>

          {/* Row 2: Badges (amount + method + date) */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {showDonationAmounts && donator.showAmount && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--chip-bg)] text-[var(--brand)] font-medium leading-none">
                ${donator.amount}
              </span>
            )}
            {donator.paymentMethod && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[var(--divider)] text-[var(--text-secondary)] font-medium leading-none">
                {donator.paymentMethod}
              </span>
            )}
            {donator.date && (
              <span className="text-[10px] text-[var(--text-secondary)] opacity-50 leading-none">
                {donator.date}
              </span>
            )}
          </div>

          {/* Row 3: Message (always reserve space) */}
          <p className="text-[var(--text-secondary)] text-[11px] mt-1 leading-snug line-clamp-1 min-h-[15px]">
            {donator.message ? `"${donator.message}"` : '\u00A0'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

/* ───── Copyable Field ───── */
function CopyableField({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)]">
      <Icon className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">{label}</span>
        <span className="block text-sm font-mono text-[var(--text-primary)] break-all">{value}</span>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 rounded-lg hover:bg-[var(--chip-bg)] transition-colors flex-shrink-0"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-[var(--text-secondary)]" />}
      </button>
    </div>
  );
}

/* ───── Payment Detail Modal ───── */
function PaymentDetailModal({ method, onClose }: { method: PaymentMethod | null; onClose: () => void }) {
  const brand = method ? BRAND_COLORS[method.iconHint] : null;
  const details = method?.details;

  return (
    <AnimatePresence>
      {method && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl overflow-hidden border border-[var(--divider)]"
            style={{ background: 'var(--bg-surface)' }}
          >
            {/* Branded Header */}
            <div
              className="relative px-6 py-5 flex items-center gap-4"
              style={{
                background: brand
                  ? `linear-gradient(135deg, ${brand.bg}, ${brand.accent})`
                  : 'linear-gradient(135deg, var(--brand), var(--chart-3))',
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <PaymentIcon hint={method.iconHint} />
              </div>
              <div style={{ color: brand?.text || '#fff' }}>
                <h3 className="text-lg font-bold font-['Poppins',sans-serif]">{method.label}</h3>
                <p className="text-sm opacity-80">{method.description}</p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                style={{ color: brand?.text || '#fff' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3">
              {details?.instructions && (
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {details.instructions}
                </p>
              )}

              {details?.number && <CopyableField label="Number" value={details.number} icon={Phone} />}
              {details?.email && <CopyableField label="Email" value={details.email} icon={Mail} />}
              {details?.address && <CopyableField label="Address" value={details.address} icon={Hash} />}
              {details?.accountName && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)]">
                  <Users className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Account Name</span>
                    <span className="block text-sm text-[var(--text-primary)]">{details.accountName}</span>
                  </div>
                </div>
              )}
              {details?.network && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)]">
                  <Globe2 className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Network</span>
                    <span className="block text-sm text-[var(--text-primary)]">{details.network}</span>
                  </div>
                </div>
              )}

              {details?.qrCodeUrl && (
                <div className="flex justify-center pt-2">
                  <img src={details.qrCodeUrl} alt="QR Code" className="w-40 h-40 rounded-xl border border-[var(--divider)]" />
                </div>
              )}

              {/* External link button if URL is set */}
              {method.url && method.url !== '#' && (
                <a
                  href={method.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
                  style={{
                    background: brand ? brand.bg : 'var(--brand)',
                    color: brand?.text || '#fff',
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open {method.label}
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const progressPercent = donationGoal.targetAmount > 0
    ? Math.min((donationGoal.currentAmount / donationGoal.targetAmount) * 100, 100)
    : 0;

  const enabledMethods = paymentMethods.filter((m) => m.enabled);

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
            {enabledMethods.map((method, i) => {
              const isLink = method.type === 'link' && method.url && method.url !== '#';
              const brandColor = BRAND_COLORS[method.iconHint];

              return (
                <motion.button
                  key={method.id}
                  onClick={() => {
                    if (isLink) {
                      window.open(method.url, '_blank', 'noopener,noreferrer');
                    } else {
                      setSelectedMethod(method);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  whileHover={{ y: -3, scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] hover:shadow-lg transition-all text-center cursor-pointer"
                  style={{ borderColor: brandColor ? `${brandColor.bg}20` : undefined }}
                >
                  {/* Gradient hover glow */}
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-[0.08] transition-opacity"
                    style={{ background: brandColor ? `linear-gradient(135deg, ${brandColor.bg}, ${brandColor.accent})` : 'var(--brand)' }}
                  />
                  <div
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform"
                    style={{ background: brandColor ? `${brandColor.bg}15` : 'var(--chip-bg)', color: brandColor?.bg || 'var(--brand)' }}
                  >
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
                  {isLink
                    ? <ExternalLink className="absolute top-2 right-2 w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 transition-opacity" />
                    : <Info className="absolute top-2 right-2 w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-60 transition-opacity" />
                  }
                </motion.button>
              );
            })}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {donators.map((donator, i) => (
                  <DonatorCard key={`${donator.name}-${i}`} donator={donator} index={i} showDonationAmounts={showDonationAmounts} />
                ))}
              </div>
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
      {/* ── PAYMENT DETAIL MODAL ── */}
      <PaymentDetailModal method={selectedMethod} onClose={() => setSelectedMethod(null)} />
    </div>
  );
}
