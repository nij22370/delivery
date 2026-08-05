"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ME_ENDPOINT = "/api/auth/me";
const LOGIN_PATH = "/login";

interface AuthUser {
  _id: string;
  email: string;
  role: "poster" | "driver" | "admin";
  name?: string;
}

interface UseAuthGuardResult {
  user: AuthUser | null;
  isLoading: boolean;
}

export function useAuthGuard(redirectTo: string = LOGIN_PATH): UseAuthGuardResult {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(ME_ENDPOINT);
      if (!response.ok) {
        router.replace(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      const data: { user: AuthUser } = await response.json();
      setUser(data.user);
    } catch {
      router.replace(redirectTo);
    } finally {
      setIsLoading(false);
    }
  }, [router, redirectTo]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { user, isLoading };
}
