const TOKEN_KEY = 'playtives_admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && isExpired(token)) {
    clearToken();
    if (window.location.pathname !== '/login') window.location.replace('/login');
    return null;
  }
  return token;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  scheduleExpiry(token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

let expiryTimer: ReturnType<typeof setTimeout> | undefined;
function isExpired(token: string): boolean {
  const exp = decodeToken(token)?.exp;
  return typeof exp !== 'number' || exp * 1000 <= Date.now();
}

function scheduleExpiry(token: string): void {
  if (expiryTimer) clearTimeout(expiryTimer);
  const exp = decodeToken(token)?.exp;
  if (typeof exp !== 'number') return;
  expiryTimer = setTimeout(() => {
    clearToken();
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }, Math.max(0, exp * 1000 - Date.now()));
}

/** Decode a JWT payload without verification (client-side only). */
export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}
