'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { useAuth } from '@/components/providers/auth-provider';
import { notify } from '@/lib/notify';
import {
  listAdministrators,
  searchAdministratorCandidates,
  setAdministratorAccess,
  type Administrator,
} from '@/lib/services/administrator-service';

export default function AdministratorsPage(): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [candidates, setCandidates] = useState<Administrator[]>([]);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setAdministrators(await listAdministrators());
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not load administrators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  async function findCandidates(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (search.trim().length < 2) return;
    try {
      setCandidates(await searchAdministratorCandidates(search.trim()));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not search members');
    }
  }

  async function changeAccess(candidate: Administrator, enabled: boolean): Promise<void> {
    if (!password) {
      notify.error('Enter your current password before changing access');
      return;
    }
    if (!window.confirm(`${enabled ? 'Grant' : 'Revoke'} administrator access for ${candidate.email}? Their current session will be invalidated.`)) return;
    setBusyId(candidate._id);
    try {
      await setAdministratorAccess(candidate._id, enabled, password);
      setPassword('');
      notify.success(enabled ? 'Administrator access granted' : 'Administrator access revoked');
      setCandidates([]);
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not change access');
    } finally {
      setBusyId('');
    }
  }

  return (
    <DashboardShell title="Administrators" description="Manage staff access to the Playtives admin workspace.">
      {!isSuperAdmin ? (
        <p role="alert" className="rounded-xl border p-6 text-sm text-muted-foreground">Super administrator access is required.</p>
      ) : (
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="app-surface rounded-2xl border p-5">
            <h2 className="font-semibold">Current administrators</h2>
            <p className="mt-1 text-sm text-muted-foreground">Only active super administrators may change staff access. Super administrator status is managed through a separate controlled procedure.</p>
            <label className="mt-4 block text-sm font-semibold">Confirm your current password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full max-w-md rounded-xl border bg-background px-4 py-2.5 text-sm" /></label>
            {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : null}
            <div className="mt-4 divide-y">
              {administrators.map((administrator) => {
                const superAdmin = administrator.roles.includes('SUPER_ADMIN');
                return <div key={administrator._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="font-semibold">{administrator.name}</p><p className="break-all text-xs text-muted-foreground">{administrator.email} · {superAdmin ? 'Super admin' : 'Admin'} · {administrator.status}</p></div>
                  {!superAdmin && administrator._id !== user?.sub ? <button type="button" disabled={busyId === administrator._id} onClick={() => void changeAccess(administrator, false)} className="rounded-lg border px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50">Revoke access</button> : null}
                </div>;
              })}
            </div>
          </section>
          <section className="app-surface rounded-2xl border p-5">
            <h2 className="font-semibold">Grant administrator access</h2>
            <p className="mt-1 text-sm text-muted-foreground">Search an existing active member account. Access takes effect after they sign in again.</p>
            <form onSubmit={(event) => void findCandidates(event)} className="mt-4 flex flex-wrap gap-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} minLength={2} aria-label="Search member by name or email" placeholder="Search name or email" className="min-w-52 flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm" />
              <button type="submit" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Search</button>
            </form>
            <div className="mt-4 divide-y">
              {candidates.map((candidate) => <div key={candidate._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="font-semibold">{candidate.name}</p><p className="break-all text-xs text-muted-foreground">{candidate.email} · {candidate.status}</p></div>
                {candidate.status === 'active' && !candidate.roles.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN') ? <button type="button" disabled={busyId === candidate._id} onClick={() => void changeAccess(candidate, true)} className="rounded-lg border border-brand/30 px-3 py-2 text-xs font-semibold text-brand disabled:opacity-50">Grant admin access</button> : null}
              </div>)}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
