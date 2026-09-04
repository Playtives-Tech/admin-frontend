'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { MdArrowBack, MdEmail, MdPhone, MdPublic, MdLock, MdLockOpen } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getMember,
  getMemberWallet,
  creditMemberEarnings,
  type AdminMember,
  type AdminWalletSummary,
  updateMemberStatus,
} from '@/lib/services/member-operations-service';
import {
  acquisitionService,
  hasVariableProjectedDistribution,
  projectedDistributionLabel,
  projectedDistributionSupportingText,
  projectedReturnForAcquisition,
  type AdminAcquisition,
} from '@/lib/services/acquisition-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value / 100);

export default function MemberDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<AdminMember | null>(null);
  const [wallet, setWallet] = useState<AdminWalletSummary | null>(null);
  const [ownerships, setOwnerships] = useState<AdminAcquisition[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReference, setCreditReference] = useState('');
  const [crediting, setCrediting] = useState(false);

  useEffect(() => {
    void Promise.all([getMember(id), getMemberWallet(id), acquisitionService.list()])
      .then(([memberResult, walletResult, allOwnerships]) => {
        setMember(memberResult);
        setWallet(walletResult);
        setOwnerships(allOwnerships.filter((item) => item.userId._id === id));
      })
      .catch(() => notify.error('Could not load this member'));
  }, [id]);

  const totals = useMemo(
    () => ({
      invested: ownerships.reduce((total, item) => total + item.amountMinorUnits, 0),
      expected: ownerships.reduce(
        (total, item) => total + (hasVariableProjectedDistribution(item) ? 0 : projectedReturnForAcquisition(item)),
        0,
      ),
    }),
    [ownerships],
  );
  const changeStatus = async () => {
    if (!member) return;
    const status = member.status === 'active' ? 'suspended' : 'active';
    setSavingStatus(true);
    try {
      setMember(await updateMemberStatus(member._id, status));
      notify.success(status === 'active' ? 'Member reactivated' : 'Member suspended');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update member status');
    } finally {
      setSavingStatus(false);
    }
  };
  const creditBalance = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const amountMinorUnits = Math.round(Number(creditAmount) * 100);
    const reference = creditReference.trim();
    if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits < 1 || !reference) {
      notify.error('Enter a valid credit amount and a unique reference');
      return;
    }
    setCrediting(true);
    try {
      setWallet(await creditMemberEarnings(id, { amountMinorUnits, reference }));
      setCreditAmount('');
      setCreditReference('');
      notify.success('Member earnings balance credited');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not credit the member balance');
    } finally {
      setCrediting(false);
    }
  };

  return (
    <DashboardShell title="Member" description="Account details and ownership summary.">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link href="/members" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <MdArrowBack className="size-4" /> Back to members
        </Link>
        {!member ? <p className="text-sm text-muted-foreground">Loading member…</p> : (
          <>
            <section className="app-surface flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-brand/10 text-base font-semibold text-brand">{member.name.charAt(0)}</span>
                <div>
                  <h1 className="text-lg font-semibold">{member.name}</h1>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MdEmail />{member.email}</span>
                    {member.phone ? <span className="inline-flex items-center gap-1"><MdPhone />{member.phone}</span> : null}
                    {member.country ? <span className="inline-flex items-center gap-1"><MdPublic />{member.country}</span> : null}
                  </div>
                </div>
              </div>
              <button disabled={savingStatus} onClick={() => void changeStatus()} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50">
                {member.status === 'active' ? <MdLock className="size-4" /> : <MdLockOpen className="size-4" />}
                {member.status === 'active' ? 'Suspend member' : 'Reactivate member'}
              </button>
            </section>

            <section className="grid gap-3 sm:grid-cols-4">
              <Metric label="Wallet balance" value={money(wallet?.totalAvailableBalanceMinorUnits ?? 0)} />
              <Metric label="Ownerships" value={String(ownerships.length)} />
              <Metric label="Amount invested" value={money(totals.invested)} />
              <Metric label="Fixed projected returns" value={money(totals.expected)} />
            </section>

            <section className="app-surface rounded-xl border p-5">
              <h2 className="text-sm font-semibold">Credit member balance</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Credits the member’s withdrawable earnings balance immediately. Use a unique reference; the same reference cannot be applied twice.</p>
              <form onSubmit={(event) => void creditBalance(event)} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] sm:items-end">
                <label className="grid gap-1.5 text-xs font-semibold">Amount (₦)<input required min="0.01" step="0.01" type="number" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="0.00" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal" /></label>
                <label className="grid gap-1.5 text-xs font-semibold">Unique reference<input required maxLength={150} value={creditReference} onChange={(event) => setCreditReference(event.target.value)} placeholder="e.g. MANUAL-PAYOUT-20260904-001" className="h-10 rounded-lg border bg-background px-3 text-sm font-normal" /></label>
                <button disabled={crediting} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">{crediting ? 'Crediting…' : 'Credit balance'}</button>
              </form>
            </section>

            <section className="app-surface rounded-xl border p-5"><h2 className="text-sm font-semibold">Next of Kin</h2>{member.nextOfKin ? <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Name:</span> {member.nextOfKin.fullName}</p><p><span className="text-muted-foreground">Relationship:</span> {member.nextOfKin.relationship}</p><p><span className="text-muted-foreground">Phone:</span> {member.nextOfKin.phone}</p><p><span className="text-muted-foreground">Email:</span> {member.nextOfKin.email ?? '—'}</p>{member.nextOfKin.address ? <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {member.nextOfKin.address}</p> : null}</div> : <p className="mt-2 text-sm text-muted-foreground">No Next of Kin details added.</p>}</section>

            <section className="app-surface overflow-x-auto rounded-xl border">
              <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Ownerships</h2><p className="mt-1 text-xs text-muted-foreground">Earnings are approved from the Payouts section after completion.</p></div>
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b bg-muted/30 text-muted-foreground"><tr>{['Opportunity', 'Units', 'Invested', 'Projected distribution', 'Status', 'Created', 'Maturity'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y">
                  {ownerships.map((item) => <tr key={item._id}><td className="px-4 py-3 font-medium">{item.opportunityId.title}</td><td className="px-4 py-3">{item.units}</td><td className="px-4 py-3">{money(item.amountMinorUnits)}</td><td className="px-4 py-3"><p className="font-medium text-brand">{projectedDistributionLabel(item)}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{projectedDistributionSupportingText(item)}</p></td><td className="px-4 py-3">{item.status.toLowerCase()}</td><td className="px-4 py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString('en-NG')}</td><td className="px-4 py-3 text-muted-foreground">{item.maturityAt ? new Date(item.maturityAt).toLocaleDateString('en-NG') : '—'}</td></tr>)}
                  {ownerships.length === 0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">This member has no ownerships yet.</td></tr> : null}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="app-surface rounded-xl border p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-base font-semibold">{value}</p></article>;
}
