'use client';

import { useEffect, useState } from 'react';
import { MdAccountBalanceWallet, MdCheckCircle } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { getAdminActivity, type ActivityLog } from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';

export default function PayoutsPage(): React.JSX.Element {
  const [credits, setCredits] = useState<ActivityLog[]>([]);

  useEffect(() => {
    void getAdminActivity().then(
      (logs) => setCredits(logs.filter((log) => log.action === 'EARNINGS_CREDITED')),
      () => notify.error('Could not load earnings distribution history'),
    );
  }, []);

  const totalMinorUnits = credits.reduce(
    (total, log) =>
      total +
      (typeof log.metadata.amountMinorUnits === 'number' ? log.metadata.amountMinorUnits : 0),
    0,
  );

  return (
    <DashboardShell title="Earnings" description="Review credited member investment returns">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="app-surface rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <p className="text-xs font-bold uppercase tracking-wider">Total Distributed</p>
              <MdAccountBalanceWallet className="size-4" />
            </div>
            <h3 className="mt-4 font-heading text-2xl font-semibold">
              ₦{(totalMinorUnits / 100).toLocaleString('en-NG')}
            </h3>
          </div>
          <div className="app-surface rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <p className="text-xs font-bold uppercase tracking-wider">Credits Processed</p>
              <MdCheckCircle className="size-4" />
            </div>
            <h3 className="mt-4 font-heading text-2xl font-semibold">{credits.length}</h3>
          </div>
        </div>

        <div className="app-surface overflow-hidden rounded-2xl border shadow-sm">
          <div className="border-b p-6">
            <h3 className="font-semibold">Earnings Credit History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">User ID</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Reference</th>
                  <th className="px-6 py-4 text-right font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {credits.map((credit) => (
                  <tr key={credit._id}>
                    <td className="px-6 py-4 font-medium">{credit.subjectId ?? 'Unknown'}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {typeof credit.metadata.reference === 'string'
                        ? credit.metadata.reference
                        : 'Not provided'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      ₦
                      {(
                        (typeof credit.metadata.amountMinorUnits === 'number'
                          ? credit.metadata.amountMinorUnits
                          : 0) / 100
                      ).toLocaleString('en-NG')}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(credit.createdAt).toLocaleString('en-NG')}
                    </td>
                  </tr>
                ))}
                {credits.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No earnings credits have been recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
