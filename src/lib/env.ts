import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: { API_SECRET: z.string().min(1) },
  client: { NEXT_PUBLIC_API_URL: z.string().url() },
  runtimeEnv: {
    API_SECRET: process.env.API_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
});
