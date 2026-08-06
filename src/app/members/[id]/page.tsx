'use client';

import Link from 'next/link';
import {
  MdArrowBack,
  MdEmail,
  MdPhone,
  MdCalendarMonth,
  MdVerifiedUser,
  MdBusinessCenter,
  MdWarning,
  MdClose,
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getMemberActivity,
  getMember,
  getMemberWallet,
  type ActivityLog,
  type AdminWalletSummary,
} from '@/lib/services/member-operations-service';

// Mock Data
const memberInfo = {
  name: 'Sarah Jenkins',
  email: 'sarah.j@example.com',
  phone: '+234 801 234 5678',
  joined: 'Oct 12, 2025',
  status: 'Active',
  kycLevel: 'Level 2 (Verified)',
  totalInvested: '₦4,500,000',
  totalReturns: '₦320,000',
  walletBalance: '₦150,000',
  activeInvestments: 3,
};

const investments = [
  {
    id: '1',
    opportunity: 'Palm oil trade cycle 08',
    type: 'Commodity',
    units: 15,
    amount: 1500000,
    date: 'Nov 01, 2025',
    status: 'Active',
  },
  {
    id: '2',
    opportunity: 'Real Estate Fund A',
    type: 'Real Estate',
    units: 5,
    amount: 2500000,
    date: 'Dec 15, 2025',
    status: 'Active',
  },
  {
    id: '3',
    opportunity: 'Agro Export Batch 10',
    type: 'Agriculture',
    units: 10,
    amount: 500000,
    date: 'Jan 10, 2026',
    status: 'Completed',
  },
];

export default function MemberDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [wallet, setWallet] = useState<AdminWalletSummary | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [displayedMember, setDisplayedMember] = useState(memberInfo);

  useEffect(() => {
    void Promise.all([
      getMember(params.id),
      getMemberWallet(params.id),
      getMemberActivity(params.id),
    ]).then(
      ([member, walletResult, logs]) => {
        setDisplayedMember({
          ...memberInfo,
          name: member.name,
          email: member.email,
          joined: new Date(member.createdAt).toLocaleDateString('en-NG'),
          status: member.status === 'suspended' ? 'Suspended' : 'Active',
        });
        setWallet(walletResult);
        setActivityLogs(logs);
      },
      () => notify.error('Could not load member wallet and activity'),
    );
  }, [params.id]);

  const handleSuspend = () => {
    setIsSuspended(true);
    setIsSuspendModalOpen(false);
    notify.success('Account suspended successfully');
  };

  return (
    <DashboardShell title="Member Profile" description="View user details and portfolio">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Breadcrumb & Header */}
        <div>
          <Link
            href="/members"
            className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            <MdArrowBack className="size-4" />
            Back to Members
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand/10 font-heading text-2xl font-bold text-brand">
                {displayedMember.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-heading text-3xl font-semibold tracking-tight">
                  {displayedMember.name}
                </h1>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MdEmail className="size-3.5" /> {displayedMember.email}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MdPhone className="size-3.5" /> {memberInfo.phone}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isSuspended ? (
                <button
                  onClick={() => setIsSuspendModalOpen(true)}
                  className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Suspend Account
                </button>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 opacity-50"
                >
                  Account Suspended
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column: Info Cards */}
          <div className="grid gap-6">
            <div className="app-surface rounded-2xl border p-6 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Status
              </h3>
              <div className="grid gap-4">
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 font-bold',
                      isSuspended
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-emerald-500/10 text-emerald-500',
                    )}
                  >
                    {isSuspended ? 'Suspended' : displayedMember.status}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-3 text-sm">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <MdCalendarMonth className="size-3.5" /> {displayedMember.joined}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">KYC Level</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <MdVerifiedUser className="size-3.5 text-brand" /> {memberInfo.kycLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border bg-brand p-6 text-brand-foreground shadow-sm">
              {/* Subtle background pattern for premium feel */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 18px)',
                }}
              />

              <div className="relative">
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wider opacity-80">
                  Portfolio Value
                </h3>
                <p className="font-heading text-3xl font-bold">{memberInfo.totalInvested}</p>

                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-brand-foreground/20 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-80">
                      Deposited Funds
                    </p>
                    <p className="mt-1 font-semibold">
                      ₦{((wallet?.deposit.availableKobo ?? 0) / 100).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider opacity-80">
                      Earnings (Returns)
                    </p>
                    <p className="mt-1 font-semibold">
                      ₦{((wallet?.earnings.availableKobo ?? 0) / 100).toLocaleString('en-NG')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-brand-foreground/20 pt-4">
                  <p className="text-[10px] uppercase tracking-wider opacity-80">Active Inv.</p>
                  <p className="mt-1 font-semibold">{memberInfo.activeInvestments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Investments Table */}
          <div className="lg:col-span-2">
            <div className="app-surface rounded-2xl border shadow-sm">
              <div className="border-b p-6">
                <h3 className="flex items-center gap-2 font-semibold">
                  <MdBusinessCenter className="size-4" />
                  Investment History
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Opportunity</th>
                      <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                        Units
                      </th>
                      <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {investments.map((inv) => (
                      <tr key={inv.id} className="transition hover:bg-muted/30">
                        <td className="px-6 py-4">
                          <p className="font-medium text-foreground">{inv.opportunity}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.type} · {inv.date}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">{inv.units}</td>
                        <td className="px-6 py-4 text-right font-medium">
                          ₦{inv.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                              inv.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="app-surface rounded-2xl border p-6 shadow-sm lg:col-span-3">
            <h3 className="font-semibold">Recent member activity</h3>
            <div className="mt-4 divide-y">
              {activityLogs.length ? (
                activityLogs.slice(0, 20).map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{log.action.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.actorType} · {log.subjectType}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('en-NG')}
                    </time>
                  </div>
                ))
              ) : (
                <p className="py-4 text-sm text-muted-foreground">No activity has been recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {isSuspendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-red-500">
                <MdWarning className="size-6" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Suspend Account?
                </h2>
              </div>
              <button
                onClick={() => setIsSuspendModalOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <MdClose className="size-4" />
              </button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Are you sure you want to suspend <strong>{displayedMember.name}</strong>&apos;s
              account? They will lose access to their wallet and active investments until the
              account is reinstated.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsSuspendModalOpen(false)}
                className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Suspend Account
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
