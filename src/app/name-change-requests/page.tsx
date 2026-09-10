'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, MailCheck, Send } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getNameChangeRequests,
  sendNameChangeLink,
  verifyNameChangeIdentity,
  type AdminNameChangeRequest,
} from '@/lib/services/member-operations-service';
import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { defaultAdminDateRange, type AdminDateRange } from '@/lib/date-range';

const date = (value: string | null): string =>
  value
    ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

export default function NameChangeRequestsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminNameChangeRequest[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [range, setRange] = useState<AdminDateRange>(defaultAdminDateRange);

  const load = useCallback(async (): Promise<void> => {
    try {
      setItems(await getNameChangeRequests(range));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load name change requests');
    }
  }, [range]);
  useEffect(() => {
    if (range.preset !== 'custom' || (range.from && range.to)) void load();
  }, [load, range]);

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

  const verifyIdentity = async (requestId: string): Promise<void> => {
    setVerifyingId(requestId);
    try {
      const updated = await verifyNameChangeIdentity(requestId);
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      if (updated.identityVerificationStatus === 'MATCHED')
        notify.success('Identity matches the requested name');
      else notify.error('Identity does not match the requested name');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not verify the identity');
    } finally {
      setVerifyingId(null);
    }
  };

  const pending = items.filter((item) => item.status === 'PENDING').length;
  return (
    <DashboardShell
      title="Name change requests"
      description="Review support requests before sending a one-time update link."
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <DateRangeFilter value={range} onChange={setRange} />
        <section className="grid gap-3 sm:grid-cols-3">
          <Metric label="All requests" value={String(items.length)} />
          <Metric label="Awaiting review" value={String(pending)} />
          <Metric
            label="Links sent"
            value={String(items.filter((item) => item.status === 'LINK_SENT').length)}
          />
        </section>
        <section className="app-surface overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1280px] text-left text-xs">
            <thead className="border-b bg-muted/30 text-muted-foreground">
              <tr>
                {[
                  'Member',
                  'Requested name',
                  'Reason',
                  'Identity document',
                  'Provider result',
                  'Supporting file',
                  'Requested',
                  'Status',
                  'Actions',
                ].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{item.user.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {item.proposedName ?? 'Legacy request'}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Current: {item.user.name}
                    </p>
                  </td>
                  <td className="max-w-[24rem] px-4 py-3 text-muted-foreground">
                    <p className="line-clamp-2">{item.reason}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.identityDocumentType ? (
                      <>
                        <p className="font-semibold text-foreground">
                          {item.identityDocumentType.replaceAll('_', ' ')}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {item.identityDocumentNumber ?? 'No number supplied'}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Not required for legacy request</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <IdentityResult item={item} />
                  </td>
                  <td className="px-4 py-3">
                    {item.identityDocumentUrl ? (
                      <a
                        href={item.identityDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand underline underline-offset-2"
                      >
                        View {item.identityDocumentFileName ?? 'document'}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">No file supplied</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{date(item.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Status status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                        <MailCheck className="size-3.5" />
                        Completed
                      </span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={verifyingId === item.id}
                          onClick={() => void verifyIdentity(item.id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-semibold transition hover:bg-muted disabled:opacity-60"
                        >
                          <BadgeCheck className="size-3.5" />
                          {verifyingId === item.id ? 'Checking…' : 'Verify ID'}
                        </button>
                        <button
                          disabled={
                            sendingId === item.id || item.identityVerificationStatus !== 'MATCHED'
                          }
                          onClick={() => void sendLink(item.id)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Send className="size-3.5" />
                          {sendingId === item.id
                            ? 'Sending…'
                            : item.status === 'LINK_SENT'
                              ? 'Resend link'
                              : 'Send link'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No name change requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </DashboardShell>
  );
}

function IdentityResult({ item }: { item: AdminNameChangeRequest }): React.JSX.Element {
  const identity = item.verifiedIdentity;
  return (
    <div className="min-w-48">
      <p
        className={`font-semibold ${item.identityVerificationStatus === 'MATCHED' ? 'text-emerald-700' : item.identityVerificationStatus === 'NOT_CHECKED' ? 'text-muted-foreground' : 'text-red-700'}`}
      >
        {item.identityVerificationStatus.replaceAll('_', ' ')}
      </p>
      {identity ? (
        <>
          <p className="mt-1 font-medium text-foreground">
            {identity.firstName} {identity.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground">
            DOB: {identity.dateOfBirth ?? 'Unavailable'}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Requested name: {item.proposedNameMatches ? 'Match' : 'No match'} · Current name:{' '}
            {item.currentNameMatches ? 'Match' : 'No match'}
          </p>
        </>
      ) : null}
    </div>
  );
}

function Status({ status }: { status: AdminNameChangeRequest['status'] }): React.JSX.Element {
  const styles =
    status === 'COMPLETED'
      ? 'bg-emerald-500/10 text-emerald-700'
      : status === 'LINK_SENT'
        ? 'bg-blue-500/10 text-blue-700'
        : 'bg-amber-500/10 text-amber-700';
  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${styles}`}>
      {status.replace('_', ' ').toLowerCase()}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <article className="app-surface rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </article>
  );
}
