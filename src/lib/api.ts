import { env } from './env';
import { clearToken, getToken } from './auth';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterSeconds: number | null = null,
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
    throw apiError(response, message);
  }
  return response.json() as Promise<T>;
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = getToken();
  const response = await fetch(new URL(path, env.NEXT_PUBLIC_API_URL), {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw apiError(response, 'Unable to open this document');
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
    throw apiError(response, message);
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

function apiError(response: Response, message: string): ApiError {
  const retryAfterSeconds = readRetryAfter(response);
  return new ApiError(
    response.status,
    response.status === 429 && retryAfterSeconds
      ? `${message} Try again in ${formatWaitTime(retryAfterSeconds)}.`
      : message,
    retryAfterSeconds,
  );
}

function readRetryAfter(response: Response): number | null {
  for (const name of ['Retry-After', 'Retry-After-account', 'Retry-After-ip']) {
    const value = Number(response.headers.get(name));
    if (Number.isFinite(value) && value > 0) return Math.ceil(value);
  }
  return null;
}

function formatWaitTime(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}
