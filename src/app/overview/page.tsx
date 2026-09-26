'use client';

import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  CreditCard,
  Layers3,
  Info,
  ReceiptText,
  TrendingUp,
  UserRoundPlus,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState, type ComponentType } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { getAdminOverview, type AdminOverview } from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, dateRangeLabel, type AdminDateRange } from '@/lib/date-range';
import {
  platformSettingsService,
  type MaintenanceStatus,
} from '@/lib/services/platform-settings-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

type Metric = Readonly<{
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'brand' | 'blue' | 'amber' | 'red';
}>;

export default function OverviewPage(): React.JSX.Element {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);
  const [maintenance, setMaintenance] = useState<MaintenanceStatus | null>(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);

  useEffect(() => {
    if (range.preset === 'custom' && (!range.from || !range.to)) return;
    void getAdminOverview(range)
      .then(setOverview)
      .catch(() => notify.error('Could not load overview'));
  }, [range]);

  useEffect(() => {
    void platformSettingsService
      .getMaintenance()
      .then(setMaintenance)
      .catch(() => notify.error('Could not load maintenance status'));
  }, []);

  const toggleMaintenance = async (): Promise<void> => {
    if (!maintenance) return;
    const enabled = !maintenance.enabled;
    setMaintenanceBusy(true);
    try {
      const updated = await platformSettingsService.setMaintenance(enabled);
      setMaintenance(updated);
      notify.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update maintenance mode');
    } finally {
      setMaintenanceBusy(false);
    }
  };

  const data = overview ?? emptyOverview;
  const projectedOwnershipValue = data.investedMinorUnits + data.expectedReturnMinorUnits;
  const netSettledWalletFlow = data.depositsMinorUnits - data.withdrawalsMinorUnits;
  const maximum = Math.max(...data.growth.map((point) => point.investedMinorUnits), 1);

  const inflowMetrics: Metric[] = [
    {
      title: 'Uninvested member balance',
      value: money(data.uninvestedBalanceMinorUnits ?? 0),
      description:
        'The current available deposit and earnings balances across all member wallets. This is money members have not yet invested or withdrawn.',
      icon: WalletCards,
    },
    {
      title: 'Total recorded inflows',
      value: money(data.trackedCapitalInflowsMinorUnits),
      description: 'Settled wallet deposits plus externally paid ownerships.',
      icon: Layers3,
    },
    {
      title: 'Settled wallet deposits',
      value: money(data.depositsMinorUnits),
      description: 'Money added through transfers, Paystack, or admin credits.',
      icon: ArrowDownRight,
      tone: 'blue',
    },
    {
      title: 'Approved transfer deposits',
      value: money(data.approvedTransferDepositsMinorUnits),
      description: 'Approved bank-transfer deposit requests.',
      icon: ReceiptText,
    },
    {
      title: 'Paystack deposits',
      value: money(data.paystackDepositsMinorUnits),
      description: 'Successful wallet payments confirmed through Paystack.',
      icon: CreditCard,
    },
    {
      title: 'Admin-added deposits',
      value: money(data.adminAddedDepositsMinorUnits),
      description: 'Wallet funds credited directly by an administrator.',
      icon: CircleDollarSign,
      tone: 'amber',
    },
    {
      title: 'Externally paid ownership capital',
      value: money(data.manualOpportunityCapitalMinorUnits),
      description: 'Ownership payments made outside the member wallet.',
      icon: Banknote,
      tone: 'amber',
    },
  ];

  const ownershipMetrics: Metric[] = [
    {
      title: 'Capital invested',
      value: money(data.investedMinorUnits),
      description: 'Value of current ownerships. Reversed records are excluded.',
      icon: WalletCards,
    },
    {
      title: 'Projected returns',
      value: money(data.expectedReturnMinorUnits),
      description: 'Estimated returns—not settled or guaranteed earnings.',
      icon: TrendingUp,
      tone: 'blue',
    },
    {
      title: 'Projected ownership value',
      value: money(projectedOwnershipValue),
      description: 'Capital invested plus projected returns.',
      icon: Layers3,
      tone: 'amber',
    },
  ];

  const operationsMetrics: Metric[] = [
    {
      title: 'Completed withdrawals',
      value: money(data.withdrawalsMinorUnits),
      description: 'Money successfully paid out from member wallets.',
      icon: ArrowUpRight,
      tone: 'red',
    },
    {
      title: 'Net settled wallet flow',
      value: money(netSettledWalletFlow),
      description: 'Settled deposits minus completed withdrawals.',
      icon: Banknote,
      tone: netSettledWalletFlow < 0 ? 'red' : 'brand',
    },
    {
      title: 'New members',
      value: data.users.toLocaleString(),
      description: 'Member accounts created during this period.',
      icon: UserRoundPlus,
      tone: 'blue',
    },
  ];

  return (
    <DashboardShell
      title="Platform overview"
      description="Money received, ownership activity, withdrawals, and member growth."
    >
      <div className="mx-auto max-w-7xl space-y-7">
        <section className="app-surface rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="max-w-2xl">
            <h2 className="mt-1 text-lg font-semibold">Showing the {dateRangeLabel(range)}</h2>
          </div>
          <div className="mt-4 sm:mt-0">
            <DateRangeFilter value={range} onChange={setRange} />
          </div>
        </section>

        <section className="app-surface flex flex-col gap-4 rounded-2xl border border-amber-500/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Emergency control
            </p>
            <h2 className="mt-1 text-base font-semibold">Maintenance mode</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Temporarily prevents members from submitting operations while administrators retain
              access.
            </p>
          </div>
          <button
            type="button"
            disabled={!maintenance || maintenanceBusy}
            onClick={() => void toggleMaintenance()}
            className={`inline-flex h-10 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50 ${maintenance?.enabled ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand text-brand-foreground hover:brightness-110'}`}
          >
            {maintenanceBusy
              ? 'Updating…'
              : maintenance?.enabled
                ? 'Disable maintenance'
                : 'Enable maintenance'}
          </button>
        </section>

        <MetricSection
          eyebrow="01 · Money received"
          title="Where recorded capital came from"
          description="A breakdown of capital recorded by the platform."
          metrics={inflowMetrics}
        />

        <MetricSection
          eyebrow="02 · Ownership portfolio"
          title="How much capital members put into opportunities"
          description="Current ownership capital and projected returns."
          metrics={ownershipMetrics}
        />

        <MetricSection
          eyebrow="03 · Operations and members"
          title="Money paid out and community growth"
          description="Withdrawals, net wallet flow, and new members."
          metrics={operationsMetrics}
        />

        <section className="app-surface rounded-2xl border p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                04 · Investment trend
              </p>
              <h2 className="mt-1 text-base font-semibold">Ownership capital by month</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                Monthly ownership value. Reversed records are excluded.
              </p>
            </div>
            <TrendingUp className="size-5 shrink-0 text-brand" />
          </div>
          <div className="mt-6 overflow-x-auto pb-1">
            <div
              className="grid h-52 min-w-[620px] items-end gap-3 border-b border-dashed"
              style={{
                gridTemplateColumns: `repeat(${Math.max(data.growth.length, 1)}, minmax(56px, 1fr))`,
              }}
            >
              {data.growth.map((point) => {
                const height = Math.max(5, (point.investedMinorUnits / maximum) * 100);
                return (
                  <div key={point.month} className="group flex h-full flex-col justify-end">
                    <div className="relative flex flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-brand/65 transition-colors group-hover:bg-brand"
                        style={{ height: `${height}%` }}
                        title={`${point.label}: ${money(point.investedMinorUnits)} across ${point.ownerships} ownerships`}
                      />
                    </div>
                    <div className="py-3 text-center">
                      <p className="text-[11px] font-semibold">{point.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {point.ownerships} ownership{point.ownerships === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}

function MetricSection({
  eyebrow,
  title,
  description,
  metrics,
}: Readonly<{ eyebrow: string; title: string; description: string; metrics: Metric[] }>) {
  return (
    <section>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
        <h2 className="mt-1 text-base font-semibold">{title}</h2>
        <p className="mt-1 max-w-4xl text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric }: Readonly<{ metric: Metric }>) {
  const [showInfo, setShowInfo] = useState(false);
  const Icon = metric.icon;
  const toneClass = {
    brand: 'bg-brand/10 text-brand',
    blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    red: 'bg-red-500/10 text-red-700 dark:text-red-300',
  }[metric.tone ?? 'brand'];
  return (
    <article className="app-surface relative rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-muted-foreground">{metric.title}</p>
            <button
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label={`About ${metric.title}`}
              aria-expanded={showInfo}
            >
              <Info className="size-3.5" />
            </button>
          </div>
          <p className="mt-2 break-words text-xl font-semibold tracking-tight">{metric.value}</p>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {showInfo ? (
        <div
          role="status"
          className="absolute inset-x-3 top-[calc(100%-0.35rem)] z-20 rounded-xl border bg-background p-3 text-xs leading-5 text-muted-foreground shadow-lg"
        >
          {metric.description}
        </div>
      ) : null}
    </article>
  );
}

const emptyOverview: AdminOverview = {
  depositsMinorUnits: 0,
  approvedTransferDepositsMinorUnits: 0,
  paystackDepositsMinorUnits: 0,
  adminAddedDepositsMinorUnits: 0,
  manualOpportunityCapitalMinorUnits: 0,
  trackedCapitalInflowsMinorUnits: 0,
  withdrawalsMinorUnits: 0,
  users: 0,
  investedMinorUnits: 0,
  expectedReturnMinorUnits: 0,
  uninvestedBalanceMinorUnits: 0,
  growth: [],
};
