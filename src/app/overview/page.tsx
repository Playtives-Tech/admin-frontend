'use client';

import { DashboardShell } from '@/components/dashboard/shell';
import { UsersRound, Wallet, TrendingUp, AlertCircle, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getAdminActivity,
  getMembers,
  type ActivityLog,
} from '@/lib/services/member-operations-service';

// Mock Data
const chartData = [40, 55, 45, 70, 65, 85, 100, 90, 110, 130, 120, 150];

export default function OverviewPage(): React.JSX.Element {
  const [userCount, setUserCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  useEffect(() => {
    void Promise.all([getMembers({ page: 1, limit: 1, status: 'all' }), getAdminActivity()]).then(
      ([members, activity]) => {
        setUserCount(members.pagination.totalItems);
        setRecentActivity(activity.slice(0, 5));
      },
    );
  }, []);
  const kpis = [
    { label: 'Total Users', value: userCount.toLocaleString(), icon: UsersRound },
    { label: 'Total Investment', value: 'Not available', icon: Wallet },
    { label: 'Avg ROI', value: 'Not available', icon: TrendingUp },
    { label: 'Pending KYC', value: 'Not available', icon: AlertCircle },
  ];
  return (
    <DashboardShell title="Overview" description="Platform statistics and recent activity">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className="app-surface rounded-2xl border p-5 shadow-sm transition hover:border-brand/35"
            >
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-xs font-bold uppercase tracking-wider">{kpi.label}</p>
                <kpi.icon className="size-4" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h3 className="font-heading text-2xl font-semibold">{kpi.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Chart Section */}
          <div className="app-surface rounded-2xl border p-6 shadow-sm lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Growth Overview</h3>
                <p className="text-xs text-muted-foreground">Monthly active investments (6mo)</p>
              </div>
              <TrendingUp
                className="size-5 text-muted-foreground"
                fill="currentColor"
                fillOpacity={0.2}
              />
            </div>

            {/* Simple CSS Bar Chart Mock */}
            <div className="mt-8 flex h-48 items-end justify-between gap-2 md:gap-4">
              {chartData.map((height, i) => (
                <div key={i} className="group relative flex w-full flex-col justify-end">
                  <div
                    className="w-full rounded-t-sm bg-brand/20 transition-all group-hover:bg-brand"
                    style={{ height: `${(height / 150) * 100}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
                    {height}k
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between border-t pt-4 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="app-surface rounded-2xl border p-6 shadow-sm">
            <h3 className="font-semibold">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">Latest platform events</p>

            <div className="mt-6 grid gap-6">
              {recentActivity.map((activity) => (
                <div key={activity._id} className="flex gap-4">
                  <div className="relative mt-1 flex size-6 shrink-0 items-center justify-center">
                    <ShieldCheck className="size-4" fill="currentColor" fillOpacity={0.2} />
                  </div>
                  <div className="grid gap-0.5">
                    <p className="text-sm font-medium">{activity.action.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{activity.subjectType}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/60">
                      {new Date(activity.createdAt).toLocaleString('en-NG')}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity has been recorded.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
