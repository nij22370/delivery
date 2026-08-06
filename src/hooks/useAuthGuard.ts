import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../api/api";

const ME_ENDPOINT = "/auth/me";
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
      const response = await api.get<{ user: AuthUser }>(ME_ENDPOINT);
      setUser(response.data.user);
    } catch (error) {
      router.replace(
        `${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`
      );
    }
    finally {
      setIsLoading(false);
    }
  }, [router, redirectTo]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { user, isLoading };
}