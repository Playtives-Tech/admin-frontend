'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { getAdminActivity, type ActivityLog } from '@/lib/services/member-operations-service';
import { notify } from '@/lib/notify';

export default function ActivityPage(): React.JSX.Element {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  useEffect(() => {
    const walletActions = ['WALLET', 'DEPOSIT', 'WITHDRAWAL', 'BANK_ACCOUNT', 'EARNINGS'];
    void getAdminActivity()
      .then((items) =>
        setLogs(
          items.filter((item) => walletActions.some((prefix) => item.action.includes(prefix))),
        ),
      )
      .catch(() => notify.error('Could not load wallet activity'));
  }, []);
  return (
    <DashboardShell
      title="Wallet Activity"
      description="Audit deposits, withdrawals, linked accounts, and wallet movements"
    >
      <div className="app-surface overflow-hidden rounded-2xl border">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-5 py-4">Activity</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Subject</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="px-5 py-4 font-semibold">{log.action.replaceAll('_', ' ')}</td>
                  <td className="px-5 py-4">{log.actorType}</td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {log.subjectType} · {log.subjectId.slice(-8)}
                  </td>
                  <td className="px-5 py-4">
                    {typeof log.metadata.amountMinorUnits === 'number'
                      ? `₦${(log.metadata.amountMinorUnits / 100).toLocaleString('en-NG')}`
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('en-NG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : null}
      </div>
    </DashboardShell>
  );
}
