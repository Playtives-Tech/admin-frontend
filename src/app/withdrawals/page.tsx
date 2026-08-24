'use client';

import { useEffect, useState } from 'react';
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
import {
  getWithdrawalRequests,
  reviewWithdrawalRequest,
} from '@/lib/services/member-operations-service';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, type AdminDateRange } from '@/lib/date-range';

interface WithdrawalRequest {
  id: string;
  user: string;
  email: string;
  amount: number;
  depositDebit: number;
  earningsDebit: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Failed';
  paymentReference: string | null;
  reviewNote: string | null;
}

export default function WithdrawalsPage(): React.JSX.Element {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);

  const filteredWithdrawals = withdrawals.filter(
    (w) => statusFilter === 'All' || w.status === statusFilter,
  );

  useEffect(() => {
    if (range.preset === 'custom' && (!range.from || !range.to)) return;
    void getWithdrawalRequests(range).then(
      (records) =>
        setWithdrawals(
          records.map((record) => ({
            id: record._id,
            user: record.userId.name,
            email: record.userId.email,
            amount: record.amountMinorUnits / 100,
            depositDebit: record.depositDebitMinorUnits / 100,
            earningsDebit: record.earningsDebitMinorUnits / 100,
            bankName: record.bankName,
            accountNumber: record.accountNumber,
            accountName: record.accountName,
            date: new Date(record.createdAt).toLocaleString('en-NG'),
            status:
              record.status === 'completed'
                ? 'Completed'
                : record.status === 'rejected'
                  ? 'Failed'
                  : 'Pending',
            paymentReference: record.paymentReference,
            reviewNote: record.reviewNote,
          })),
        ),
      () => notify.error('Could not load withdrawal requests'),
    );
  }, [range]);

  const pending = withdrawals.filter((request) => request.status === 'Pending');
  const stats = [
    { label: 'Pending Withdrawals', value: String(pending.length), icon: MdAccessTime },
    {
      label: 'Pending Volume',
      value: `₦${pending.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}`,
      icon: MdNorth,
    },
    {
      label: 'Processed',
      value: `₦${withdrawals
        .filter((item) => item.status === 'Completed')
        .reduce((sum, item) => sum + item.amount, 0)
        .toLocaleString()}`,
      icon: MdCheckCircle,
    },
  ];

  const handleAction = async (id: string, action: 'Completed' | 'Failed') => {
    if (action === 'Completed' && !paymentReference.trim()) {
      notify.error('Enter the bank payment reference before completing this withdrawal');
      return;
    }
    setIsReviewing(true);
    try {
      await reviewWithdrawalRequest(id, action === 'Completed' ? 'completed' : 'rejected', {
        paymentReference: paymentReference.trim() || undefined,
        note: reviewNote.trim() || undefined,
      });
      setWithdrawals((current) =>
        current.map((request) => (request.id === id ? { ...request, status: action } : request)),
      );
      setSelectedWithdrawal(null);
      setPaymentReference('');
      setReviewNote('');
      notify.success(`Withdrawal marked as ${action.toLowerCase()}`);
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Withdrawal review failed');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <DashboardShell title="Withdrawals" description="Process user withdrawal requests">
      <div className="mx-auto max-w-6xl space-y-8">
        <DateRangeFilter value={range} onChange={setRange} />
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
              <h3 className="mt-4 font-sans text-2xl font-semibold">{stat.value}</h3>
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
          <div className="flex h-[min(60vh,680px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-surface">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="font-sans text-lg font-semibold text-foreground">
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
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid gap-4">
                {/* User & Amount */}
                <div className="grid gap-3 rounded-xl border bg-background p-4 sm:grid-cols-2">
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
                    <p className="mt-1 text-xl font-semibold text-brand">
                      ₦{selectedWithdrawal.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Reserved balance breakdown */}
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Withdrawal Funding Breakdown
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Reserved from Deposits</p>
                      <p className="font-medium">
                        ₦{selectedWithdrawal.depositDebit.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reserved from Earnings</p>
                      <p className="font-medium">
                        ₦{selectedWithdrawal.earningsDebit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs text-muted-foreground">Total Reserved</p>
                    <p className="font-medium text-brand">
                      ₦
                      {(
                        selectedWithdrawal.depositDebit + selectedWithdrawal.earningsDebit
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Bank Details Card */}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Destination Bank
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border bg-brand/5 p-3.5 text-brand">
                    <div className="grid size-10 place-items-center rounded-lg bg-brand/10">
                      <MdAccountBalance className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">
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
                {selectedWithdrawal.status === 'Pending' ? (
                  <div className="grid gap-3 border-t pt-4">
                    <label className="grid gap-2 text-sm font-semibold">
                      Payment reference (required for completion)
                      <input
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        maxLength={120}
                        className="h-11 rounded-xl border bg-background px-3"
                        placeholder="Bank transfer reference"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Decision note
                      <textarea
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        maxLength={500}
                        rows={3}
                        className="rounded-xl border bg-background p-3"
                        placeholder="Reason, reconciliation note, or rejection details"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/20 px-5 py-3">
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Close
              </button>
              {selectedWithdrawal.status === 'Pending' && (
                <>
                  <button
                    disabled={isReviewing}
                    onClick={() => handleAction(selectedWithdrawal.id, 'Failed')}
                    className="flex items-center gap-1.5 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    Reject Request
                  </button>
                  <button
                    disabled={isReviewing}
                    onClick={() => handleAction(selectedWithdrawal.id, 'Completed')}
                    className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <MdCheckCircle className="size-4" /> Confirm Payment & Complete
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
