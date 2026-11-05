'use client';

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiError } from './api';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => {
          if (err instanceof ApiError && [400, 401, 403, 404, 422].includes(err.status)) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
