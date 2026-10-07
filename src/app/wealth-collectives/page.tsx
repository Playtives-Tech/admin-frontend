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
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
} from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { CollectiveAboutEditor } from '@/components/collectives/collective-about-editor';
import { CollectiveAgreementEditor } from '@/components/collectives/collective-agreement-editor';
import { notify } from '@/lib/notify';
import {
  wealthCollectiveService,
  type WealthCollectiveCycle,
  type WealthCollectiveOverview,
  type WealthCollectivePeriod,
} from '@/lib/services/wealth-collective-service';

const money = (amount: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(amount / 100);
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

export default function WealthCollectivesPage(): React.JSX.Element {
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
        ) : (
          <ProgrammeSetup refresh={load} />
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
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted"
            onClick={() => setStartDateOpen(true)}
            type="button"
          >
            <Pencil className="size-4" /> Edit start date
          </button>
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
      {section === 'content' && <CollectiveAboutEditor programme={programme} refresh={refresh} />}
      {section === 'overview' && (
        <div className="space-y-4">
          <section className="bg-card rounded-2xl border p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Capital movement</h2>
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
          <h2 className="text-lg font-semibold">Current programme position</h2>
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
          <h2 className="text-xl font-semibold">Month amounts and payouts</h2>
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
      {section === 'agreement' && (
        <CollectiveAgreementEditor programme={programme} refresh={refresh} />
      )}
    </>
  );
}

function SettlementSettings(): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Early Exit settlement</h2>
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
      <h2 className="text-xl font-semibold">Early Exit requests</h2>
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
                  {request.status === 'REQUESTED' && (
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
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof wealthCollectiveService.cycleMembers>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          <h2 className="text-xl font-semibold">Member tracking</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare each member’s deployed amount, position, and reserved contribution.
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
              <th className="px-4 py-3 text-right font-medium">Position</th>
              <th className="px-4 py-3 text-right font-medium">Reserved</th>
              <th className="px-4 py-3 font-medium">Monthly plan</th>
              <th className="px-4 py-3 font-medium">Agreement</th>
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
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(updates.length / pageSize));
  const publish = (form: HTMLFormElement): void => {
    const values = new FormData(form);
    setBusy(true);
    void wealthCollectiveService
      .publishUpdate({ title: String(values.get('title')), body: String(values.get('body')) })
      .then(async () => {
        form.reset();
        notify.success('Update published to members.');
        await refresh();
      })
      .catch((cause: unknown) =>
        notify.error(cause instanceof Error ? cause.message : 'Unable to publish update.'),
      )
      .finally(() => setBusy(false));
  };
  return (
    <section className="bg-card rounded-2xl border p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Collective updates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Publish programme news alongside deployment dates in members’ Updates view.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          publish(event.currentTarget);
        }}
      >
        <label className="block text-sm font-medium">
          Title
          <input
            className="mt-1 h-11 w-full rounded-lg border bg-background px-3"
            maxLength={160}
            name="title"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Message
          <textarea
            className="mt-1 min-h-28 w-full rounded-lg border bg-background p-3"
            maxLength={5000}
            name="body"
            required
          />
        </label>
        <button
          className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Publishing…' : 'Publish update'}
        </button>
      </form>
      <div className="mt-6 divide-y border-t">
        {updates.slice((page - 1) * pageSize, page * pageSize).map((update) => (
          <article className="py-4" key={update._id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{update.title}</h3>
              <time className="text-xs text-muted-foreground">{dateTime(update.publishedAt)}</time>
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
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
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
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
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
  const [rate, setRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [windowBusy, setWindowBusy] = useState(false);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const now = Date.now();
  const halfwayCanChange =
    Boolean(cycle.halfwayCandidateAt) && now < new Date(cycle.halfwayCandidateAt!).getTime();
  const monthActive =
    now >= new Date(cycle.startsAt).getTime() && now < new Date(cycle.endsAt).getTime();
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
    setBusy(true);
    void wealthCollectiveService
      .reconcileCycle(cycle._id, bps)
      .then(async () => {
        notify.success(`Month ${cycle.number} reconciled.`);
        await refresh();
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to reconcile this cycle.'),
      )
      .finally(() => setBusy(false));
  };
  return (
    <div className="py-5">
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
        ) : (
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
              disabled={busy}
              type="button"
              onClick={reconcile}
            >
              {busy ? 'Saving…' : 'Reconcile'}
            </button>
          </div>
        )}
      </div>
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
