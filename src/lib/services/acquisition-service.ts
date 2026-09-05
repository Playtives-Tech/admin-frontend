import { api } from '@/lib/api';
import { type AdminDateRange, dateRangeSearchParams } from '@/lib/date-range';
import { defaultAdminDateRange } from '@/lib/date-range';

export type AcquisitionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AcquisitionSource = 'MEMBER_WALLET' | 'ADMIN_MANUAL';
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
    returnSchedule?: 'MONTHLY' | 'YEARLY' | 'AT_MATURITY';
    projectedDistributionPerUnitMinimumMinorUnits?: number | null;
    projectedDistributionPerUnitMaximumMinorUnits?: number | null;
    equivalentProjectedMinimumPercentage?: number | null;
    equivalentProjectedMaximumPercentage?: number | null;
  }>;
  orderId: Readonly<{
    _id: string;
    amountMinorUnits: number;
    units: number;
    unitPriceMinorUnits: number;
  }>;
  units: number;
  amountMinorUnits: number;
  acquisitionSource?: AcquisitionSource;
  assignmentReference?: string | null;
  assignmentNote?: string;
  projectedReturnRatePercent: number;
  projectedReturnMinorUnits: number | null;
  returnSchedule?: 'MONTHLY' | 'YEARLY' | 'AT_MATURITY';
  projectedDistributionMinimumMinorUnits?: number | null;
  projectedDistributionMaximumMinorUnits?: number | null;
  equivalentProjectedMinimumPercentage?: number | null;
  equivalentProjectedMaximumPercentage?: number | null;
  ownershipPercentageAtPurchase: number | null;
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
  list: (range: AdminDateRange = defaultAdminDateRange) =>
    api<AdminAcquisition[]>(`/v1/admin/acquisitions?${dateRangeSearchParams(range)}`, {
      cache: 'no-store',
    }),
  stats: (range: AdminDateRange = defaultAdminDateRange) =>
    api<AcquisitionStats>(`/v1/admin/acquisitions/stats?${dateRangeSearchParams(range)}`, {
      cache: 'no-store',
    }),
  assignManual: (input: {
    userId: string;
    opportunityId: string;
    units: number;
    amountMinorUnits: number;
    opportunityRevision: number;
    reference: string;
    note?: string;
    rolloverElection?: 'PAYOUT' | 'COMPOUND';
  }) =>
    api<AdminAcquisition>('/v1/admin/acquisitions/manual', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};

export function projectedReturnForAcquisition(acquisition: AdminAcquisition): number {
  return (
    acquisition.projectedReturnMinorUnits ??
    Math.round((acquisition.amountMinorUnits * acquisition.projectedReturnRatePercent) / 100)
  );
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value / 100);

function distributionBounds(acquisition: AdminAcquisition): Readonly<{
  minimum: number | null;
  maximum: number | null;
}> {
  const minimum =
    acquisition.projectedDistributionMinimumMinorUnits ??
    (acquisition.opportunityId.projectedDistributionPerUnitMinimumMinorUnits == null
      ? null
      : acquisition.opportunityId.projectedDistributionPerUnitMinimumMinorUnits *
        acquisition.units);
  const maximum =
    acquisition.projectedDistributionMaximumMinorUnits ??
    (acquisition.opportunityId.projectedDistributionPerUnitMaximumMinorUnits == null
      ? null
      : acquisition.opportunityId.projectedDistributionPerUnitMaximumMinorUnits *
        acquisition.units);
  return { minimum, maximum };
}

export function hasVariableProjectedDistribution(acquisition: AdminAcquisition): boolean {
  const { minimum, maximum } = distributionBounds(acquisition);
  return minimum !== null || maximum !== null;
}

export function projectedDistributionLabel(acquisition: AdminAcquisition): string {
  const { minimum, maximum } = distributionBounds(acquisition);
  if (minimum !== null && maximum !== null)
    return minimum === maximum
      ? formatMoney(minimum)
      : `${formatMoney(minimum)}–${formatMoney(maximum)}`;
  if (minimum !== null) return formatMoney(minimum);
  if (maximum !== null) return formatMoney(maximum);
  return formatMoney(projectedReturnForAcquisition(acquisition));
}

export function projectedDistributionSupportingText(acquisition: AdminAcquisition): string {
  if (!hasVariableProjectedDistribution(acquisition))
    return `${acquisition.projectedReturnRatePercent}% projected`;
  const schedule = acquisition.returnSchedule ?? acquisition.opportunityId.returnSchedule;
  return `${schedule === 'YEARLY' ? 'Yearly' : schedule === 'AT_MATURITY' ? 'At maturity' : 'Monthly'} projected distribution`;
}
