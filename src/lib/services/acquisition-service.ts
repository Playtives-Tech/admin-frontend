import { api } from '@/lib/api';

export type AcquisitionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AdminAcquisition = Readonly<{
  _id: string;
  userId: Readonly<{ _id: string; name: string; email: string; status: string }>;
  opportunityId: Readonly<{ _id: string; title: string; slug: string; category: string; status: string; availableUnits: number; totalUnits: number }>;
  orderId: Readonly<{ _id: string; amountMinorUnits: number; units: number; unitPriceMinorUnits: number }>;
  units: number;
  amountMinorUnits: number;
  projectedReturnRatePercent: number;
  status: AcquisitionStatus;
  progressPercent: number;
  adminNote?: string;
  revision: number;
  createdAt: string;
}>;
export type AcquisitionStats = Readonly<{ totalAcquisitions: number; activeAcquisitions: number; totalUnits: number; totalAmountMinorUnits: number }>;

const keys = new Map<string, string>();
function keyFor(value: string): string {
  const prior = keys.get(value);
  if (prior) return prior;
  const key = crypto.randomUUID();
  keys.set(value, key);
  return key;
}

export const acquisitionService = {
  list: () => api<AdminAcquisition[]>('/v1/admin/acquisitions', { cache: 'no-store' }),
  stats: () => api<AcquisitionStats>('/v1/admin/acquisitions/stats', { cache: 'no-store' }),
  manage: (id: string, revision: number, input: { status?: AcquisitionStatus; progressPercent?: number; adminNote?: string }) => api<AdminAcquisition>(`/v1/admin/acquisitions/${id}`, {
    method: 'PATCH',
    headers: { 'Idempotency-Key': keyFor(`${id}:${revision}:${JSON.stringify(input)}`), 'If-Match': String(revision) },
    body: JSON.stringify(input),
  }),
};
