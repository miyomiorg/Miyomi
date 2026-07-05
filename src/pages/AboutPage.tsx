import { AlertCircle, Smartphone, Puzzle, BookOpen, Link as LinkIcon, Heart, Users, Github, UploadCloud, Coffee, Youtube, Target, Eye, Zap, Globe, MessageCircle, BarChart3, Database, Info, Sparkles, Star, Swords, Ghost } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, type ReactNode } from 'react';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { dataService } from '../services/dataService';
import { Link, useLocation } from 'react-router-dom';
import { useSeasonalAsset } from '../hooks/useSeasonalAsset';
import { DiscordIcon } from '../components/DiscordIcon';
import { TelegramIcon } from '../components/TelegramIcon';

function ResponsiveCard({ children, className = '', ...props }: { children: ReactNode; className?: string;[key: string]: any }) {
  return (
    <motion.div
      className={`md:p-6 md:bg-[var(--bg-surface)] md:border md:border-[var(--divider)] md:rounded-2xl transition-all md:hover:border-[var(--brand)]/40 ${className}`}
      {...props}
    >
      {children}
    </motion.div>
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function AboutPage() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const avatarImage = useSeasonalAsset('homeAvatar', '/polic.webp');
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location]);

  const [stats, setStats] = useState({
    monthlyVisitors: 0,
    resourcesIndexed: 0,
    guidesListings: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [visitorsRes, apps, extensions, guideCategories] = await Promise.all([
          fetch('/api/stats').catch(() => null),
          dataService.getApps().catch(() => []),
          dataService.getExtensions().catch(() => []),
          dataService.getGuideCategories().catch(() => [])
        ]);

        let visitors = 0;
        if (visitorsRes && visitorsRes.ok) {
          const visitorsData = await visitorsRes.json();
          visitors = visitorsData.monthlyVisitors || 0;
        }

        const resourcesIndexed = apps.length + extensions.length;
        const guidesListings = guideCategories.reduce((acc: number, cat: any) => acc + cat.guides.length, 0);

        setStats({
          monthlyVisitors: visitors,
          resourcesIndexed,
          guidesListings,
          isLoading: false
        });
      } catch (error) {
        console.error("Failed to fetch stats", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-16 overflow-hidden">
      {isFeedbackOpen && (
        <FeedbackPanel page="about" onClose={() => setIsFeedbackOpen(false)} />
      )}

      {/* SINGLE COLUMN LAYOUT CENTERED */}
      <div className="flex flex-col gap-16 md:gap-20">

        {/* HERO */}
        <section className="text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
            className="relative inline-block mb-6"
          >
            {/* Floating Elements */}
            <motion.div className="absolute -top-4 -left-12 text-purple-400/40" animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0] }} transition={{ duration: 5, repeat: Infinity }}><Sparkles className="w-8 h-8" /></motion.div>
            <motion.div className="absolute top-4 -right-16 text-cyan-400/40" animate={{ y: [0, 20, 0], rotate: [0, -15, 15, 0] }} transition={{ duration: 6, repeat: Infinity }}><Star className="w-10 h-10" /></motion.div>
            <motion.div className="absolute bottom-4 -left-16 text-orange-400/40" animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }} transition={{ duration: 4.5, repeat: Infinity }}><Swords className="w-6 h-6" /></motion.div>
            <motion.div className="absolute -bottom-6 -right-12 text-pink-400/40" animate={{ y: [0, 15, 0], rotate: [0, -10, 10, 0] }} transition={{ duration: 5.5, repeat: Infinity }}><Ghost className="w-8 h-8" /></motion.div>

            <motion.img
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              src={avatarImage}
              alt="Miyomi Mascot"
              className="w-32 md:w-48 drop-shadow-2xl z-10 relative object-contain"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-[var(--brand)]/10 blur-3xl rounded-full -z-10"></div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[var(--text-primary)] font-['Poppins',sans-serif] mt-2 mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: '1.1', fontWeight: 800 }}
          >
            Miyomi
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-md mx-auto text-sm md:text-base leading-relaxed"
          >
            A curated directory for manga, anime, novel apps, extensions, guides, and community resources.
          </motion.p>
        </section>

        {/* WHAT IS MIYOMI */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center max-w-5xl mx-auto"
        >
          <div className="order-2 md:order-1 text-left">
            <h2 className="text-[var(--text-primary)] font-bold text-xl md:text-2xl mb-4">What is Miyomi?</h2>
            <p className="text-[var(--text-secondary)] text-sm md:text-base leading-relaxed mb-4">
              Miyomi is a community-driven directory designed to help users discover trusted manga, anime, novel, and reading-related resources. Finding the right app or extension when they're scattered across different platforms is a pain. We organize software, extensions, guides, and useful tools in one searchable place.
            </p>
          </div>
          <div className="order-1 md:order-2 hidden md:flex justify-center">
            <img src="/hugme.webp" alt="Miyomi Mascot" className="w-full max-w-[300px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 ease-out" />
          </div>
        </motion.section>

        {/* OUR MISSION */}
        <section>
          <h2 className="text-[var(--text-primary)] font-bold text-xl md:text-2xl mb-8 text-center">
            Our Mission
          </h2>
          <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 md:gap-y-6">
            <ResponsiveCard variants={itemVariants} className="flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Discoverability</h3>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">Help users find quality resources quickly without the hassle of searching the web.</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Transparency</h3>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">Clearly explain what resources are and where they come from for user safety.</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Community</h3>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">Support open communities, contributors, and independent creators actively.</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-bold text-[var(--text-primary)] text-base">Simplicity</h3>
              </div>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">Make discovery easy and accessible for everyone, no matter their technical skill.</p>
            </ResponsiveCard>
          </motion.div>
        </section>

        {/* WHAT WE OFFER */}
        <section>
          <h2 className="text-[var(--text-primary)] font-bold text-xl md:text-2xl mb-8 text-center">
            What We Offer
          </h2>
          <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-6">
            <ResponsiveCard variants={itemVariants}>
              <Link to="/software" className="group flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-3 md:text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Smartphone className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Software Directory</h3>
                  <p className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-relaxed">Discover reading applications and tools.</p>
                </div>
              </Link>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants}>
              <Link to="/extensions" className="group flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-3 md:text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Puzzle className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Extensions Directory</h3>
                  <p className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-relaxed">Find and explore community-made extensions.</p>
                </div>
              </Link>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants}>
              <Link to="/guides" className="group flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-3 md:text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Guides</h3>
                  <p className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-relaxed">Tutorials and setup guides.</p>
                </div>
              </Link>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants}>
              <Link to="#" className="group flex flex-row md:flex-col items-center md:justify-center gap-4 md:gap-3 md:text-center h-full">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1 md:flex-none">
                  <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1">Community Resources</h3>
                  <p className="text-[11px] md:text-xs text-[var(--text-secondary)] leading-relaxed">Helpful websites and related projects.</p>
                </div>
              </Link>
            </ResponsiveCard>
          </motion.div>
        </section>

        {/* COMMUNITY IMPACT */}
        <section>
          <h2 className="text-[var(--text-primary)] font-bold text-xl md:text-2xl mb-8 text-center">
            Community Impact
          </h2>
          <motion.div
            variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            <ResponsiveCard variants={itemVariants} className="flex flex-col items-center justify-center gap-2 text-center py-5 bg-[var(--bg-elev-1)]/40 md:bg-transparent rounded-xl md:rounded-none">
              <BarChart3 className="w-6 h-6 text-[var(--brand)] opacity-80 mb-2" />
              <h3 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-none">
                {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.monthlyVisitors > 0 ? (stats.monthlyVisitors >= 1000 ? `${(stats.monthlyVisitors / 1000).toFixed(1)}k+` : `${stats.monthlyVisitors}+`) : '10k+')}
              </h3>
              <p className="text-[9px] md:text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Monthly Visitors</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col items-center justify-center gap-2 text-center py-5 bg-[var(--bg-elev-1)]/40 md:bg-transparent rounded-xl md:rounded-none">
              <Database className="w-6 h-6 text-[var(--brand)] opacity-80 mb-2" />
              <h3 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-none">
                {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.resourcesIndexed > 0 ? `${stats.resourcesIndexed}+` : '500+')}
              </h3>
              <p className="text-[9px] md:text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Resources Indexed</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col items-center justify-center gap-2 text-center py-5 bg-[var(--bg-elev-1)]/40 md:bg-transparent rounded-xl md:rounded-none">
              <BookOpen className="w-6 h-6 text-[var(--brand)] opacity-80 mb-2" />
              <h3 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-none">
                {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.guidesListings > 0 ? `${stats.guidesListings}+` : '100+')}
              </h3>
              <p className="text-[9px] md:text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Guides & Listings</p>
            </ResponsiveCard>

            <ResponsiveCard variants={itemVariants} className="flex flex-col items-center justify-center gap-2 text-center py-5 bg-[var(--bg-elev-1)]/40 md:bg-transparent rounded-xl md:rounded-none">
              <Users className="w-6 h-6 text-[var(--brand)] opacity-80 mb-2" />
              <h3 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-none">24/7</h3>
              <p className="text-[9px] md:text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Growing Community</p>
            </ResponsiveCard>
          </motion.div>
        </section>

        {/* TEAM AND SUPPORT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-6 items-stretch">

          {/* MEET THE TEAM */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="h-full">
            <div className="h-full flex flex-col gap-4 md:p-8 md:bg-[var(--bg-surface)] md:border md:border-[var(--divider)] md:rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h2 className="text-[var(--text-primary)] font-bold text-lg">
                  Meet The Team
                </h2>
              </div>

              <div className="flex flex-col gap-3">
                {teamMembers.map((member) => (
                  <div key={member.name} className="flex items-center gap-3 p-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] md:shadow-[inset_3px_0_0_0_#0891b2] rounded-xl hover:border-[var(--brand)]/40 transition-colors overflow-hidden">
                    <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full border border-[var(--divider)]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{member.name}</span>
                        {member.link && (
                          <a href={member.link} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                            <Github className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-cyan-400 font-medium">{member.role}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{member.description}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center p-3 text-center md:bg-blue-500/10 border border-blue-500/20 rounded-xl mt-2">
                  <p className="text-xs text-blue-400 font-medium">And You! Thank you for your feedback, reports, and submissions</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SUPPORT MIYOMI CARD */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} className="h-full">
            <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-8 bg-[var(--bg-elev-1)] md:bg-gradient-to-br md:from-[var(--brand)]/5 md:to-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Coffee className="w-5 h-5 text-[var(--text-primary)]" />
                <h2 className="text-[var(--text-primary)] font-bold text-lg">
                  Support Miyomi
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
                Help Miyomi Grow! Support development, infrastructure, moderation, and future improvements.
              </p>

              <Link to="/donate" className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors mb-8 shadow-[0_0_20px_rgba(59,130,246,0.35)]">
                <Heart className="w-4 h-4 fill-current" /> Help Miyomi Grow
              </Link>

              <p className="text-[11px] text-[var(--text-secondary)] mb-4">Follow us on social networks</p>
              <div className="flex items-center gap-4">
                <a href="https://www.youtube.com/@iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] md:bg-transparent border border-[var(--divider)] md:border-cyan-800/40 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF0000] hover:border-[#FF0000] hover:-translate-y-1 transition-all shadow-sm">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://discord.gg/hfYtH9hrRm" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] md:bg-transparent border border-[var(--divider)] md:border-cyan-800/40 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#5865F2] hover:border-[#5865F2] hover:-translate-y-1 transition-all shadow-sm">
                  <DiscordIcon className="w-5 h-5" />
                </a>
                <a href="https://t.me/iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] md:bg-transparent border border-[var(--divider)] md:border-cyan-800/40 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#0088cc] hover:border-[#0088cc] hover:-translate-y-1 transition-all shadow-sm">
                  <TelegramIcon className="w-5 h-5" />
                </a>
                <a href="https://github.com/miyomiorg/Miyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] md:bg-transparent border border-[var(--divider)] md:border-cyan-800/40 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:-translate-y-1 transition-all shadow-sm">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.section>

        </div>

        {/* COMMUNITY DRIVEN */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <ResponsiveCard className="flex flex-col md:flex-row items-start md:items-start md:justify-between gap-6 p-6 md:p-8 bg-[var(--bg-elev-1)]/40 md:bg-transparent border border-[var(--divider)] md:border-none rounded-2xl md:rounded-none">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 justify-start">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-lg">Community-Driven</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed text-left">
                Miyomi is an independent fan-run project. The directory currently grows almost entirely through your help. If you find any errors or are willing to add more entries, please help us out!
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 justify-start">
                <Link to="/contribute" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2">
                  <UploadCloud className="w-4 h-4" /> Use the Contribute page
                </Link>
                <a href="https://github.com/miyomiorg/Miyomi/issues/new" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[var(--bg-elev-2)] border border-[var(--divider)] text-[var(--text-primary)] font-bold text-sm hover:bg-[var(--bg-elev-3)] transition-colors flex items-center justify-center gap-2">
                  <Github className="w-4 h-4" /> Open a Github Issue
                </a>
              </div>
            </div>
          </ResponsiveCard>
        </motion.section>

        {/* ALSO VISIT */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="p-4 md:p-5 flex items-start md:items-center gap-4 bg-[var(--bg-elev-1)] md:bg-cyan-950/20 border border-[var(--divider)] md:border-cyan-900/40 border-l-[6px] border-l-cyan-600 rounded-xl hover:border-cyan-500/50 transition-all">
            <Heart className="w-5 h-5 text-cyan-400 fill-cyan-400 flex-shrink-0 mt-0.5 md:mt-0" />
            <div className="text-left">
              <p className="text-sm text-[var(--text-primary)]">
                <span className="font-bold">Also Visit</span> <a href="https://everythingmoe.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-medium">EverythingMoe</a>, <a href="https://wotaku.wiki/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-medium">Wotaku</a> & <a href="https://theindex.moe/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-medium">TheIndex</a>
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Some amazing resources we refer to.</p>
            </div>
          </div>
        </motion.section>

        {/* TRANSPARENCY NOTICE */}
        <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <div id="disclaimer" className="md:border-l-4 md:border-l-yellow-500 md:p-6 md:bg-yellow-500/5 md:rounded-2xl md:overflow-hidden mt-4 md:mt-0 scroll-mt-24">
            <div className="flex items-center gap-2 mb-3 justify-start">
              <Info className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base">Transparency Notice</h3>
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-3 text-left">
              <p>
                Miyomi is simply a directory. We have no affiliation with the developers or creators of the apps, extensions, or resources listed here. We do not build, host, or distribute any of this content.
              </p>
              <p>
                Limitation of Liability: Miyomi provides this directory on an "AS-IS" and "AS-AVAILABLE" basis. We do not warrant that external links, extensions, or applications indexed here are safe, secure, or compatible with your device.
              </p>
              <p>
                If you notice any suspicious listings, please use the <button onClick={() => setIsFeedbackOpen(true)} className="text-yellow-500 hover:underline font-semibold">Feedback button</button> to report them.
              </p>
            </div>
          </div>
        </motion.section>

      </div>
    </div>
  );
}
