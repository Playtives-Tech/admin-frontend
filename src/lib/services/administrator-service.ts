import { api } from '@/lib/api';

export type Administrator = Readonly<{
  _id: string;
  name: string;
  email: string;
  status: string;
  roles: string[];
}>;

export type AdministratorCandidate = Administrator;

export function listAdministrators(): Promise<Administrator[]> {
  return api<Administrator[]>('/v1/admin/administrators');
}

export async function searchAdministratorCandidates(search: string): Promise<AdministratorCandidate[]> {
  const result = await api<{ items: AdministratorCandidate[] }>(`/v1/admin/users?page=1&limit=20&search=${encodeURIComponent(search)}`);
  return result.items;
}

export function setAdministratorAccess(id: string, enabled: boolean, password: string): Promise<Administrator> {
  return api<Administrator>(`/v1/admin/administrators/${id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled, password }),
  });
}
