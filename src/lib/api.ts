import { env } from './env';
import { clearToken, getToken } from './auth';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const isFormData = init?.body instanceof FormData;
  const response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(!isFormData && init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      clearToken();
      window.location.replace('/login');
    }
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join('. ')
          : String(body.message)
        : 'Request failed. Please try again.';
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new ApiError(response.status, 'Unable to open this document');
  return response.blob();
}

export async function downloadApiFile(path: string, fallbackFilename: string): Promise<void> {
  const token = getToken();
  const response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join('. ')
          : String(body.message)
        : 'Unable to download this file.';
    throw new ApiError(response.status, message);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] ??
    fallbackFilename;
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
