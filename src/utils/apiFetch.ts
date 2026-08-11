// apiFetch.ts - fetch() wrapper that transparently refreshes an expired access
// token and retries once on 401. Drop-in replacement for fetch() on protected
// endpoints (same RequestInfo / RequestInit → Response contract). Public
// endpoints that never return 401 pass straight through untouched.

import { refreshAccessToken } from "@/lib/refreshAccessToken";

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  // Only protected endpoints return 401 — public ones pass straight through.
  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    // Refresh token invalid/expired too — surface the original 401 response.
    return response;
  }

  return fetch(input, init);
}
