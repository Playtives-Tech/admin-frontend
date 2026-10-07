import { api } from '@/lib/api';

export type NotificationAudience =
  | 'all-active'
  | 'collective-members'
  | 'opportunity-subscribers'
  | 'kyc-incomplete'
  | 'specific-members';
export type NotificationChannel = 'inApp' | 'email';

export type NotificationCampaignInput = Readonly<{
  audiences: NotificationAudience[];
  channels: NotificationChannel[];
  reason: string;
  title: string;
  message: string;
  opportunityId?: string;
  specificEmails?: string[];
}>;

export type NotificationPreview = Readonly<{
  recipientCount: number;
  unmatchedSpecificEmails: string[];
}>;

export type NotificationSendResult = NotificationPreview &
  Readonly<{
    id: string;
    status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
    inAppDeliveredCount: number;
    emailDeliveredCount: number;
    emailFailedCount: number;
  }>;

export type NotificationCampaign = Readonly<{
  _id: string;
  audiences: NotificationAudience[];
  channels: NotificationChannel[];
  reason: string;
  title: string;
  recipientCount: number;
  inAppDeliveredCount: number;
  emailDeliveredCount: number;
  emailFailedCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  createdAt: string;
  createdBy?: { name: string; email: string };
  opportunityId?: { title: string } | null;
}>;

export const notificationService = {
  preview: (input: NotificationCampaignInput) =>
    api<NotificationPreview>('/v1/admin/notifications/preview', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  send: (input: NotificationCampaignInput) =>
    api<NotificationSendResult>('/v1/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  campaigns: () => api<NotificationCampaign[]>('/v1/admin/notifications/campaigns'),
};
