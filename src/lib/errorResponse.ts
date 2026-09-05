import { AxiosError } from "axios";

export function getBackendErrorMessage(
  error: AxiosError,
  fallback: string
): string {
  const data = error?.response?.data as Record<string, unknown> | undefined;
  if (typeof data?.message === "string") return data.message;
  if (typeof data?.detail === "string") return data.detail;
  return fallback;
}
