'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ApiError } from '@/lib/api';
import { loginAdmin } from '@/lib/services/auth-service';
import { cn } from '@/lib/utils';

export default function LoginPage(): React.JSX.Element {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setIsPending(true);
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      const response = await loginAdmin(email.trim().toLowerCase(), password);
      if (!response.user.roles.includes('ADMIN')) throw new Error('Admin access is required');
      login(response.accessToken);
      router.replace('/overview');
    } catch (err: unknown) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="app-background flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2">
            <span className="font-sans text-2xl font-semibold tracking-tight">
              Playtives Admin
            </span>
          </span>
          <p className="text-sm text-muted-foreground">Sign in to your admin workspace</p>
        </div>

        {/* Card */}
        <div className="app-surface rounded-2xl border px-8 py-8 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="grid gap-5">
            {/* Error banner */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@playtives.com"
                className={cn(
                  'rounded-xl border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                  'outline-none ring-offset-background transition',
                  'focus:border-brand/50 focus:ring-2 focus:ring-brand/25',
                )}
              />
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'rounded-xl border bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                  'outline-none ring-offset-background transition',
                  'focus:border-brand/50 focus:ring-2 focus:ring-brand/25',
                )}
              />
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isPending}
              className={cn(
                'mt-1 w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-brand-foreground',
                'transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Playtives Admin — restricted access
        </p>
      </div>
    </main>
  );
}
