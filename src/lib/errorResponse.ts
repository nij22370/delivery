import { AxiosError } from "axios";

export function getBackendErrorMessage(
  error: AxiosError,
  fallback: string
): string {
  const data = error?.response?.data as any;
  return data?.message || data?.detail || fallback;
}
