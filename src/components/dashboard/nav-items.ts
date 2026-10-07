import {
  PieChart,
  UsersRound,
  FilePenLine,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  ChartNoAxesCombined,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  TicketCheck,
  UserCheck,
  Layers3,
  BellRing,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: PieChart },
  { href: '/members', label: 'Members', icon: UsersRound },
  { href: '/participation-requests', label: 'Participation Requests', icon: UserCheck },
  { href: '/member-codes', label: 'Member Codes', icon: TicketCheck },
  // KYC review navigation is temporarily paused.
  // { href: '/kyc', label: 'KYC Reviews', icon: ShieldCheck },
  { href: '/opportunities', label: 'Opportunity Editor', icon: FilePenLine },
  { href: '/wealth-collectives', label: 'Wealth Collectives', icon: Layers3 },
  { href: '/interest-registrations', label: 'Interest Registrations', icon: ClipboardList },
  { href: '/blog', label: 'Blog Center', icon: BookOpen },
  { href: '/payouts', label: 'User Payouts', icon: Banknote },
  { href: '/acquisitions', label: 'User Ownerships', icon: ChartNoAxesCombined },
  { href: '/deposits', label: 'Deposit Requests', icon: ArrowDownCircle },
  { href: '/withdrawals', label: 'Withdrawal Requests', icon: ArrowUpCircle },
  { href: '/name-change-requests', label: 'Name Change Requests', icon: BadgeCheck },
  { href: '/notifications', label: 'Notifications', icon: BellRing },
  // { href: '/activity', label: 'Wallet Activity', icon: ScrollText },
];

export const navGroups: ReadonlyArray<{ label: string; items: NavItem[] }> = [
  {
    label: 'Member management',
    items: navItems.filter((item) =>
      ['/overview', '/members', '/participation-requests', '/member-codes'].includes(item.href),
    ),
  },
  {
    label: 'Collectives & opportunities',
    items: navItems.filter((item) =>
      [
        '/opportunities',
        '/wealth-collectives',
        '/interest-registrations',
        '/acquisitions',
      ].includes(item.href),
    ),
  },
  {
    label: 'Payments',
    items: navItems.filter((item) => ['/payouts', '/deposits', '/withdrawals'].includes(item.href)),
  },
  {
    label: 'Content & profile',
    items: navItems.filter((item) =>
      ['/blog', '/name-change-requests', '/notifications'].includes(item.href),
    ),
  },
];
