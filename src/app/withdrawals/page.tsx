'use client';

import { useState } from 'react';
import {
  MdNorth,
  MdCheckCircle,
  MdCancel,
  MdAccessTime,
  MdAccountBalance,
  MdTune,
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

// Mock Data
const stats = [
  { label: 'Pending Withdrawals', value: '8', icon: MdAccessTime },
  { label: 'Pending Volume', value: '₦1.2M', icon: MdNorth },
  { label: 'Processed (30d)', value: '₦15.4M', icon: MdCheckCircle },
];

interface WithdrawalRequest {
  id: string;
  user: string;
  email: string;
  amount: number;
  walletBalance: number;
  earningsBalance: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Failed';
}

const initialWithdrawals: WithdrawalRequest[] = [
  {
    id: 'WDR-001',
    user: 'Zainab Bello',
    email: 'zainab.b@example.com',
    amount: 250000,
    walletBalance: 150000,
    earningsBalance: 300000,
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Zainab Bello',
    date: 'Oct 15, 2026 14:30',
    status: 'Pending',
  },
  {
    id: 'WDR-002',
    user: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    amount: 500000,
    walletBalance: 150000,
    earningsBalance: 600000,
    bankName: 'Access Bank',
    accountNumber: '0698765432',
    accountName: 'Sarah Jenkins',
    date: 'Oct 15, 2026 12:15',
    status: 'Pending',
  },
  {
    id: 'WDR-003',
    user: 'Michael Tosin',
    email: 'michael.t@example.com',
    amount: 1500000,
    walletBalance: 0,
    earningsBalance: 1500000,
    bankName: 'Zenith Bank',
    accountNumber: '2023456789',
    accountName: 'Michael Tosin',
    date: 'Oct 14, 2026 09:45',
    status: 'Completed',
  },
  {
    id: 'WDR-004',
    user: 'David Olatunji',
    email: 'david.o@example.com',
    amount: 50000,
    walletBalance: 50000,
    earningsBalance: 20000,
    bankName: 'First Bank',
    accountNumber: '3029876541',
    accountName: 'David Olatunji',
    date: 'Oct 14, 2026 16:20',
    status: 'Failed',
  },
];

export default function WithdrawalsPage(): React.JSX.Element {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(initialWithdrawals);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredWithdrawals = withdrawals.filter(
    (w) => statusFilter === 'All' || w.status === statusFilter,
  );

  const handleAction = (id: string, action: 'Completed' | 'Failed') => {
    setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status: action } : w)));
    setSelectedWithdrawal(null);
    notify.success(`Withdrawal marked as ${action.toLowerCase()}`);
  };

  return (
    <DashboardShell title="Withdrawals" description="Process user withdrawal requests">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="app-surface rounded-2xl border p-5 shadow-sm transition hover:border-brand/35"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <stat.icon className="size-4" />
              </div>
              <h3 className="mt-4 font-heading text-2xl font-semibold">{stat.value}</h3>
            </div>
          ))}
        </div>

        {/* Withdrawals Table */}
        <div className="app-surface rounded-2xl border shadow-sm">
          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <MdNorth className="size-4" />
              Withdrawal Requests
            </h3>

            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex w-max items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MdTune className="size-4" />
                Filter: {statusFilter}
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border bg-surface p-2 shadow-xl">
                  <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Status
                  </div>
                  {['All', 'Pending', 'Completed', 'Failed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setIsFilterOpen(false);
                      }}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted',
                        statusFilter === status && 'bg-brand/10 font-medium text-brand',
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">User</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Destination</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Date Requested</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredWithdrawals.map((wdr) => (
                  <tr key={wdr.id} className="transition hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{wdr.user}</p>
                      <p className="text-xs text-muted-foreground">{wdr.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ₦{wdr.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MdAccountBalance className="size-3.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{wdr.bankName}</p>
                          <p className="text-xs text-muted-foreground">{wdr.accountNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{wdr.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                          wdr.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : wdr.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500',
                        )}
                      >
                        {wdr.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedWithdrawal(wdr)}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredWithdrawals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                      No withdrawals found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border bg-surface shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Review Withdrawal
                </h2>
                <p className="text-xs text-muted-foreground">Request ID: {selectedWithdrawal.id}</p>
              </div>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MdCancel className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid gap-6">
                {/* User & Amount */}
                <div className="grid grid-cols-2 gap-4 rounded-xl border bg-background p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      User Details
                    </p>
                    <p className="mt-1 font-medium">{selectedWithdrawal.user}</p>
                    <p className="text-xs text-muted-foreground">{selectedWithdrawal.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Requested Amount
                    </p>
                    <p className="mt-1 font-heading text-2xl font-semibold text-brand">
                      ₦{selectedWithdrawal.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* User Balances Breakdown */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    User Balances
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Deposited Funds</p>
                      <p className="font-medium">
                        ₦{selectedWithdrawal.walletBalance.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Earnings (Returns)</p>
                      <p className="font-medium">
                        ₦{selectedWithdrawal.earningsBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Total Available</p>
                    <p className="font-medium text-brand">
                      ₦
                      {(
                        selectedWithdrawal.walletBalance + selectedWithdrawal.earningsBalance
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Bank Details Card */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Destination Bank
                  </p>
                  <div className="flex items-center gap-4 rounded-xl border bg-brand/5 p-4 text-brand">
                    <div className="grid size-12 place-items-center rounded-xl bg-brand/10">
                      <MdAccountBalance className="size-6" />
                    </div>
                    <div>
                      <p className="font-heading text-lg font-semibold">
                        {selectedWithdrawal.bankName}
                      </p>
                      <p className="text-sm font-medium">
                        {selectedWithdrawal.accountNumber} · {selectedWithdrawal.accountName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MdAccessTime className="size-4" />
                  Requested on {selectedWithdrawal.date}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 border-t bg-muted/20 p-4">
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Close
              </button>
              {selectedWithdrawal.status === 'Pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'Failed')}
                    className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Fail Request
                  </button>
                  <button
                    onClick={() => handleAction(selectedWithdrawal.id, 'Completed')}
                    className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <MdCheckCircle className="size-4" /> Process & Complete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
