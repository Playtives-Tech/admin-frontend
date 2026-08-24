import { api } from '@/lib/api';
import { type AdminDateRange, dateRangeSearchParams } from '@/lib/date-range';
import { defaultAdminDateRange } from '@/lib/date-range';

export type AcquisitionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AdminAcquisition = Readonly<{
  _id: string;
  userId: Readonly<{ _id: string; name: string; email: string; status: string }>;
  opportunityId: Readonly<{
    _id: string;
    title: string;
    slug: string;
    category: string;
    status: string;
    availableUnits: number;
    totalUnits: number;
  }>;
  orderId: Readonly<{
    _id: string;
    amountMinorUnits: number;
    units: number;
    unitPriceMinorUnits: number;
  }>;
  units: number;
  amountMinorUnits: number;
  projectedReturnRatePercent: number;
  status: AcquisitionStatus;
  progressPercent: number;
  adminNote?: string;
  revision: number;
  createdAt: string;
  maturityAt: string | null;
  completedAt: string | null;
}>;
export type AcquisitionStats = Readonly<{
  totalAcquisitions: number;
  activeAcquisitions: number;
  totalUnits: number;
  totalAmountMinorUnits: number;
}>;

export const acquisitionService = {
  list: (range: AdminDateRange = defaultAdminDateRange) => api<AdminAcquisition[]>(`/v1/admin/acquisitions?${dateRangeSearchParams(range)}`, { cache: 'no-store' }),
  stats: (range: AdminDateRange = defaultAdminDateRange) => api<AcquisitionStats>(`/v1/admin/acquisitions/stats?${dateRangeSearchParams(range)}`, { cache: 'no-store' }),
};
