'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MdArrowBack, MdDeleteForever } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { Opportunity, opportunityService } from '@/lib/services/opportunity-service';

export default function DeleteOpportunityPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity>();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    opportunityService
      .get(id)
      .then(setOpportunity)
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to load opportunity'),
      );
  }, [id]);

  async function remove(): Promise<void> {
    if (!opportunity || confirmation !== opportunity.title) return;
    setDeleting(true);
    try {
      await opportunityService.delete(opportunity._id, opportunity.revision, confirmation);
      notify.success('Opportunity and its Cloudflare asset were deleted.');
      router.replace('/opportunities');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to delete opportunity');
      setDeleting(false);
    }
  }

  return (
    <DashboardShell title="Delete Opportunity" description="Permanent deletion confirmation">
      <div className="mx-auto max-w-xl">
        <Link
          href={opportunity ? `/opportunities/${opportunity._id}` : '/opportunities'}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-brand"
        >
          <MdArrowBack />
          Back to editor
        </Link>
        <section className="rounded-2xl border border-red-500/30 bg-background p-6 shadow-sm sm:p-8">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600">
            <MdDeleteForever className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Permanently delete this opportunity?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This removes the opportunity from Discover immediately and deletes its optimized image
            from Cloudflare R2. This action cannot be undone.
          </p>
          {opportunity ? (
            <>
              <div className="mt-6 rounded-xl bg-muted p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground">Opportunity</p>
                <p className="mt-1 font-semibold">{opportunity.title}</p>
              </div>
              <label className="mt-6 grid gap-2 text-sm font-medium">
                Type <strong>{opportunity.title}</strong> to confirm
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                  className="rounded-xl border bg-background px-3 py-2.5 outline-none focus:border-red-500"
                />
              </label>
              <button
                type="button"
                disabled={deleting || confirmation !== opportunity.title}
                onClick={() => void remove()}
                className="mt-6 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? 'Deleting opportunity and asset…' : 'Delete permanently'}
              </button>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Loading opportunity…</p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
