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

const keys = new Map<string, string>();
export const payoutService = {
  list: (status?: MaturityPayoutStatus) =>
    api<MaturityPayout[]>(`/v1/admin/payouts${status ? `?status=${status}` : ''}`, {
      cache: 'no-store',
    }),
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
