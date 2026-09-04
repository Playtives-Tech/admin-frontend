import { api } from '@/lib/api';
import { env } from '@/lib/env';

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED' | 'INTEREST_OPEN' | 'INTEREST_CLOSED' | 'FUNDING_OPEN' | 'FULLY_SUBSCRIBED' | 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED' | 'DELETING';
export type ReturnSchedule = 'MONTHLY' | 'YEARLY' | 'AT_MATURITY';
export type OpportunityStructure = 'CO_OWNERSHIP' | 'CO_FUNDING' | 'FULL_OWNERSHIP';
export type ReturnModel =
  | 'PROFIT_SHARING_VARIABLE'
  | 'REVENUE_SHARING_VARIABLE'
  | 'PROJECTED_MONTHLY_RETURN'
  | 'CAPITAL_APPRECIATION'
  | 'HYBRID'
  | 'NO_PERIODIC_INCOME';
export type ProjectionType =
  | 'PERCENTAGE'
  | 'AMOUNT'
  | 'RANGE'
  | 'PERCENTAGE_RANGE'
  | 'AMOUNT_AND_PERCENTAGE_RANGE'
  | 'NOT_APPLICABLE';
export type TermType = 'FIXED_TERM' | 'LIFE_OF_ASSET';
export type DurationUnit = 'DAYS' | 'MONTHS' | 'YEARS';
export type AgreementStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface Opportunity {
  _id: string;
  slug: string;
  title: string;
  category: string;
  opportunityStructure: OpportunityStructure;
  returnModel: ReturnModel;
  projectionType: ProjectionType;
  summary: string;
  about?: string;
  agreement?: string;
  agreementVersion: string;
  agreementEffectiveDate: string | null;
  agreementStatus: AgreementStatus;
  agreementResourceUrl: string;
  pricePerUnitMinorUnits: number;
  minimumUnits: number;
  totalUnits: number;
  memberFundedUnits: number;
  sponsorUnits: number;
  totalEconomicUnits: number;
  fundingTargetMinorUnits: number;
  ownershipPerUnitPercent: number | null;
  maximumUnitsPerMember: number | null;
  availableUnits: number;
  durationMonths: number | null;
  termType: TermType;
  durationValue: number | null;
  durationUnit: DurationUnit | null;
  fundingOpensAt: string | null;
  fundingDeadlineAt: string | null;
  closeWhenFullySubscribed: boolean;
  targetActivationAt: string | null;
  capitalExitDescription: string;
  projectionDisclaimer: string;
  projectedReturnRatePercent: number;
  projectedDistributionPerUnitMinorUnits: number | null;
  projectedDistributionPerUnitMinimumMinorUnits: number | null;
  projectedDistributionPerUnitMaximumMinorUnits: number | null;
  equivalentProjectedPercentage: number | null;
  equivalentProjectedMinimumPercentage: number | null;
  equivalentProjectedMaximumPercentage: number | null;
  projectedProfitMinorUnits: number;
  projectedMonthlyProfitMinorUnits: number | null;
  returnSchedule: ReturnSchedule;
  rolloverAllowed: boolean;
  rolloverCompoundsReturns: boolean;
  rolloverNextPrincipalMinorUnits: number | null;
  rolloverNextProjectedProfitMinorUnits: number | null;
  memberAvailabilityDate?: string | null;
  offerClosesAt?: string | null;
  commencementDate?: string | null;
  location?: string;
  imageUrl?: string;
  imageKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  interestModeEnabled: boolean;
  interestTargetAmount: number | null;
  interestOpensAt: string | null;
  interestClosesAt: string | null;
  showInterestProgress: boolean;
  collectOpeningCapital: boolean;
  collectRecurringAmount: boolean;
  recurringFrequency: 'monthly' | null;
  collectCapitalReadiness: boolean;
  interestAcknowledgementText: string;
  interestAcknowledgementVersion: string;
  status: OpportunityStatus;
  publishedAt?: string | null;
  revision: number;
}

export type OpportunityInterestRegistration = { _id: string; openingCapital: number; recurringAmount: number | null; recurringFrequency: 'monthly' | null; capitalReadiness: 'available_now' | 'within_7_days' | 'not_sure'; status: string; acknowledgementVersion: string; createdAt: string; updatedAt: string; userId: { _id: string; name: string; email: string; phone?: string | null }; opportunityId: { _id: string; title: string; slug: string } };

export type OpportunityPayload = Partial<
  Omit<
    Opportunity,
    | '_id'
    | 'slug'
    | 'availableUnits'
    | 'projectedProfitMinorUnits'
    | 'totalEconomicUnits'
    | 'fundingTargetMinorUnits'
    | 'ownershipPerUnitPercent'
    | 'equivalentProjectedPercentage'
    | 'equivalentProjectedMinimumPercentage'
    | 'equivalentProjectedMaximumPercentage'
    | 'projectedMonthlyProfitMinorUnits'
    | 'rolloverNextPrincipalMinorUnits'
    | 'rolloverNextProjectedProfitMinorUnits'
    | 'publishedAt'
  >
> &
  Pick<Opportunity, 'title' | 'category' | 'summary'>;

const requestKeys = new Map<string, string>();
function idempotencyKey(scope: string, payload: unknown): string {
  const fingerprint = `${scope}:${JSON.stringify(payload)}`;
  const existing = requestKeys.get(fingerprint);
  if (existing) return existing;
  const created = crypto.randomUUID();
  if (requestKeys.size >= 100) requestKeys.delete(requestKeys.keys().next().value ?? '');
  requestKeys.set(fingerprint, created);
  return created;
}

export const opportunityService = {
  list: () => api<Opportunity[]>('/v1/admin/opportunities'),
  get: (id: string) => api<Opportunity>(`/v1/admin/opportunities/${id}`),
  interests: (opportunityId?: string) => api<OpportunityInterestRegistration[]>(`/v1/admin/opportunities/interests${opportunityId ? `?opportunityId=${encodeURIComponent(opportunityId)}` : ''}`),
  create: (payload: OpportunityPayload) =>
    api<Opportunity>('/v1/admin/opportunities', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey('create', payload) },
      body: JSON.stringify(payload),
    }),
  update: (id: string, revision: number, payload: Partial<OpportunityPayload>) =>
    api<Opportunity>(`/v1/admin/opportunities/${id}`, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey(`update:${id}:${revision}`, payload),
        'If-Match': String(revision),
      },
      body: JSON.stringify(payload),
    }),
  delete: (id: string, revision: number, confirmationTitle: string) =>
    api<{ id: string; deleted: true }>(`/v1/admin/opportunities/${id}`, {
      method: 'DELETE',
      headers: {
        'Idempotency-Key': idempotencyKey(`delete:${id}:${revision}`, { confirmationTitle }),
        'If-Match': String(revision),
      },
      body: JSON.stringify({ confirmationTitle }),
    }),
  uploadImage: (file: File) => {
    const body = new FormData();
    body.append('image', file);
    return api<{ imageUrl: string; imageKey: string; imageWidth: number; imageHeight: number }>(
      '/v1/admin/opportunities/image',
      {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey('image', {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          }),
        },
        body,
      },
    );
  },
  subscribe: (onChange: () => void) => {
    const source = new EventSource(
      new URL('/v1/opportunities/events', env.NEXT_PUBLIC_API_URL).toString(),
    );
    source.addEventListener('opportunity', onChange);
    return () => source.close();
  },
};
