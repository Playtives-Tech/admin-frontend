'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Layers3,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { getAdminOverview, type AdminOverview } from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, dateRangeLabel, type AdminDateRange } from '@/lib/date-range';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function OverviewPage(): React.JSX.Element {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);

  useEffect(() => {
    if (range.preset === 'custom' && (!range.from || !range.to)) return;
    void getAdminOverview(range)
      .then(setOverview)
      .catch(() => notify.error('Could not load overview'));
  }, [range]);

  const metrics = [
    {
      label: 'Settled deposits',
      value: money(overview?.depositsMinorUnits ?? 0),
      icon: ArrowDownRight,
    },
    {
      label: 'Manual opportunity capital',
      value: money(overview?.manualOpportunityCapitalMinorUnits ?? 0),
      icon: CircleDollarSign,
    },
    {
      label: 'Total recorded inflows',
      value: money(overview?.trackedCapitalInflowsMinorUnits ?? 0),
      icon: Layers3,
    },
    {
      label: 'Completed withdrawals',
      value: money(overview?.withdrawalsMinorUnits ?? 0),
      icon: ArrowUpRight,
    },
    { label: 'Members', value: (overview?.users ?? 0).toLocaleString(), icon: UsersRound },
    {
      label: 'Amount invested',
      value: money(overview?.investedMinorUnits ?? 0),
      icon: WalletCards,
    },
    {
      label: 'Expected return',
      value: money(overview?.expectedReturnMinorUnits ?? 0),
      icon: TrendingUp,
    },
  ];
  const maximum = Math.max(...(overview?.growth.map((point) => point.investedMinorUnits) ?? []), 1);

  return (
    <DashboardShell
      title="Overview"
      description="Settled wallet activity, member ownership, and expected returns."
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <DateRangeFilter value={range} onChange={setRange} />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <article key={label} className="app-surface rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <Icon className="size-4 text-brand" />
              </div>
              <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
            </article>
          ))}
        </section>

        <section className="app-surface rounded-xl border p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Growth overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Ownership capital recorded over the {dateRangeLabel(range)}.
              </p>
            </div>
            <TrendingUp className="size-4 text-brand" />
          </div>
          <div className="mt-6 grid h-44 grid-cols-6 items-end gap-3">
            {(overview?.growth ?? []).map((point) => {
              const height = Math.max(6, (point.investedMinorUnits / maximum) * 100);
              return (
                <div key={point.month} className="group flex h-full flex-col justify-end">
                  <div className="relative flex flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-brand/75 transition-colors group-hover:bg-brand"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${money(point.investedMinorUnits)}`}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {point.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
