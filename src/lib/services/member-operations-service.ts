import { api } from '@/lib/api';
import { type AdminDateRange, dateRangeSearchParams } from '@/lib/date-range';

export type AdminWalletSummary = Readonly<{
  id: string;
  currency: 'NGN';
  status: 'active' | 'locked';
  deposit: Readonly<{
    availableBalanceMinorUnits: number;
    pendingBalanceMinorUnits: number;
  }>;
  earnings: Readonly<{
    availableBalanceMinorUnits: number;
    lifetimeEarningsMinorUnits: number;
  }>;
  totalAvailableBalanceMinorUnits: number;
}>;

export type ActivityLog = Readonly<{
  _id: string;
  action: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  subjectType: string;
  subjectId: string;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}>;

export type AdminMember = Readonly<{
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  status: 'active' | 'suspended';
  emailVerifiedAt: string | null;
  createdAt: string;
  walletId: string | null;
  roles: ('MEMBER' | 'ADMIN')[];
  activeOwnershipCount: number;
  totalInvestedMinorUnits: number;
  kycStatus: 'pending' | 'verified' | 'rejected';
  kycVerifiedAt: string | null;
  kycReviewNote: string | null;
  nextOfKin: Readonly<{
    fullName: string;
    relationship: string;
    phone: string;
    email: string | null;
    address: string | null;
  }> | null;
}>;

export type MembersPage = Readonly<{
  items: AdminMember[];
  pagination: Readonly<{ page: number; limit: number; totalItems: number; totalPages: number }>;
}>;

export function getMembers(input: {
  page: number;
  limit: number;
  search?: string;
  status?: 'all' | 'active' | 'pending' | 'suspended';
  range: AdminDateRange;
}): Promise<MembersPage> {
  const query = new URLSearchParams({ page: String(input.page), limit: String(input.limit) });
  if (input.search) query.set('search', input.search);
  if (input.status && input.status !== 'all') query.set('status', input.status);
  new URLSearchParams(dateRangeSearchParams(input.range)).forEach((value, key) =>
    query.set(key, value),
  );
  return api<MembersPage>(`/v1/admin/users?${query.toString()}`);
}

export function getMember(userId: string): Promise<AdminMember> {
  return api<AdminMember>(`/v1/admin/users/${encodeURIComponent(userId)}`);
}

export function updateMemberStatus(
  userId: string,
  status: 'active' | 'suspended',
): Promise<AdminMember> {
  return api<AdminMember>(`/v1/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function updateMemberKyc(
  userId: string,
  status: 'pending' | 'verified' | 'rejected',
  note?: string,
): Promise<AdminMember> {
  return api<AdminMember>(`/v1/admin/users/${encodeURIComponent(userId)}/kyc`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export function getMemberWallet(userId: string): Promise<AdminWalletSummary> {
  return api<AdminWalletSummary>(`/v1/admin/users/${encodeURIComponent(userId)}/wallet`);
}

export function creditMemberEarnings(
  userId: string,
  input: { amountMinorUnits: number; reference: string },
): Promise<AdminWalletSummary> {
  return api<AdminWalletSummary>(`/v1/admin/users/${encodeURIComponent(userId)}/earnings`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getMemberActivity(userId: string): Promise<ActivityLog[]> {
  return api<ActivityLog[]>(`/v1/admin/users/${encodeURIComponent(userId)}/activity-logs`);
}

type RequestUser = Readonly<{ _id: string; name: string; email: string }>;

export type AdminDepositRequest = Readonly<{
  _id: string;
  userId: RequestUser;
  amountMinorUnits: number;
  receiptImageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
}>;

export function getDepositRequests(range: AdminDateRange): Promise<AdminDepositRequest[]> {
  return api<AdminDepositRequest[]>(`/v1/admin/wallet/deposits?${dateRangeSearchParams(range)}`);
}

export type SettledPaystackDeposit = Readonly<{
  _id: string;
  userId: RequestUser;
  amountMinorUnits: number;
  currency: 'NGN';
  reference: string;
  channel: 'card' | 'bank_transfer';
  paidAt: string | null;
  creditedAt: string | null;
  createdAt: string;
}>;

export function getSettledPaystackDeposits(
  range: AdminDateRange,
): Promise<SettledPaystackDeposit[]> {
  return api<SettledPaystackDeposit[]>(
    `/v1/admin/wallet/deposits/settled?${dateRangeSearchParams(range)}`,
  );
}

export function reviewDepositRequest(
  requestId: string,
  status: 'approved' | 'rejected',
): Promise<AdminDepositRequest> {
  return api<AdminDepositRequest>(`/v1/admin/wallet/deposits/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export type AdminWithdrawalRequest = Readonly<{
  _id: string;
  userId: RequestUser;
  amountMinorUnits: number;
  depositDebitMinorUnits: number;
  earningsDebitMinorUnits: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: string;
  reviewedAt: string | null;
  paymentReference: string | null;
  reviewNote: string | null;
}>;

export function getWithdrawalRequests(range: AdminDateRange): Promise<AdminWithdrawalRequest[]> {
  return api<AdminWithdrawalRequest[]>(
    `/v1/admin/wallet/withdrawals?${dateRangeSearchParams(range)}`,
  );
}

export function reviewWithdrawalRequest(
  requestId: string,
  status: 'completed' | 'rejected',
  input: { paymentReference?: string; note?: string },
): Promise<AdminWithdrawalRequest> {
  return api<AdminWithdrawalRequest>(
    `/v1/admin/wallet/withdrawals/${encodeURIComponent(requestId)}`,
    { method: 'PATCH', body: JSON.stringify({ status, ...input }) },
  );
}

export function getAdminActivity(): Promise<ActivityLog[]> {
  return api<ActivityLog[]>('/v1/admin/activity-logs');
}

export type AdminOverview = Readonly<{
  depositsMinorUnits: number;
  manualOpportunityCapitalMinorUnits: number;
  trackedCapitalInflowsMinorUnits: number;
  withdrawalsMinorUnits: number;
  users: number;
  investedMinorUnits: number;
  expectedReturnMinorUnits: number;
  growth: ReadonlyArray<
    Readonly<{
      month: string;
      label: string;
      investedMinorUnits: number;
      ownerships: number;
    }>
  >;
}>;

export function getAdminOverview(range: AdminDateRange): Promise<AdminOverview> {
  return api<AdminOverview>(`/v1/admin/overview?${dateRangeSearchParams(range)}`, {
    cache: 'no-store',
  });
}

export type AdminNameChangeRequest = Readonly<{
  id: string;
  user: Readonly<{ id: string; name: string; email: string }>;
  reason: string;
  identityDocumentType?: string | null;
  identityDocumentNumber?: string | null;
  identityDocumentUrl?: string | null;
  identityDocumentFileName?: string | null;
  status: 'PENDING' | 'LINK_SENT' | 'COMPLETED';
  createdAt: string;
  linkSentAt: string | null;
  completedAt: string | null;
}>;

export function getNameChangeRequests(range: AdminDateRange): Promise<AdminNameChangeRequest[]> {
  return api<AdminNameChangeRequest[]>(
    `/v1/admin/name-change-requests?${dateRangeSearchParams(range)}`,
    { cache: 'no-store' },
  );
}

export function sendNameChangeLink(requestId: string): Promise<AdminNameChangeRequest> {
  return api<AdminNameChangeRequest>(
    `/v1/admin/name-change-requests/${encodeURIComponent(requestId)}/send-link`,
    { method: 'POST' },
  );
}
