import { api } from '@/lib/api';

export type MaintenanceStatus = Readonly<{
  enabled: boolean;
  message: string;
  updatedAt: string | null;
}>;

export const platformSettingsService = {
  getMaintenance: () => api<MaintenanceStatus>('/v1/admin/platform/maintenance', { cache: 'no-store' }),
  setMaintenance: (enabled: boolean, message?: string) =>
    api<MaintenanceStatus>('/v1/admin/platform/maintenance', {
      method: 'PATCH',
      body: JSON.stringify({ enabled, message }),
    }),
};
