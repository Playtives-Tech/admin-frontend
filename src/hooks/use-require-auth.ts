'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

/**
 * Redirects to /login if the user is not authenticated.
 * Returns `true` once authentication is confirmed (guards can render children).
 */
export function useRequireAuth(): { ready: boolean } {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  return { ready: !isLoading && Boolean(user) };
}
