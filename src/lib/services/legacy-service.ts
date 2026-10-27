import { api } from '@/lib/api';

export type LegacyOpportunity = {
  _id: string;
  title: string;
  currency: 'NGN' | 'GBP' | 'USD';
  description: string;
  startDate: string | null;
  totalCycles: number;
  totalUnits: number;
};
export type LegacyPeriod = {
  _id: string;
  cycleNumber: number | null;
  label: string;
  dueAt: string;
  sourceDueAt?: string | null;
  principalMinorUnits: number | null;
  ratePercent: number | null;
  expectedReturnMinorUnits: number | null;
  status: 'UNVERIFIED' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'ROLLED_OVER';
  paidMinorUnits: number;
  rolledOverMinorUnits: number;
  settledAt: string | null;
  reference: string;
  note: string;
};
export type LegacyPosition = {
  _id: string;
  opportunityId: LegacyOpportunity;
  opportunityModel?: 'Opportunity' | 'LegacyOpportunity';
  units: number;
  firstCycle: number | null;
  lastCycle: number | null;
  activatedAt: string | null;
  activationStartedAt: string | null;
  ownershipId: string | null;
  userId: { _id: string; name: string; email: string; memberCode?: string };
  sourcePositionId: string;
  sourceInvestorId: string;
  principalMinorUnits: number;
  ratePercent: number | null;
  fixedReturnMinorUnits: number | null;
  startAt: string;
  participationStartAt?: string;
  endAt: string | null;
  durationMonths: number | null;
  preference: 'PAY_TO_ACCOUNT' | 'ROLL_OVER' | 'UNKNOWN';
  status: 'ACTIVE' | 'COMPLETED' | 'EXITED' | 'UNVERIFIED';
  capitalReturnedMinorUnits: number;
  capitalReturnedAt: string | null;
  capitalReturnReference: string;
  note: string;
  periods: LegacyPeriod[];
  changes: Array<{ at: string; by: string; action: string; details: string }>;
  revision: number;
};

const json = (value: unknown) => JSON.stringify(value);
export const legacyService = {
  opportunities: () =>
    api<LegacyOpportunity[]>('/v1/admin/legacy/opportunities', { cache: 'no-store' }),
  positions: (params: { opportunityId?: string; page: number; limit: number }) => {
    const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) });
    if (params.opportunityId) query.set('opportunityId', params.opportunityId);
    return api<{
      items: LegacyPosition[];
      pagination: { page: number; limit: number; totalItems: number; totalPages: number };
    }>(`/v1/admin/legacy/positions?${query}`, { cache: 'no-store' });
  },
  createPosition: (input: Record<string, unknown>) =>
    api<LegacyPosition>('/v1/admin/legacy/positions', { method: 'POST', body: json(input) }),
  linkPosition: (positionId: string, input: Record<string, unknown>) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}/link`, {
      method: 'PATCH', body: json(input),
    }),
  activatePosition: (positionId: string, revision: number) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}/activate`, {
      method: 'POST', body: json({ revision }),
    }),
  addPeriod: (positionId: string, input: Record<string, unknown>) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}/periods`, {
      method: 'POST',
      body: json(input),
    }),
  updatePeriod: (positionId: string, periodId: string, input: Record<string, unknown>) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}/periods/${periodId}`, {
      method: 'PATCH',
      body: json(input),
    }),
  updatePosition: (positionId: string, input: Record<string, unknown>) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}`, {
      method: 'PATCH',
      body: json(input),
    }),
  updateTerms: (positionId: string, input: Record<string, unknown>) =>
    api<LegacyPosition>(`/v1/admin/legacy/positions/${positionId}/terms`, {
      method: 'PATCH',
      body: json(input),
    }),
};
