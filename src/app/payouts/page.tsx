'use client';

import { useCallback, useEffect, useState } from 'react';
import { MdAccountBalanceWallet, MdCheckCircle, MdPendingActions } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  payoutService,
  type MaturityPayout,
  type MaturityPayoutStatus,
} from '@/lib/services/payout-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function PayoutsPage(): React.JSX.Element {
  const [items, setItems] = useState<MaturityPayout[]>([]);
  const [status, setStatus] = useState<'ALL' | MaturityPayoutStatus>('PENDING');
  const [busy, setBusy] = useState('');
  const load = useCallback(
    () => payoutService.list(status === 'ALL' ? undefined : status).then(setItems),
    [status],
  );
  useEffect(() => {
    void load().catch(() => notify.error('Could not load maturity payouts'));
  }, [load]);
  const review = async (payout: MaturityPayout, action: 'APPROVED' | 'REJECTED') => {
    if (
      action === 'APPROVED' &&
      !window.confirm(
        `Approve ${money(payout.totalPayoutMinorUnits)} for ${payout.userId.name}? This immediately credits earnings.`,
      )
    )
      return;
    const note = action === 'REJECTED' ? (window.prompt('Reason for rejection') ?? '') : '';
    setBusy(payout._id);
    try {
      await payoutService.review(payout, action, note);
      await load();
      notify.success(action === 'APPROVED' ? 'Payout approved and credited' : 'Payout rejected');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Payout review failed');
    } finally {
      setBusy('');
    }
  };
  const pending = items.filter((item) => item.status === 'PENDING');
  return (
    <DashboardShell
      title="Payouts"
      description="Approve matured ownership returns before wallet credit"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Visible payouts" value={String(items.length)} icon={MdPendingActions} />
          <Stat
            label="Pending value"
            value={money(pending.reduce((sum, item) => sum + item.totalPayoutMinorUnits, 0))}
            icon={MdAccountBalanceWallet}
          />
          <Stat
            label="Approved"
            value={String(items.filter((item) => item.status === 'APPROVED').length)}
            icon={MdCheckCircle}
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setStatus(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${status === value ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="app-surface overflow-x-auto rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {[
                  'Member',
                  'Opportunity',
                  'Units',
                  'Principal',
                  'Return',
                  'Payout',
                  'Status',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="px-4 py-4 font-semibold text-muted-foreground">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="px-4 py-4">
                    <p className="font-medium">{item.userId.name}</p>
                    <p className="text-xs text-muted-foreground">{item.userId.email}</p>
                  </td>
                  <td className="px-4 py-4">{item.opportunityId.title}</td>
                  <td className="px-4 py-4">{item.ownershipId.units}</td>
                  <td className="px-4 py-4">{money(item.principalMinorUnits)}</td>
                  <td className="px-4 py-4 text-brand">{money(item.returnMinorUnits)}</td>
                  <td className="px-4 py-4 font-semibold">{money(item.totalPayoutMinorUnits)}</td>
                  <td className="px-4 py-4">{item.status}</td>
                  <td className="px-4 py-4">
                    {item.status === 'PENDING' || item.status === 'PROCESSING' ? (
                      <div className="flex gap-2">
                        {item.status === 'PENDING' || item.processingDecision === 'REJECTED' ? (
                          <button
                            disabled={busy === item._id}
                            onClick={() => void review(item, 'REJECTED')}
                            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-red-500"
                          >
                            Reject
                          </button>
                        ) : null}
                        {item.status === 'PENDING' || item.processingDecision === 'APPROVED' ? (
                          <button
                            disabled={busy === item._id}
                            onClick={() => void review(item, 'APPROVED')}
                            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                          >
                            Approve
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      new Date(item.reviewedAt ?? item.createdAt).toLocaleDateString('en-NG')
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    No payouts match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="app-surface rounded-2xl border p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
        <Icon className="size-4" />
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
    </div>
  );
}
