import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ScrollText, TreePine, User, Swords, BookOpen, Users, Dices, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'Characters', icon: User },
  { path: '/group', label: 'Adventure', icon: Users },
  { path: '/skill-trees', label: 'Skill Trees', icon: TreePine, adminOnly: true },
  { path: '/races', label: 'Races', icon: Swords },
  { path: '/rules', label: 'Rules', icon: BookOpen },
  { path: '/loot-table', label: 'Loot Table', icon: Dices },
];

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Top nav bar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <ScrollText className="w-6 h-6 text-primary" />
              <span className="font-heading text-lg font-semibold text-foreground tracking-wide">Jainga's Tower</span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}