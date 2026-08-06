'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { navItems } from './nav-items';
import { cn } from '@/lib/utils';

function NavLink({
  href,
  label,
  icon: Icon,
}: (typeof navItems)[number]): React.JSX.Element {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'bg-brand text-brand-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="size-6 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
    </Link>
  );
}

export function DashboardSidebar(): React.JSX.Element {
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout(): void {
    logout();
    router.replace('/login');
  }

  return (
    <aside className="app-surface fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r px-5 py-6 lg:flex">
      {/* Wordmark */}
      <Link
        href="/overview"
        className="flex items-center gap-3 px-2 font-heading text-xl font-semibold"
      >
        <span className="size-7 rounded-lg bg-brand" aria-hidden="true" />
        Playtives
      </Link>

      {/* Section label */}
      <p className="px-2 pt-12 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Management
      </p>

      {/* Nav */}
      <nav className="mt-3 grid gap-1" aria-label="Dashboard navigation">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions — theme toggle + email + sign out */}
      <div className="grid gap-2 border-t pt-6">
        {/* User info row */}
        <div className="flex items-center justify-between px-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.email ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Sign-out button — mirrors web's style exactly */}
        <button
          type="button"
          id="dashboard-logout"
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-background px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm',
            'transition hover:border-brand/35 hover:bg-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          )}
        >
          <LogOut className="size-4" fill="currentColor" fillOpacity={0.2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
