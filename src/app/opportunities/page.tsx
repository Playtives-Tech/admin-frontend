'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdAdd, MdGridView, MdCalendarMonth } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { api } from '@/lib/api';

interface Opportunity {
  _id: string;
  name: string;
  type: string;
  summary: string;
  about: string;
  pricePerUnit: number;
  minUnits: number;
  unitsAvailable: number;
  positionsTotal: number;
  maxPositionsPerMember: number;
  duration: string;
  projectedMonthlyProfit: string;
  projectedTotalProfit: string;
  distributionFrequency: string;
  ownershipModel: string;
  rollover: boolean;
  principalReleaseDate: string;
  location: string;
  operator: string;
  status: string;
  images: string[];
  alt: string;
}

export default function OpportunitiesPage(): React.JSX.Element {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const data = await api<Opportunity[]>('/opportunities');
        setOpportunities(data);
      } catch (error) {
        console.error('Failed to fetch opportunities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunities();
  }, []);

  return (
    <DashboardShell title="Opportunities" description="Manage platform opportunities">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Opportunities</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage investment opportunities.
            </p>
          </div>
          <Link
            href="/opportunities/new"
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-90"
          >
            <MdAdd className="size-4" />
            Create opportunity
          </Link>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed">
            <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : opportunities.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20">
            <MdGridView className="mb-4 size-8 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">No opportunities yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first opportunity.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp) => (
              <div key={opp._id} className="app-surface group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm transition hover:border-brand/35 hover:shadow-md">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
                      {opp.type}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${opp.status === 'Published' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {opp.status}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-semibold line-clamp-2">{opp.name}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price/Unit</p>
                      <p className="mt-1 text-sm font-medium">₦{opp.pricePerUnit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available</p>
                      <p className="mt-1 text-sm font-medium">{opp.unitsAvailable.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                  <MdCalendarMonth className="size-3.5" />
                  Release: {new Date(opp.principalReleaseDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
