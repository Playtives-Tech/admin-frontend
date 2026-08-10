'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MdAdd, MdCalendarMonth, MdGridView } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { Opportunity, opportunityService } from '@/lib/services/opportunity-service';

export default function OpportunitiesPage(): React.JSX.Element {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    opportunityService
      .list()
      .then(setItems)
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : 'Unable to load opportunities'),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <DashboardShell title="Opportunities" description="Manage platform opportunities">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold">Opportunities</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create, publish and edit member-facing opportunities.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground"
          >
            <MdAdd />
            Create opportunity
          </Link>
        </div>
        {loading ? (
          <div className="p-16 text-center text-sm text-muted-foreground">
            Loading opportunities…
          </div>
        ) : error ? (
          <div className="border-destructive/30 text-destructive rounded-xl border p-6 text-sm">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed">
            <MdGridView className="mb-3 size-8 text-muted-foreground" />
            <h3 className="font-semibold">No opportunities yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first opportunity to begin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
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
                    {item.principalReleaseDate
                      ? new Date(item.principalReleaseDate).toLocaleDateString()
                      : 'No release date'}
                  </span>
                  <Link href={`/opportunities/${item._id}`} className="font-semibold text-brand">
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
