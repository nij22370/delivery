"use client";

import { useEffect, useState } from "react";
import { getMe } from "@/api/apis/auth/authApi";
import type { AuthUser } from "@/types/auth/auth";

interface UseAuthResult {
  user: AuthUser | null;
  isLoading: boolean;
}

/**
 * Non-redirecting auth hook for UI state.
 * Fetches the current user from GET /auth/me on mount and exposes it to consumers
 * (e.g. the header). It never redirects — use useAuthGuard instead when a route
 * must send unauthenticated users to the login page.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getMe()
      .then((response) => {
        if (isMounted) {
          setUser(response.user);
        }
      })
      .catch(() => {
        // 401 (not logged in / expired token) or server error → treat as logged out.
        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { user, isLoading };
}
