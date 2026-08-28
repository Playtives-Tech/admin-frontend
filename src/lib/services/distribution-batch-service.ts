import { api } from '@/lib/api';
import { type AdminDateRange, dateRangeSearchParams } from '@/lib/date-range';

export type DistributionBatchStatus =
  'AWAITING_AMOUNT' | 'READY_FOR_APPROVAL' | 'PROCESSING' | 'APPROVED' | 'REJECTED';

export type DistributionBatch = Readonly<{
  _id: string;
  opportunityId: Readonly<{ _id: string; title: string; returnSchedule: string }>;
  scheduledFor: string;
  cycleNumber: number;
  status: DistributionBatchStatus;
  inputMethod:
    'RATE_PERCENT' | 'AMOUNT_PER_UNIT' | 'TOTAL_DISTRIBUTION_AMOUNT' | 'MANUAL_ALLOCATION' | null;
  actualRatePercent: number | null;
  actualAmountPerUnitMinorUnits: number | null;
  totalDistributionMinorUnits: number | null;
  totalActualReturnMinorUnits: number;
  ownershipCount: number;
  rolloverCompoundsReturns: boolean;
  adminNote: string;
  revision: number;
}>;

export type DistributionBatchDetail = Readonly<{
  batch: DistributionBatch;
  allocations: ReadonlyArray<
    Readonly<{
      _id: string;
      cycleNumber: number;
      principalBeforeMinorUnits: number;
      returnMinorUnits: number;
      principalAfterMinorUnits: number;
      rolledOver: boolean;
      manuallySet?: boolean;
      status: string;
      userId: Readonly<{ name: string; email: string }>;
      ownershipId: Readonly<{
        units: number;
        rolloverElection: 'PAYOUT' | 'COMPOUND' | null;
        rolloverCompoundsReturns: boolean;
      }>;
    }>
  >;
}>;

export type DistributionBatchPage = Readonly<{
  items: DistributionBatch[];
  pagination: Readonly<{ page: number; limit: number; totalItems: number; totalPages: number }>;
}>;

const keys = new Map<string, string>();
const query = (status: string | undefined, range: AdminDateRange, page: number, limit: number) =>
  new URLSearchParams({
    ...(status ? { status } : {}),
    page: String(page),
    limit: String(limit),
    ...Object.fromEntries(new URLSearchParams(dateRangeSearchParams(range))),
  }).toString();

export const distributionBatchService = {
  list: (
    status: DistributionBatchStatus | undefined,
    range: AdminDateRange,
    page = 1,
    limit = 20,
  ) =>
    api<DistributionBatchPage>(
      `/v1/admin/distribution-batches?${query(status, range, page, limit)}`,
      {
        cache: 'no-store',
      },
    ),
  get: (id: string) =>
    api<DistributionBatchDetail>(`/v1/admin/distribution-batches/${id}`, { cache: 'no-store' }),
  setAmount: (
    batch: DistributionBatch,
    inputMethod: 'RATE_PERCENT' | 'AMOUNT_PER_UNIT' | 'TOTAL_DISTRIBUTION_AMOUNT',
    value: number,
  ) => {
    const body =
      inputMethod === 'RATE_PERCENT'
        ? { inputMethod, actualRatePercent: value }
        : inputMethod === 'TOTAL_DISTRIBUTION_AMOUNT'
          ? { inputMethod, totalDistributionMinorUnits: Math.round(value * 100) }
          : { inputMethod, actualAmountPerUnitMinorUnits: Math.round(value * 100) };
    return request<DistributionBatchDetail>(batch, 'amount', body);
  },
  setManualAllocations: (
    batch: DistributionBatch,
    allocations: ReadonlyArray<Readonly<{ accrualId: string; returnMinorUnits: number }>>,
  ) => request<DistributionBatchDetail>(batch, 'manual-allocations', { allocations }),
  review: (batch: DistributionBatch, status: 'APPROVED' | 'REJECTED', note = '') =>
    request<DistributionBatch>(batch, 'review', { status, note }),
};

function request<T>(
  batch: DistributionBatch,
  action: 'amount' | 'manual-allocations' | 'review',
  body: object,
) {
  const fingerprint = `${batch._id}:${batch.revision}:${action}:${JSON.stringify(body)}`;
  const key = keys.get(fingerprint) ?? crypto.randomUUID();
  keys.set(fingerprint, key);
  return api<T>(`/v1/admin/distribution-batches/${batch._id}/${action}`, {
    method: 'PATCH',
    headers: { 'Idempotency-Key': key, 'If-Match': String(batch.revision) },
    body: JSON.stringify(body),
  });
}
