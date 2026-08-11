import { api } from '@/lib/api';

export type MaturityPayoutStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED';
export type MaturityPayout = Readonly<{
  _id: string;
  userId: Readonly<{ _id: string; name: string; email: string }>;
  opportunityId: Readonly<{ _id: string; title: string; slug: string }>;
  ownershipId: Readonly<{
    _id: string;
    units: number;
    amountMinorUnits: number;
    totalAccruedReturnMinorUnits: number;
  }>;
  principalMinorUnits: number;
  returnMinorUnits: number;
  totalPayoutMinorUnits: number;
  status: MaturityPayoutStatus;
  processingDecision: 'APPROVED' | 'REJECTED' | null;
  reviewNote: string;
  revision: number;
  createdAt: string;
  reviewedAt: string | null;
}>;

export type PayoutDetail = Readonly<{
  payout: MaturityPayout &
    Readonly<{
      userId: MaturityPayout['userId'] &
        Readonly<{ status: string; roles: string[]; createdAt: string }>;
      opportunityId: MaturityPayout['opportunityId'] &
        Readonly<{
          category: string;
          summary: string;
          durationMonths: number;
          projectedReturnRatePercent: number;
          projectedProfitMinorUnits: number;
          projectedMonthlyProfitMinorUnits: number | null;
          returnSchedule: string;
          rolloverAllowed: boolean;
          rolloverCompoundsReturns: boolean;
          operator: string;
          location: string;
          principalReleaseDate: string | null;
          imageUrl: string;
        }>;
      ownershipId: MaturityPayout['ownershipId'] &
        Readonly<{
          investmentCapitalMinorUnits: number;
          cyclesAccrued: number;
          createdAt: string;
          completedAt: string | null;
          maturityAt: string | null;
        }>;
    }>;
  wallet: Readonly<{
    totalAvailableBalanceMinorUnits: number;
    deposit: Readonly<{ availableBalanceMinorUnits: number; pendingBalanceMinorUnits: number }>;
    earnings: Readonly<{ availableBalanceMinorUnits: number; lifetimeEarningsMinorUnits: number }>;
  }>;
  accruals: ReadonlyArray<
    Readonly<{
      _id: string;
      cycleNumber: number;
      principalBeforeMinorUnits: number;
      returnMinorUnits: number;
      principalAfterMinorUnits: number;
      rolledOver: boolean;
      status: string;
      scheduledFor: string;
    }>
  >;
}>;

const keys = new Map<string, string>();
export const payoutService = {
  list: (status?: MaturityPayoutStatus) =>
    api<MaturityPayout[]>(`/v1/admin/payouts${status ? `?status=${status}` : ''}`, {
      cache: 'no-store',
    }),
  get: (id: string) => api<PayoutDetail>(`/v1/admin/payouts/${id}`, { cache: 'no-store' }),
  review: (payout: MaturityPayout, status: 'APPROVED' | 'REJECTED', note = '') => {
    const fingerprint = `${payout._id}:${payout.revision}:${status}:${note}`;
    const key = keys.get(fingerprint) ?? crypto.randomUUID();
    keys.set(fingerprint, key);
    return api<MaturityPayout>(`/v1/admin/payouts/${payout._id}`, {
      method: 'PATCH',
      headers: { 'Idempotency-Key': key, 'If-Match': String(payout.revision) },
      body: JSON.stringify({ status, note }),
    });
  },
};
