'use client';

import { Check, Clock3, History, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { notify } from '@/lib/notify';
import {
  opportunityService,
  type Opportunity,
  type OpportunityExecutionStageHistory,
} from '@/lib/services/opportunity-service';

export function ExecutionProgressPanel({
  opportunity,
  onUpdated,
}: Readonly<{ opportunity: Opportunity; onUpdated: (value: Opportunity) => void }>) {
  const [label, setLabel] = useState('');
  const [stageDate, setStageDate] = useState(new Date().toISOString().slice(0, 10));
  const [publicNote, setPublicNote] = useState('');
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [editingStageDate, setEditingStageDate] = useState('');
  const [editingPublicNote, setEditingPublicNote] = useState('');
  const [savingEditedDate, setSavingEditedDate] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [history, setHistory] = useState<OpportunityExecutionStageHistory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const canManage = useMemo(() => {
    const closes = opportunity.offerClosesAt ? new Date(opportunity.offerClosesAt).getTime() : NaN;
    return Number.isFinite(closes) && closes <= Date.now();
  }, [opportunity.offerClosesAt]);

  useEffect(() => {
    opportunityService
      .executionStageHistory(opportunity._id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [opportunity._id]);

  async function appendStage() {
    if (!label.trim()) return notify.error('Enter the current stage.');
    if (!stageDate) return notify.error('Select the date for this stage.');
    setSaving(true);
    try {
      const updated = await opportunityService.appendExecutionStep(
        opportunity._id,
        opportunity.revision,
        {
          label: label.trim(),
          stageDate,
          publicNote: publicNote.trim(),
          notifyInApp,
          notifyEmail,
        },
      );
      onUpdated(updated);
      setLabel('');
      setPublicNote('');
      setStageDate(new Date().toISOString().slice(0, 10));
      setHistory(await opportunityService.executionStageHistory(opportunity._id));
      notify.success('New progress stage added.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to add progress stage');
    } finally {
      setSaving(false);
    }
  }

  async function saveStageDate() {
    if (!editingStepId || !editingStageDate) return;
    setSavingEditedDate(true);
    try {
      if (!editingLabel.trim()) return notify.error('Enter the stage name.');
      const updated = await opportunityService.updateExecutionStep(
        opportunity._id,
        editingStepId,
        opportunity.revision,
        {
          label: editingLabel.trim(),
          stageDate: editingStageDate,
          publicNote: editingPublicNote.trim(),
        },
      );
      onUpdated(updated);
      setEditingStepId(null);
      setEditingLabel('');
      setEditingStageDate('');
      setEditingPublicNote('');
      setHistory(await opportunityService.executionStageHistory(opportunity._id));
      notify.success('Stage date updated.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to update stage date');
    } finally {
      setSavingEditedDate(false);
    }
  }

  async function deleteStage(stepId: string, stepLabel: string) {
    if (!window.confirm(`Delete “${stepLabel}” from this opportunity's progress?`)) return;
    setDeletingStepId(stepId);
    try {
      const updated = await opportunityService.deleteExecutionStep(
        opportunity._id,
        stepId,
        opportunity.revision,
      );
      onUpdated(updated);
      if (editingStepId === stepId) setEditingStepId(null);
      setHistory(await opportunityService.executionStageHistory(opportunity._id));
      notify.success('Progress stage deleted.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to delete progress stage');
    } finally {
      setDeletingStepId(null);
    }
  }

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="border-b pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Deal execution</p>
        <h2 className="mt-1 text-lg font-semibold">Post-close progress</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Offer closed is always first. Add each real stage as it happens; the newest stage becomes
          the current step members see.
        </p>
      </div>

      {opportunity.executionProgress ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {opportunity.executionProgress.steps.map((step) => {
            const customStep = opportunity.executionCustomSteps.find(
              (item) => item._id === step.stage,
            );
            const isEditing = customStep?._id === editingStepId;
            return (
            <div key={step.stage} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              {step.status === 'CURRENT' ? <Clock3 className="size-4 text-brand" /> : <Check className="size-4 text-brand" />}
              <div className="min-w-0 flex-1">
                <p className={`truncate text-xs ${step.status === 'CURRENT' ? 'font-semibold text-brand' : 'text-muted-foreground'}`}>{step.label}</p>
                {isEditing ? (
                  <div className="mt-2 grid gap-2 sm:col-span-3">
                    <input aria-label="Stage name" className="min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs" value={editingLabel} maxLength={120} onChange={(event) => setEditingLabel(event.target.value)} />
                    <input type="date" aria-label="Stage date" className="min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs" value={editingStageDate} onChange={(event) => setEditingStageDate(event.target.value)} />
                    <textarea aria-label="Member-facing update" rows={2} className="min-w-0 resize-y rounded-md border bg-background px-2 py-1.5 text-xs" value={editingPublicNote} maxLength={1000} onChange={(event) => setEditingPublicNote(event.target.value)} placeholder="Optional member-facing update" />
                    <div className="flex items-center gap-1.5">
                      <button type="button" disabled={savingEditedDate} onClick={saveStageDate} className="rounded-md bg-brand px-2.5 py-1.5 text-[10px] font-semibold text-brand-foreground disabled:opacity-60">Save changes</button>
                      <button type="button" onClick={() => setEditingStepId(null)} className="rounded-md border px-2.5 py-1.5 text-[10px] font-semibold">Cancel</button>
                    </div>
                  </div>
                ) : step.date ? <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(step.date).toLocaleDateString('en-NG')}</p> : null}
              </div>
              {customStep && !isEditing ? <div className="flex shrink-0 gap-1"><button type="button" aria-label={`Edit ${step.label}`} title="Edit stage" onClick={() => { setEditingStepId(customStep._id); setEditingLabel(customStep.label); setEditingStageDate(customStep.stageDate.slice(0, 10)); setEditingPublicNote(customStep.note); }} className="grid size-7 place-items-center rounded-md border bg-background text-muted-foreground hover:text-brand"><Pencil className="size-3" /></button><button type="button" disabled={deletingStepId === customStep._id} aria-label={`Delete ${step.label}`} title="Delete stage" onClick={() => deleteStage(customStep._id, customStep.label)} className="grid size-7 place-items-center rounded-md border bg-background text-muted-foreground hover:border-destructive/40 hover:text-destructive disabled:opacity-50"><Trash2 className="size-3" /></button></div> : null}
            </div>
          );})}
        </div>
      ) : null}

      {!canManage ? (
        <div className="mt-5 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">Stage controls become available when the offer closes.</div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Current stage
            <input className="min-h-10 rounded-lg border bg-background px-3 py-2 text-sm" value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Supplier verification" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            Stage date
            <input type="date" className="min-h-10 rounded-lg border bg-background px-3 py-2 text-sm" value={stageDate} onChange={(event) => setStageDate(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
            Member-facing update
            <textarea rows={3} maxLength={1000} className="rounded-lg border bg-background px-3 py-2 text-sm" value={publicNote} onChange={(event) => setPublicNote(event.target.value)} placeholder="Optional context members should see about this stage." />
          </label>
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={notifyInApp} onChange={(event) => setNotifyInApp(event.target.checked)} /> Notify in app</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={notifyEmail} onChange={(event) => setNotifyEmail(event.target.checked)} /> Send email</label>
          </div>
          <button type="button" disabled={saving} onClick={appendStage} className="w-fit rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-60 sm:col-span-2">
            {saving ? 'Adding stage…' : 'Add next stage'}
          </button>
        </div>
      )}

      <div className="mt-6 border-t pt-4">
        <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold">
          <History className="size-4" /> View update history
          {history.length ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs text-brand">{history.length}</span> : null}
        </button>
      </div>

      {historyOpen ? (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-end bg-black/45 sm:place-items-center sm:p-5" onClick={() => setHistoryOpen(false)}>
          <section className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border bg-background shadow-2xl sm:rounded-2xl" onClick={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b px-5 py-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">Deal execution</p><h2 className="mt-1 text-lg font-semibold">Update history</h2></div>
              <button type="button" aria-label="Close" onClick={() => setHistoryOpen(false)} className="grid size-9 place-items-center rounded-full border"><X className="size-4" /></button>
            </header>
            <div className="overflow-y-auto p-5">
              {history.length ? history.map((item) => (
                <article key={item._id} className="mb-3 rounded-xl border bg-muted/25 px-4 py-3">
                  <div className="flex justify-between gap-4"><p className="text-sm font-semibold">{item.customLabel || item.newStage || 'Progress update'}</p><time className="text-xs text-muted-foreground">{new Date(item.stageDate || item.createdAt).toLocaleDateString('en-NG')}</time></div>
                  {item.publicNote ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.publicNote}</p> : null}
                </article>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">No progress updates yet.</p>}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
