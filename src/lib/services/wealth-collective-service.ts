import { api } from '@/lib/api';

export type WealthCollectiveCycle = Readonly<{
  _id: string;
  number: number;
  startsAt: string;
  endsAt: string;
  firstWindowOpensAt?: string | null;
  firstWindowClosesAt: string | null;
  secondWindowOpensAt: string | null;
  secondWindowClosesAt: string | null;
  secondWindowEnabled?: boolean;
  halfwayCandidateAt?: string | null;
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'RECONCILED';
  actualReturnRateBps: number | null;
}>;

export type WealthCollectiveProgramme = Readonly<{
  _id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  projectedTargetRateBps: number | null;
  settlementTimeframe: string;
  aboutFormat: 'TEXT' | 'MARKDOWN' | 'HTML';
  aboutContent: string;
  agreementFormat?: 'TEXT' | 'MARKDOWN' | 'HTML';
  agreementContent?: string;
  agreementVersion?: number;
}>;

export type WealthCollectivePeriod = 'today' | '7d' | '30d' | 'this-month' | 'last-month' | 'all';

export type WealthCollectiveOverview = Readonly<{
  programme: WealthCollectiveProgramme | null;
  cycles: WealthCollectiveCycle[];
  memberWalletBalanceMinorUnits: number;
  committedCapitalMinorUnits: number;
  reservedContributionMinorUnits: number;
  settledAmountMinorUnits: number;
  transactionCount: number;
  pendingEarlyExitCount: number;
  pendingEarlyExitCapitalMinorUnits: number;
  periodStats: Readonly<{
    label: string;
    comparisonLabel: string | null;
    fundsAddedMinorUnits: number;
    deployedMinorUnits: number;
    currentlyReservedMinorUnits: number;
    paidOutMinorUnits: number;
    previousFundsAddedMinorUnits: number;
    previousDeployedMinorUnits: number;
    previousPaidOutMinorUnits: number;
  }>;
  cycleStats: ReadonlyArray<{
    cycleId: string;
    committedCapitalMinorUnits: number;
    contributionCount: number;
    subscriberCount: number;
    scheduledAmountMinorUnits: number;
    scheduledCount: number;
    scheduledSubscriberCount: number;
    manualEligibleCount: number;
    manualEligibleMinorUnits: number;
    newCapitalMinorUnits: number;
    rolloverInMinorUnits: number;
    profitMinorUnits: number;
    rolloverOutMinorUnits: number;
    maturityPayoutMinorUnits: number;
    earlyExitPayoutMinorUnits: number;
    earlyExitPayoutCount: number;
  }>;
  updates: ReadonlyArray<{
    _id: string;
    title: string;
    body: string;
    publishedAt: string;
  }>;
}>;
export type WealthCollectiveMember = Readonly<{
  userId: string;
  name: string;
  email: string;
  memberCode: string | null;
  amountMinorUnits: number;
  addedMinorUnits: number;
  contributionCount: number;
  scheduledAmountMinorUnits: number;
  scheduledCount: number;
  scheduledDeploymentAt: string | null;
  scheduledWindowLabel: '1st' | '16th' | null;
  agreementAccepted: boolean;
  agreementAcceptedAt: string | null;
  agreementSignatureName: string | null;
  monthlyContributionPlan: Readonly<{
    amountMinorUnits: number;
    method: 'MANUAL' | 'AUTOMATIC';
    preferredDebitDay: number | null;
    nextDebitAt: string | null;
    lastAttemptAt: string | null;
    lastStatus: 'PROCESSING' | 'SUCCESSFUL' | 'INSUFFICIENT_FUNDS' | 'FAILED' | null;
    reminderDay: number | null;
    nextReminderAt: string | null;
  }> | null;
}>;

export type WealthCollectiveMemberPage = Readonly<{
  cycleId: string;
  members: WealthCollectiveMember[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>;

export type WealthCollectiveExitPage = Readonly<{
  requests: ReadonlyArray<{
    _id: string;
    userId: { _id: string; name: string; email: string; memberCode?: string };
    capitalMinorUnits: number;
    forfeitedProfitMinorUnits: number;
    settlementTimeframe: string;
    eligibleSettlementAt: string | null;
    canSettle: boolean;
    status: 'REQUESTED' | 'COMPLETED';
    requestedAt: string;
    completedAt: string | null;
  }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}>;

export const wealthCollectiveService = {
  overview: (period: WealthCollectivePeriod = '30d') =>
    api<WealthCollectiveOverview>(`/v1/admin/collectives/overview?period=${period}`, {
      cache: 'no-store',
    }),
  cycleMembers: (cycleId: string, page = 1, limit = 20) =>
    api<WealthCollectiveMemberPage>(
      `/v1/admin/collectives/cycles/${cycleId}/members?page=${page}&limit=${limit}`,
      { cache: 'no-store' },
    ),
  publishUpdate: (input: { title: string; body: string }) =>
    api('/v1/admin/collectives/updates', { method: 'POST', body: JSON.stringify(input) }),
  updateAbout: (input: { format: 'TEXT' | 'MARKDOWN' | 'HTML'; content: string }) =>
    api<WealthCollectiveProgramme>('/v1/admin/collectives/programme/about', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  updateAgreement: (input: { format: 'TEXT' | 'MARKDOWN' | 'HTML'; content: string }) =>
    api<WealthCollectiveProgramme>('/v1/admin/collectives/programme/agreement', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  updateProgrammeStart: (startsAt: string) =>
    api<WealthCollectiveProgramme>('/v1/admin/collectives/programme/start-date', {
      method: 'PATCH',
      body: JSON.stringify({ startsAt }),
    }),
  earlyExits: (page = 1, limit = 20) =>
    api<WealthCollectiveExitPage>(`/v1/admin/collectives/early-exits?page=${page}&limit=${limit}`, {
      cache: 'no-store',
    }),
  completeEarlyExit: (requestId: string) =>
    api(`/v1/admin/collectives/early-exits/${requestId}/complete`, { method: 'POST' }),
  createProgramme: (input: {
    name: string;
    startsAt: string;
    firstWindowClosesAt?: string;
    secondWindowClosesAt?: string;
    projectedTargetRateBps?: number;
    settlementTimeframe?: string;
  }) => api('/v1/admin/collectives/programme', { method: 'POST', body: JSON.stringify(input) }),
  reconcileCycle: (cycleId: string, actualReturnRateBps: number) =>
    api(`/v1/admin/collectives/cycles/${cycleId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ actualReturnRateBps }),
    }),
  updateHalfwayWindow: (cycleId: string, enabled: boolean) =>
    api(`/v1/admin/collectives/cycles/${cycleId}/halfway-window`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  deployPending: (cycleId: string) =>
    api<{ count: number; amountMinorUnits: number }>(
      `/v1/admin/collectives/cycles/${cycleId}/deploy-pending`,
      { method: 'POST', body: JSON.stringify({ confirmed: true }) },
    ),
};
