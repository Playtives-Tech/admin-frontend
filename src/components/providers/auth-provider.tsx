'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearToken, decodeToken, getToken, setToken } from '@/lib/auth';

interface AdminUser {
  sub: string;
  email: string;
  roles: string[];
}

interface AuthContextValue {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseToken(token: string | null): AdminUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (
    !payload ||
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    !Array.isArray(payload.roles) ||
    !payload.roles.every((role) => typeof role === 'string') ||
    !payload.roles.includes('ADMIN')
  )
    return null;
  // Check expiry
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }
  return { sub: payload.sub, email: payload.email, roles: payload.roles };
}

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    setTokenState(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  const user = useMemo(() => parseToken(token), [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, login, logout }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
