'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MdAdd, MdCalendarMonth, MdDeleteOutline, MdGridView } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { useAuth } from '@/components/providers/auth-provider';
import { Opportunity, opportunityService } from '@/lib/services/opportunity-service';

export default function OpportunitiesPage(): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const load = () =>
      opportunityService
        .list()
        .then(setItems)
        .catch((value: unknown) =>
          setError(value instanceof Error ? value.message : 'Unable to load opportunities'),
        )
        .finally(() => setLoading(false));
    void load();
    return opportunityService.subscribe(() => void load());
  }, []);
  const standardItems = items.filter((item) => !item.historicalOnly);
  const historicalItems = items.filter((item) => item.historicalOnly);
  return (
    <DashboardShell title="Opportunities" description="Manage platform opportunities">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-sans text-3xl font-semibold">Opportunities</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create, publish and edit member-facing opportunities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/opportunities/legacy/new"
              className="flex items-center gap-2 rounded-xl border border-brand px-4 py-2.5 text-sm font-semibold text-brand"
            >
              <MdAdd /> Historical opportunity
            </Link>
            <Link
              href="/opportunities/new"
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
            >
              <MdAdd />
              Create opportunity
            </Link>
          </div>
        </div>
        {loading ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            Loading opportunities…
          </div>
        ) : error ? (
          <div className="border-destructive/30 text-destructive rounded-xl border p-6 text-sm">
            {error}
          </div>
        ) : standardItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed">
            <MdGridView className="mb-3 size-8 text-muted-foreground" />
            <h3 className="font-semibold">No public opportunities yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a public opportunity to begin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {standardItems.map((item) => (
              <article
                key={item._id}
                className="app-surface overflow-hidden rounded-2xl border p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase text-brand">
                    {item.category}
                  </span>
                  <span
                    className={
                      item.status === 'PUBLISHED'
                        ? 'text-xs font-bold text-emerald-600'
                        : 'text-xs font-bold text-amber-600'
                    }
                  >
                    {item.status}
                  </span>
                </div>
                <h2 className="mt-4 line-clamp-2 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Unit price</p>
                    <p className="font-semibold">
                      ₦{(item.pricePerUnitMinorUnits / 100).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available</p>
                    <p className="font-semibold">{item.availableUnits.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MdCalendarMonth />
                    {item.offerClosesAt
                      ? `Closes ${new Date(item.offerClosesAt).toLocaleDateString()}`
                      : item.memberAvailabilityDate
                        ? `Opens ${new Date(item.memberAvailabilityDate).toLocaleDateString()}`
                        : 'Offer dates required'}
                  </span>
                  <span className="flex items-center gap-3">
                    <Link href={`/opportunities/${item._id}`} className="font-semibold text-brand">
                      Edit
                    </Link>
                    {isSuperAdmin ? <Link
                      href={`/opportunities/${item._id}/delete`}
                      aria-label={`Delete ${item.title}`}
                      className="text-red-600"
                    >
                      <MdDeleteOutline />
                    </Link> : null}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
        <section className="mt-10 border-t pt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Historical opportunities</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Full opportunities for legacy ownerships; visible only to assigned members.
              </p>
            </div>
            <Link href="/opportunities/legacy/new" className="text-sm font-semibold text-brand">
              Create historical opportunity
            </Link>
          </div>
          {historicalItems.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No historical opportunities created yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {historicalItems.map((item) => (
                <div key={item._id} className="rounded-2xl border bg-background p-5">
                  <span className="text-xs font-bold uppercase text-brand">
                    Historical · NGN
                  </span>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-4 flex gap-4 text-sm font-semibold text-brand">
                    <Link href={`/opportunities/${item._id}`}>Edit details</Link>
                    <Link href="/legacy">Assign ownership →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}
