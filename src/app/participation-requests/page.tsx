'use client';

import Link from 'next/link';
import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getParticipationAccessRequests,
  reviewParticipationAccessRequest,
  type ParticipationAccessRequest,
} from '@/lib/services/member-operations-service';

type Filter = 'ALL' | ParticipationAccessRequest['status'];

export default function ParticipationRequestsPage(): React.JSX.Element {
  const [items, setItems] = useState<ParticipationAccessRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<ParticipationAccessRequest | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (): void => {
    void getParticipationAccessRequests(filter)
      .then(setItems)
      .catch(() => notify.error('Could not load participation requests'));
  };

  useEffect(load, [filter]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [item.userId.name, item.userId.email, item.userId.phone, item.userId.memberCode]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [items, search]);

  const openReview = (
    request: ParticipationAccessRequest,
    nextDecision: 'APPROVED' | 'REJECTED',
  ): void => {
    setReviewing(request);
    setDecision(nextDecision);
    setNote('');
  };

  const submitReview = async (): Promise<void> => {
    if (!reviewing) return;
    setSaving(true);
    try {
      await reviewParticipationAccessRequest(reviewing._id, {
        decision,
        note: note.trim() || undefined,
      });
      notify.success(decision === 'APPROVED' ? 'Participation access approved' : 'Request rejected');
      setReviewing(null);
      load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not review this request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Participation Requests"
      description="Review pending members before wallet funding and opportunity participation are enabled"
    >
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="app-surface rounded-xl border p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, phone, or member code"
                className="h-11 w-full rounded-xl border bg-background pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${filter === value ? 'border-brand bg-brand text-white' : 'bg-background hover:bg-muted'}`}
                >
                  {label(value)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="app-surface overflow-hidden rounded-xl border">
          {visible.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Clock3 className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold">No participation requests found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                New requests from pending members will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visible.map((item) => (
                <article
                  key={item._id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_.8fr_1fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/members/${item.userId._id}`}
                      className="font-semibold hover:text-brand"
                    >
                      {item.userId.name}
                    </Link>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.userId.email}
                    </p>
                    {item.userId.memberCode ? (
                      <p className="mt-1 font-mono text-[11px] font-semibold text-brand">
                        {item.userId.memberCode}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <StatusBadge status={item.status} />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Requested {new Date(item.createdAt).toLocaleDateString('en-NG')}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {item.message || 'No additional message was provided.'}
                  </p>
                  <div className="flex gap-2 lg:justify-end">
                    {item.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openReview(item, 'REJECTED')}
                          className="h-9 rounded-lg border border-red-500/25 px-3 text-xs font-semibold text-red-600 hover:bg-red-500/[0.05]"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => openReview(item, 'APPROVED')}
                          className="h-9 rounded-lg bg-brand px-3 text-xs font-semibold text-white"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/members/${item.userId._id}`}
                        className="inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
                      >
                        View member
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {reviewing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            className="app-surface w-full max-w-md rounded-2xl border p-5 shadow-xl sm:p-6"
          >
            <h2 className="text-lg font-semibold">
              {decision === 'APPROVED' ? 'Approve participation access?' : 'Reject this request?'}
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {decision === 'APPROVED'
                ? `${reviewing.userId.name} will be able to fund their wallet and participate in an open opportunity.`
                : `${reviewing.userId.name} will remain restricted and may submit another request later.`}
            </p>
            <label htmlFor="review-note" className="mt-5 block text-xs font-semibold">
              Review note <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="review-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={500}
              className="mt-2 w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setReviewing(null)}
                className="h-10 rounded-lg border px-4 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitReview()}
                className={`h-10 rounded-lg px-4 text-xs font-semibold text-white disabled:opacity-60 ${decision === 'APPROVED' ? 'bg-brand' : 'bg-red-600'}`}
              >
                {saving ? 'Saving…' : decision === 'APPROVED' ? 'Approve access' : 'Reject request'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: ParticipationAccessRequest['status'] }): React.JSX.Element {
  const icon =
    status === 'APPROVED' ? (
      <CheckCircle2 className="size-3.5" />
    ) : status === 'REJECTED' ? (
      <XCircle className="size-3.5" />
    ) : (
      <Clock3 className="size-3.5" />
    );
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700' : status === 'REJECTED' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700'}`}
    >
      {icon} {label(status)}
    </span>
  );
}

function label(value: Filter): string {
  if (value === 'ALL') return 'All';
  return value.charAt(0) + value.slice(1).toLowerCase();
}
