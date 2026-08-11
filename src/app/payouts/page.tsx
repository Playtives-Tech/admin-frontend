'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdClose,
  MdPendingActions,
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
  const [status, setStatus] = useState<'ALL' | MaturityPayoutStatus>('PENDING');
  const [detail, setDetail] = useState<PayoutDetail>();
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const load = useCallback(
    () => payoutService.list(status === 'ALL' ? undefined : status).then(setItems),
    [status],
  );
  useEffect(() => {
    void load().catch(() => notify.error('Could not load maturity payouts'));
  }, [load]);
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
        `Credit ${money(detail.payout.totalPayoutMinorUnits)} to ${detail.payout.userId.name}'s earnings balance?`,
      )
    )
      return;
    setBusy(true);
    try {
      await payoutService.review(detail.payout, action, note);
      setDetail(undefined);
      await load();
      notify.success(action === 'APPROVED' ? 'Payout approved and credited' : 'Payout rejected');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Payout review failed');
    } finally {
      setBusy(false);
    }
  };
  const pending = items.filter((item) => item.status === 'PENDING' || item.status === 'PROCESSING');
  return (
    <DashboardShell
      title="Payouts"
      description="Validate matured ownerships before crediting member earnings"
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
                  <td className="px-4 py-4 font-semibold">{money(item.totalPayoutMinorUnits)}</td>
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
        </div>
      </div>
      {detail && (
        <ReviewPanel
          detail={detail}
          note={note}
          setNote={setNote}
          busy={busy}
          close={() => setDetail(undefined)}
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
  review,
}: {
  detail: PayoutDetail;
  note: string;
  setNote: (value: string) => void;
  busy: boolean;
  close: () => void;
  review: (action: 'APPROVED' | 'REJECTED') => Promise<void>;
}) {
  const { payout, wallet, accruals } = detail;
  const reviewable = payout.status === 'PENDING' || payout.status === 'PROCESSING';
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm">
      <aside className="h-full w-full max-w-3xl overflow-y-auto bg-background shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-background/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              Maturity validation
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold">
              {payout.opportunityId.title}
            </h2>
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
              <Metric
                label="Operator"
                value={payout.opportunityId.operator || 'Not specified'}
                helper={payout.opportunityId.location}
              />
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
                label="Rollover"
                value={payout.opportunityId.rolloverAllowed ? 'Enabled' : 'Disabled'}
                helper={
                  payout.opportunityId.rolloverCompoundsReturns
                    ? 'Returns compound into capital'
                    : 'No compounding'
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
              <Metric label="Total payout" value={money(payout.totalPayoutMinorUnits)} />
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
                  Approve and credit earnings
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
      <h3 className="mb-4 font-heading text-lg font-semibold">{title}</h3>
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
