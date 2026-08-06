'use client';

import { useEffect, useState } from 'react';
import {
  MdSouth,
  MdCheckCircle,
  MdCancel,
  MdAccessTime,
  MdVisibility,
  MdClose,
  MdWarning,
  MdTune,
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { getDepositRequests, reviewDepositRequest } from '@/lib/services/member-operations-service';

interface DepositRequest {
  id: string;
  user: string;
  email: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  transferReference: string;
}

export default function DepositsPage(): React.JSX.Element {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredDeposits = deposits.filter(
    (d) => statusFilter === 'All' || d.status === statusFilter,
  );

  useEffect(() => {
    void getDepositRequests().then(
      (records) =>
        setDeposits(
          records.map((record) => ({
            id: record._id,
            user: record.userId.name,
            email: record.userId.email,
            amount: record.amountMinorUnits / 100,
            date: new Date(record.createdAt).toLocaleString('en-NG'),
            status:
              `${record.status.charAt(0).toUpperCase()}${record.status.slice(1)}` as DepositRequest['status'],
            transferReference: record.transferReference,
          })),
        ),
      () => notify.error('Could not load deposit requests'),
    );
  }, []);

  const pending = deposits.filter((deposit) => deposit.status === 'Pending');
  const stats = [
    { label: 'Pending Requests', value: String(pending.length), icon: MdAccessTime },
    {
      label: 'Pending Volume',
      value: `₦${pending.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}`,
      icon: MdSouth,
    },
    {
      label: 'Total Approved',
      value: `₦${deposits
        .filter((item) => item.status === 'Approved')
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString()}`,
      icon: MdCheckCircle,
    },
  ];

  const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
    try {
      await reviewDepositRequest(id, action.toLowerCase() as 'approved' | 'rejected');
      setDeposits((current) =>
        current.map((deposit) => (deposit.id === id ? { ...deposit, status: action } : deposit)),
      );
      setSelectedDeposit(null);
      notify.success(`Deposit request ${action.toLowerCase()}`);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Deposit review failed');
    }
  };

  return (
    <DashboardShell title="Deposits" description="Review and validate wallet funding requests">
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

        {/* Deposits Table */}
        <div className="app-surface rounded-2xl border shadow-sm">
          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <MdSouth className="size-4" />
              Recent Deposit Requests
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
                  {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
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
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Date Submitted</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDeposits.map((deposit) => (
                  <tr key={deposit.id} className="transition hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{deposit.user}</p>
                      <p className="text-xs text-muted-foreground">{deposit.email}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ₦{deposit.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{deposit.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                          deposit.status === 'Approved'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : deposit.status === 'Pending'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500',
                        )}
                      >
                        {deposit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedDeposit(deposit)}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <MdVisibility className="size-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-surface shadow-xl">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b p-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Review Deposit
                </h2>
                <p className="text-xs text-muted-foreground">Request ID: {selectedDeposit.id}</p>
              </div>
              <button
                onClick={() => setSelectedDeposit(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MdClose className="size-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto grid max-w-md gap-6">
                {/* Bank transfer reference */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bank Transfer Reference
                  </p>
                  <div className="rounded-xl border bg-muted p-4 text-sm">
                    {selectedDeposit.transferReference}
                  </div>
                </div>

                <div className="grid gap-4 rounded-xl border bg-background p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      User Details
                    </p>
                    <p className="mt-1 font-medium">{selectedDeposit.user}</p>
                    <p className="text-xs text-muted-foreground">{selectedDeposit.email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Date Submitted
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                      <MdAccessTime className="size-3.5 text-muted-foreground" />{' '}
                      {selectedDeposit.date}
                    </p>
                  </div>
                  <div className="border-t pt-2 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Requested Amount
                    </p>
                    <p className="mt-1 font-heading text-3xl font-semibold text-brand">
                      ₦{selectedDeposit.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedDeposit.status === 'Pending' && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <MdWarning className="mt-0.5 size-5 shrink-0 text-amber-500" />
                      <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">
                        Verify this transfer reference and amount against the receiving bank
                        statement before approving. Approval immediately credits the user&apos;s
                        deposited balance.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex shrink-0 items-center justify-end gap-3 border-t bg-muted/20 p-4">
              <button
                onClick={() => setSelectedDeposit(null)}
                className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Close
              </button>
              {selectedDeposit.status === 'Pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedDeposit.id, 'Rejected')}
                    className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <MdCancel className="size-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleAction(selectedDeposit.id, 'Approved')}
                    className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <MdCheckCircle className="size-4" /> Approve & Credit Wallet
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
