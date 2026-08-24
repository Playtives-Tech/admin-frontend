'use client';

import { useEffect, useState } from 'react';
import { MailCheck, Send } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getNameChangeRequests,
  sendNameChangeLink,
  type AdminNameChangeRequest,
} from '@/lib/services/member-operations-service';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, type AdminDateRange } from '@/lib/date-range';

const date = (value: string | null): string =>
  value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function NameChangeRequestsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminNameChangeRequest[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);

  const load = async (): Promise<void> => {
    try {
      setItems(await getNameChangeRequests(range));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load name change requests');
    }
  };
  useEffect(() => { if (range.preset !== 'custom' || (range.from && range.to)) void load(); }, [range]);

  const sendLink = async (requestId: string): Promise<void> => {
    setSendingId(requestId);
    try {
      const updated = await sendNameChangeLink(requestId);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      notify.success('Secure name-change link sent');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not send the secure link');
    } finally {
      setSendingId(null);
    }
  };

  const pending = items.filter((item) => item.status === 'PENDING').length;
  return (
    <DashboardShell title="Name change requests" description="Review support requests before sending a one-time update link.">
      <div className="mx-auto max-w-6xl space-y-5">
        <DateRangeFilter value={range} onChange={setRange} />
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="All requests" value={String(items.length)} />
          <Metric label="Awaiting review" value={String(pending)} />
          <Metric label="Links sent" value={String(items.filter((item) => item.status === 'LINK_SENT').length)} />
        </section>
        <section className="app-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b bg-muted/30 text-muted-foreground"><tr>{['Member', 'Reason', 'Requested', 'Status', 'Secure link'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{item.user.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.user.email}</p></td>
                  <td className="max-w-[24rem] px-4 py-3 text-muted-foreground"><p className="line-clamp-2">{item.reason}</p></td>
                  <td className="px-4 py-3 text-muted-foreground">{date(item.createdAt)}</td>
                  <td className="px-4 py-3"><Status status={item.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'COMPLETED' ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand"><MailCheck className="size-3.5" />Completed</span> : (
                      <button disabled={sendingId === item.id} onClick={() => void sendLink(item.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold transition hover:bg-muted disabled:opacity-60">
                        <Send className="size-3.5" />{sendingId === item.id ? 'Sending…' : item.status === 'LINK_SENT' ? 'Resend link' : 'Send link'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No name change requests yet.</td></tr> : null}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardShell>
  );
}

function Status({ status }: { status: AdminNameChangeRequest['status'] }): React.JSX.Element {
  const styles = status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-700' : status === 'LINK_SENT' ? 'bg-blue-500/10 text-blue-700' : 'bg-amber-500/10 text-amber-700';
  return <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${styles}`}>{status.replace('_', ' ').toLowerCase()}</span>;
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return <article className="app-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></article>;
}
