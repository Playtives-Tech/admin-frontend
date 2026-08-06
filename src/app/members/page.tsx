'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MdSearch, MdTune, MdChevronLeft, MdChevronRight, MdVisibility } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { cn } from '@/lib/utils';

// Mock Data
const members = [
  { id: '1', name: 'Sarah Jenkins', email: 'sarah.j@example.com', joined: 'Oct 12, 2025', activeInvestments: 3, totalInvested: 4500000, status: 'Active' },
  { id: '2', name: 'Michael Tosin', email: 'michael.t@example.com', joined: 'Nov 02, 2025', activeInvestments: 1, totalInvested: 100000, status: 'Active' },
  { id: '3', name: 'Zainab Bello', email: 'zainab.b@example.com', joined: 'Nov 15, 2025', activeInvestments: 0, totalInvested: 0, status: 'Pending KYC' },
  { id: '4', name: 'David Olatunji', email: 'david.o@example.com', joined: 'Dec 01, 2025', activeInvestments: 5, totalInvested: 12500000, status: 'Active' },
  { id: '5', name: 'Chika Nnamdi', email: 'chika.n@example.com', joined: 'Jan 10, 2026', activeInvestments: 2, totalInvested: 800000, status: 'Suspended' },
  { id: '6', name: 'Aisha Yekini', email: 'aisha.y@example.com', joined: 'Feb 22, 2026', activeInvestments: 4, totalInvested: 3200000, status: 'Active' },
];

export default function MembersPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
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
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</div>
                {['All', 'Active', 'Pending KYC', 'Suspended'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setStatusFilter(status);
                      setIsFilterOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted",
                      statusFilter === status && "bg-brand/10 text-brand font-medium"
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
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Active Inv.</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Total Invested</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="transition hover:bg-muted/30">
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
                    <td className="px-6 py-4 text-muted-foreground">{member.joined}</td>
                    <td className="px-6 py-4 text-right font-medium">{member.activeInvestments}</td>
                    <td className="px-6 py-4 text-right font-medium">₦{member.totalInvested.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        member.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                        member.status === 'Pending KYC' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      )}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/members/${member.id}`} 
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        <MdVisibility className="size-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-xs text-muted-foreground">Showing 1 to {filteredMembers.length} of 142</p>
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
