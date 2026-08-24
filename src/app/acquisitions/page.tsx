'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { acquisitionService, type AdminAcquisition } from '@/lib/services/acquisition-service';
import { notify } from '@/lib/notify';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value / 100);

const statusClass: Record<AdminAcquisition['status'], string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  COMPLETED: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function AcquisitionsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminAcquisition[]>([]);
  const [memberId, setMemberId] = useState('all');

  useEffect(() => {
    void acquisitionService
      .list()
      .then(setItems)
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Could not load ownerships'),
      );
  }, []);

  const members = useMemo(
    () => Array.from(new Map(items.map((item) => [item.userId._id, item.userId])).values()),
    [items],
  );
  const visible = memberId === 'all' ? items : items.filter((item) => item.userId._id === memberId);
  const totalInvested = visible.reduce((total, item) => total + item.amountMinorUnits, 0);
  const totalExpected = visible.reduce(
    (total, item) => total + Math.round((item.amountMinorUnits * item.projectedReturnRatePercent) / 100),
    0,
  );

  return (
    <DashboardShell title="User ownerships" description="A concise ledger of member opportunity ownerships.">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="app-surface flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Ownership ledger</h2>
            <p className="mt-1 text-xs text-muted-foreground">Filter to review one member’s ownerships.</p>
          </div>
          <select
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="h-9 min-w-56 rounded-lg border bg-background px-3 text-xs outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="all">All members</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} · {member.email}
              </option>
            ))}
          </select>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Ownerships" value={String(visible.length)} />
          <Metric label="Amount invested" value={money(totalInvested)} />
          <Metric label="Expected return" value={money(totalExpected)} />
        </section>

        <section className="app-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b bg-muted/30 text-muted-foreground">
              <tr>
                {['Member', 'Opportunity', 'Units', 'Amount invested', 'Expected return', 'Status', 'Created', 'Maturity'].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((item) => {
                const expected = Math.round((item.amountMinorUnits * item.projectedReturnRatePercent) / 100);
                return (
                  <tr key={item._id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.userId.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.userId.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.opportunityId.title}</td>
                    <td className="px-4 py-3">{item.units}</td>
                    <td className="px-4 py-3 font-medium">{money(item.amountMinorUnits)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand">{money(expected)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.projectedReturnRatePercent}% ROI</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[item.status]}`}>
                        {item.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('en-NG')}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.maturityAt ? new Date(item.maturityAt).toLocaleDateString('en-NG') : '—'}</td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">No ownerships match this member.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="app-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></article>;
}
