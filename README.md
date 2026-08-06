# Playtives Admin

Next.js App Router foundation for the Playtives administration experience.

## Setup

Copy `.env.example` to `.env.local`, set the API URL and server secret, then run `pnpm install` and `pnpm dev`.

## Environment

`NEXT_PUBLIC_API_URL` is the public API origin. `API_SECRET` is validated server-side and must never be exposed to client code.

The login screen authenticates through `POST /v1/admin/auth/login`. Both the backend and the client-side session parser require the issued JWT to contain the `ADMIN` role; the former mock-token bypass has been removed.

## Scripts

`pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, and `pnpm format`.

## Structure

- `src/app`: routes, metadata, and route states
- `src/components/ui`: reusable interface primitives
- `src/lib`: validated environment configuration, API client, and utilities
- `src/hooks` and `src/types`: application-wide hooks and types
- `src/styles`: visual tokens and global styles
