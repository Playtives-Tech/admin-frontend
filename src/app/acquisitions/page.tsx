'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import {
  acquisitionService,
  type AcquisitionStats,
  type AdminAcquisition,
} from '@/lib/services/acquisition-service';
import { notify } from '@/lib/notify';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

export default function AcquisitionsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminAcquisition[]>([]);
  const [stats, setStats] = useState<AcquisitionStats>();
  const load = () =>
    Promise.all([acquisitionService.list(), acquisitionService.stats()]).then(
      ([records, totals]) => {
        setItems(records);
        setStats(totals);
      },
    );
  useEffect(() => {
    void load().catch((error: unknown) =>
      notify.error(error instanceof Error ? error.message : 'Could not load acquisitions'),
    );
  }, []);
  const update = async (
    item: AdminAcquisition,
    input: Parameters<typeof acquisitionService.manage>[2],
  ) => {
    try {
      await acquisitionService.manage(item._id, item.revision, input);
      await load();
      notify.success('Ownership updated');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Could not update ownership');
    }
  };
  return (
    <DashboardShell title="Acquisitions" description="Track and manage acquired opportunity units">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['All acquisitions', stats?.totalAcquisitions ?? 0],
          ['Active', stats?.activeAcquisitions ?? 0],
          ['Units', stats?.totalUnits ?? 0],
          ['Capital allocated', money(stats?.totalAmountMinorUnits ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="app-surface rounded-2xl border p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="app-surface mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              {[
                'Member',
                'Opportunity',
                'Units',
                'Contribution',
                'Progress',
                'Status',
                'Actions',
              ].map((label) => (
                <th key={label} className="px-5 py-4 font-semibold text-muted-foreground">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item._id}>
                <td className="px-5 py-4">
                  <p className="font-medium">{item.userId.name}</p>
                  <p className="text-xs text-muted-foreground">{item.userId.email}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium">{item.opportunityId.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.opportunityId.availableUnits}/{item.opportunityId.totalUnits} left
                  </p>
                </td>
                <td className="px-5 py-4">{item.units}</td>
                <td className="px-5 py-4 font-medium">{money(item.amountMinorUnits)}</td>
                <td className="px-5 py-4">
                  <input
                    aria-label="Ownership progress"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={item.progressPercent}
                    onBlur={(event) => {
                      const value = Number(event.target.value);
                      if (value !== item.progressPercent)
                        void update(item, { progressPercent: value });
                    }}
                    className="w-20 rounded-lg border bg-background px-2 py-1.5"
                  />
                  %
                </td>
                <td className="px-5 py-4">{item.status}</td>
                <td className="px-5 py-4">
                  <select
                    aria-label="Ownership status"
                    value={item.status}
                    onChange={(event) => {
                      const status = event.target.value as AdminAcquisition['status'];
                      if (
                        status === 'CANCELLED' &&
                        !window.confirm(
                          'Cancel this ownership, refund its wallet debit, and release its units?',
                        )
                      )
                        return;
                      void update(item, { status });
                    }}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED" disabled>
                      Completed by maturity
                    </option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                  No acquired opportunities yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
