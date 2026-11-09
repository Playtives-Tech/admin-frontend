'use client';

import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Download,
  Landmark,
  Layers3,
  Pencil,
  Bold,
  Heading2,
  Info,
  Link2,
  List,
  Trash2,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { useAuth } from '@/components/providers/auth-provider';
import { CollectiveAboutEditor } from '@/components/collectives/collective-about-editor';
import { CollectiveAgreementEditor } from '@/components/collectives/collective-agreement-editor';
import { notify } from '@/lib/notify';
import {
  wealthCollectiveService,
  type WealthCollectiveCycle,
  type WealthCollectiveOverview,
  type WealthCollectivePeriod,
  type CollectiveTrade,
  type CollectiveTradeInput,
  type CollectiveTradePreview,
  type CollectiveReconciliationPreview,
} from '@/lib/services/wealth-collective-service';

const money = (amount: number): string =>
  Number.isFinite(amount)
    ? new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        maximumFractionDigits: 2,
      }).format(amount / 100)
    : '—';
const dateTime = (value: string): string =>
  new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos',
  }).format(new Date(value));
const lagosDateTimeInput = (value: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date(value))
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

function HelpText({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [open]);
  return (
    <>
      <button
        aria-expanded={open}
        aria-label={`Information about ${label}`}
        className="inline-flex size-6 items-center justify-center rounded-full align-middle text-muted-foreground hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Info aria-hidden="true" className="size-4" />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
            onMouseDown={() => setOpen(false)}
            role="presentation"
          >
            <div
              aria-labelledby={titleId}
              aria-modal="true"
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl font-semibold" id={titleId}>
                  {label}
                </h2>
                <button
                  aria-label="Close information"
                  autoFocus
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-5" />
                </button>
              </div>
              <div className="mt-4 text-sm font-normal leading-7 text-slate-700">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

const metricHelp: Record<string, string> = {
  'Funds added':
    'Money moved from Playtives Wallets into the Collective during the selected period. It may not have been deployed yet.',
  Deployed:
    'New contributions put to work during the selected period; later rollovers are tracked separately.',
  'Still reserved':
    'Contributions added during this period that are waiting for an eligible deployment window.',
  'Paid to members':
    'Cash actually credited to member wallets after maturity or a completed Early Exit. Profit attribution and rollovers are not cash payouts.',
  'Capital contributed':
    'Member-funded capital recorded in the current programme, excluding exited positions.',
  'Reserved for deployment':
    'Member contributions committed to a future deployment and not yet earning.',
  'Paid to member wallets':
    'Total settled Collective value and completed Early Exit payments credited to member wallets.',
  'Recorded movements':
    'Count of Collective ledger events, including funding, profit attribution, and rollover; not a count of payouts.',
  'Pending Early Exit requests':
    'Requests awaiting review or settlement. Capital stops participating while a request is pending.',
  'Early Exit capital awaiting settlement':
    'Capital requested for Early Exit but not yet credited back to member wallets.',
  'New member capital':
    'Fresh contributions deployed into this month, excluding capital carried from a previous month.',
  'Rolled in': 'Capital and compounded profit carried from the preceding reconciled month.',
  'Net profit / loss': 'Attributed member result for this month. This is not a wallet payment.',
  'Rolled to next month':
    'Invested balance carried into the next scheduled month after reconciliation; held profit is excluded.',
  'Maturity paid': 'Final-month value actually credited to member wallets.',
  'Early exits paid': 'Completed Early Exit payments credited during this month.',
  'Deployed now':
    'Contribution records whose deployment time has arrived. This excludes future-dated rollover records.',
  'Future rollover':
    'Capital already recorded for this month but not due to deploy until its scheduled start.',
  'Awaiting deployment':
    'This member’s scheduled contributions that have not entered the selected month’s invested balance.',
  'Actual profit attributed':
    'This member’s recorded result from reconciliation or settled trades for the selected month. It is not a wallet payment.',
};

export default function WealthCollectivesPage(): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [overview, setOverview] = useState<WealthCollectiveOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<WealthCollectivePeriod>('30d');
  const requestSequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestSequence.current;
    setLoading(true);
    try {
      const result = await wealthCollectiveService.overview(period);
      if (request === requestSequence.current) setOverview(result);
    } catch (error) {
      if (request === requestSequence.current)
        notify.error(error instanceof Error ? error.message : 'Unable to load Wealth Collectives');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [period]);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardShell
      title="Wealth Collectives"
      description="Configure the programme, monitor member funds, manage Early Exits, and reconcile each month."
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {!overview ? (
          <p className="text-sm text-muted-foreground">Loading Wealth Collective management…</p>
        ) : overview.programme ? (
          <ProgrammeOverview
            overview={overview}
            period={period}
            setPeriod={setPeriod}
            loading={loading}
            refresh={load}
          />
        ) : isSuperAdmin ? (
          <ProgrammeSetup refresh={load} />
        ) : (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            A super administrator must create the programme.
          </p>
        )}
      </div>
    </DashboardShell>
  );
}

function ProgrammeSetup({
  refresh,
}: Readonly<{ refresh: () => Promise<void> }>): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const submit = (form: HTMLFormElement): void => {
    const values = new FormData(form);
    setBusy(true);
    void wealthCollectiveService
      .createProgramme({
        name: String(values.get('name')),
        startsAt: new Date(`${String(values.get('startsAt'))}:00+01:00`).toISOString(),
        projectedTargetRateBps: Math.round(Number(values.get('projectedTargetPercent')) * 100),
      })
      .then(async () => {
        notify.success('Wealth Collective programme created.');
        await refresh();
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to create programme.'),
      )
      .finally(() => setBusy(false));
  };
  return (
    <section className="bg-card max-w-2xl rounded-2xl border p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
          <Layers3 className="size-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Create the first Wealth Collective</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This creates twelve Collective months from your chosen date. Each month has one
            start-day deployment; its halfway window can be enabled later.
          </p>
        </div>
      </div>
      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
      >
        <label className="text-sm font-medium sm:col-span-2">
          Programme name
          <input
            className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
            defaultValue="Playtives Wealth Collective"
            name="name"
            required
          />
        </label>
        <label className="text-sm font-medium">
          First month start date and time
          <input
            className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
            name="startsAt"
            required
            type="datetime-local"
          />
        </label>
        <div className="rounded-lg bg-muted/55 p-3 text-xs leading-5 text-muted-foreground">
          Enter Lagos local time. The programme lasts 12 Collective months from this date.
        </div>
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
          The start-day window remains open through 11:59 PM Africa/Lagos time. Later funds await
          the next enabled deployment unless an admin deploys them during the month.
        </div>
        <label className="text-sm font-medium sm:col-span-2">
          Projected monthly target (%)
          <input
            className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
            min="0"
            name="projectedTargetPercent"
            placeholder="e.g. 3"
            required
            step="0.01"
            type="number"
          />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          This is a projection, not a guaranteed return. Actual monthly results are entered after
          reconciliation.
        </p>
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
          Early Exit is fixed at month end. A member forfeits all profit and accrued returns when
          requesting an exit; only personally contributed capital becomes eligible for settlement at
          the end of that Collective month.
        </div>
        <button
          className="h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground disabled:opacity-50 sm:col-span-2"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Creating programme…' : 'Create 12-month programme'}
        </button>
      </form>
    </section>
  );
}

function ProgrammeOverview({
  overview,
  period,
  setPeriod,
  loading,
  refresh,
}: Readonly<{
  overview: WealthCollectiveOverview;
  period: WealthCollectivePeriod;
  setPeriod: (period: WealthCollectivePeriod) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}>): React.JSX.Element {
  const programme = overview.programme!;
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [section, setSection] = useState<
    'overview' | 'months' | 'members' | 'exits' | 'content' | 'updates' | 'agreement'
  >('overview');
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => lagosDateTimeInput(programme.startsAt));
  const [savingStartDate, setSavingStartDate] = useState(false);
  const saveStartDate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!startDate) return;
    setSavingStartDate(true);
    void wealthCollectiveService
      .updateProgrammeStart(new Date(`${startDate}:00+01:00`).toISOString())
      .then(async () => {
        notify.success('Programme start date and month windows updated.');
        setStartDateOpen(false);
        await refresh();
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to update start date.'),
      )
      .finally(() => setSavingStartDate(false));
  };
  return (
    <>
      <section className="bg-card rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
              Active programme
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{programme.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {dateTime(programme.startsAt)} to {dateTime(programme.endsAt)} · {programme.timezone}
            </p>
          </div>
          {isSuperAdmin ? (
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
              onClick={() => setStartDateOpen(true)}
              type="button"
            >
              <Pencil className="size-4" /> Edit start date
            </button>
          ) : null}
        </div>
      </section>
      {startDateOpen && (
        <div
          aria-labelledby="edit-collective-start-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <form
            className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-2xl"
            onSubmit={saveStartDate}
          >
            <h2 className="text-xl font-semibold" id="edit-collective-start-title">
              Edit programme start
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The programme end date and all 12 month dates and funding windows will be recalculated
              using Africa/Lagos time. You can edit this only before a month starts or any funds are
              contributed or scheduled.
            </p>
            <label className="mt-5 block text-sm font-medium">
              First month start date and time
              <input
                className="mt-2 h-11 w-full rounded-lg border bg-background px-3"
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="datetime-local"
                value={startDate}
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-lg border px-4 text-sm font-semibold"
                disabled={savingStartDate}
                onClick={() => setStartDateOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50"
                disabled={savingStartDate || !startDate}
                type="submit"
              >
                {savingStartDate ? 'Saving…' : 'Save new start date'}
              </button>
            </div>
          </form>
        </div>
      )}
      <nav
        aria-label="Wealth Collective admin sections"
        className="flex flex-wrap gap-2 border-b pb-3"
      >
        {(
          [
            ['overview', 'Overview'],
            ['months', 'Months & payouts'],
            ['members', 'Member tracking'],
            ['exits', 'Early exits'],
            ['content', 'Member content'],
            ['updates', 'Updates'],
            ['agreement', 'Agreement'],
          ] as const
        ).map(([key, label]) => (
          <button
            aria-current={section === key ? 'page' : undefined}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${section === key ? 'border-brand bg-brand text-white' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            key={key}
            onClick={() => setSection(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="text-sm text-muted-foreground">
        <HelpText label={`${section} section`}>
          {
            {
              overview:
                'Review date-filtered cash movements and the current programme-wide position. These totals are not individual member balances.',
              months:
                'Review scheduled months, settle trades where enabled, then close a month to record member results and carry invested funds forward. Wallet payouts occur at maturity or completed Early Exit.',
              members:
                'Select a month to compare each member’s capital, personal profit attribution, rollover, reservations, and agreement status.',
              exits:
                'Review member Early Exit requests and settle eligible capital according to the programme rules.',
              content:
                'Edit the explanation members see about the Collective. Saving content does not change financial records.',
              updates:
                'Publish announcements for members; this does not alter balances or payout calculations.',
              agreement:
                'Manage the terms members accept before participating. Changing terms does not recalculate past results.',
            }[section]
          }
        </HelpText>
      </div>
      {section === 'content' && <CollectiveAboutEditor programme={programme} refresh={refresh} />}
      {section === 'overview' && (
        <div className="space-y-4">
          <section className="bg-card rounded-2xl border p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  Capital movement{' '}
                  <HelpText label="Capital movement">
                    These figures describe cash events in the chosen date range, not today’s
                    Collective balance. Funding, deployment, and payout can happen on different
                    dates.
                  </HelpText>
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Transactions in the selected period · Africa/Lagos time
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                Period
                <select
                  className="h-10 rounded-lg border bg-background px-3 text-sm"
                  onChange={(event) => setPeriod(event.target.value as WealthCollectivePeriod)}
                  value={period}
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="this-month">This month</option>
                  <option value="last-month">Last month</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            {loading && (
              <p className="mt-2 text-xs text-muted-foreground" role="status">
                Updating report…
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MovementStat
                label="Funds added"
                value={overview.periodStats.fundsAddedMinorUnits}
                previous={overview.periodStats.previousFundsAddedMinorUnits}
                comparison={overview.periodStats.comparisonLabel}
              />
              <MovementStat
                label="Deployed"
                value={overview.periodStats.deployedMinorUnits}
                previous={overview.periodStats.previousDeployedMinorUnits}
                comparison={overview.periodStats.comparisonLabel}
              />
              <MovementStat
                label="Still reserved"
                value={overview.periodStats.currentlyReservedMinorUnits}
                detail="Added in this period; not yet deployed"
              />
              <MovementStat
                label="Paid to members"
                value={overview.periodStats.paidOutMinorUnits}
                previous={overview.periodStats.previousPaidOutMinorUnits}
                comparison={overview.periodStats.comparisonLabel}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Funds added are wallet debits; deployed is the amount put to work. A contribution may
              appear in different periods for these two events. Paid to members includes maturity
              and completed Early Exit settlements. These are historical cash movements, not the
              current invested balance.
            </p>
          </section>
          <h2 className="text-lg font-semibold">
            Current programme position{' '}
            <HelpText label="Current programme position">
              Current member capital, reservations, payouts, and pending exits across the active
              programme. These figures are not limited by the period filter above.
            </HelpText>
          </h2>
          <p className="text-xs text-muted-foreground">
            Live capital and reservations exclude members who exited. Payouts and recorded movements
            remain available for audit.
          </p>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric
              icon={Landmark}
              label="Capital contributed"
              value={money(overview.committedCapitalMinorUnits)}
            />
            <Metric
              icon={CalendarDays}
              label="Reserved for deployment"
              value={money(overview.reservedContributionMinorUnits)}
            />
            <Metric
              icon={ChartNoAxesCombined}
              label="Paid to member wallets"
              value={money(overview.settledAmountMinorUnits)}
            />
            <Metric
              icon={CalendarDays}
              label="Recorded movements"
              value={String(overview.transactionCount)}
            />
            <Metric
              icon={CalendarDays}
              label="Pending Early Exit requests"
              value={String(overview.pendingEarlyExitCount)}
            />
            <Metric
              icon={Landmark}
              label="Early Exit capital awaiting settlement"
              value={money(overview.pendingEarlyExitCapitalMinorUnits)}
            />
          </section>
        </div>
      )}
      {section === 'months' && (
        <section className="bg-card rounded-2xl border p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Month amounts and payouts{' '}
            <HelpText label="Month amounts and payouts">
              A month’s return is attributed to each eligible member at reconciliation. Before final
              maturity, invested capital and compounded profit roll forward rather than being paid
              to wallets.
            </HelpText>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            New deposits and rollovers are separate. Actual profit appears after reconciliation;
            payout means cash credited to members, not amounts rolled into the next month.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Maturity payouts are attributed to their final month; Early Exit payouts are shown in
            the month they were completed. Live member capital, rollovers, and profit exclude exited
            positions.
          </p>
          <div className="mt-5 divide-y">
            {overview.cycles.map((cycle) => (
              <CycleRow
                cycle={cycle}
                key={cycle._id}
                refresh={refresh}
                stats={overview.cycleStats.find((stat) => stat.cycleId === cycle._id)}
              />
            ))}
          </div>
        </section>
      )}
      {section === 'members' && <MembersPanel cycles={overview.cycles} />}
      {section === 'exits' && (
        <div className="space-y-4">
          <SettlementSettings />
          <EarlyExitsPanel />
        </div>
      )}
      {section === 'updates' && <ProgrammeUpdates updates={overview.updates} refresh={refresh} />}
      {section === 'agreement' && isSuperAdmin && (
        <CollectiveAgreementEditor programme={programme} refresh={refresh} />
      )}
      {section === 'agreement' && !isSuperAdmin && (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          Only a super administrator can change the agreement.
        </p>
      )}
    </>
  );
}

function SettlementSettings(): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">
        Early Exit settlement{' '}
        <HelpText label="Early Exit settlement">
          Review an approved Early Exit and confirm the amount before crediting the member’s
          Playtives Wallet. This is separate from monthly profit attribution.
        </HelpText>
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Settlement timing is fixed. The member’s position stops participating immediately, all
        profit and accrued returns are permanently forfeited, and only personally contributed
        capital can be settled at the end of the current Collective month.
      </p>
      <p className="mt-3 text-sm font-semibold text-brand">
        Policy: End of the current Collective month
      </p>
    </section>
  );
}

function EarlyExitsPanel(): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof wealthCollectiveService.earlyExits>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setBusy(true);
    void wealthCollectiveService
      .earlyExits(page)
      .then((value) => {
        setResult(value);
        setError(null);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load Early Exit requests.'),
      )
      .finally(() => setBusy(false));
  }, [page]);
  useEffect(load, [load]);
  const settle = (requestId: string, eligibleSettlementAt: string | null): void => {
    if (
      !window.confirm(
        `Confirm this Early Exit settlement${eligibleSettlementAt ? `, eligible since ${dateTime(eligibleSettlementAt)}` : ''}? Only the member’s personally contributed capital will be credited. All profit and accrued returns remain permanently forfeited.`,
      )
    )
      return;
    setSettlingId(requestId);
    void wealthCollectiveService
      .completeEarlyExit(requestId)
      .then(() => {
        notify.success('Capital settled to the member’s Playtives Wallet.');
        load();
      })
      .catch((cause: unknown) =>
        notify.error(cause instanceof Error ? cause.message : 'Settlement failed.'),
      )
      .finally(() => setSettlingId(null));
  };
  return (
    <section className="bg-card rounded-2xl border p-5 sm:p-6">
      <h2 className="text-xl font-semibold">
        Early Exit requests{' '}
        <HelpText label="Early Exit requests">
          Members asking to leave before maturity appear here. Review eligibility and settlement
          timing before completing a wallet payout.
        </HelpText>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Review contributed capital and forfeited returns. Settlement remains locked until the
        member’s current Collective month ends, and completion is idempotent.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Requested / eligible</th>
              <th className="px-4 py-3 text-right font-medium">Capital due</th>
              <th className="px-4 py-3 text-right font-medium">Returns forfeited</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result?.requests.map((request) => (
              <tr key={request._id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{request.userId?.name ?? 'Member'}</p>
                  <p className="text-xs text-muted-foreground">{request.userId?.email}</p>
                </td>
                <td className="px-4 py-3">
                  {dateTime(request.requestedAt)}
                  <p className="text-xs text-muted-foreground">
                    Eligible{' '}
                    {request.eligibleSettlementAt
                      ? dateTime(request.eligibleSettlementAt)
                      : 'after migration'}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {money(request.capitalMinorUnits)}
                </td>
                <td className="px-4 py-3 text-right">{money(request.forfeitedProfitMinorUnits)}</td>
                <td className="px-4 py-3">
                  {request.status === 'COMPLETED' ? 'Settled' : 'Pending settlement'}
                </td>
                <td className="px-4 py-3">
                  {isSuperAdmin && request.status === 'REQUESTED' && (
                    <button
                      className="rounded-lg border border-brand px-3 py-2 font-semibold text-brand disabled:opacity-50"
                      disabled={settlingId !== null || !request.canSettle}
                      title={
                        request.canSettle
                          ? 'Complete settlement'
                          : 'Available at the end of the current Collective month'
                      }
                      onClick={() => settle(request._id, request.eligibleSettlementAt)}
                      type="button"
                    >
                      {settlingId === request._id
                        ? 'Settling…'
                        : request.canSettle
                          ? 'Complete settlement'
                          : 'Locked until month end'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {busy && <p className="p-4 text-sm text-muted-foreground">Loading requests…</p>}
        {!busy && !result?.requests.length && (
          <p className="p-4 text-sm text-muted-foreground">No Early Exit requests yet.</p>
        )}
      </div>
      {result && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {result.pagination.total} requests · page {page} of {result.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page <= 1 || busy}
              onClick={() => setPage((value) => value - 1)}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page >= result.pagination.totalPages || busy}
              onClick={() => setPage((value) => value + 1)}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MembersPanel({
  cycles,
}: Readonly<{ cycles: WealthCollectiveCycle[] }>): React.JSX.Element {
  const [cycleId, setCycleId] = useState(cycles[0]?._id ?? '');
  const [page, setPage] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof wealthCollectiveService.cycleMembers>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedMember = result?.members.find((member) => member.userId === selectedMemberId);
  useEffect(() => {
    if (!selectedMemberId) return;
    const dismiss = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSelectedMemberId(null);
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [selectedMemberId]);
  useEffect(() => {
    if (!cycleId) return;
    setBusy(true);
    void wealthCollectiveService
      .cycleMembers(cycleId, page)
      .then((response) => {
        setResult(response);
        setError(null);
      })
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : 'Unable to load member tracking.'),
      )
      .finally(() => setBusy(false));
  }, [cycleId, page]);
  return (
    <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">
            Member tracking{' '}
            <HelpText label="Member tracking">
              Select a month to see each member’s deployed capital, individually attributed profit,
              rolled-forward amount, and funds awaiting deployment. Download CSV for the full list.
            </HelpText>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare each member’s contributed capital, attributed profit, rollover, and reserved
            contribution. Profit is not a wallet payment before maturity.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium">
            Month
            <select
              className="ml-2 h-10 rounded-lg border bg-background px-3"
              onChange={(event) => {
                setCycleId(event.target.value);
                setPage(1);
                setSelectedMemberId(null);
              }}
              value={cycleId}
            >
              {cycles.map((cycle) => (
                <option key={cycle._id} value={cycle._id}>
                  Month {cycle.number}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand/25 bg-brand/5 px-3.5 text-sm font-semibold text-brand transition hover:bg-brand/10 disabled:opacity-50"
            disabled={!cycleId || exporting}
            onClick={() => {
              const cycle = cycles.find((item) => item._id === cycleId);
              if (!cycle) return;
              setExporting(true);
              void wealthCollectiveService
                .exportCycleMembers(cycleId, cycle.number)
                .catch((cause: unknown) =>
                  notify.error(
                    cause instanceof Error ? cause.message : 'Unable to export members.',
                  ),
                )
                .finally(() => setExporting(false));
            }}
            type="button"
          >
            <Download className="size-4" />
            {exporting ? 'Exporting…' : 'Download CSV'}
          </button>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 text-right font-medium">Added</th>
              <th className="px-4 py-3 text-right font-medium">Recorded position</th>
              <th className="px-4 py-3 text-right font-medium">Profit attributed</th>
              <th className="px-4 py-3 text-right font-medium">Rolled forward</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 font-medium">Monthly plan</th>
              <th className="px-4 py-3 font-medium">Agreement</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {result?.members.map((member) => (
              <tr key={member.userId}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </td>
                <td className="px-4 py-3">{member.memberCode ?? '—'}</td>
                <td className="px-4 py-3 text-right">{money(member.addedMinorUnits)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {money(member.amountMinorUnits)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-brand">
                  {money(member.profitMinorUnits)}
                </td>
                <td className="px-4 py-3 text-right">{money(member.rolledForwardMinorUnits)}</td>
                <td className="px-4 py-3 text-right">{money(member.scheduledAmountMinorUnits)}</td>
                <td className="px-4 py-3">
                  {member.monthlyContributionPlan ? (
                    <>
                      <p className="font-medium">
                        {money(member.monthlyContributionPlan.amountMinorUnits)} ·{' '}
                        {member.monthlyContributionPlan.method === 'AUTOMATIC'
                          ? 'Automatic'
                          : 'Manual'}
                      </p>
                      {member.monthlyContributionPlan.method === 'AUTOMATIC' && (
                        <p className="text-xs text-muted-foreground">
                          {member.monthlyContributionPlan.nextDebitAt
                            ? `Next ${dateTime(member.monthlyContributionPlan.nextDebitAt)}`
                            : 'No next debit'}
                          {member.monthlyContributionPlan.lastStatus === 'INSUFFICIENT_FUNDS'
                            ? ' · Insufficient balance last attempt'
                            : ''}
                        </p>
                      )}
                      {member.monthlyContributionPlan.method === 'MANUAL' &&
                        member.monthlyContributionPlan.nextReminderAt && (
                          <p className="text-xs text-muted-foreground">
                            Next reminder {dateTime(member.monthlyContributionPlan.nextReminderAt)}
                          </p>
                        )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not set</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {member.agreementAccepted ? (
                    <>
                      <span className="font-medium text-brand">Signed</span>
                      <p className="text-xs text-muted-foreground">
                        {member.agreementAcceptedAt ? dateTime(member.agreementAcceptedAt) : ''}
                      </p>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not signed</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    aria-expanded={selectedMemberId === member.userId}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold text-brand hover:bg-brand/5"
                    onClick={() =>
                      setSelectedMemberId(selectedMemberId === member.userId ? null : member.userId)
                    }
                    type="button"
                  >
                    {selectedMemberId === member.userId ? 'Hide' : 'View'} account
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {busy && <p className="p-4 text-sm text-muted-foreground">Loading member records…</p>}
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {!busy && !error && result?.members.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No members have funded this month.</p>
        )}
      </div>
      {selectedMember &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm"
            onMouseDown={() => setSelectedMemberId(null)}
            role="presentation"
          >
            <section
              aria-label={`${selectedMember.name} Collective account details`}
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6"
              onMouseDown={(event) => event.stopPropagation()}
              role="dialog"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedMember.name} · Month{' '}
                    {cycles.find((item) => item._id === cycleId)?.number}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.email} · {selectedMember.memberCode ?? 'No member code'}
                  </p>
                </div>
                <button
                  aria-label="Close account details"
                  autoFocus
                  className="rounded-lg border px-3 py-2 text-sm"
                  onClick={() => setSelectedMemberId(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  icon={Landmark}
                  label="Deployed now"
                  value={money(
                    selectedMember.deployedMinorUnits ?? selectedMember.amountMinorUnits,
                  )}
                />
                <Metric
                  icon={CalendarDays}
                  label="Awaiting deployment"
                  value={money(selectedMember.scheduledAmountMinorUnits)}
                />
                <Metric
                  icon={ChartNoAxesCombined}
                  label="Actual profit attributed"
                  value={money(selectedMember.profitMinorUnits)}
                />
                <Metric
                  icon={Layers3}
                  label="Rolled to next month"
                  value={money(selectedMember.rolledForwardMinorUnits)}
                />
                {(selectedMember.pendingRolloverMinorUnits ?? 0) > 0 && (
                  <Metric
                    icon={CalendarDays}
                    label="Future rollover"
                    value={money(selectedMember.pendingRolloverMinorUnits)}
                  />
                )}
              </div>
              <div className="bg-card mt-4 rounded-lg border p-4 text-sm">
                <p className="font-semibold">
                  Illustrative profit for this month:{' '}
                  {selectedMember.projectedProfitMinorUnits == null
                    ? 'Not available'
                    : money(selectedMember.projectedProfitMinorUnits)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {result?.projectionRateBps == null
                    ? (result?.projectionUnavailableReason ??
                      'Projection is unavailable for this month.')
                    : `Based on the ${(result.projectionRateBps / 100).toFixed(2)}% monthly target, each deployed contribution’s amount and eligible days. This is not a guaranteed return or a wallet balance.`}
                </p>
                <p className="mt-2 text-muted-foreground">
                  First recorded deployment:{' '}
                  {selectedMember.firstDeployedAt
                    ? dateTime(selectedMember.firstDeployedAt)
                    : selectedMember.amountMinorUnits > 0
                      ? 'Date not recorded'
                      : 'No funds deployed'}{' '}
                  · Next pending deployment:{' '}
                  {selectedMember.scheduledDeploymentAt
                    ? dateTime(selectedMember.scheduledDeploymentAt)
                    : 'None'}
                </p>
              </div>
              <h4 className="mt-5 font-semibold">Deployed contribution history</h4>
              <div className="mt-2 space-y-2">
                {(selectedMember.contributionDetails ?? []).map((item) => (
                  <div className="bg-card rounded-lg border p-3 text-sm" key={item.reference}>
                    <p className="font-medium">
                      {money(item.amountMinorUnits)} · {item.rollover ? 'Rolled in' : 'New capital'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Earning from {dateTime(item.effectiveAt)} · Deployed{' '}
                      {item.deployedAt ? dateTime(item.deployedAt) : 'date not recorded'} · Ref:{' '}
                      {item.reference}
                    </p>
                    {item.projectedProfitMinorUnits !== null && (
                      <p className="mt-1 text-xs text-brand">
                        Illustrative profit: {money(item.projectedProfitMinorUnits)}
                      </p>
                    )}
                  </div>
                ))}
                {!selectedMember.contributionDetails?.length && (
                  <p className="text-sm text-muted-foreground">
                    Contribution details are not available from the current backend response.
                  </p>
                )}
              </div>
            </section>
          </div>,
          document.body,
        )}
      {result && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {result.pagination.total} members · page {page} of {result.pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page <= 1 || busy}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page >= result.pagination.totalPages || busy}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ProgrammeUpdates({
  updates,
  refresh,
}: Readonly<{
  updates: WealthCollectiveOverview['updates'];
  refresh: () => Promise<void>;
}>): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(updates.length / pageSize));
  const publish = (): void => {
    setBusy(true);
    const request = editingId
      ? wealthCollectiveService.updatePublishedUpdate(editingId, {
          title,
          body,
          format: 'MARKDOWN',
        })
      : wealthCollectiveService.publishUpdate({ title, body, format: 'MARKDOWN' });
    void request
      .then(async () => {
        setTitle('');
        setBody('');
        setEditingId(null);
        notify.success(editingId ? 'Update saved.' : 'Update published to members.');
        await refresh();
      })
      .catch((cause: unknown) =>
        notify.error(cause instanceof Error ? cause.message : 'Unable to publish update.'),
      )
      .finally(() => setBusy(false));
  };
  const format = (prefix: string, suffix = prefix): void => {
    const editor = editorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = body.slice(start, end) || 'text';
    const next = `${body.slice(0, start)}${prefix}${selected}${suffix}${body.slice(end)}`;
    setBody(next);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };
  const remove = async (updateId: string): Promise<void> => {
    if (!window.confirm('Delete this Collective update? Members will no longer see it.')) return;
    setBusy(true);
    try {
      await wealthCollectiveService.deletePublishedUpdate(updateId);
      notify.success('Update deleted.');
      await refresh();
    } catch (cause) {
      notify.error(cause instanceof Error ? cause.message : 'Unable to delete update.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="bg-card rounded-2xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">
        Collective updates{' '}
        <HelpText label="Collective updates">
          Publish programme announcements that members can read in their Collective dashboard.
          Updates do not change balances or reconciliation.
        </HelpText>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Publish programme news alongside deployment dates in members’ Updates view.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          publish();
        }}
      >
        <label className="block text-sm font-medium">
          Title
          <input
            className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Message
          <span className="mt-1 flex flex-wrap gap-1 rounded-t-lg border border-b-0 bg-muted/30 p-2">
            <button
              aria-label="Heading"
              className="rounded-md border bg-background p-2"
              onClick={() => format('## ', '')}
              type="button"
            >
              <Heading2 className="size-4" />
            </button>
            <button
              aria-label="Bold"
              className="rounded-md border bg-background p-2"
              onClick={() => format('**')}
              type="button"
            >
              <Bold className="size-4" />
            </button>
            <button
              aria-label="Bullet list"
              className="rounded-md border bg-background p-2"
              onClick={() => format('- ', '')}
              type="button"
            >
              <List className="size-4" />
            </button>
            <button
              aria-label="Link"
              className="rounded-md border bg-background p-2"
              onClick={() => format('[', '](https://)')}
              type="button"
            >
              <Link2 className="size-4" />
            </button>
            <span className="self-center px-2 text-xs font-normal text-muted-foreground">
              Markdown formatting supported
            </span>
          </span>
          <textarea
            ref={editorRef}
            className="min-h-40 w-full rounded-b-lg border bg-background p-3 font-mono text-sm"
            maxLength={5000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        <button
          className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Saving…' : editingId ? 'Save changes' : 'Publish update'}
        </button>
        {editingId ? (
          <button
            className="ml-2 rounded-lg border px-5 py-3 text-sm font-semibold"
            onClick={() => {
              setEditingId(null);
              setTitle('');
              setBody('');
            }}
            type="button"
          >
            Cancel edit
          </button>
        ) : null}
      </form>
      <div className="mt-6 divide-y border-t">
        {updates.slice((page - 1) * pageSize, page * pageSize).map((update) => (
          <article className="py-4" key={update._id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">{update.title}</h3>
              <div className="flex items-center gap-2">
                <time className="text-xs text-muted-foreground">
                  {dateTime(update.publishedAt)}
                </time>
                <button
                  aria-label="Edit update"
                  className="rounded-md border p-2 text-muted-foreground hover:text-brand"
                  onClick={() => {
                    setEditingId(update._id);
                    setTitle(update.title);
                    setBody(update.body);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  type="button"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  aria-label="Delete update"
                  className="rounded-md border p-2 text-muted-foreground hover:text-red-600"
                  disabled={busy}
                  onClick={() => void remove(update._id)}
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {update.body}
            </p>
          </article>
        ))}
        {!updates.length && (
          <p className="py-4 text-sm text-muted-foreground">No announcements published yet.</p>
        )}
      </div>
      {updates.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {updates.length} updates · page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Previous updates page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              type="button"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              aria-label="Next updates page"
              className="rounded-lg border p-2 disabled:opacity-40"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              type="button"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MovementStat({
  label,
  value,
  previous,
  comparison,
  detail,
}: Readonly<{
  label: string;
  value: number;
  previous?: number;
  comparison?: string | null;
  detail?: string;
}>): React.JSX.Element {
  const priorValue = previous ?? 0;
  const difference = previous === undefined ? null : value - priorValue;
  const change =
    difference === null || !comparison
      ? detail
      : priorValue === 0
        ? value === 0
          ? `No change vs ${comparison.toLowerCase()}`
          : `New activity vs ${comparison.toLowerCase()}`
        : `${difference >= 0 ? '+' : '−'}${money(Math.abs(difference))} (${Math.abs((difference / priorValue) * 100).toFixed(1)}%) vs ${comparison.toLowerCase()}`;
  return (
    <article className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-medium text-muted-foreground">
        {label} {metricHelp[label] && <HelpText label={label}>{metricHelp[label]}</HelpText>}
      </p>
      <p className="mt-2 text-xl font-semibold tabular-nums">{money(value)}</p>
      {change && <p className="mt-2 text-xs leading-5 text-muted-foreground">{change}</p>}
    </article>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}>): React.JSX.Element {
  return (
    <article className="bg-card rounded-xl border p-4">
      <Icon className="size-5 text-brand" />
      <p className="mt-4 text-sm text-muted-foreground">
        {label} {metricHelp[label] && <HelpText label={label}>{metricHelp[label]}</HelpText>}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </article>
  );
}

function CycleRow({
  cycle,
  refresh,
  stats,
}: Readonly<{
  cycle: WealthCollectiveCycle;
  refresh: () => Promise<void>;
  stats?: WealthCollectiveOverview['cycleStats'][number];
}>): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [rate, setRate] = useState('');
  const [hasTrades, setHasTrades] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reconciliationPreview, setReconciliationPreview] =
    useState<CollectiveReconciliationPreview | null>(null);

  const [previewBusy, setPreviewBusy] = useState(false);
  const [windowBusy, setWindowBusy] = useState(false);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const now = Date.now();
  const halfwayCanChange =
    Boolean(cycle.halfwayCandidateAt) && now < new Date(cycle.halfwayCandidateAt!).getTime();
  const monthActive =
    now >= new Date(cycle.startsAt).getTime() && now < new Date(cycle.endsAt).getTime();
  useEffect(() => {
    void wealthCollectiveService
      .listTrades(cycle._id)
      .then((items) => {
        setHasTrades(items.length > 0);
        if (items.length > 0) setRate('0');
      })
      .catch(() => undefined);
  }, [cycle._id, cycle.status]);
  const toggleHalfway = (): void => {
    setWindowBusy(true);
    void wealthCollectiveService
      .updateHalfwayWindow(cycle._id, !cycle.secondWindowEnabled)
      .then(async () => {
        notify.success(`Halfway window ${cycle.secondWindowEnabled ? 'disabled' : 'enabled'}.`);
        await refresh();
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to update halfway window.'),
      )
      .finally(() => setWindowBusy(false));
  };
  const deployPending = (): void => {
    if (
      !stats?.manualEligibleCount ||
      !window.confirm(
        `Deploy ${stats.manualEligibleCount} pending contribution(s) totalling ${money(stats.manualEligibleMinorUnits)} into Month ${cycle.number} now? They will begin earning from today. This cannot be undone.`,
      )
    )
      return;
    setDeploymentBusy(true);
    void wealthCollectiveService
      .deployPending(cycle._id)
      .then(async (result) => {
        notify.success(
          `${result.count} contribution(s) deployed · ${money(result.amountMinorUnits)}.`,
        );
        await refresh();
      })
      .catch((error: unknown) => {
        notify.error(error instanceof Error ? error.message : 'Unable to deploy pending funds.');
        void refresh();
      })
      .finally(() => setDeploymentBusy(false));
  };
  const reconcile = (): void => {
    const bps = Math.round(Number(rate) * 100);
    if (!Number.isFinite(bps) || bps < -10000 || bps > 10000 || rate.trim() === '') {
      notify.error('Enter a valid return percentage.');
      return;
    }
    setConfirmOpen(true);
    setPreviewBusy(true);
    setReconciliationPreview(null);
    void wealthCollectiveService
      .reconciliationPreview(cycle._id, bps)
      .then(setReconciliationPreview)
      .catch((error: unknown) => {
        notify.error(
          error instanceof Error ? error.message : 'Unable to prepare reconciliation preview.',
        );
        setConfirmOpen(false);
      })
      .finally(() => setPreviewBusy(false));
  };
  const confirmReconcile = (): void => {
    const bps = Math.round(Number(rate) * 100);
    if (!reconciliationPreview?.canReconcile) return;
    setBusy(true);
    void wealthCollectiveService
      .reconcileCycle(cycle._id, bps, reconciliationPreview.digest)
      .then(async () => {
        setConfirmOpen(false);
        notify.success(`Month ${cycle.number} reconciled.`);
        await refresh();
      })
      .catch(async (error: unknown) => {
        notify.error(error instanceof Error ? error.message : 'Unable to reconcile this cycle.');
        try {
          const updated = await wealthCollectiveService.reconciliationPreview(cycle._id, bps);
          setReconciliationPreview(updated);
        } catch {
          setConfirmOpen(false);
        }
      })
      .finally(() => setBusy(false));
  };
  return (
    <div className="py-5">
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={() => setConfirmOpen(false)}
        >
          <div
            aria-labelledby={`reconcile-title-${cycle._id}`}
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold" id={`reconcile-title-${cycle._id}`}>
                  Review Month {cycle.number} before closing
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Proposed monthly return: {Number(rate).toFixed(2)}%. Nothing is changed until you
                  confirm.
                </p>
              </div>
              <button
                aria-label="Close preview"
                className="rounded-lg border px-3 py-2 text-sm"
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>
            {previewBusy ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Calculating member allocations…
              </p>
            ) : reconciliationPreview ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <MovementStat
                    label="Eligible capital"
                    value={reconciliationPreview.totals.capitalMinorUnits}
                    detail="Currently deployed capital included"
                  />
                  <MovementStat
                    label="Monthly result"
                    value={reconciliationPreview.totals.monthlyProfitMinorUnits}
                    detail="Day-weighted at the proposed rate"
                  />
                  <MovementStat
                    label="Trade result"
                    value={reconciliationPreview.totals.tradeProfitMinorUnits}
                    detail="Previously settled trade profit/loss"
                  />
                  <MovementStat
                    label={
                      reconciliationPreview.nextCycle ? 'Rollover to next month' : 'Maturity payout'
                    }
                    value={
                      reconciliationPreview.nextCycle
                        ? reconciliationPreview.totals.rolloverMinorUnits
                        : reconciliationPreview.totals.maturityPayoutMinorUnits
                    }
                    detail={
                      reconciliationPreview.nextCycle
                        ? 'No wallet credit at this step'
                        : 'Expected wallet credit at final maturity'
                    }
                  />
                  <MovementStat
                    label="Pending deployments"
                    value={reconciliationPreview.totals.awaitingDeploymentMinorUnits}
                    detail={`${reconciliationPreview.pendingDeploymentCount} pending contribution(s); excluded until deployed`}
                  />
                </div>
                {reconciliationPreview.blockers.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {reconciliationPreview.blockers.join(' ')}
                  </div>
                )}
                <div className="mt-4 max-h-[48vh] overflow-auto rounded-xl border">
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="sticky top-0 bg-muted text-xs">
                      <tr>
                        {[
                          'Member',
                          'Deployed capital',
                          'Awaiting',
                          'Eligible days',
                          'Monthly result',
                          'Trade result',
                          'Held profit',
                          'Rollover',
                          'Maturity payout',
                          'Status',
                        ].map((label) => (
                          <th className="px-3 py-3" key={label}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationPreview.members.map((member) => (
                        <tr className="border-t" key={member.userId}>
                          <td className="px-3 py-3">
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.email || member.userId}
                            </div>
                          </td>
                          <td className="px-3 py-3">{money(member.capitalMinorUnits)}</td>
                          <td className="px-3 py-3">
                            {money(member.awaitingDeploymentMinorUnits)}
                          </td>
                          <td className="px-3 py-3">{member.eligibleDays}</td>
                          <td className="px-3 py-3">{money(member.monthlyProfitMinorUnits)}</td>
                          <td className="px-3 py-3">{money(member.tradeProfitMinorUnits)}</td>
                          <td className="px-3 py-3">{money(member.heldProfitMinorUnits)}</td>
                          <td className="px-3 py-3">{money(member.rolloverMinorUnits)}</td>
                          <td className="px-3 py-3">{money(member.maturityPayoutMinorUnits)}</td>
                          <td className="px-3 py-3">
                            {member.excluded ? 'Excluded — exit pending' : 'Included'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reconciliationPreview.members.length === 0 && (
                    <p className="p-6 text-center text-sm text-muted-foreground">
                      No deployed member capital is eligible for this reconciliation.
                    </p>
                  )}
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {reconciliationPreview.nextCycle
                    ? 'Confirming records each member’s result and rolls eligible capital plus compounded profit forward. No member wallet is credited; held profit remains non-earning until maturity.'
                    : 'Confirming records the result and credits the eligible matured value to member wallets.'}{' '}
                  Review all rows carefully; this action is not reversible from this screen.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    className="rounded-lg border px-4 py-2 text-sm"
                    onClick={() => setConfirmOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={busy || !reconciliationPreview.canReconcile}
                    onClick={confirmReconcile}
                    type="button"
                  >
                    {busy ? 'Closing…' : 'Confirm reconciliation'}
                  </button>
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Preview unavailable. Close and try again.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <strong>Month {cycle.number}</strong>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {cycle.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateTime(cycle.startsAt)} – {dateTime(cycle.endsAt)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Start-day window:{' '}
            {cycle.firstWindowOpensAt && cycle.firstWindowClosesAt
              ? `${dateTime(cycle.firstWindowOpensAt)} – ${dateTime(cycle.firstWindowClosesAt)}`
              : 'Not available this month'}
            {' · Halfway window: '}
            {cycle.secondWindowOpensAt && cycle.secondWindowClosesAt
              ? `${dateTime(cycle.secondWindowOpensAt)} – ${dateTime(cycle.secondWindowClosesAt)}`
              : 'Off'}
          </p>
          {cycle.halfwayCandidateAt && !cycle.secondWindowEnabled && (
            <p className="mt-1 text-xs text-muted-foreground">
              Optional halfway deployment: {dateTime(cycle.halfwayCandidateAt)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isSuperAdmin ? (
              <button
                className="rounded-lg border border-brand px-3 py-2 text-xs font-semibold text-brand disabled:cursor-not-allowed disabled:opacity-50"
                disabled={windowBusy || !halfwayCanChange || cycle.status === 'RECONCILED'}
                onClick={toggleHalfway}
                type="button"
              >
                {windowBusy
                  ? 'Saving…'
                  : cycle.secondWindowEnabled
                    ? 'Disable halfway window'
                    : 'Enable halfway window'}
              </button>
            ) : null}
            {isSuperAdmin ? (
              <button
                className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  deploymentBusy ||
                  !monthActive ||
                  cycle.status === 'RECONCILED' ||
                  !stats?.manualEligibleCount
                }
                onClick={deployPending}
                type="button"
              >
                {deploymentBusy
                  ? 'Deploying…'
                  : `Deploy pending now · ${stats?.manualEligibleCount ?? 0}`}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Eligible awaiting deployment: {money(stats?.manualEligibleMinorUnits ?? 0)}. Manual
            deployment uses today as each contribution’s earning start date.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>
              <strong className="text-foreground">{stats?.subscriberCount ?? 0}</strong> subscribers
            </span>
            <span>
              <strong className="text-foreground">
                {money(stats?.committedCapitalMinorUnits ?? 0)}
              </strong>{' '}
              committed
            </span>
            <span>
              <strong className="text-foreground">{stats?.contributionCount ?? 0}</strong>{' '}
              contributions
            </span>
            <span>
              <strong className="text-foreground">
                {money(stats?.scheduledAmountMinorUnits ?? 0)}
              </strong>{' '}
              scheduled · {stats?.scheduledSubscriberCount ?? 0} members
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span>
              Entered month{' '}
              <strong className="tabular-nums">
                {money((stats?.newCapitalMinorUnits ?? 0) + (stats?.rolloverInMinorUnits ?? 0))}
              </strong>
            </span>
            <span>
              Paid to wallets{' '}
              <strong className="tabular-nums">
                {money(
                  (stats?.maturityPayoutMinorUnits ?? 0) + (stats?.earlyExitPayoutMinorUnits ?? 0),
                )}
              </strong>
            </span>
          </div>
        </div>
        {cycle.status === 'RECONCILED' ? (
          <p className="text-sm font-semibold text-brand">
            Actual return: {(cycle.actualReturnRateBps! / 100).toFixed(2)}%
          </p>
        ) : isSuperAdmin ? (
          <div className="flex gap-2">
            <input
              className="h-10 w-28 rounded-lg border px-3 text-sm"
              min="-100"
              max="100"
              placeholder="Return %"
              step="0.01"
              type="number"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
            <button
              className="h-10 rounded-lg border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              disabled={busy || (hasTrades && rate !== '0')}
              type="button"
              onClick={reconcile}
            >
              {busy ? 'Saving…' : 'Reconcile'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Awaiting super administrator reconciliation.
          </p>
        )}
      </div>
      {hasTrades && cycle.status !== 'RECONCILED' && (
        <p className="mt-2 text-xs text-muted-foreground">
          This month has settled trades. Use 0% at month-end close; trade profits have already been
          recorded and must not be applied again.
        </p>
      )}
      <TradeSettlements cycle={cycle} isSuperAdmin={isSuperAdmin} refresh={refresh} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MovementStat
          label="New member capital"
          value={stats?.newCapitalMinorUnits ?? 0}
          detail="Newly deployed in this month"
        />
        <MovementStat
          label="Rolled in"
          value={stats?.rolloverInMinorUnits ?? 0}
          detail="Principal and profit from previous month"
        />
        <MovementStat
          label="Net profit / loss"
          value={stats?.profitMinorUnits ?? 0}
          detail="Day-weighted result after reconciliation"
        />
        <MovementStat
          label="Rolled to next month"
          value={stats?.rolloverOutMinorUnits ?? 0}
          detail="Not a cash payout"
        />
        <MovementStat
          label="Maturity paid"
          value={stats?.maturityPayoutMinorUnits ?? 0}
          detail="Credited to member wallets after final month"
        />
        <MovementStat
          label="Early exits paid"
          value={stats?.earlyExitPayoutMinorUnits ?? 0}
          detail={`${stats?.earlyExitPayoutCount ?? 0} completed settlements during this month`}
        />
      </div>
    </div>
  );
}

function TradeSettlements({
  cycle,
  isSuperAdmin,
  refresh,
}: Readonly<{
  cycle: WealthCollectiveCycle;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
}>): React.JSX.Element {
  const [trades, setTrades] = useState<CollectiveTrade[]>([]);
  const [reference, setReference] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [profit, setProfit] = useState('');
  const [profitMode, setProfitMode] = useState<'PERCENT' | 'AMOUNT'>('PERCENT');
  const [treatment, setTreatment] = useState<'COMPOUND' | 'HOLD'>('COMPOUND');
  const [preview, setPreview] = useState<{
    input: CollectiveTradeInput;
    result: CollectiveTradePreview;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void wealthCollectiveService
      .listTrades(cycle._id)
      .then(setTrades)
      .catch(() => setTrades([]));
  }, [cycle._id]);

  const prepare = (): CollectiveTradeInput | null => {
    const profitValue = Number(profit);
    const profitUnits = Math.round(profitValue * 100);
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (
      !reference.trim() ||
      !startsAt ||
      !endsAt ||
      !/^\d+(?:\.\d{1,2})?$/.test(profit) ||
      !Number.isSafeInteger(profitUnits) ||
      profitUnits < 1 ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      notify.error(
        'Enter a reference, trade dates, and a positive verified profit with up to two decimal places.',
      );
      return null;
    }
    return {
      reference: reference.trim(),
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      ...(profitMode === 'PERCENT'
        ? { profitRateBps: profitUnits }
        : { profitMinorUnits: profitUnits }),
      treatment,
    };
  };
  const loadPreview = (): void => {
    const input = prepare();
    if (!input) return;
    setBusy(true);
    setPreview(null);
    void wealthCollectiveService
      .previewTrade(cycle._id, input)
      .then((result) => setPreview({ input, result }))
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to preview trade.'),
      )
      .finally(() => setBusy(false));
  };
  const settle = (): void => {
    if (
      !preview ||
      !window.confirm(
        `Confirm ${money(preview.result.totalProfitMinorUnits)} profit across ${preview.result.allocations.length} contribution(s)? This is an immutable Collective-only settlement; no wallet is credited.`,
      )
    )
      return;
    setBusy(true);
    void wealthCollectiveService
      .settleTrade(cycle._id, preview.input, preview.result.digest)
      .then(async () => {
        notify.success('Trade profit recorded in members’ Collective positions.');
        setPreview(null);
        setReference('');
        setStartsAt('');
        setEndsAt('');
        setProfit('');
        setTrades(await wealthCollectiveService.listTrades(cycle._id));
        await refresh();
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to settle trade.'),
      )
      .finally(() => setBusy(false));
  };
  const clearPreview = (): void => setPreview(null);
  return (
    <section className="bg-card mt-5 rounded-xl border p-4">
      <h4 className="font-semibold">
        Trade settlements{' '}
        <HelpText label="Trade settlements">
          Record verified profit for a trade within this month. Preview the per-member allocation
          first, then choose whether profit compounds into later trades or stays held until
          maturity. No wallet is credited now.
        </HelpText>
      </h4>
      <p className="mt-1 text-xs text-muted-foreground">
        Settle verified trade profit during this month without moving money to Playtives Wallets.
        Compounded profit earns in later trades; held profit stays in the Collective without earning
        until maturity or exit. Month-end reconciliation is still required to move capital forward.
      </p>
      {trades.length > 0 && (
        <div className="mt-3 space-y-1 text-xs">
          {trades.map((trade) => (
            <p key={trade._id}>
              {trade.reference} · {dateTime(trade.startsAt)}–{dateTime(trade.endsAt)} ·{' '}
              {money(trade.profitMinorUnits)}
              {trade.profitRateBps !== undefined
                ? ` (${(trade.profitRateBps / 100).toFixed(2)}%)`
                : ''}{' '}
              · {trade.treatment === 'COMPOUND' ? 'Compounded' : 'Held'}
            </p>
          ))}
        </div>
      )}
      {isSuperAdmin &&
        process.env.NEXT_PUBLIC_COLLECTIVE_TRADE_SETTLEMENT_ENABLED === 'true' &&
        cycle.status !== 'RECONCILED' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <label className="text-xs">
              Trade reference
              <input
                className="mt-1 h-10 w-full rounded-lg border px-3"
                value={reference}
                onChange={(event) => {
                  setReference(event.target.value);
                  clearPreview();
                }}
              />
            </label>
            <label className="text-xs">
              Trade started
              <input
                className="mt-1 h-10 w-full rounded-lg border px-3"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => {
                  setStartsAt(event.target.value);
                  clearPreview();
                }}
              />
            </label>
            <label className="text-xs">
              Trade ended
              <input
                className="mt-1 h-10 w-full rounded-lg border px-3"
                type="datetime-local"
                value={endsAt}
                onChange={(event) => {
                  setEndsAt(event.target.value);
                  clearPreview();
                }}
              />
            </label>
            <label className="text-xs">
              Profit entry
              <select
                className="mt-1 h-10 w-full rounded-lg border px-3"
                value={profitMode}
                onChange={(event) => {
                  setProfitMode(event.target.value as 'PERCENT' | 'AMOUNT');
                  setProfit('');
                  clearPreview();
                }}
              >
                <option value="PERCENT">Percentage</option>
                <option value="AMOUNT">Amount (₦)</option>
              </select>
            </label>
            <label className="text-xs">
              {profitMode === 'PERCENT' ? 'Verified profit (%)' : 'Verified profit (₦)'}
              <input
                className="mt-1 h-10 w-full rounded-lg border px-3"
                type="number"
                min="0.01"
                step="0.01"
                placeholder={profitMode === 'PERCENT' ? 'e.g. 20' : 'e.g. 100000'}
                value={profit}
                onChange={(event) => {
                  setProfit(event.target.value);
                  clearPreview();
                }}
              />
            </label>
            {profitMode === 'PERCENT' && (
              <p className="self-end text-xs text-muted-foreground sm:col-span-2 xl:col-span-5">
                Percentage applies to invested capital weighted by each member’s time in this trade.
                Preview the calculated naira profit and each member’s allocation before confirming.
              </p>
            )}
            <label className="text-xs">
              Profit treatment
              <select
                className="mt-1 h-10 w-full rounded-lg border px-3"
                value={treatment}
                onChange={(event) => {
                  setTreatment(event.target.value as 'COMPOUND' | 'HOLD');
                  clearPreview();
                }}
              >
                <option value="COMPOUND">Use in next trade</option>
                <option value="HOLD">Hold until maturity</option>
              </select>
            </label>
            <div className="sm:col-span-2 xl:col-span-5">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
                disabled={busy}
                onClick={loadPreview}
              >
                Preview member allocations
              </button>
            </div>
            {preview && (
              <div className="rounded-lg border bg-muted/40 p-4 sm:col-span-2 xl:col-span-5">
                <p className="text-sm font-semibold">
                  {money(preview.result.totalProfitMinorUnits)} across{' '}
                  {preview.result.allocations.length} contribution(s)
                </p>
                <div className="mt-2 max-h-44 overflow-auto text-xs">
                  {preview.result.allocations.map((item) => (
                    <p key={item.contributionId}>
                      Member {item.userId} · Capital {money(item.investedBeforeMinorUnits)} · Profit{' '}
                      {money(item.profitMinorUnits)}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={settle}
                >
                  Confirm trade settlement
                </button>
              </div>
            )}
          </div>
        )}
    </section>
  );
}
