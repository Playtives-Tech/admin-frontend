'use client';

import { useState } from 'react';
import { 
  MdAccountBalanceWallet, 
  MdTrendingUp, 
  MdPayments,
  MdCheckCircle,
  MdAccessTime,
  MdArrowUpward,
  MdArrowDownward
} from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

// Mock Data
const stats = [
  { label: 'Total Distributed', value: '₦125.8M', change: '+24%', isPositive: true, icon: MdAccountBalanceWallet },
  { label: 'Next Scheduled', value: '₦12.4M', date: 'Oct 30, 2026', isPositive: null, icon: MdAccessTime },
  { label: 'Average Yield', value: '14.2%', change: '+1.2%', isPositive: true, icon: MdTrendingUp },
];

const payouts = [
  { id: '1', opportunity: 'Palm oil trade cycle 08', type: 'Monthly Dividend', amount: 4500000, recipients: 142, date: 'Oct 15, 2026', status: 'Completed' },
  { id: '2', opportunity: 'Real Estate Fund A', type: 'Maturity Principal + Interest', amount: 85000000, recipients: 45, date: 'Oct 30, 2026', status: 'Pending' },
  { id: '3', opportunity: 'Agro Export Batch 10', type: 'Quarterly Dividend', amount: 2100000, recipients: 88, date: 'Nov 05, 2026', status: 'Pending' },
  { id: '4', opportunity: 'Logistics Fleet 02', type: 'Monthly Dividend', amount: 3200000, recipients: 210, date: 'Sep 15, 2026', status: 'Completed' },
];

export default function PayoutsPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'History'>('Upcoming');
  const [payoutList, setPayoutList] = useState(payouts);

  const filteredPayouts = payoutList.filter(p => 
    activeTab === 'Upcoming' ? p.status === 'Pending' : p.status === 'Completed'
  );

  const handleProcess = (id: string) => {
    setPayoutList(prev => prev.map(p => p.id === id ? { ...p, status: 'Completed' } : p));
    notify.success('Payout processed successfully');
  };

  return (
    <DashboardShell title="Payouts" description="Manage distributions and payout history">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Statistics Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat, i) => (
            <div key={i} className="app-surface rounded-2xl border p-5 shadow-sm transition hover:border-brand/35">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <stat.icon className="size-4" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <h3 className="font-heading text-2xl font-semibold">{stat.value}</h3>
                  {stat.date && <p className="text-xs text-muted-foreground mt-1">{stat.date}</p>}
                </div>
                {stat.change && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${stat.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {stat.isPositive !== null && (
                    stat.isPositive ? <MdArrowUpward className="size-3" /> : <MdArrowDownward className="size-3" />
                  )}  {stat.change}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Payouts Section */}
        <div className="app-surface rounded-2xl border shadow-sm">
          {/* Header & Tabs */}
          <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold">Distribution Schedule</h3>
            <div className="flex rounded-lg border bg-muted/30 p-1">
              {(['Upcoming', 'History'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-xs font-semibold transition",
                    activeTab === tab 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Opportunity / Type</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Total Amount</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Recipients</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Date</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="transition hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{payout.opportunity}</p>
                      <p className="text-xs text-muted-foreground">{payout.type}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">₦{payout.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{payout.recipients}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payout.date}</td>
                    <td className="px-6 py-4 text-right">
                      {payout.status === 'Pending' ? (
                        <button 
                          onClick={() => handleProcess(payout.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <MdPayments className="size-3.5" />
                          Process
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                          <MdCheckCircle className="size-3.5" />
                          Done
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">
                      No payouts found for this category.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}
