'use client';

import Link from 'next/link';
import { ArrowLeft, Search, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getUninvestedMemberBalances,
  type UninvestedMemberBalance,
} from '@/lib/services/member-operations-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function UninvestedBalancesPage(): React.JSX.Element {
  const [items, setItems] = useState<UninvestedMemberBalance[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUninvestedMemberBalances({ page, limit: 20, search });
      setItems(result.items);
      setTotalBalance(result.totalBalanceMinorUnits);
      setPagination(result.pagination);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load member balances');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <DashboardShell
      title="Uninvested user balances"
      description="Track available deposit and earnings balances that members and administrators have not invested or withdrawn."
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <Link href="/overview" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="size-4" /> Back to overview
        </Link>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="app-surface rounded-2xl border p-5">
            <p className="text-xs font-semibold text-muted-foreground">Total uninvested balance</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{money(totalBalance)}</p>
          </div>
          <div className="app-surface rounded-2xl border p-5">
            <p className="text-xs font-semibold text-muted-foreground">Users with a balance</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{pagination.totalItems.toLocaleString()}</p>
          </div>
        </section>

        <section className="app-surface overflow-hidden rounded-2xl border">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">User balance breakdown</h2>
              <p className="mt-1 text-xs text-muted-foreground">Deposit balance plus available earnings for each member or administrator.</p>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, or member code" className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm" />
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  {['User', 'Account type', 'Member code', 'Deposit balance', 'Earnings balance', 'Total uninvested'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/members/${item._id}`} className="font-semibold text-foreground hover:text-brand hover:underline">{item.name}</Link>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{item.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold">{item.roles.includes('ADMIN') ? 'Administrator' : 'Member'}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{item.memberCode ?? '—'}</td>
                    <td className="px-4 py-3">{money(item.depositBalanceMinorUnits)}</td>
                    <td className="px-4 py-3">{money(item.earningsBalanceMinorUnits)}</td>
                    <td className="px-4 py-3 font-semibold text-brand">{money(item.uninvestedBalanceMinorUnits)}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground"><WalletCards className="mx-auto mb-2 size-6" />No users with an uninvested balance found.</td></tr> : null}
                {loading ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Loading balances…</td></tr> : null}
              </tbody>
            </table>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 font-semibold text-foreground disabled:opacity-40">Previous</button>
              <button type="button" disabled={loading || page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 font-semibold text-foreground disabled:opacity-40">Next</button>
            </div>
          </footer>
        </section>
      </div>
    </DashboardShell>
  );
}
