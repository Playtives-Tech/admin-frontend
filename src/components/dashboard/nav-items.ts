import {
  PieChart,
  UsersRound,
  FilePenLine,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  ChartNoAxesCombined,
  ScrollText,
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
  { href: '/opportunities', label: 'Opportunity Editor', icon: FilePenLine },
  { href: '/payouts', label: 'User Payouts', icon: Banknote },
  { href: '/acquisitions', label: 'User Ownerships', icon: ChartNoAxesCombined },
  { href: '/deposits', label: 'Deposit Requests', icon: ArrowDownCircle },
  { href: '/withdrawals', label: 'Withdrawal Requests', icon: ArrowUpCircle },
  // { href: '/activity', label: 'Wallet Activity', icon: ScrollText },
];
