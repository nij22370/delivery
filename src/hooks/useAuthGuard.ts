"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { AuthUser } from "@/types/auth/auth";

const LOGIN_PATH = "/login";

interface UseAuthGuardResult {
  user: AuthUser | null;
  isLoading: boolean;
}

/**
 * Route-protection hook: delegates the auth fetch to useAuth() and redirects
 * unauthenticated users to the login page once the auth check has resolved.
 */
export function useAuthGuard(redirectTo: string = LOGIN_PATH): UseAuthGuardResult {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || user) {
      return;
    }

    router.replace(
      `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`
    );
  }, [isLoading, user, router, redirectTo]);

  return { user, isLoading };
}
