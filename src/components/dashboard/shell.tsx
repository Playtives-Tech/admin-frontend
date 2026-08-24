'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { DashboardSidebar } from './sidebar';
import { navItems } from './nav-items';
import { cn } from '@/lib/utils';

function MobileNavLink({
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
        'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'text-brand'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="size-6 shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
    </Link>
  );
}

interface DashboardShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function DashboardShell({
  title,
  description,
  children,
}: DashboardShellProps): React.JSX.Element | null {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-border border-t-brand" />
      </div>
    );
  }

  return (
    <div className="app-background min-h-dvh">
      <DashboardSidebar />

      <div className="lg:ml-72">
        {/* Top header */}
        <header className="app-surface sticky top-0 z-10 flex h-16 items-center border-b px-5 backdrop-blur lg:px-10">
          <div>
            <h1 className="font-sans text-base font-semibold">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="px-5 py-8 pb-24 lg:px-10 lg:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="app-surface fixed inset-x-0 bottom-0 z-20 flex h-[4.75rem] items-center justify-around border-t px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
        {navItems.map((item) => (
          <MobileNavLink key={item.href} {...item} />
        ))}
      </nav>
    </div>
  );
}
