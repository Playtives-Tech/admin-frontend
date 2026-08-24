'use client';

import { useEffect, useState } from 'react';
import { MdCheckCircle, MdClose, MdContentCopy, MdImage, MdOpenInNew, MdPendingActions, MdPictureAsPdf } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { getDepositRequests, reviewDepositRequest, type AdminDepositRequest } from '@/lib/services/member-operations-service';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, type AdminDateRange } from '@/lib/date-range';

const money = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value / 100);

export default function DepositsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminDepositRequest[]>([]);
  const [selected, setSelected] = useState<AdminDepositRequest | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(true);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);

  const load = () => getDepositRequests(range).then(setItems);
  useEffect(() => { if (range.preset !== 'custom' || (range.from && range.to)) void load().catch(() => notify.error('Could not load deposit requests')); }, [range]);
  const review = async (status: 'approved' | 'rejected') => {
    if (!selected) return;
    setReviewing(true);
    try {
      const updated = await reviewDepositRequest(selected._id, status);
      setItems((current) => current.map((item) => item._id === updated._id ? updated : item));
      setSelected(null);
      notify.success(status === 'approved' ? 'Deposit approved and wallet credited' : 'Deposit rejected');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not review deposit');
    } finally { setReviewing(false); }
  };
  const pending = items.filter((item) => item.status === 'pending');
  return (
    <DashboardShell title="User deposits" description="Review payment receipts and credit verified transfers.">
      <div className="mx-auto max-w-6xl space-y-5">
        <DateRangeFilter value={range} onChange={setRange} />
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="Requests" value={String(items.length)} />
          <Metric label="Awaiting review" value={String(pending.length)} />
          <Metric label="Pending value" value={money(pending.reduce((sum, item) => sum + item.amountMinorUnits, 0))} />
        </section>
        <section className="app-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b bg-muted/30 text-muted-foreground"><tr>{['Member', 'Amount', 'Narration', 'Submitted', 'Status', ''].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y">
              {items.map((item) => <tr key={item._id} className="hover:bg-muted/20"><td className="px-4 py-3"><p className="font-semibold text-foreground">{item.userId.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.userId.email}</p></td><td className="px-4 py-3 font-medium">{money(item.amountMinorUnits)}</td><td className="max-w-52 truncate px-4 py-3 font-mono text-[11px]" title={item.narration ?? 'Not provided'}>{item.narration ?? 'Not provided'}</td><td className="px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString('en-NG')}</td><td className="px-4 py-3"><Status status={item.status} /></td><td className="px-4 py-3 text-right"><button onClick={() => { setReceiptLoading(true); setSelected(item); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold hover:bg-muted"><MdPendingActions className="size-4" />Review</button></td></tr>)}
              {items.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No deposit requests yet.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
      {selected ? <DepositReviewModal deposit={selected} receiptLoading={receiptLoading} setReceiptLoading={setReceiptLoading} reviewing={reviewing} close={() => setSelected(null)} review={review} /> : null}
    </DashboardShell>
  );
}

function DepositReviewModal({ deposit, receiptLoading, setReceiptLoading, reviewing, close, review }: { deposit: AdminDepositRequest; receiptLoading: boolean; setReceiptLoading: (value: boolean) => void; reviewing: boolean; close: () => void; review: (status: 'approved' | 'rejected') => Promise<void> }) {
  const narration = deposit.narration ?? 'Not provided';
  const copy = async () => { await navigator.clipboard.writeText(narration); notify.success('Narration copied'); };
  const isPending = deposit.status === 'pending';
  const isPdf = /\.pdf(?:$|[?#])/i.test(deposit.receiptImageUrl);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"><section className="app-surface flex h-[min(60vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border"><header className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-sm font-semibold">Review deposit</h2><p className="mt-1 text-xs text-muted-foreground">Confirm the receipt, amount, and narration before crediting.</p></div><button onClick={close} className="grid size-8 place-items-center rounded-lg hover:bg-muted"><MdClose /></button></header><div className="grid flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[1.15fr_.85fr]"><div className="relative min-h-52 overflow-hidden rounded-lg border bg-muted"><a href={deposit.receiptImageUrl} target="_blank" rel="noreferrer" className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-md bg-background/90 text-foreground" title="Open receipt in a new tab"><MdOpenInNew /></a>{isPdf ? <a href={deposit.receiptImageUrl} target="_blank" rel="noreferrer" className="grid h-full min-h-52 place-items-center gap-2 p-6 text-center text-muted-foreground"><MdPictureAsPdf className="size-10 text-red-500" /><span className="text-xs font-semibold text-foreground">PDF receipt</span><span className="text-[11px]">Open the document to review it.</span></a> : <>{receiptLoading ? <div className="grid h-full min-h-52 place-items-center text-muted-foreground"><MdImage className="size-6 animate-pulse" /></div> : null}<img src={deposit.receiptImageUrl} alt="Payment receipt" onLoad={() => setReceiptLoading(false)} onError={() => setReceiptLoading(false)} className={`h-full min-h-52 w-full object-contain ${receiptLoading ? 'invisible' : ''}`} /></>}</div><div className="space-y-4"><Detail label="Member" value={deposit.userId.name} helper={deposit.userId.email} /><Detail label="Amount" value={money(deposit.amountMinorUnits)} /><div><p className="text-xs text-muted-foreground">Payment narration</p><div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"><code className="min-w-0 flex-1 truncate text-[11px] font-semibold">{narration}</code><button onClick={() => void copy()} className="text-brand"><MdContentCopy className="size-4" /></button></div></div><Detail label="Submitted" value={new Date(deposit.createdAt).toLocaleString('en-NG')} /><Status status={deposit.status} /></div></div><footer className="flex justify-end gap-2 border-t px-5 py-4"><button disabled={reviewing} onClick={close} className="h-9 rounded-lg border px-3 text-xs font-semibold">Close</button>{isPending ? <><button disabled={reviewing} onClick={() => void review('rejected')} className="h-9 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-600 disabled:opacity-50">Reject</button><button disabled={reviewing} onClick={() => void review('approved')} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-semibold text-brand-foreground disabled:opacity-50"><MdCheckCircle className="size-4" />{reviewing ? 'Reviewing…' : 'Approve & credit'}</button></> : null}</footer></section></div>;
}

function Detail({ label, value, helper }: { label: string; value: string; helper?: string }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p>{helper ? <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p> : null}</div>; }
function Status({ status }: { status: AdminDepositRequest['status'] }) { return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : status === 'rejected' ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'}`}>{status}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <article className="app-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></article>; }
