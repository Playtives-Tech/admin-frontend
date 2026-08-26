'use client';

import { useCallback, useEffect, useState } from 'react';
import { MdChevronLeft, MdChevronRight, MdClose, MdVisibility } from 'react-icons/md';
import { notify } from '@/lib/notify';
import { type AdminDateRange } from '@/lib/date-range';
import {
  distributionBatchService,
  type DistributionBatch,
  type DistributionBatchDetail,
} from '@/lib/services/distribution-batch-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value / 100);
const date = (value: string) => new Date(value).toLocaleDateString('en-NG', { dateStyle: 'medium' });

export function MonthlyDistributionPanel({ range }: { range: AdminDateRange }): React.JSX.Element {
  const [items, setItems] = useState<DistributionBatch[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [detail, setDetail] = useState<DistributionBatchDetail>();
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    const response = await distributionBatchService.list(undefined, range, page);
    setItems(response.items);
    setTotalItems(response.pagination.totalItems);
    setTotalPages(response.pagination.totalPages);
  }, [page, range]);
  useEffect(() => { void load().catch(() => notify.error('Could not load monthly distributions')); }, [load]);
  useEffect(() => { setPage(1); }, [range]);
  const open = async (id: string) => {
    setLoading(true);
    try { setDetail(await distributionBatchService.get(id)); }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Could not load distribution'); }
    finally { setLoading(false); }
  };
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Monthly earnings</p>
        <h2 className="mt-1 font-sans text-xl font-semibold">Actual distribution review</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter the actual monthly amount per unit or realised rate, review member allocations, then approve wallet credits.</p>
      </div>
      <div className="app-surface overflow-x-auto rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30"><tr>{['Opportunity', 'Due date', 'Cycle', 'Members', 'Actual amount', 'Status', 'Review'].map((label) => <th key={label} className="px-4 py-3 font-semibold text-muted-foreground">{label}</th>)}</tr></thead>
          <tbody className="divide-y">
            {items.map((item) => <tr key={item._id}>
              <td className="px-4 py-4 font-medium">{item.opportunityId.title}</td><td className="px-4 py-4">{date(item.scheduledFor)}</td><td className="px-4 py-4">{item.cycleNumber}</td><td className="px-4 py-4">{item.ownershipCount}</td><td className="px-4 py-4 text-brand">{item.status === 'AWAITING_AMOUNT' ? 'Awaiting amount' : money(item.totalActualReturnMinorUnits)}</td><td className="px-4 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{item.status.replaceAll('_', ' ')}</span></td>
              <td className="px-4 py-4"><button onClick={() => void open(item._id)} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted"><MdVisibility /> Review</button></td>
            </tr>)}
            {!items.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No monthly distributions are due in this period.</td></tr>}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground"><span>{totalItems ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, totalItems)} of ${totalItems}` : 'No monthly distributions'}</span><div className="flex items-center gap-2"><span>Page {page} of {totalPages}</span><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="grid size-8 place-items-center rounded-lg border disabled:opacity-40"><MdChevronLeft /></button><button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="grid size-8 place-items-center rounded-lg border disabled:opacity-40"><MdChevronRight /></button></div></div>
      </div>
      {detail && <DistributionDrawer detail={detail} close={() => setDetail(undefined)} updateDetail={(updated) => { setDetail(updated); void load(); }} refresh={async () => { await load(); setDetail(undefined); }} />}
    </section>
  );
}

function DistributionDrawer({ detail, close, updateDetail, refresh }: { detail: DistributionBatchDetail; close: () => void; updateDetail: (updated: DistributionBatchDetail) => void; refresh: () => Promise<void> }) {
  const [method, setMethod] = useState<'RATE_PERCENT' | 'AMOUNT_PER_UNIT' | 'TOTAL_DISTRIBUTION_AMOUNT'>(
    detail.batch.inputMethod === 'MANUAL_ALLOCATION'
      ? 'AMOUNT_PER_UNIT'
      : detail.batch.inputMethod ?? 'AMOUNT_PER_UNIT',
  );
  const [amount, setAmount] = useState(
    detail.batch.inputMethod === 'TOTAL_DISTRIBUTION_AMOUNT'
      ? String((detail.batch.totalDistributionMinorUnits ?? 0) / 100)
      : detail.batch.actualAmountPerUnitMinorUnits
        ? String(detail.batch.actualAmountPerUnitMinorUnits / 100)
        : '',
  );
  const [rate, setRate] = useState(detail.batch.actualRatePercent ? String(detail.batch.actualRatePercent) : '');
  const [manualReturns, setManualReturns] = useState<Record<string, string>>(() => Object.fromEntries(detail.allocations.map((item) => [item._id, String(item.returnMinorUnits / 100)])));
  const [note, setNote] = useState(detail.batch.adminNote ?? '');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setManualReturns(Object.fromEntries(detail.allocations.map((item) => [item._id, String(item.returnMinorUnits / 100)])));
  }, [detail]);
  const calculate = async () => {
    const value = Number(method === 'RATE_PERCENT' ? rate : amount);
    if (!Number.isFinite(value) || value < 0) return notify.error('Enter a valid actual distribution amount');
    setBusy(true);
    try {
      const updated = await distributionBatchService.setAmount(detail.batch, method, value);
      notify.success('Allocations calculated. Review the totals before approval.');
      updateDetail(updated);
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not calculate allocations'); }
    finally { setBusy(false); }
  };
  const review = async (status: 'APPROVED' | 'REJECTED') => {
    if (status === 'REJECTED' && !note.trim()) return notify.error('Add a rejection note');
    if (status === 'APPROVED' && !window.confirm(`Credit ${money(detail.batch.totalActualReturnMinorUnits)} across ${detail.allocations.length} members?`)) return;
    setBusy(true);
    try { await distributionBatchService.review(detail.batch, status, note); notify.success(status === 'APPROVED' ? 'Earnings credited to member wallets' : 'Distribution rejected'); await refresh(); }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Could not review distribution'); }
    finally { setBusy(false); }
  };
  const saveManualReturns = async () => {
    const allocations = detail.allocations.map((item) => ({
      accrualId: item._id,
      returnMinorUnits: Math.round(Number(manualReturns[item._id]) * 100),
    }));
    if (allocations.some((item) => !Number.isFinite(item.returnMinorUnits) || item.returnMinorUnits < 0))
      return notify.error('Enter a valid actual return for every member');
    setBusy(true);
    try {
      const updated = await distributionBatchService.setManualAllocations(detail.batch, allocations);
      notify.success('Custom member returns saved. These are now the amounts that will be credited.');
      updateDetail(updated);
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save custom returns'); }
    finally { setBusy(false); }
  };
  const ready = detail.batch.status === 'READY_FOR_APPROVAL';
  const editable = ['AWAITING_AMOUNT', 'READY_FOR_APPROVAL', 'REJECTED'].includes(detail.batch.status);
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-sm"><aside className="h-full w-full max-w-3xl overflow-y-auto bg-background shadow-2xl"><header className="sticky top-0 z-10 flex items-start justify-between border-b bg-background/95 p-6 backdrop-blur"><div><p className="text-xs font-bold uppercase tracking-wider text-brand">Monthly distribution</p><h2 className="mt-1 font-sans text-2xl font-semibold">{detail.batch.opportunityId.title}</h2><p className="mt-1 text-sm text-muted-foreground">Due {date(detail.batch.scheduledFor)} · cycle {detail.batch.cycleNumber}</p></div><button onClick={close} className="rounded-lg border p-2"><MdClose /></button></header><div className="space-y-6 p-6">
    <section className="rounded-2xl border p-5"><h3 className="font-sans text-lg font-semibold">Set actual monthly earnings</h3><p className="mt-1 text-sm text-muted-foreground">Projected figures are disclosures only. Enter a realised rate, amount per unit, or one total amount to share across the opportunity’s economic units.</p>{editable && <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto]"><select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="rounded-xl border bg-background px-3 py-2.5 text-sm"><option value="AMOUNT_PER_UNIT">Actual amount per unit</option><option value="RATE_PERCENT">Actual rate on capital</option><option value="TOTAL_DISTRIBUTION_AMOUNT">Total amount to distribute</option></select><input type="number" min="0" step="0.01" value={method === 'RATE_PERCENT' ? rate : amount} onChange={(event) => method === 'RATE_PERCENT' ? setRate(event.target.value) : setAmount(event.target.value)} placeholder={method === 'RATE_PERCENT' ? 'e.g. 3.5%' : method === 'TOTAL_DISTRIBUTION_AMOUNT' ? 'e.g. ₦3,000,000' : 'e.g. ₦71,428.57'} className="rounded-xl border bg-background px-3 py-2.5 text-sm"/><button disabled={busy} onClick={() => void calculate()} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground disabled:opacity-50">Calculate allocations</button></div>}</section>
    <section className="rounded-2xl border"><div className="border-b p-5"><h3 className="font-sans text-lg font-semibold">Member allocation preview</h3><p className="mt-1 text-sm text-muted-foreground">Use the calculator above for a quick estimate, or enter the exact amount each member should receive below. Saved custom values override the calculation.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted/30"><tr>{['Member','Units','Opening capital','Actual return','Closing capital'].map((label) => <th key={label} className="px-4 py-3 font-semibold text-muted-foreground">{label}</th>)}</tr></thead><tbody className="divide-y">{detail.allocations.map((item) => <tr key={item._id}><td className="px-4 py-3"><p className="font-medium">{item.userId.name}</p><p className="text-xs text-muted-foreground">{item.userId.email}</p></td><td className="px-4 py-3">{item.ownershipId.units}</td><td className="px-4 py-3">{money(item.principalBeforeMinorUnits)}</td><td className="px-4 py-3 text-brand">{editable ? <input aria-label={`Actual return for ${item.userId.name}`} type="number" min="0" step="0.01" value={manualReturns[item._id] ?? ''} onChange={(event) => setManualReturns((current) => ({ ...current, [item._id]: event.target.value }))} className="w-32 rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground" /> : money(item.returnMinorUnits)}</td><td className="px-4 py-3">{ready ? money(item.principalAfterMinorUnits) : '—'}</td></tr>)}</tbody></table></div>{editable && <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-xs text-muted-foreground">Enter the exact credited amount for every member, then save the manual returns.</p><button disabled={busy} onClick={() => void saveManualReturns()} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">Save custom returns</button></div>}</section>
    {ready && <section className="rounded-2xl border p-5"><label className="text-sm font-semibold">Admin note</label><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional approval note; required when rejecting" className="mt-2 min-h-24 w-full rounded-xl border bg-background p-3 text-sm"/><div className="mt-4 grid gap-3 sm:grid-cols-2"><button disabled={busy} onClick={() => void review('REJECTED')} className="h-11 rounded-xl border font-semibold text-red-500 disabled:opacity-50">Reject distribution</button><button disabled={busy} onClick={() => void review('APPROVED')} className="h-11 rounded-xl bg-brand font-semibold text-brand-foreground disabled:opacity-50">Approve and credit earnings</button></div></section>}
  </div></aside></div>;
}
