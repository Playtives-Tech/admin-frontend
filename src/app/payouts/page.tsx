'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
  MdPendingActions,
  MdPayments,
  MdVisibility,
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  payoutService,
  type MaturityPayout,
  type MaturityPayoutStatus,
  type PayoutDetail,
} from '@/lib/services/payout-service';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, type AdminDateRange } from '@/lib/date-range';
import { MonthlyDistributionPanel } from '@/components/payouts/monthly-distribution-panel';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' }) : 'Not available';

export default function PayoutsPage(): React.JSX.Element {
  const [items, setItems] = useState<MaturityPayout[]>([]);
  const [status, setStatus] = useState<'ALL' | MaturityPayoutStatus>('ALL');
  const [tab, setTab] = useState<'MONTHLY' | 'PRINCIPAL'>('MONTHLY');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detail, setDetail] = useState<PayoutDetail>();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);
  const load = useCallback(async () => {
    const response = await payoutService.list(status === 'ALL' ? undefined : status, range, page);
    setItems(response.items);
    setTotalItems(response.pagination.totalItems);
    setTotalPages(response.pagination.totalPages);
  }, [page, range, status]);
  useEffect(() => {
    void load().catch(() => notify.error('Could not load maturity payouts'));
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [range, status]);
  const open = async (id: string) => {
    setLoadingDetail(true);
    setNote('');
    try {
      setDetail(await payoutService.get(id));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load payout details');
    } finally {
      setLoadingDetail(false);
    }
  };
  const review = async (action: 'APPROVED' | 'REJECTED') => {
    if (!detail) return;
    if (action === 'REJECTED' && !note.trim()) {
      notify.error('Add a reason before rejecting this payout');
      return;
    }
    if (
      action === 'APPROVED' &&
      !window.confirm(
        `Return ${money(detail.payout.actualPayoutMinorUnits ?? detail.payout.totalPayoutMinorUnits)} of principal to ${detail.payout.userId.name}'s wallet?`,
      )
    )
      return;
    setBusy(true);
    try {
      await payoutService.review(detail.payout, action, note);
      setDetail(undefined);
      await load();
      notify.success(
        action === 'APPROVED' ? 'Principal payout approved and credited' : 'Payout rejected',
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Payout review failed');
    } finally {
      setBusy(false);
    }
  };
  const pending = items.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING');
  return (
    <DashboardShell
      title="User payouts"
      description="Review actual monthly earnings first, then return principal for completed fixed-term ownerships."
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-2">
            <button
              onClick={() => setTab('MONTHLY')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${tab === 'MONTHLY' ? 'border-brand bg-brand text-brand-foreground' : 'bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground'}`}
            >
              <MdPayments className="size-4" />
              Monthly earnings
            </button>
            <button
              onClick={() => setTab('PRINCIPAL')}
              className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${tab === 'PRINCIPAL' ? 'border-brand bg-brand text-brand-foreground' : 'bg-background text-muted-foreground hover:border-brand/40 hover:text-foreground'}`}
            >
              <MdAccountBalanceWallet className="size-4" />
              Capital returns
            </button>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>
        {tab === 'MONTHLY' ? (
          <MonthlyDistributionPanel range={range} />
        ) : (
          <>
            <div className="pt-2">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                Capital returns
              </p>
              <h2 className="mt-1 font-sans text-xl font-semibold">Principal payout review</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Approve the final principal return separately once a fixed-term ownership completes.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat
                label="Completed ownerships"
                value={String(items.length)}
                icon={MdPendingActions}
              />
              <Stat
                label="Pending value"
                value={money(
                  pending.reduce(
                    (sum, item) =>
                      sum + (item.actualPayoutMinorUnits ?? item.totalPayoutMinorUnits),
                    0,
                  ),
                )}
                icon={MdAccountBalanceWallet}
              />
              <Stat
                label="Approved in view"
                value={String(items.filter((item) => item.status === 'APPROVED').length)}
                icon={MdCheckCircle}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
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
                      'Projected return',
                      'Total payout',
                      'Status',
                      'Review',
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
                      <td className="px-4 py-4 font-semibold">
                        {money(item.actualPayoutMinorUnits ?? item.totalPayoutMinorUnits)}
                      </td>
                      <td className="px-4 py-4">{item.status}</td>
                      <td className="px-4 py-4">
                        <button
                          disabled={loadingDetail}
                          onClick={() => void open(item._id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          <MdVisibility /> Review details
                        </button>
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
              <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
                <span>
                  {totalItems
                    ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, totalItems)} of ${totalItems}`
                    : 'No capital returns'}
                </span>
                <div className="flex items-center gap-2">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    className="grid size-8 place-items-center rounded-lg border disabled:opacity-40"
                  >
                    <MdChevronLeft />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    className="grid size-8 place-items-center rounded-lg border disabled:opacity-40"
                  >
                    <MdChevronRight />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {detail && (
        <ReviewPanel
          detail={detail}
          note={note}
          setNote={setNote}
          busy={busy}
          close={() => setDetail(undefined)}
          updateDetail={setDetail}
          review={review}
        />
      )}
    </DashboardShell>
  );
}

function ReviewPanel({
  detail,
  note,
  setNote,
  busy,
  close,
  updateDetail,
  review,
}: {
  detail: PayoutDetail;
  note: string;
  setNote: (value: string) => void;
  busy: boolean;
  close: () => void;
  updateDetail: (detail: PayoutDetail | undefined) => void;
  review: (action: 'APPROVED' | 'REJECTED') => Promise<void>;
}) {
  const { payout, wallet, accruals } = detail;
  const [actualAmount, setActualAmount] = useState(
    String((payout.actualPayoutMinorUnits ?? payout.totalPayoutMinorUnits) / 100),
  );
  const reviewable = payout.status === 'PENDING' || payout.status === 'PROCESSING';
  const saveActualAmount = async () => {
    const value = Number(actualAmount);
    if (!Number.isFinite(value) || value < 0)
      return notify.error('Enter a valid capital return amount');
    try {
      const updated = await payoutService.setActualAmount(payout, value);
      updateDetail({
        ...detail,
        payout: {
          ...payout,
          actualPayoutMinorUnits: updated.actualPayoutMinorUnits,
          revision: updated.revision,
        },
      });
      notify.success('Capital return amount saved');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not save capital return amount');
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm">
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-background shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-background/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Maturity validation
            </p>
            <h2 className="mt-1 font-sans text-2xl font-semibold">{payout.opportunityId.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review every factor before approving this payout.
            </p>
          </div>
          <button onClick={close} className="rounded-lg border p-2">
            <MdClose />
          </button>
        </header>
        <div className="space-y-6 p-6">
          <Section title="Member and wallet">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Member" value={payout.userId.name} helper={payout.userId.email} />
              <Metric
                label="Account status"
                value={payout.userId.status}
                helper={`Joined ${date(payout.userId.createdAt)}`}
              />
              <Metric
                label="Deposit balance"
                value={money(wallet.deposit.availableBalanceMinorUnits)}
                helper={`${money(wallet.deposit.pendingBalanceMinorUnits)} pending`}
              />
              <Metric
                label="Earnings balance"
                value={money(wallet.earnings.availableBalanceMinorUnits)}
                helper={`${money(wallet.earnings.lifetimeEarningsMinorUnits)} lifetime earnings`}
              />
              <Metric
                label="Total available wallet"
                value={money(wallet.totalAvailableBalanceMinorUnits)}
              />
            </div>
          </Section>
          <Section title="Opportunity terms">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric
                label="Opportunity"
                value={payout.opportunityId.title}
                helper={payout.opportunityId.category}
              />
              <Metric label="Location" value={payout.opportunityId.location || 'Not specified'} />
              <Metric
                label="Duration"
                value={`${payout.opportunityId.durationMonths} months`}
                helper={`${payout.opportunityId.returnSchedule.replaceAll('_', ' ').toLowerCase()} returns`}
              />
              <Metric
                label="Projected ROI"
                value={`${payout.opportunityId.projectedReturnRatePercent}%`}
                helper={`Monthly for ${payout.ownershipId.units} units: ${money((payout.opportunityId.projectedMonthlyProfitMinorUnits ?? Math.round(payout.opportunityId.projectedProfitMinorUnits / Math.max(1, payout.opportunityId.durationMonths))) * payout.ownershipId.units)}`}
              />
              <Metric
                label="Member profit rollover"
                value={
                  payout.opportunityId.rolloverAllowed ? 'Member choice enabled' : 'Not offered'
                }
                helper={
                  payout.opportunityId.rolloverCompoundsReturns
                    ? 'Legacy setting: returns compound into capital'
                    : 'Members who opt in have approved profit added to their contribution'
                }
              />
            </div>
          </Section>
          <Section title="Ownership and maturity">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Units acquired" value={String(payout.ownershipId.units)} />
              <Metric label="Original principal" value={money(payout.principalMinorUnits)} />
              <Metric
                label="Final capital"
                value={money(payout.ownershipId.investmentCapitalMinorUnits)}
              />
              <Metric label="Accrued return" value={money(payout.returnMinorUnits)} />
              <Metric
                label="Capital amount to return"
                value={money(payout.actualPayoutMinorUnits ?? payout.totalPayoutMinorUnits)}
                helper={
                  payout.actualPayoutMinorUnits == null
                    ? 'Calculated capital amount'
                    : `Override saved · calculated ${money(payout.totalPayoutMinorUnits)}`
                }
              />
              <Metric
                label="Time held"
                value={`${payout.ownershipId.cyclesAccrued} monthly cycles`}
                helper={`${date(payout.ownershipId.createdAt)} – ${date(payout.ownershipId.completedAt ?? payout.ownershipId.maturityAt)}`}
              />
            </div>
          </Section>
          <Section title="Monthly accrual evidence">
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      'Cycle',
                      'Scheduled',
                      'Opening capital',
                      'Return',
                      'Closing capital',
                      'Treatment',
                    ].map((label) => (
                      <th key={label} className="px-3 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accruals.map((item) => (
                    <tr key={item._id}>
                      <td className="px-3 py-3">{item.cycleNumber}</td>
                      <td className="px-3 py-3">{date(item.scheduledFor)}</td>
                      <td className="px-3 py-3">{money(item.principalBeforeMinorUnits)}</td>
                      <td className="px-3 py-3 text-brand">{money(item.returnMinorUnits)}</td>
                      <td className="px-3 py-3">{money(item.principalAfterMinorUnits)}</td>
                      <td className="px-3 py-3">
                        {item.rolledOver ? 'Rolled over' : item.status.replaceAll('_', ' ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
          {reviewable && (
            <Section title="Admin decision">
              <div className="mb-4 rounded-xl bg-muted/40 p-4">
                <label className="text-sm font-semibold">Exact capital amount to return</label>
                <p className="mt-1 text-xs text-muted-foreground">
                  This manual amount overrides the calculated principal return and is the amount
                  credited when approved.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actualAmount}
                    onChange={(event) => setActualAmount(event.target.value)}
                    className="h-11 min-w-48 rounded-xl border bg-background px-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveActualAmount()}
                    className="h-11 rounded-xl border px-4 text-sm font-semibold hover:bg-background"
                  >
                    Save amount
                  </button>
                </div>
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional approval note; required when rejecting"
                className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  disabled={busy}
                  onClick={() => void review('REJECTED')}
                  className="h-11 rounded-xl border font-semibold text-red-500 disabled:opacity-50"
                >
                  Reject payout
                </button>
                <button
                  disabled={busy}
                  onClick={() => void review('APPROVED')}
                  className="h-11 rounded-xl bg-brand font-semibold text-brand-foreground disabled:opacity-50"
                >
                  Approve and return principal
                </button>
              </div>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-background p-5">
      <h3 className="mb-4 font-sans text-lg font-semibold">{title}</h3>
      {children}
    </section>
  );
}
function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-semibold capitalize">{value}</p>
      {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
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
