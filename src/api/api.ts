// api.ts - Base API client with interceptors
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { refreshAccessToken } from '@/lib/refreshAccessToken';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// ── Automatic token refresh on 401 ────────────────────────────────────────────
// The accessToken cookie expires after 15 minutes. When any protected request
// returns 401, we refresh it once via POST /api/auth/refresh (which rotates the
// refresh token and re-sets both cookies) and then retry the failed request.
// Without this, users hit "Unauthorized" on protected actions (e.g. posting a
// job) as soon as the access token expires.

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    // Only refresh on 401s from requests that haven't already been retried once.
    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      // Refresh token is invalid/expired too — surface the original 401 to the caller.
      return Promise.reject(error);
    }

    original._retry = true;
    return api(original);
  }
);

export default api;