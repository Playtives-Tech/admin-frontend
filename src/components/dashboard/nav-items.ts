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
  ShieldCheck,
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
  { href: '/member-codes', label: 'Member Codes', icon: TicketCheck },
  { href: '/kyc', label: 'KYC Reviews', icon: ShieldCheck },
  { href: '/opportunities', label: 'Opportunity Editor', icon: FilePenLine },
  { href: '/interest-registrations', label: 'Interest Registrations', icon: ClipboardList },
  { href: '/blog', label: 'Blog Center', icon: BookOpen },
  { href: '/payouts', label: 'User Payouts', icon: Banknote },
  { href: '/acquisitions', label: 'User Ownerships', icon: ChartNoAxesCombined },
  { href: '/deposits', label: 'Deposit Requests', icon: ArrowDownCircle },
  { href: '/withdrawals', label: 'Withdrawal Requests', icon: ArrowUpCircle },
  { href: '/name-change-requests', label: 'Name Change Requests', icon: BadgeCheck },
  // { href: '/activity', label: 'Wallet Activity', icon: ScrollText },
];
