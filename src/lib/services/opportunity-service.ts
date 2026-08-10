import { api } from '@/lib/api';

export type OpportunityStatus = 'DRAFT' | 'PUBLISHED';
export type ReturnSchedule = 'MONTHLY' | 'YEARLY' | 'AT_MATURITY';

export interface Opportunity {
  _id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  about?: string;
  agreement?: string;
  pricePerUnitMinorUnits: number;
  minimumUnits: number;
  totalUnits: number;
  availableUnits: number;
  durationMonths: number | null;
  projectedReturnRatePercent: number;
  projectedProfitMinorUnits: number;
  projectedMonthlyProfitMinorUnits: number | null;
  returnSchedule: ReturnSchedule;
  ownershipModel: 'CO_OWNERSHIP' | 'FULL_OWNERSHIP';
  rolloverAllowed: boolean;
  rolloverCompoundsReturns: boolean;
  rolloverNextPrincipalMinorUnits: number | null;
  rolloverNextProjectedProfitMinorUnits: number | null;
  principalReleaseDate?: string | null;
  location?: string;
  operator?: string;
  imageUrl?: string;
  imageKey?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  status: OpportunityStatus;
  publishedAt?: string | null;
}

export type OpportunityPayload = Partial<
  Omit<
    Opportunity,
    | '_id'
    | 'slug'
    | 'availableUnits'
    | 'projectedProfitMinorUnits'
    | 'projectedMonthlyProfitMinorUnits'
    | 'rolloverNextPrincipalMinorUnits'
    | 'rolloverNextProjectedProfitMinorUnits'
    | 'publishedAt'
  >
> &
  Pick<Opportunity, 'title' | 'category' | 'summary'>;

export const opportunityService = {
  list: () => api<Opportunity[]>('/v1/admin/opportunities'),
  get: (id: string) => api<Opportunity>(`/v1/admin/opportunities/${id}`),
  create: (payload: OpportunityPayload) =>
    api<Opportunity>('/v1/admin/opportunities', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<OpportunityPayload>) =>
    api<Opportunity>(`/v1/admin/opportunities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  uploadImage: (file: File) => {
    const body = new FormData();
    body.append('image', file);
    return api<{ imageUrl: string; imageKey: string; imageWidth: number; imageHeight: number }>(
      '/v1/admin/opportunities/image',
      { method: 'POST', body },
    );
  },
};
