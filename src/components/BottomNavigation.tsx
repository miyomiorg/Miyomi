import React from 'react';
import { Home, Smartphone, Puzzle, BookOpen, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

interface BottomNavigationProps {
  onNavigate?: (path: string) => void;
  mobileMenuOpen?: boolean;
  onMenuToggle?: () => void;
}

export function BottomNavigation({
  onNavigate,
  mobileMenuOpen = false,
  onMenuToggle,
}: BottomNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      match: (p: string) => p === '/' && !mobileMenuOpen,
    },
    {
      label: 'Software',
      path: '/software',
      icon: Smartphone,
      match: (p: string) => p.startsWith('/software') && !mobileMenuOpen,
    },
    {
      label: 'Extensions',
      path: '/extensions',
      icon: Puzzle,
      match: (p: string) => p.startsWith('/extensions') && !mobileMenuOpen,
    },
    {
      label: 'Guides',
      path: '/guides',
      icon: BookOpen,
      match: (p: string) => p.startsWith('/guides') && !mobileMenuOpen,
    },
    {
      label: 'Menu',
      icon: Menu,
      isMenuToggle: true,
      match: () => mobileMenuOpen,
    },
  ];

  const handleTabClick = (item: typeof navItems[number]) => {
    if (item.isMenuToggle) {
      onMenuToggle?.();
    } else if (item.path) {
      if (onNavigate) {
        onNavigate(item.path);
      } else {
        navigate(item.path);
      }
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[999] md:hidden bg-[var(--bg-page)]/85 backdrop-blur-xl border-t border-[var(--divider)]/50 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] flex items-center justify-around px-2"
      style={{
        height: 'calc(4rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item, idx) => {
        const isActive = item.match(location.pathname);
        const Icon = item.icon;

        return (
          <button
            key={item.label || idx}
            onClick={() => handleTabClick(item)}
            className="relative flex flex-col items-center justify-center flex-1 h-full py-2 select-none group focus:outline-none"
            aria-label={item.label}
          >
            {/* Tab content wrapper */}
            <div className="flex flex-col items-center justify-center gap-1">
              {/* Icon with active scale animation */}
              <motion.div
                animate={{
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`transition-colors duration-200 ${
                  isActive ? 'text-[var(--brand)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </motion.div>

              {/* Label */}
              <span
                className={`text-[10px] font-['Inter',sans-serif] transition-colors duration-200 ${
                  isActive
                    ? 'text-[var(--brand)] font-semibold'
                    : 'text-[var(--text-secondary)] font-normal'
                }`}
              >
                {item.label}
              </span>
            </div>

            {/* Sliding dot active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeTabDot"
                className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--brand)]"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
