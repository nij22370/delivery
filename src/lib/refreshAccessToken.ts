// refreshAccessToken.ts - Single-flight access-token refresh shared by the axios
// interceptor (src/api/api.ts) and the fetch wrapper (src/utils/apiFetch.ts).
//
// The accessToken cookie expires after 15 minutes. POST /api/auth/refresh issues
// a new token pair and rotates the stored refresh-token hash, so concurrent
// refreshes would each fail against the other's already-rotated hash — hence a
// single shared promise that all 401 handlers await.

import axios from "axios";

let refreshPromise: Promise<boolean> | null = null;

export function refreshAccessToken(): Promise<boolean> {
  // Bare axios (not the `api` instance) — the refresh request never enters the
  // response interceptor, so it cannot recurse into another refresh.
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
