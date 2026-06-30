import { AlertCircle, Smartphone, Puzzle, BookOpen, Link as LinkIcon, Heart, Users, Github, UploadCloud, Coffee, Youtube, Target, Eye, Zap, Globe, MessageCircle, BarChart3, Database } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, type ReactNode } from 'react';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { dataService } from '../services/dataService';
import { Link } from 'react-router-dom';
import { DiscordIcon } from '../components/DiscordIcon';
import { TelegramIcon } from '../components/TelegramIcon';

function Card({ children, className = '', ...props }: { children: ReactNode; className?: string; [key: string]: any }) {
  return (
    <motion.div
      className={`p-6 bg-[var(--bg-surface)] border border-[var(--divider)] rounded-2xl ${className}`}
      style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function AboutPage() {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12 overflow-hidden">
      {isFeedbackOpen && (
        <FeedbackPanel page="about" onClose={() => setIsFeedbackOpen(false)} />
      )}

      {/* HERO */}
      <section className="mb-16 text-center relative pt-8 pb-4">
        {/* Floating background elements */}
        <motion.div
          animate={{ y: [0, -15, 0], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-[15%] text-[var(--brand)]/30 hidden md:block"
        >
          <MessageCircle className="w-10 h-10" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -10, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-20 right-[15%] text-amber-500/30 hidden md:block"
        >
          <Zap className="w-12 h-12" />
        </motion.div>
        
        {/* Logo Mascot Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
          className="relative inline-block mb-8"
        >
           <motion.img 
             animate={{ y: [0, -10, 0] }}
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             src="/logo-lg.png" 
             alt="Miyomi Mascot" 
             className="w-48 md:w-64 drop-shadow-2xl z-10 relative"
           />
           {/* Glowing orb behind mascot */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-[var(--brand)]/20 blur-3xl rounded-full -z-10"></div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-[var(--text-primary)] font-['Poppins',sans-serif] mt-2 mb-4"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: '1.1', fontWeight: 800 }}
        >
          Miyomi
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-[var(--text-secondary)] font-['Inter',sans-serif] max-w-2xl mx-auto text-lg md:text-xl leading-relaxed"
        >
          A curated directory for manga, anime, novel apps, extensions, guides, and community resources.
        </motion.p>
      </section>

      {/* WHAT IS MIYOMI */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        className="mb-20 text-center max-w-3xl mx-auto"
      >
        <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl md:text-3xl font-bold mb-6">
          What is Miyomi?
        </h2>
        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
          Miyomi is a community-driven directory designed to help users discover trusted manga, anime, novel, and reading-related resources. Finding the right app or extension when they're scattered across different platforms is a pain. We organize software, extensions, guides, and useful tools in one searchable place.
        </p>
      </motion.section>

      {/* OUR MISSION */}
      <section className="mb-20">
        <div className="text-center mb-8">
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl md:text-3xl font-bold">
            Our Mission
          </h2>
        </div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variants={itemVariants} whileHover={{ scale: 1.02, borderColor: 'rgba(59,130,246,0.4)' }} className="flex flex-col gap-2 !p-6 cursor-default group">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-lg">Discoverability</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Help users find quality resources quickly without the hassle of searching the web.</p>
          </Card>
          <Card variants={itemVariants} whileHover={{ scale: 1.02, borderColor: 'rgba(168,85,247,0.4)' }} className="flex flex-col gap-2 !p-6 cursor-default group">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-2 group-hover:bg-purple-500/20 transition-colors">
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-lg">Transparency</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Clearly explain what resources are and where they come from for user safety.</p>
          </Card>
          <Card variants={itemVariants} whileHover={{ scale: 1.02, borderColor: 'rgba(34,197,94,0.4)' }} className="flex flex-col gap-2 !p-6 cursor-default group">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-2 group-hover:bg-green-500/20 transition-colors">
              <Globe className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-lg">Community</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Support open communities, contributors, and independent creators actively.</p>
          </Card>
          <Card variants={itemVariants} whileHover={{ scale: 1.02, borderColor: 'rgba(249,115,22,0.4)' }} className="flex flex-col gap-2 !p-6 cursor-default group">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center mb-2 group-hover:bg-orange-500/20 transition-colors">
              <Zap className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-bold text-[var(--text-primary)] text-lg">Simplicity</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">Make discovery easy and accessible for everyone, no matter their technical skill.</p>
          </Card>
        </motion.div>
      </section>

      {/* WHAT WE OFFER */}
      <section className="mb-20">
        <div className="text-center mb-8">
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl md:text-3xl font-bold">
            What We Offer
          </h2>
        </div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          <Link to="/software" className="block h-full">
            <Card variants={itemVariants} whileHover={{ y: -5, borderColor: 'rgba(59,130,246,0.4)', boxShadow: '0 10px 25px -5px rgba(59,130,246,0.2)' }} className="h-full flex flex-col items-center text-center group !p-4 md:!p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                <Smartphone className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base mb-1">Software Directory</h3>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">Discover reading applications and tools.</p>
            </Card>
          </Link>

          <Link to="/extensions" className="block h-full">
            <Card variants={itemVariants} whileHover={{ y: -5, borderColor: 'rgba(168,85,247,0.4)', boxShadow: '0 10px 25px -5px rgba(168,85,247,0.2)' }} className="h-full flex flex-col items-center text-center group !p-4 md:!p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/5 transition-colors" />
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                <Puzzle className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base mb-1">Extensions Directory</h3>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">Find and explore community-made extensions.</p>
            </Card>
          </Link>

          <Link to="/guides" className="block h-full">
            <Card variants={itemVariants} whileHover={{ y: -5, borderColor: 'rgba(34,197,94,0.4)', boxShadow: '0 10px 25px -5px rgba(34,197,94,0.2)' }} className="h-full flex flex-col items-center text-center group !p-4 md:!p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors" />
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-green-500 group-hover:text-white transition-all duration-300">
                <BookOpen className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base mb-1">Guides</h3>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">Tutorials and setup guides.</p>
            </Card>
          </Link>

          <Link to="#" className="block h-full">
            <Card variants={itemVariants} whileHover={{ y: -5, borderColor: 'rgba(249,115,22,0.4)', boxShadow: '0 10px 25px -5px rgba(249,115,22,0.2)' }} className="h-full flex flex-col items-center text-center group !p-4 md:!p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors" />
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
                <LinkIcon className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm md:text-base mb-1">Community Resources</h3>
              <p className="text-xs text-[var(--text-secondary)] hidden sm:block">Helpful websites and related projects.</p>
            </Card>
          </Link>
        </motion.div>
      </section>

      {/* COMMUNITY IMPACT */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        className="mb-20"
      >
        <div className="text-center mb-8">
          <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl md:text-3xl font-bold">
            Community Impact
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center flex flex-col items-center justify-center !p-6" whileHover={{ scale: 1.05 }}>
            <BarChart3 className="w-8 h-8 text-[var(--brand)] mb-3 opacity-80" />
            <h3 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-1">
              {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.monthlyVisitors > 0 ? (stats.monthlyVisitors >= 1000 ? `${(stats.monthlyVisitors / 1000).toFixed(1)}k+` : `${stats.monthlyVisitors}+`) : '10k+')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">Monthly Visitors</p>
          </Card>
          <Card className="text-center flex flex-col items-center justify-center !p-6" whileHover={{ scale: 1.05 }}>
            <Database className="w-8 h-8 text-[var(--brand)] mb-3 opacity-80" />
            <h3 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-1">
              {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.resourcesIndexed > 0 ? `${stats.resourcesIndexed}+` : '500+')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">Resources Indexed</p>
          </Card>
          <Card className="text-center flex flex-col items-center justify-center !p-6" whileHover={{ scale: 1.05 }}>
            <BookOpen className="w-8 h-8 text-[var(--brand)] mb-3 opacity-80" />
            <h3 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-1">
              {stats.isLoading ? <span className="animate-pulse">...</span> : (stats.guidesListings > 0 ? `${stats.guidesListings}+` : '100+')}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">Guides & Listings</p>
          </Card>
          <Card className="text-center flex flex-col items-center justify-center !p-6" whileHover={{ scale: 1.05 }}>
            <Users className="w-8 h-8 text-[var(--brand)] mb-3 opacity-80" />
            <h3 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-1">24/7</h3>
            <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">Growing Community</p>
          </Card>
        </div>
      </motion.section>

      {/* TEAM & SUPPORT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {/* MIYOMI TEAM */}
        <motion.section initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="h-full border border-[var(--divider)] hover:border-[var(--brand)]/30 transition-colors">
            <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Meet The Team
            </h2>
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.name} className="flex items-center p-4 bg-[var(--bg-elev-1)] rounded-xl border border-[var(--divider)] border-l-4 border-l-cyan-500/50 gap-4 transition-transform hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 cursor-default group">
                  <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full border-2 border-cyan-500/30 group-hover:border-cyan-500 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{member.name}</span>
                      {member.link && (
                        <a href={member.link} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-cyan-400 transition-colors">
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs font-medium text-cyan-500 mb-0.5">{member.role}</p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">{member.description}</p>
                  </div>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center p-4 bg-[var(--brand)]/10 rounded-xl border border-[var(--brand)]/20 text-center">
                <span className="font-bold text-[var(--brand)] md:text-lg leading-snug">
                  And You! Thank you for your feedback,<br className="hidden sm:block" /> reports, and submissions
                </span>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* SUPPORT */}
        <motion.section initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
          <Card className="h-full relative overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] group">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-[var(--text-primary)] font-['Poppins',sans-serif] text-2xl font-bold mb-4 flex items-center gap-2">
                <Coffee className="w-6 h-6 text-cyan-400" />
                Support Miyomi
              </h2>
              <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8">
                Help Miyomi Grow! Support development, infrastructure, moderation, and future improvements.
              </p>
              <Link
                to="/donate"
                className="inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:-translate-y-1 text-lg mb-8"
              >
                <Heart className="w-5 h-5 fill-current" />
                Help Miyomi Grow
              </Link>

              <div className="flex flex-col items-center pt-2">
                <p className="text-[var(--text-secondary)] text-sm mb-4 font-medium">Follow us on social networks</p>
                <div className="flex items-center gap-4">
                  <a href="https://www.youtube.com/@iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-cyan-500/30 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#FF0000] hover:border-[#FF0000] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all">
                    <Youtube className="w-5 h-5" />
                  </a>
                  <a href="https://discord.gg/hfYtH9hrRm" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-cyan-500/30 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#5865F2] hover:border-[#5865F2] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(88,101,242,0.3)] transition-all">
                    <DiscordIcon className="w-5 h-5" />
                  </a>
                  <a href="https://t.me/iitachiyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-cyan-500/30 flex items-center justify-center text-[var(--text-secondary)] hover:text-[#0088cc] hover:border-[#0088cc] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,136,204,0.3)] transition-all">
                    <TelegramIcon className="w-5 h-5" />
                  </a>
                  <a href="https://github.com/tas33n/miyomi" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-[var(--bg-elev-1)] border border-cyan-500/30 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all">
                    <Github className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </motion.section>
      </div>

      {/* OTHER STUFF: COMMUNITY DRIVEN & RESOURCES */}
      <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
        <Card className="bg-gradient-to-br from-[var(--brand)]/10 to-transparent dark:from-[var(--brand)]/10 dark:to-transparent border-[var(--brand)]/20">
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--brand)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-sm hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--brand)]/30"
              >
                <UploadCloud className="w-5 h-5" />
                Use the Contribute page
              </Link>
              <a
                href="https://github.com/tas33n/miyomi/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-elev-1)] border border-[var(--divider)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--bg-elev-2)] transition-colors shadow-sm hover:-translate-y-1 hover:shadow-lg"
              >
                <Github className="w-5 h-5" />
                Open a GitHub issue
              </a>
            </div>
          </div>
        </Card>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
        <Card className="relative overflow-hidden border-[var(--brand)]/20 bg-[var(--brand)]/5 hover:border-[var(--brand)]/40 transition-colors group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[var(--brand)]/50 group-hover:bg-[var(--brand)] transition-colors"></div>
          <p className="text-[var(--text-primary)] font-medium mb-1 flex items-center gap-2 flex-wrap">
            <Heart className="w-5 h-5 flex-shrink-0 text-[var(--brand)] fill-current" />
            <span>
              Also Visit{' '}
              <a href="https://everythingmoe.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline">EverythingMoe</a>,{' '}
              <a href="https://wotaku.moe/" target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline">Wotaku</a> &{' '}
              <a href="https://theindex.moe/" target="_blank" rel="noopener noreferrer" className="text-[var(--brand)] hover:underline">TheIndex</a>
            </span>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Some amazing resources we refer to.
          </p>
        </Card>
      </motion.section>

      {/* DISCLAIMER PUSHED TO BOTTOM */}
      <motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} id="disclaimer">
        <blockquote className="border-l-4 border-amber-500/50 dark:border-amber-500/50 bg-[var(--bg-elev-1)]/50 pl-4 py-2 pr-4 rounded-xl my-4 text-[var(--text-secondary)]">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2 text-base md:text-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            Transparency Notice
          </h3>
          <p className="text-xs md:text-sm leading-relaxed mb-2">
            Miyomi is simply a directory. We have <strong>no affiliation</strong> with the developers or creators of the apps, extensions, or resources listed here. We do not build, host, or distribute any of this content.
          </p>
          <p className="text-xs md:text-sm leading-relaxed mb-2">
            <strong>Limitation of Liability:</strong> Miyomi provides this directory on an "as-is" and "as-available" basis. We do not warrant that external links, extensions, or applications indexed here are safe, secure, or compatible with your device.
          </p>
          <p className="text-xs md:text-sm leading-relaxed">
            If you notice any suspicious listings, please use the <button onClick={() => setIsFeedbackOpen(true)} className="font-medium underline text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors">Feedback button</button> to report them.
          </p>
        </blockquote>
      </motion.section>

    </div>
  );
}
