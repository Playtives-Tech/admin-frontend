'use client';

import { DashboardShell } from '@/components/dashboard/shell';
import { 
  UsersRound, 
  Wallet, 
  TrendingUp, 
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

// Mock Data
const kpis = [
  { label: 'Total Users', value: '2,845', change: '+12.5%', isPositive: true, icon: UsersRound },
  { label: 'Total Investment', value: '₦1.2B', change: '+8.2%', isPositive: true, icon: Wallet },
  { label: 'Avg ROI', value: '14.5%', change: '+1.2%', isPositive: true, icon: TrendingUp },
  { label: 'Pending KYC', value: '124', change: '-5.4%', isPositive: false, icon: AlertCircle },
];

const recentActivity = [
  { id: 1, action: 'New user joined', user: 'sarah.j@example.com', time: '10 mins ago', type: 'signup' },
  { id: 2, action: 'Opportunity fully funded', user: 'Palm oil trade cycle 08', time: '1 hour ago', type: 'investment' },
  { id: 3, action: 'Payout processed', user: 'Real Estate Fund A', time: '3 hours ago', type: 'payout' },
  { id: 4, action: 'New user joined', user: 'michael.t@example.com', time: '5 hours ago', type: 'signup' },
  { id: 5, action: 'Draft published', user: 'Agro Export Batch 12', time: '1 day ago', type: 'investment' },
];

const chartData = [40, 55, 45, 70, 65, 85, 100, 90, 110, 130, 120, 150];

export default function OverviewPage(): React.JSX.Element {
  return (
    <DashboardShell title="Overview" description="Platform statistics and recent activity">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, i) => (
            <div key={i} className="app-surface rounded-2xl border p-5 shadow-sm transition hover:border-brand/35">
              <div className="flex items-center justify-between text-muted-foreground">
                <p className="text-xs font-bold uppercase tracking-wider">{kpi.label}</p>
                <kpi.icon className="size-4" />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <h3 className="font-heading text-2xl font-semibold">{kpi.value}</h3>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {kpi.change}
                </div>
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
              <TrendingUp className="size-5 text-muted-foreground" fill="currentColor" fillOpacity={0.2} />
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
                <div key={activity.id} className="flex gap-4">
                  <div className="relative mt-1 flex size-6 shrink-0 items-center justify-center">
                    {activity.type === 'signup' ? <UsersRound className="size-4" fill="currentColor" fillOpacity={0.2} /> : 
                     activity.type === 'investment' ? <Wallet className="size-4" fill="currentColor" fillOpacity={0.2} /> : 
                     <ShieldCheck className="size-4" fill="currentColor" fillOpacity={0.2} />}
                    {activity.id !== recentActivity.length && (
                      <div className="absolute left-1/2 top-6 h-6 w-px -translate-x-1/2 bg-border" />
                    )}
                  </div>
                  <div className="grid gap-0.5">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/60">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </DashboardShell>
  );
}
