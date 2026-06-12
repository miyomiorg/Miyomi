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
  bkash: { bg: '#E2136E', accent: '#C70D5A', text: '#fff' },
  nagad: { bg: '#F6921E', accent: '#E07D0D', text: '#fff' },
  rocket: { bg: '#8B2F8B', accent: '#722778', text: '#fff' },
  upay: { bg: '#00A651', accent: '#008C44', text: '#fff' },
  upi: { bg: '#5F259F', accent: '#4A1D7D', text: '#fff' },
  paytm: { bg: '#00BAF2', accent: '#0098C8', text: '#fff' },
  gcash: { bg: '#007DFE', accent: '#0065CC', text: '#fff' },
  maya: { bg: '#2BC44D', accent: '#22A33E', text: '#fff' },
  grabpay: { bg: '#00B14F', accent: '#008D3F', text: '#fff' },
  dana: { bg: '#118EEA', accent: '#0D73BF', text: '#fff' },
  gopay: { bg: '#00AED6', accent: '#008EB0', text: '#fff' },
  paypal: { bg: '#003087', accent: '#002266', text: '#fff' },
  bitcoin: { bg: '#F7931A', accent: '#D97F15', text: '#fff' },
  ethereum: { bg: '#627EEA', accent: '#4A65CC', text: '#fff' },
  usdt: { bg: '#26A17B', accent: '#1E8264', text: '#fff' },
  wise: { bg: '#9FE870', accent: '#7CC755', text: '#1A1A2E' },
  bank: { bg: '#1A1A2E', accent: '#111122', text: '#fff' },
  contact: { bg: '#6C5CE7', accent: '#5A4BD1', text: '#fff' },
  razorpay: { bg: '#0B6CBB', accent: '#085699', text: '#fff' },
};

/* ───── helper: pick icon by hint ───── */
function PaymentIcon({ hint }: { hint: PaymentMethod['iconHint'] }) {
  const cls = 'w-5 h-5';
  
  // Custom logos for popular methods
  if (hint === 'paypal') return <img src="https://upload.wikimedia.org/wikipedia/commons/b/b7/PayPal_Logo_Icon_2014.svg" className="w-5 h-5 object-contain" alt="PayPal" />;
  if (hint === 'bitcoin' || hint === 'crypto') return <img src="https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg" className="w-5 h-5 object-contain" alt="Bitcoin" />;
  if (hint === 'usdt') return <img src="https://cryptologos.cc/logos/tether-usdt-logo.svg" className="w-5 h-5 object-contain" alt="USDT" />;
  if (hint === 'gcash') return (
    <div className="w-5 h-5 overflow-hidden flex items-center justify-start shrink-0">
      <img src="https://upload.wikimedia.org/wikipedia/commons/5/52/GCash_logo.svg" className="h-5 max-w-none" alt="GCash" />
    </div>
  );
  if (hint === 'kofi' || hint === 'buymeacoffee') return <img src="https://storage.ko-fi.com/cdn/brandasset/v2/kofi_symbol.png" className="w-5 h-5 object-contain" alt="Ko-fi" />;

  switch (hint) {
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
                ${donator.usdAmount ?? donator.amount}
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-20 md:pt-24 pb-6"
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
            className="relative w-full max-w-md rounded-2xl overflow-hidden border border-[var(--divider)] flex flex-col max-h-full"
            style={{ background: 'var(--bg-surface)' }}
          >
            {/* Branded Header */}
            <div
              className="relative px-6 py-5 flex items-center gap-4 flex-shrink-0"
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
            <div className="p-6 space-y-3 overflow-y-auto min-h-0">
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
    whereFundsGoItems,
    showDonationAmounts,
    showGoal,
    transparencyLastUpdated,
    loading,
  } = useDonations();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const progressPercent = donationGoal.targetAmount > 0
    ? Math.min((donationGoal.currentAmount / donationGoal.targetAmount) * 100, 100)
    : 0;

  const enabledMethods = paymentMethods.filter(m => m.enabled).sort((a, b) => {
    const isContactA = a.iconHint === 'contact' || a.label.toLowerCase().includes('contact');
    const isContactB = b.iconHint === 'contact' || b.label.toLowerCase().includes('contact');
    if (isContactA && !isContactB) return 1;
    if (!isContactA && isContactB) return -1;
    return 0;
  });

  const annualCostTotal = transparencyItems.reduce((acc, item) => {
    const num = parseFloat(item.value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return acc;
    if (item.value.toLowerCase().includes('mo')) {
      return acc + (num * 12);
    }
    return acc + num;
  }, 0);

  const displayWhereFundsGo = whereFundsGoItems;
  const hasWhereFundsGo = displayWhereFundsGo.length > 0;

  const sortedDonators = [...donators].sort((a, b) => {
    const amountA = a.usdAmount ?? a.amount;
    const amountB = b.usdAmount ?? b.amount;
    return amountB - amountA;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12 space-y-6">
      {/* ── HERO ── */}
      <section className="mb-10 text-center">
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
          Miyomi is a free, community-driven library for apps, extensions, repositories, guides, and tutorials.
          <br className="hidden md:block" />Your support helps keep the project independent and accessible to everyone.
        </motion.p>
      </section>

      {/* ── GOAL PROGRESS (Conditional) ── */}
      {showGoal && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
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
      )}

      {/* ── TRANSPARENCY ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-5 h-5 text-[var(--brand)]" />
            <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
              Transparency
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Clear, simple, and open. Here's how Miyomi is funded and maintained.
          </p>

          {/* Grid for desktop, stack for mobile */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${hasWhereFundsGo ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-4 md:gap-6 mb-6`}>
            
            {/* Box 1: Annual Cost */}
            <div className="lg:col-span-1 p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] md:text-center flex flex-row md:flex-col items-center md:justify-center justify-between">
              <div className="text-[var(--text-secondary)] text-sm md:text-xs font-semibold md:uppercase tracking-wider mb-0 md:mb-2 flex items-center gap-2 md:justify-center">
                <Clock className="w-4 h-4 md:w-3.5 md:h-3.5" />
                Annual Cost
              </div>
              <div className="text-right md:text-center">
                <div className="text-lg md:text-3xl font-bold text-[var(--brand)] md:mb-1">
                  ~${Math.round(annualCostTotal)} <span className="text-sm text-[var(--text-secondary)] font-normal">/ year</span>
                </div>
                <p className="hidden md:block text-xs text-[var(--text-secondary)]">Estimated total to run Miyomi</p>
                <p className="hidden md:block text-[10px] text-[var(--text-secondary)] opacity-60 mt-1">All costs are in USD.</p>
              </div>
            </div>

            {/* Box 2: Cost Breakdown */}
            <div className="lg:col-span-2 p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] min-w-0">
              <div className="text-[var(--text-secondary)] text-sm md:text-xs font-semibold md:uppercase tracking-wider mb-4 flex items-center gap-2">
                <Server className="w-4 h-4 md:w-3.5 md:h-3.5" />
                Cost Breakdown
              </div>
              <div className="space-y-3 md:space-y-2">
                {transparencyItems.map((item, i) => (
                  <div key={i} className="flex items-center text-sm w-full min-w-0">
                    <span className="text-[var(--text-secondary)] truncate flex-shrink min-w-0">{item.label}</span>
                    <span className="flex-1 mx-2 border-b border-dotted border-[var(--text-secondary)] opacity-30 mt-1 min-w-[10px]" />
                    <span className="text-[var(--text-primary)] font-medium whitespace-nowrap flex-shrink-0">{item.value}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-[var(--divider)] flex items-center w-full text-sm font-semibold min-w-0">
                  <span className="text-[var(--text-primary)] truncate flex-shrink min-w-0">Total (USD / year)</span>
                  <span className="flex-1 mx-2 border-b border-dotted border-[var(--text-secondary)] opacity-30 mt-1 min-w-[10px]" />
                  <span className="text-[var(--brand)] whitespace-nowrap flex-shrink-0">~${Math.round(annualCostTotal)}</span>
                </div>
              </div>
            </div>

            {/* Box 3: Where Funds Go */}
            {hasWhereFundsGo && (
              <div className="lg:col-span-2 p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] flex flex-col justify-between min-w-0">
                <div>
                  <div className="text-[var(--text-secondary)] text-sm md:text-xs font-semibold md:uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 md:w-3.5 md:h-3.5" />
                    Where Funds Go
                  </div>
                  <ul className="space-y-3 md:space-y-2 mb-3">
                    {displayWhereFundsGo.map((item, i) => (
                      <li key={i} className="flex items-center text-sm w-full min-w-0">
                        <span className="text-[var(--text-secondary)] flex items-center gap-2 truncate flex-shrink min-w-0">
                          <span className="w-1 h-1 rounded-full bg-pink-400 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <span className="flex-1 mx-2 border-b border-dotted border-[var(--text-secondary)] opacity-30 mt-1 min-w-[10px]" />
                        <span className="text-[var(--text-primary)] font-medium text-xs whitespace-nowrap flex-shrink-0">{item.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3 border-t border-[var(--divider)] hidden md:block">
                  <p className="text-xs text-[var(--text-secondary)]">No salaries. No profit.<br />100% goes toward keeping Miyomi online.</p>
                </div>
              </div>
            )}

          </div>

          {/* Info box */}
          <div className="p-4 rounded-xl bg-[var(--brand)]/5 border border-[var(--brand)]/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-[var(--brand)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--text-primary)]">Why transparency matters:</span> Your contributions help cover real costs so Miyomi can remain free, open, and independent. We believe in open source—and open books.
            </p>
          </div>
        </Card>
      </motion.section>

      {/* ── SUPPORT MIYOMI ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
              Support method
            </h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Optional support. No paywalls, no premium access—ever.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {enabledMethods.map((method, i) => {
              const isLink = method.type === 'link' && method.url && method.url !== '#';
              const brandColor = BRAND_COLORS[method.iconHint];
              const isLongText = method.label.length > 14;

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
                  className={`group relative flex flex-col md:flex-row items-center gap-3 p-3 md:p-4 rounded-xl border border-[var(--divider)] bg-[var(--bg-page)] hover:shadow-lg transition-all text-center md:text-left cursor-pointer ${isLongText ? 'col-span-2 sm:col-span-1' : 'col-span-1'}`}
                  style={{ borderColor: brandColor ? `${brandColor.bg}20` : undefined }}
                >
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-[0.08] transition-opacity"
                    style={{ background: brandColor ? `linear-gradient(135deg, ${brandColor.bg}, ${brandColor.accent})` : 'var(--brand)' }}
                  />
                  <div
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform shrink-0"
                    style={{ background: brandColor ? `${brandColor.bg}15` : 'var(--chip-bg)', color: brandColor?.bg || 'var(--brand)' }}
                  >
                    <PaymentIcon hint={method.iconHint} />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0 w-full">
                    <span className="block text-[var(--text-primary)] text-sm font-semibold font-['Poppins',sans-serif] truncate">
                      {method.label}
                    </span>
                    <span className="block text-[var(--text-secondary)] text-[10px] md:text-xs mt-0.5 leading-tight truncate">
                      {method.description}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </Card>
      </motion.section>

      {/* ── DONATORS WALL ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[var(--brand)]" />
              <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-lg font-semibold">
                Recent Supporters
              </h2>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              Thanks to everyone who supports Miyomi.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-[100px] rounded-xl bg-[var(--chip-bg)] animate-pulse"
                />
              ))}
            </div>
          ) : donators.length === 0 ? (
            <div className="text-center py-6 border border-[var(--divider)] rounded-xl">
              <Heart className="w-8 h-8 text-[var(--text-secondary)] opacity-30 mx-auto mb-2" />
              <p className="text-[var(--text-secondary)] text-sm">
                Be the first!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedDonators.map((donator, i) => (
                <DonatorCard key={i} donator={donator} index={i} showDonationAmounts={showDonationAmounts} />
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
      >
        <Card className="bg-[var(--bg-surface)]">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#cbe5fb] to-[#9db8f7] overflow-hidden">
              <img src="/polic.png" alt="Miyomi" className="w-14 h-14 object-contain mt-2" />
            </div>
            <div>
              <h2 className="font-['Poppins',sans-serif] text-[var(--text-primary)] text-base font-semibold mb-1">
                From The Team
              </h2>
              <p className="text-[var(--text-secondary)] font-['Inter',sans-serif] text-sm leading-relaxed mb-2">
                Miyomi started as a small project and grew thanks to an amazing community.<br className="hidden md:block" />
                Your support—big or small—helps keep Miyomi alive.
              </p>
              <div className="flex items-center gap-1 text-[var(--brand)] text-sm font-semibold">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Thank you!</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.section>

      {/* ── PAYMENT DETAIL MODAL ── */}
      <PaymentDetailModal method={selectedMethod} onClose={() => setSelectedMethod(null)} />
    </div>
  );
}
