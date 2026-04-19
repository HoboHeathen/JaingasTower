import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ScrollText, TreePine, User, Swords, BookOpen, Users } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const ALL_NAV_ITEMS = [
  { path: '/', label: 'Characters', icon: User },
  { path: '/skill-trees', label: 'Skill Trees', icon: TreePine, adminOnly: true },
  { path: '/races', label: 'Races', icon: Swords },
  { path: '/rules', label: 'Rules', icon: BookOpen },
  { path: '/group', label: 'Group', icon: Users },
];


export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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
            <div className="flex items-center gap-1">
              {navItems.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>);

}