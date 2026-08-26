'use client';

import type { AdminDateRange, DateRangePreset } from '@/lib/date-range';
import { cn } from '@/lib/utils';

const options: ReadonlyArray<Readonly<{ value: Exclude<DateRangePreset, 'custom'>; label: string }>> = [
  { value: '1m', label: 'Last month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
];

export function DateRangeFilter({ value, onChange }: { value: AdminDateRange; onChange: (value: AdminDateRange) => void }): React.JSX.Element {
  return <div className="flex flex-wrap items-center justify-end gap-1.5" aria-label="Date range">
    {options.map((option) => <button key={option.value} onClick={() => onChange({ preset: option.value })} className={cn('h-7 rounded-md border px-2.5 text-[11px] font-semibold transition', value.preset === option.value ? 'border-brand bg-brand text-brand-foreground' : 'bg-background hover:bg-muted')}>{option.label}</button>)}
    <button onClick={() => onChange({ preset: 'custom', from: value.from, to: value.to })} className={cn('h-7 rounded-md border px-2.5 text-[11px] font-semibold transition', value.preset === 'custom' ? 'border-brand bg-brand text-brand-foreground' : 'bg-background hover:bg-muted')}>Custom</button>
    {value.preset === 'custom' ? <><input aria-label="From date" type="date" value={value.from ?? ''} onChange={(event) => onChange({ ...value, from: event.target.value })} className="h-7 rounded-md border bg-background px-2 text-[11px]" /><input aria-label="To date" type="date" value={value.to ?? ''} onChange={(event) => onChange({ ...value, to: event.target.value })} className="h-7 rounded-md border bg-background px-2 text-[11px]" /></> : null}
  </div>;
}
