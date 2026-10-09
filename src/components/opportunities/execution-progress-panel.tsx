'use client';

import { Check, Circle, Clock3, History, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import {
  opportunityService,
  type Opportunity,
  type OpportunityExecutionStage,
  type OpportunityExecutionStageHistory,
} from '@/lib/services/opportunity-service';

const manualStages: Array<{ value: OpportunityExecutionStage; label: string }> = [
  { value: 'OFFER_CLOSED', label: 'Offer closed' },
  { value: 'SOURCING_SELECTION', label: 'Sourcing & selection' },
  { value: 'PURCHASE_IN_PROGRESS', label: 'Purchase in progress' },
  { value: 'AGREEMENT_DOCUMENTATION', label: 'Agreement & documentation' },
  { value: 'PREPARING_FOR_DEPLOYMENT', label: 'Preparing for deployment' },
];

export function ExecutionProgressPanel({
  opportunity,
  onUpdated,
}: Readonly<{ opportunity: Opportunity; onUpdated: (value: Opportunity) => void }>) {
  const initialStage =
    opportunity.executionProgress?.stage === 'DEAL_ACTIVE'
      ? 'PREPARING_FOR_DEPLOYMENT'
      : (opportunity.executionProgress?.stage ?? 'OFFER_CLOSED');
  const [stage, setStage] = useState<OpportunityExecutionStage>(initialStage);
  const [publicNote, setPublicNote] = useState(opportunity.executionStageNote ?? '');
  const [expectedAt, setExpectedAt] = useState(
    opportunity.executionStageExpectedAt?.slice(0, 10) ?? '',
  );
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [regressionReason, setRegressionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<OpportunityExecutionStageHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const currentIndex = manualStages.findIndex(({ value }) => value === initialStage);
  const nextIndex = manualStages.findIndex(({ value }) => value === stage);
  const isRegression = nextIndex >= 0 && currentIndex >= 0 && nextIndex < currentIndex;
  const canManage = useMemo(() => {
    const closes = opportunity.offerClosesAt ? new Date(opportunity.offerClosesAt).getTime() : NaN;
    const starts = opportunity.commencementDate
      ? new Date(opportunity.commencementDate).getTime()
      : NaN;
    return (
      Number.isFinite(closes) &&
      closes <= Date.now() &&
      (!Number.isFinite(starts) || starts > Date.now())
    );
  }, [opportunity.commencementDate, opportunity.offerClosesAt]);

  useEffect(() => {
    opportunityService
      .executionStageHistory(opportunity._id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [opportunity._id]);

  async function save() {
    if (isRegression && !regressionReason.trim())
      return notify.error('Add a reason before moving the stage backwards.');
    setSaving(true);
    try {
      const updated = await opportunityService.updateExecutionStage(
        opportunity._id,
        opportunity.revision,
        {
          stage,
          publicNote: publicNote.trim(),
          expectedAt: expectedAt || null,
          notifyInApp,
          notifyEmail,
          regressionReason: regressionReason.trim(),
        },
      );
      onUpdated(updated);
      setRegressionReason('');
      setHistory(await opportunityService.executionStageHistory(opportunity._id));
      notify.success('Execution progress updated.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update execution progress');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="border-b pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Deal execution</p>
        <h2 className="mt-1 text-lg font-semibold">Post-close progress</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Keep members informed between offer close and deal start. Deal active is set automatically
          from the configured start date.
        </p>
      </div>

      {opportunity.executionProgress ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {opportunity.executionProgress.steps.map((step) => (
            <div
              key={step.stage}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
            >
              {step.status === 'COMPLETED' ? (
                <Check className="size-4 text-brand" />
              ) : step.status === 'CURRENT' ? (
                <Clock3 className="size-4 text-brand" />
              ) : (
                <Circle className="size-4 text-muted-foreground/50" />
              )}
              <span
                className={`text-xs ${step.status === 'CURRENT' ? 'font-semibold text-brand' : 'text-muted-foreground'}`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {!canManage ? (
        <div className="mt-5 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          {opportunity.executionProgress?.stage === 'DEAL_ACTIVE'
            ? 'This deal is active. Its stage now follows the existing lifecycle.'
            : 'Stage controls become available when the offer closes.'}
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Current stage
            <select
              className="min-h-10 rounded-lg border bg-background px-3 py-2 text-sm"
              value={stage}
              onChange={(event) => setStage(event.target.value as OpportunityExecutionStage)}
            >
              {manualStages.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Expected next update (optional)
            <input
              type="date"
              className="min-h-10 rounded-lg border bg-background px-3 py-2 text-sm"
              value={expectedAt}
              onChange={(event) => setExpectedAt(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Member-facing update
            <textarea
              rows={3}
              maxLength={1000}
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={publicNote}
              onChange={(event) => setPublicNote(event.target.value)}
              placeholder="Optional context members should see about this stage."
            />
          </label>
          {isRegression ? (
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Internal reason for moving backwards
              <textarea
                rows={2}
                maxLength={500}
                className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-sm"
                value={regressionReason}
                onChange={(event) => setRegressionReason(event.target.value)}
              />
            </label>
          ) : null}
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyInApp}
                onChange={(event) => setNotifyInApp(event.target.checked)}
              />{' '}
              Notify in app
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(event) => setNotifyEmail(event.target.checked)}
              />{' '}
              Send email
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60"
            >
              {saving ? 'Updating progress…' : 'Update progress'}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand/35 hover:text-brand"
        >
          <History className="size-4" />
          View update history
          {history.length ? (
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">
              {history.length}
            </span>
          ) : null}
        </button>
      </div>

      {historyOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="execution-history-title"
          className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-5"
          onClick={() => setHistoryOpen(false)}
        >
          <section
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border bg-background shadow-2xl sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                  Deal execution
                </p>
                <h2 id="execution-history-title" className="mt-1 text-lg font-semibold">
                  Update history
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">{opportunity.title}</p>
              </div>
              <button
                type="button"
                aria-label="Close update history"
                onClick={() => setHistoryOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full border text-muted-foreground transition hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </header>
            <div className="overflow-y-auto p-5 sm:p-6">
              {history.length ? (
                <div className="space-y-3">
                  {history.map((item) => (
                    <article key={item._id} className="rounded-xl border bg-muted/25 px-4 py-3">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <p className="text-sm font-semibold">
                          {manualStages.find(({ value }) => value === item.newStage)?.label ??
                            item.newStage}
                        </p>
                        <time className="shrink-0 text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('en-NG')}
                        </time>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Updated by {item.changedBy?.name ?? 'Admin'}
                      </p>
                      {item.publicNote ? (
                        <p className="mt-2 whitespace-pre-line text-sm leading-5 text-muted-foreground">
                          {item.publicNote}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center">
                  <History className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-semibold">No progress updates yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Saved execution-stage changes will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
