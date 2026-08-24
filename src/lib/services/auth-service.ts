import { api } from '@/lib/api';

export type AdminLoginResponse = Readonly<{
  accessToken: string;
  user: Readonly<{
    id: string;
    name: string;
    email: string;
    emailVerified: true;
    roles: string[];
  }>;
}>;

export function loginAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  return api<AdminLoginResponse>('/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}
