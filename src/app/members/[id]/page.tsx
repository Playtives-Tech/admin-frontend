'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  MdAddBusiness,
  MdArrowBack,
  MdEmail,
  MdPhone,
  MdPublic,
  MdLock,
  MdLockOpen,
  MdCheckCircle,
  MdRadioButtonUnchecked,
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  getMember,
  getMemberWallet,
  creditMemberBalance,
  debitMemberBalance,
  getMemberTransactionHistory,
  type AdminMember,
  type AdminWalletSummary,
  type MemberTransactionHistoryItem,
  updateMembershipStatus,
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
import { opportunityService, type Opportunity } from '@/lib/services/opportunity-service';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function MemberDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<AdminMember | null>(null);
  const [wallet, setWallet] = useState<AdminWalletSummary | null>(null);
  const [ownerships, setOwnerships] = useState<AdminAcquisition[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<MemberTransactionHistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState<
    'ALL' | MemberTransactionHistoryItem['category']
  >('ALL');
  const [savingStatus, setSavingStatus] = useState(false);
  const [selectedMemberStatus, setSelectedMemberStatus] = useState<
    AdminMember['memberStatus'] | ''
  >('');
  const [memberStatusReason, setMemberStatusReason] = useState('');
  const [savingMemberStatus, setSavingMemberStatus] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReference, setCreditReference] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [crediting, setCrediting] = useState(false);
  const [debitAmount, setDebitAmount] = useState('');
  const [debitReference, setDebitReference] = useState('');
  const [debitReason, setDebitReason] = useState('');
  const [debitConfirmed, setDebitConfirmed] = useState(false);
  const [debiting, setDebiting] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [assignmentOpportunityId, setAssignmentOpportunityId] = useState('');
  const [assignmentUnits, setAssignmentUnits] = useState('1');
  const [assignmentAmount, setAssignmentAmount] = useState('');
  const [assignmentReference, setAssignmentReference] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [assignmentRollover, setAssignmentRollover] = useState<'PAYOUT' | 'COMPOUND'>('PAYOUT');
  const [assignmentConfirmed, setAssignmentConfirmed] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    void Promise.all([
      getMember(id),
      getMemberWallet(id),
      acquisitionService.list(),
      opportunityService.list(),
      getMemberTransactionHistory(id),
    ])
      .then(([memberResult, walletResult, allOwnerships, opportunityResults, history]) => {
        setMember(memberResult);
        setSelectedMemberStatus(memberResult.memberStatus);
        setWallet(walletResult);
        setOwnerships(allOwnerships.filter((item) => item.userId._id === id));
        setOpportunities(opportunityResults.filter(isManuallyAssignable));
        setTransactionHistory(history);
      })
      .catch(() => notify.error('Could not load this member'));
  }, [id]);

  const totals = useMemo(
    () => ({
      invested: ownerships.reduce((total, item) => total + item.amountMinorUnits, 0),
      expected: ownerships.reduce(
        (total, item) =>
          total +
          (hasVariableProjectedDistribution(item) ? 0 : projectedReturnForAcquisition(item)),
        0,
      ),
    }),
    [ownerships],
  );
  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item._id === assignmentOpportunityId) ?? null,
    [assignmentOpportunityId, opportunities],
  );
  const kycCompletedSteps = member
    ? Number.isInteger(member.kycCompletedSteps)
      ? member.kycCompletedSteps
      : [member.bvnVerifiedAt, member.ninVerifiedAt, member.phoneVerifiedAt].filter(Boolean).length
    : 0;
  const kycComplete = kycCompletedSteps === 3;
  const visibleHistory = useMemo(
    () =>
      historyFilter === 'ALL'
        ? transactionHistory
        : transactionHistory.filter((item) => item.category === historyFilter),
    [historyFilter, transactionHistory],
  );
  const refreshTransactionHistory = async (): Promise<void> => {
    setTransactionHistory(await getMemberTransactionHistory(id));
  };
  const changeStatus = async () => {
    if (!member) return;
    const status = member.status === 'active' ? 'suspended' : 'active';
    setSavingStatus(true);
    try {
      const updated = await updateMemberStatus(member._id, status);
      setMember((current) => (current ? { ...current, ...updated } : updated));
      notify.success(status === 'active' ? 'Member reactivated' : 'Member suspended');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update member status');
    } finally {
      setSavingStatus(false);
    }
  };
  const changeMembershipStatus = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!member || !selectedMemberStatus || selectedMemberStatus === member.memberStatus) return;
    const reason = memberStatusReason.trim();
    if (reason.length < 3) {
      notify.error('Enter a short reason for changing the membership status');
      return;
    }
    if (
      !window.confirm(
        `Change ${member.name} from ${member.memberStatus} to ${selectedMemberStatus}?`,
      )
    )
      return;
    setSavingMemberStatus(true);
    try {
      const updated = await updateMembershipStatus(member._id, {
        memberStatus: selectedMemberStatus,
        reason,
      });
      setMember(updated);
      setSelectedMemberStatus(updated.memberStatus);
      setMemberStatusReason('');
      await refreshTransactionHistory();
      notify.success(`Membership status changed to ${updated.memberStatus}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update membership status');
    } finally {
      setSavingMemberStatus(false);
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
      if (creditReason.trim().length < 3) {
        notify.error('Enter the reason or payment context for this credit');
        return;
      }
      setWallet(
        await creditMemberBalance(id, {
          amountMinorUnits,
          reference,
          reason: creditReason.trim(),
        }),
      );
      setCreditAmount('');
      setCreditReference('');
      setCreditReason('');
      await refreshTransactionHistory();
      notify.success('Member wallet balance credited');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not credit the member balance');
    } finally {
      setCrediting(false);
    }
  };
  const debitBalance = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const amountMinorUnits = Math.round(Number(debitAmount) * 100);
    const reference = debitReference.trim();
    const reason = debitReason.trim();
    if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits < 1 || !reference) {
      notify.error('Enter a valid debit amount and a unique reference');
      return;
    }
    if (reason.length < 3) {
      notify.error('Enter a clear reason for this wallet debit');
      return;
    }
    if (amountMinorUnits > (wallet?.totalAvailableBalanceMinorUnits ?? 0)) {
      notify.error('The debit amount exceeds the member’s available wallet balance');
      return;
    }
    if (!debitConfirmed) {
      notify.error('Confirm that you have reviewed this wallet debit');
      return;
    }
    setDebiting(true);
    try {
      setWallet(await debitMemberBalance(id, { amountMinorUnits, reference, reason }));
      setDebitAmount('');
      setDebitReference('');
      setDebitReason('');
      setDebitConfirmed(false);
      await refreshTransactionHistory();
      notify.success('Member wallet balance debited');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not debit the member balance');
    } finally {
      setDebiting(false);
    }
  };
  const chooseAssignmentOpportunity = (opportunityId: string): void => {
    const opportunity = opportunities.find((item) => item._id === opportunityId);
    setAssignmentOpportunityId(opportunityId);
    setAssignmentUnits('1');
    setAssignmentAmount(opportunity ? String(opportunity.pricePerUnitMinorUnits / 100) : '');
    setAssignmentRollover('PAYOUT');
    setAssignmentConfirmed(false);
  };
  const changeAssignmentUnits = (value: string): void => {
    setAssignmentUnits(value);
    const units = Number(value);
    if (selectedOpportunity && Number.isInteger(units) && units > 0)
      setAssignmentAmount(String((selectedOpportunity.pricePerUnitMinorUnits * units) / 100));
  };
  const assignOwnership = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const units = Number(assignmentUnits);
    const amountMinorUnits = Math.round(Number(assignmentAmount) * 100);
    const reference = assignmentReference.trim();
    if (
      !selectedOpportunity ||
      !Number.isInteger(units) ||
      units < 1 ||
      units > selectedOpportunity.availableUnits ||
      !Number.isSafeInteger(amountMinorUnits) ||
      amountMinorUnits < 1 ||
      !reference ||
      !assignmentConfirmed
    ) {
      notify.error('Review the opportunity, available units, amount, and unique reference');
      return;
    }
    setAssigning(true);
    try {
      await acquisitionService.assignManual({
        userId: id,
        opportunityId: selectedOpportunity._id,
        units,
        amountMinorUnits,
        opportunityRevision: selectedOpportunity.revision,
        reference,
        note: assignmentNote.trim() || undefined,
        rolloverElection: assignmentRollover,
      });
      const [allOwnerships, opportunityResults] = await Promise.all([
        acquisitionService.list(),
        opportunityService.list(),
      ]);
      setOwnerships(allOwnerships.filter((item) => item.userId._id === id));
      setOpportunities(opportunityResults.filter(isManuallyAssignable));
      setAssignmentOpportunityId('');
      setAssignmentUnits('1');
      setAssignmentAmount('');
      setAssignmentReference('');
      setAssignmentNote('');
      setAssignmentRollover('PAYOUT');
      setAssignmentConfirmed(false);
      await refreshTransactionHistory();
      notify.success('Ownership assigned without debiting the member wallet');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not assign this ownership');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <DashboardShell title="Member" description="Account details and ownership summary.">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href="/members"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <MdArrowBack className="size-4" /> Back to members
        </Link>
        {!member ? (
          <p className="text-sm text-muted-foreground">Loading member…</p>
        ) : (
          <>
            <section className="app-surface flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-brand/10 text-base font-semibold text-brand">
                  {member.name.charAt(0)}
                </span>
                <div>
                  <h1 className="text-lg font-semibold">{member.name}</h1>
                  {member.memberCode ? (
                    <p className="mt-1 font-mono text-xs font-semibold text-brand">
                      {member.memberCode}
                    </p>
                  ) : null}
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      member.memberStatus === 'active'
                        ? 'bg-brand/10 text-brand'
                        : member.memberStatus === 'pending'
                          ? 'bg-amber-500/10 text-amber-700'
                          : 'bg-sky-500/10 text-sky-600'
                    }`}
                  >
                    {member.memberStatus === 'active'
                      ? 'Active member'
                      : member.memberStatus === 'pending'
                        ? member.participationAccessApproved
                          ? 'Pending · participation approved'
                          : 'Pending · participation locked'
                        : 'Community member'}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MdEmail />
                      {member.email}
                    </span>
                    {member.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <MdPhone />
                        {member.phone}
                      </span>
                    ) : null}
                    {member.country ? (
                      <span className="inline-flex items-center gap-1">
                        <MdPublic />
                        {member.country}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                disabled={savingStatus}
                onClick={() => void changeStatus()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
              >
                {member.status === 'active' ? (
                  <MdLock className="size-4" />
                ) : (
                  <MdLockOpen className="size-4" />
                )}
                {member.status === 'active' ? 'Suspend member' : 'Reactivate member'}
              </button>
            </section>

            <section className="app-surface rounded-xl border p-5">
              <div>
                <h2 className="text-sm font-semibold">Membership access</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Community members cannot enter the dashboard, pending members have restricted
                  access, and active members have full member access.
                </p>
              </div>
              <form
                className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] lg:items-end"
                onSubmit={(event) => void changeMembershipStatus(event)}
              >
                <label className="grid gap-1.5 text-xs font-semibold">
                  Member status
                  <select
                    value={selectedMemberStatus}
                    onChange={(event) =>
                      setSelectedMemberStatus(event.target.value as AdminMember['memberStatus'])
                    }
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-medium outline-none focus:border-brand"
                  >
                    <option value="community">Community</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Reason for change
                  <input
                    value={memberStatusReason}
                    onChange={(event) => setMemberStatusReason(event.target.value)}
                    placeholder="Why is this status being changed?"
                    maxLength={500}
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:border-brand"
                  />
                </label>
                <button
                  type="submit"
                  disabled={
                    savingMemberStatus ||
                    !selectedMemberStatus ||
                    selectedMemberStatus === member.memberStatus
                  }
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-xs font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingMemberStatus ? 'Updating…' : 'Update status'}
                </button>
              </form>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Members with active or completed ownerships cannot be moved back to community or
                pending status.
              </p>
            </section>

            <section className="app-surface rounded-xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">KYC verification</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    BVN, NIN, and Nigerian phone verification progress.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    kycComplete
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}
                >
                  {kycCompletedSteps}/3 completed
                </span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(kycCompletedSteps / 3) * 100}%` }}
                />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <KycStep label="BVN verified" verifiedAt={member.bvnVerifiedAt} />
                <KycStep label="NIN verified" verifiedAt={member.ninVerifiedAt} />
                <KycStep label="Phone verified" verifiedAt={member.phoneVerifiedAt} />
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-4">
              <Metric
                label="Wallet balance"
                value={money(wallet?.totalAvailableBalanceMinorUnits ?? 0)}
              />
              <Metric label="Ownerships" value={String(ownerships.length)} />
              <Metric label="Amount invested" value={money(totals.invested)} />
              <Metric label="Fixed projected returns" value={money(totals.expected)} />
            </section>

            <section className="app-surface overflow-hidden rounded-xl border">
              <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Transaction history</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deposits, wallet adjustments, ownership activity, payouts, and account actions.
                  </p>
                </div>
                <select
                  value={historyFilter}
                  onChange={(event) =>
                    setHistoryFilter(
                      event.target.value as 'ALL' | MemberTransactionHistoryItem['category'],
                    )
                  }
                  className="h-9 rounded-lg border bg-background px-3 text-xs font-medium"
                  aria-label="Filter transaction history"
                >
                  <option value="ALL">All activity</option>
                  <option value="DEPOSIT">Deposits</option>
                  <option value="WITHDRAWAL">Withdrawals</option>
                  <option value="OWNERSHIP">Ownerships</option>
                  <option value="PAYOUT">Payouts</option>
                  <option value="WALLET">Wallet changes</option>
                  <option value="ACCOUNT">Account activity</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[52%]" />
                    <col className="w-[15%]" />
                    <col className="w-[17%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <thead className="border-b bg-muted/30 text-muted-foreground">
                    <tr>
                      {['Activity', 'Status', 'Amount', 'Date'].map((label) => (
                        <th key={label} className="px-4 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <p className="mt-0.5 text-muted-foreground">
                            {item.description ?? item.category}
                            {item.units != null
                              ? ` · ${item.units} unit${item.units === 1 ? '' : 's'}`
                              : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {item.status ? (
                            <HistoryStatus status={item.status} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${item.amountMinorUnits != null && item.amountMinorUnits < 0 ? 'text-red-600' : item.amountMinorUnits != null ? 'text-emerald-600' : ''}`}
                        >
                          {item.amountMinorUnits == null ? '—' : money(item.amountMinorUnits)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                    {visibleHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                          No matching activity yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="app-surface rounded-xl border border-red-500/25 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Debit member balance</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                    Removes funds from the member’s available wallet balance. The adjustment is
                    permanently recorded with the administrator, reference, reason, and amount.
                  </p>
                </div>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
                  Available: {money(wallet?.totalAvailableBalanceMinorUnits ?? 0)}
                </span>
              </div>
              <form
                onSubmit={(event) => void debitBalance(event)}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <label className="grid gap-1.5 text-xs font-semibold">
                  Amount (₦)
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={debitAmount}
                    onChange={(event) => setDebitAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Unique reference
                  <input
                    required
                    maxLength={150}
                    value={debitReference}
                    onChange={(event) => setDebitReference(event.target.value)}
                    placeholder="e.g. WALLET-ADJUSTMENT-20260916-001"
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
                  Reason for debit
                  <textarea
                    required
                    minLength={3}
                    maxLength={300}
                    value={debitReason}
                    onChange={(event) => setDebitReason(event.target.value)}
                    placeholder="Explain why funds are being removed from this wallet."
                    className="min-h-20 rounded-lg border bg-background px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                <label className="flex items-start gap-2 rounded-lg bg-red-500/5 p-3 text-xs leading-5 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={debitConfirmed}
                    onChange={(event) => setDebitConfirmed(event.target.checked)}
                    className="mt-0.5 size-4 accent-red-600"
                  />
                  <span>
                    I have reviewed the member, amount, and reason. I understand this will reduce
                    the member’s available wallet balance immediately.
                  </span>
                </label>
                <button
                  disabled={debiting || !debitConfirmed}
                  className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
                >
                  {debiting ? 'Debiting…' : 'Debit member balance'}
                </button>
              </form>
            </section>

            <section className="app-surface rounded-xl border p-5">
              <h2 className="text-sm font-semibold">Credit member balance</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Records an offline payment and credits the member’s wallet deposit balance
                immediately. Use a unique reference; the same reference cannot be applied twice.
              </p>
              <form
                onSubmit={(event) => void creditBalance(event)}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <label className="grid gap-1.5 text-xs font-semibold">
                  Amount (₦)
                  <input
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    value={creditAmount}
                    onChange={(event) => setCreditAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Unique reference
                  <input
                    required
                    maxLength={150}
                    value={creditReference}
                    onChange={(event) => setCreditReference(event.target.value)}
                    placeholder="e.g. OFFLINE-DEPOSIT-20260904-001"
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
                  Payment context
                  <input
                    required
                    maxLength={300}
                    value={creditReason}
                    onChange={(event) => setCreditReason(event.target.value)}
                    placeholder="e.g. Bank transfer confirmed by Finance"
                    className="h-10 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <button
                  disabled={crediting}
                  className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60 sm:col-span-2"
                >
                  {crediting ? 'Crediting…' : 'Credit balance'}
                </button>
              </form>
            </section>

            <section className="app-surface rounded-xl border p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                  <MdAddBusiness className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">Assign existing ownership</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use this for ownership purchased before the platform. Available units are
                    deducted immediately, but the member’s wallet is not charged.
                  </p>
                </div>
              </div>
              <form
                onSubmit={(event) => void assignOwnership(event)}
                className="mt-5 grid gap-4 sm:grid-cols-2"
              >
                <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
                  Opportunity
                  <select
                    required
                    value={assignmentOpportunityId}
                    onChange={(event) => chooseAssignmentOpportunity(event.target.value)}
                    className="h-11 rounded-lg border bg-background px-3 text-sm font-normal"
                  >
                    <option value="">Select an opportunity</option>
                    {opportunities.map((opportunity) => (
                      <option key={opportunity._id} value={opportunity._id}>
                        {opportunity.title} — {opportunity.availableUnits} units available
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Units
                  <input
                    required
                    min="1"
                    max={selectedOpportunity?.availableUnits}
                    step="1"
                    type="number"
                    value={assignmentUnits}
                    onChange={(event) => changeAssignmentUnits(event.target.value)}
                    className="h-11 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Recorded investment amount (₦)
                  <input
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    value={assignmentAmount}
                    onChange={(event) => setAssignmentAmount(event.target.value)}
                    placeholder="0.00"
                    className="h-11 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Unique assignment reference
                  <input
                    required
                    maxLength={150}
                    value={assignmentReference}
                    onChange={(event) => setAssignmentReference(event.target.value)}
                    placeholder="e.g. LEGACY-OWNERSHIP-2026-001"
                    className="h-11 rounded-lg border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Profit handling
                  <select
                    value={assignmentRollover}
                    disabled={!selectedOpportunity?.rolloverAllowed}
                    onChange={(event) =>
                      setAssignmentRollover(event.target.value as 'PAYOUT' | 'COMPOUND')
                    }
                    className="h-11 rounded-lg border bg-background px-3 text-sm font-normal disabled:opacity-60"
                  >
                    <option value="PAYOUT">Pay out distributions</option>
                    {selectedOpportunity?.rolloverAllowed ? (
                      <option value="COMPOUND">Compound distributions</option>
                    ) : null}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-semibold sm:col-span-2">
                  Internal note
                  <textarea
                    maxLength={500}
                    rows={3}
                    value={assignmentNote}
                    onChange={(event) => setAssignmentNote(event.target.value)}
                    placeholder="Why this ownership is being entered manually"
                    className="rounded-lg border bg-background px-3 py-2.5 text-sm font-normal"
                  />
                </label>
                {selectedOpportunity ? (
                  <div className="rounded-lg bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
                    <span className="font-semibold text-foreground">Assignment summary:</span>{' '}
                    {assignmentUnits || 0} of {selectedOpportunity.availableUnits} available units.
                    Listed unit price is {money(selectedOpportunity.pricePerUnitMinorUnits)}. This
                    action does not alter the wallet balance.
                  </div>
                ) : null}
                <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={assignmentConfirmed}
                    onChange={(event) => setAssignmentConfirmed(event.target.checked)}
                    className="mt-1 size-4 accent-brand"
                  />
                  <span>
                    I confirm this member previously purchased these units and the recorded amount
                    is correct. I understand the units will be removed from availability.
                  </span>
                </label>
                <div className="flex justify-end sm:col-span-2">
                  <button
                    disabled={assigning || !selectedOpportunity || !assignmentConfirmed}
                    className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {assigning ? 'Assigning…' : 'Assign ownership'}
                  </button>
                </div>
              </form>
            </section>

            <section className="app-surface rounded-xl border p-5">
              <h2 className="text-sm font-semibold">Next of Kin</h2>
              {member.nextOfKin ? (
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-muted-foreground">Name:</span> {member.nextOfKin.fullName}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Relationship:</span>{' '}
                    {member.nextOfKin.relationship}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span> {member.nextOfKin.phone}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    {member.nextOfKin.email ?? '—'}
                  </p>
                  {member.nextOfKin.address ? (
                    <p className="sm:col-span-2">
                      <span className="text-muted-foreground">Address:</span>{' '}
                      {member.nextOfKin.address}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No Next of Kin details added.</p>
              )}
            </section>

            <section className="app-surface overflow-x-auto rounded-xl border">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Ownerships</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Earnings are approved from the Payouts section after completion.
                </p>
              </div>
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b bg-muted/30 text-muted-foreground">
                  <tr>
                    {[
                      'Opportunity',
                      'Source',
                      'Units',
                      'Invested',
                      'Projected distribution',
                      'Status',
                      'Created',
                      'Maturity',
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ownerships.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3 font-medium">{item.opportunityId.title}</td>
                      <td className="px-4 py-3">
                        <p>
                          {item.acquisitionSource === 'ADMIN_MANUAL'
                            ? 'Admin assigned'
                            : 'Wallet purchase'}
                        </p>
                        {item.assignmentReference ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {item.assignmentReference}
                          </p>
                        ) : null}
                        {item.assignmentNote ? (
                          <p
                            className="mt-0.5 max-w-48 truncate text-[11px] text-muted-foreground"
                            title={item.assignmentNote}
                          >
                            {item.assignmentNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{item.units}</td>
                      <td className="px-4 py-3">{money(item.amountMinorUnits)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand">{projectedDistributionLabel(item)}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {projectedDistributionSupportingText(item)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{item.status.toLowerCase()}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString('en-NG')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.maturityAt
                          ? new Date(item.maturityAt).toLocaleDateString('en-NG')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                  {ownerships.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                        This member has no ownerships yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function KycStep({
  label,
  verifiedAt,
}: Readonly<{ label: string; verifiedAt: string | null }>): React.JSX.Element {
  const verified = Boolean(verifiedAt);
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-3">
      {verified ? (
        <MdCheckCircle className="size-5 shrink-0 text-emerald-600" />
      ) : (
        <MdRadioButtonUnchecked className="size-5 shrink-0 text-muted-foreground" />
      )}
      <div>
        <p className="text-xs font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {verified ? 'Completed' : 'Not completed'}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="app-surface rounded-xl border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
    </article>
  );
}

function HistoryStatus({ status }: Readonly<{ status: string }>): React.JSX.Element {
  const positive = ['APPROVED', 'COMPLETED', 'SETTLED', 'ACTIVE'].includes(status);
  const negative = ['REJECTED', 'REVERSED'].includes(status);
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${positive ? 'bg-emerald-500/10 text-emerald-700' : negative ? 'bg-red-500/10 text-red-700' : 'bg-amber-500/10 text-amber-700'}`}
    >
      {status.toLowerCase().replaceAll('_', ' ')}
    </span>
  );
}

function isManuallyAssignable(opportunity: Opportunity): boolean {
  return (
    !opportunity.interestModeEnabled &&
    opportunity.availableUnits > 0 &&
    ['PUBLISHED', 'FUNDING_OPEN', 'ACTIVE'].includes(opportunity.status)
  );
}
