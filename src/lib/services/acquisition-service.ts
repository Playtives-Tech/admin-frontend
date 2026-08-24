import { api } from '@/lib/api';

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
  list: () => api<AdminAcquisition[]>('/v1/admin/acquisitions', { cache: 'no-store' }),
  stats: () => api<AcquisitionStats>('/v1/admin/acquisitions/stats', { cache: 'no-store' }),
};
