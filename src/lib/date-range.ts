export type DateRangePreset = '1m' | '3m' | '6m' | 'custom';
export type AdminDateRange = Readonly<{ preset: DateRangePreset; from?: string; to?: string }>;

export const defaultAdminDateRange: AdminDateRange = { preset: '3m' };

export function dateRangeSearchParams(value: AdminDateRange): string {
  const params = new URLSearchParams({ range: value.preset });
  if (value.preset === 'custom' && value.from && value.to) {
    params.set('from', value.from);
    params.set('to', value.to);
  }
  return params.toString();
}

export function dateRangeLabel(value: AdminDateRange): string {
  if (value.preset === '1m') return 'last month';
  if (value.preset === '3m') return 'last 3 months';
  if (value.preset === '6m') return 'last 6 months';
  return 'selected period';
}
