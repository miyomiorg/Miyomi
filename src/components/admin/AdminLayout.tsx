import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  LayoutDashboard, AppWindow, Puzzle, BookOpen, HelpCircle,
  Inbox, Heart, Bell, Palette, Settings, Users, LogOut, Menu, X, ScrollText, Shield, DollarSign
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/apps', label: 'Apps', icon: AppWindow },
  { path: '/admin/extensions', label: 'Extensions', icon: Puzzle },
  { path: '/admin/guides', label: 'Guides', icon: BookOpen },
  { path: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { path: '/admin/submissions', label: 'Submissions', icon: Inbox },
  { path: '/admin/likes', label: 'Likes', icon: Heart },
  { path: '/admin/notices', label: 'Notices', icon: Bell },
  { path: '/admin/donations', label: 'Donations', icon: DollarSign },
  { path: '/admin/themes', label: 'Themes', icon: Palette },
  { path: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
  { path: '/admin/sessions', label: 'Sessions', icon: Shield },
  { path: '/admin/settings', label: 'Settings', icon: Settings },
  { path: '/admin/admins', label: 'Admins', icon: Users, superAdminOnly: true },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isSuperAdmin } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter(item => !item.superAdminOnly || isSuperAdmin);

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
        <div className="h-16 flex items-center px-6 border-b border-[var(--divider)]">
          <button onClick={() => navigate('/')} className="text-xl font-bold text-[var(--brand)] font-['Poppins',sans-serif]">
            Miyomi Admin
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                  ? 'bg-[var(--brand)]/10 text-[var(--brand)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev-1)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--divider)]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full border border-[var(--divider)]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-[var(--brand)] font-bold">
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
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-[var(--divider)] bg-[var(--bg-surface)] flex-shrink-0">
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
