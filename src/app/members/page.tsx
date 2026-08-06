'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdSearch, MdTune, MdChevronLeft, MdChevronRight, MdVisibility } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { cn } from '@/lib/utils';
import { getMembers, type AdminMember } from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';

export default function MembersPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getMembers()
      .then(setMembers, (error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Could not load members'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const displayedStatus =
      m.status === 'suspended' ? 'Suspended' : m.emailVerifiedAt ? 'Active' : 'Pending KYC';
    const matchesStatus = statusFilter === 'All' || displayedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardShell title="Members" description="Manage user accounts and portfolios">
      <div className="mx-auto max-w-6xl">
        {/* Header Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <MdSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border bg-background py-2 pl-9 pr-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex w-max items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <MdTune className="size-4" />
              Filter: {statusFilter}
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-xl border bg-surface p-2 shadow-xl">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                {['All', 'Active', 'Pending KYC', 'Suspended'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setIsFilterOpen(false);
                    }}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted',
                      statusFilter === status && 'bg-brand/10 font-medium text-brand',
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="app-surface overflow-hidden rounded-2xl border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">User</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Join Date</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Active Inv.
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Total Invested
                  </th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map((member) => (
                  <tr key={member._id} className="transition hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-heading font-semibold text-brand">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString('en-NG')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">0</td>
                    <td className="px-6 py-4 text-right font-medium">₦0</td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                          member.status === 'active' && member.emailVerifiedAt
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : member.status === 'active'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500',
                        )}
                      >
                        {member.status === 'suspended'
                          ? 'Suspended'
                          : member.emailVerifiedAt
                            ? 'Active'
                            : 'Pending KYC'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/members/${member._id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <MdVisibility className="size-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                      No members match this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-xs text-muted-foreground">
              Showing {filteredMembers.length} members
            </p>
            <div className="flex items-center gap-2">
              <button className="grid size-8 place-items-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <MdChevronLeft className="size-4" />
              </button>
              <button className="grid size-8 place-items-center rounded-lg border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <MdChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
