import { PieChart, UsersRound, Building2, Banknote, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: '/overview', label: 'Overview', icon: PieChart },
  { href: '/members', label: 'Members', icon: UsersRound },
  { href: '/opportunities', label: 'Opportunities', icon: Building2 },
  { href: '/deposits', label: 'Deposits', icon: ArrowDownCircle },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
  { href: '/payouts', label: 'Payouts', icon: Banknote },
];
