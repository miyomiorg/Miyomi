import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard, AppWindow, Puzzle, BookOpen, HelpCircle,
  Inbox, Heart, Bell, Palette, Settings, Users, LogOut, Menu, X, ScrollText, Shield, DollarSign,
  PenTool, Flag, MessageSquare, Layers, Bot, FileText, UserCircle, ChevronDown
} from 'lucide-react';
import { useState, useEffect } from 'react';

type NavItem = {
  path: string;
  label: string;
  icon: any;
  superAdminOnly?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    label: '',
    items: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Content',
    items: [
      { path: '/admin/apps', label: 'Apps', icon: AppWindow },
      { path: '/admin/extensions', label: 'Extensions', icon: Puzzle },
      { path: '/admin/compat-groups', label: 'Compat Groups', icon: Layers },
      { path: '/admin/guides', label: 'Guides', icon: BookOpen },
      { path: '/admin/blog-posts', label: 'Blog Posts', icon: FileText },
      { path: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
    ]
  },
  {
    label: 'Community',
    items: [
      { path: '/admin/contributors', label: 'Contributors', icon: UserCircle },
      { path: '/admin/submissions', label: 'Submissions', icon: Inbox },
      { path: '/admin/guide-submissions', label: 'Guide Subs', icon: BookOpen },
      { path: '/admin/edit-suggestions', label: 'Edits', icon: PenTool },
      { path: '/admin/reports', label: 'Reports', icon: Flag },
      { path: '/admin/feedbacks', label: 'Feedbacks', icon: MessageSquare },
    ]
  },
  {
    label: 'Engagement',
    items: [
      { path: '/admin/likes', label: 'Likes', icon: Heart },
      { path: '/admin/notices', label: 'Notices', icon: Bell },
      { path: '/admin/donations', label: 'Donations', icon: DollarSign },
    ]
  },
  {
    label: 'System',
    items: [
      { path: '/admin/themes', label: 'Themes', icon: Palette },
      { path: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
      { path: '/admin/bot-logs', label: 'Bot Attacks', icon: Bot },
      { path: '/admin/sessions', label: 'Sessions', icon: Shield },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
      { path: '/admin/admins', label: 'Admins', icon: Users, superAdminOnly: true },
    ]
  },
];

function getInitialCollapsed(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem('admin_sidebar_collapsed');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isModerator, hasPermission } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed);

  // Map nav paths to permission resource names for moderator filtering
  const pathToResource: Record<string, string> = {
    '/admin/apps': 'apps',
    '/admin/extensions': 'extensions',
    '/admin/compat-groups': 'apps', // tied to apps management
    '/admin/guides': 'guides',
    '/admin/blog-posts': 'blog_posts',
    '/admin/faqs': 'faqs',
    '/admin/contributors': 'contributors',
    '/admin/submissions': 'submissions',
    '/admin/guide-submissions': 'guide_submissions',
    '/admin/edit-suggestions': 'edit_suggestions',
    '/admin/reports': 'reports',
    '/admin/feedbacks': 'feedbacks',
    '/admin/likes': 'likes',
    '/admin/notices': 'notices',
    '/admin/donations': 'donations',
    '/admin/themes': 'themes',
  };

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  const toggleSection = (label: string) => {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
  };

  return (
    <div className="flex h-screen bg-[var(--bg-page)] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-[var(--divider)] 
        flex flex-col transition-transform duration-200 lg:translate-x-0 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-14 lg:h-16 flex items-center justify-between px-5 border-b border-[var(--divider)] flex-shrink-0">
          <button onClick={() => navigate('/')} className="text-lg lg:text-xl font-bold text-[var(--brand)] font-['Poppins',sans-serif]">
            Miyomi Admin
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-[var(--text-secondary)] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overscroll-contain">
          {navSections.map(section => {
            const filteredItems = section.items.filter(item => {
              if (item.superAdminOnly && !isSuperAdmin) return false;
              if (isModerator) {
                // If it's the dashboard, always allow
                if (item.path === '/admin/dashboard') return true;
                const resource = pathToResource[item.path];
                // If resource is mapped, check read permission
                if (resource) return hasPermission(resource, 'read');
                // If not mapped, hide it from moderators by default
                return false;
              }
              return true;
            });
            if (filteredItems.length === 0) return null;

            const isCollapsed = section.label && collapsed[section.label];
            const hasActiveChild = filteredItems.some(item => location.pathname.startsWith(item.path));

            return (
              <div key={section.label || 'top'}>
                {/* Section header */}
                {section.label && (
                  <button
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between px-3 pt-4 pb-1.5 text-[10px] uppercase tracking-widest font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {section.label}
                      {hasActiveChild && isCollapsed && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                      )}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                )}

                {/* Section items */}
                {!isCollapsed && filteredItems.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-all ${active
                        ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[var(--divider)] flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full border border-[var(--divider)] flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-[var(--brand)] font-bold flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user?.user_metadata?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)] hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (Mobile + Desktop now) */}
        <header className="h-14 lg:h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-[var(--divider)] bg-[var(--bg-surface)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-[var(--text-primary)]">
              <Menu className="w-5 h-5" />
            </button>
            {/* Optional Breadcrumb or Page Title can go here */}
            <div className="font-medium text-[var(--text-secondary)] hidden lg:block">
              Dashboard
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[var(--bg-page)] p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
