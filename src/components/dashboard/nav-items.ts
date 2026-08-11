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
  { href: '/acquisitions', label: 'Acquisitions', icon: ChartNoAxesCombined },
  { href: '/deposits', label: 'Deposits', icon: ArrowDownCircle },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
  { href: '/activity', label: 'Wallet Activity', icon: ScrollText },
  { href: '/payouts', label: 'Payouts', icon: Banknote },
];
