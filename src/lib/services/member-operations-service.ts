import { api } from '@/lib/api';

export type AdminWalletSummary = Readonly<{
  id: string;
  currency: 'NGN';
  status: 'active' | 'locked';
  deposit: Readonly<{ availableKobo: number; pendingKobo: number }>;
  earnings: Readonly<{ availableKobo: number; lifetimeEarnedKobo: number }>;
  totalAvailableKobo: number;
}>;

export type ActivityLog = Readonly<{
  _id: string;
  action: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  subjectType: string;
  createdAt: string;
  metadata: Record<string, string | number | boolean | null>;
}>;

export type AdminMember = Readonly<{
  _id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  emailVerifiedAt: string | null;
  createdAt: string;
  walletId: string | null;
}>;

export function getMembers(): Promise<AdminMember[]> {
  return api<AdminMember[]>('/v1/admin/users');
}

export function getMember(userId: string): Promise<AdminMember> {
  return api<AdminMember>(`/v1/admin/users/${encodeURIComponent(userId)}`);
}

export function getMemberWallet(userId: string): Promise<AdminWalletSummary> {
  return api<AdminWalletSummary>(`/v1/admin/users/${encodeURIComponent(userId)}/wallet`);
}

export function getMemberActivity(userId: string): Promise<ActivityLog[]> {
  return api<ActivityLog[]>(`/v1/admin/users/${encodeURIComponent(userId)}/activity-logs`);
}
