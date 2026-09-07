'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, Plus, TicketCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/shell';
import {
  generateMemberCodes,
  getMemberCodes,
  type MemberCode,
} from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';

export default function MemberCodesPage(): React.JSX.Element {
  const [codes, setCodes] = useState<MemberCode[]>([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setCodes((await getMemberCodes({ page: 1, limit: 100, search, status })).items);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load member codes');
    } finally {
      setLoading(false);
    }
  }, [search, status]);
  useEffect(() => {
    void load();
  }, [load]);

  const generate = async (): Promise<void> => {
    setGenerating(true);
    try {
      const created = await generateMemberCodes(count);
      notify.success(`${created.length} member code${created.length === 1 ? '' : 's'} generated`);
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not generate member codes');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardShell
      title="Member Codes"
      description="Generate invitation codes and track the member attached to every code."
    >
      <div className="space-y-5">
        <section className="app-surface rounded-xl border p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-brand/10 text-brand">
                <TicketCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Generate new codes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Codes follow the sequential format PLY-001-BE5 and can only be used once.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(event) =>
                  setCount(Math.min(100, Math.max(1, Number(event.target.value))))
                }
                className="h-10 w-24 rounded-lg border bg-background px-3 text-sm"
              />
              <button
                onClick={() => void generate()}
                disabled={generating}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Plus className="size-4" />
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </section>
        <section className="app-surface rounded-xl border p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void load();
              }}
            >
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value.toUpperCase())}
                placeholder="Search member code"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              />
            </form>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-lg border bg-background px-3 pr-9 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="ASSIGNED">Assigned</option>
            </select>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3">Code</th>
                  <th>Status</th>
                  <th>Assigned member</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {codes.map((item) => (
                  <tr key={item._id} className="border-b last:border-0">
                    <td className="py-4 font-mono font-semibold">{item.code}</td>
                    <td>
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.userId ? (
                        <div>
                          <p className="font-medium">{item.userId.name}</p>
                          <p className="text-xs text-muted-foreground">{item.userId.email}</p>
                        </div>
                      ) : (
                        (item.reservedForEmail ?? '—')
                      )}
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        aria-label={`Copy ${item.code}`}
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(item.code)
                            .then(() => notify.success('Member code copied'))
                        }
                        className="rounded-md p-2 hover:bg-muted"
                      >
                        <Copy className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Loading member codes…
              </p>
            ) : !codes.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No member codes found.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
