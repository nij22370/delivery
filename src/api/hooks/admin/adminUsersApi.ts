// adminUsersApi.ts - TanStack Query hooks for admin users domain
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import {
  getAdminUsers,
  toggleSuspendUser,
  changeUserRole,
} from "../../apis/admin/adminUsersApi";
import type {
  AdminUsersQuery,
  AdminUsersResponse,
  SuspendUserInput,
  SuspendUserResponse,
  ChangeUserRoleInput,
  ChangeUserRoleResponse,
} from "@/types/admin/adminUsers";

export const ADMIN_USERS_QUERY_KEY = "adminUsers";

export function useAdminUsers(query: AdminUsersQuery) {
  return useQuery<AdminUsersResponse>({
    queryKey: [ADMIN_USERS_QUERY_KEY, query],
    queryFn: () => getAdminUsers(query),
    staleTime: 15 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useToggleSuspendUser() {
  const queryClient = useQueryClient();

  return useMutation<
    SuspendUserResponse,
    AxiosError<{ error?: string; message?: string }>,
    { id: string; data?: SuspendUserInput }
  >({
    mutationFn: ({ id, data }) => toggleSuspendUser(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
      toast.success(result.message);
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to update user suspension status";
      toast.error(errorMsg);
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation<
    ChangeUserRoleResponse,
    AxiosError<{ error?: string; message?: string }>,
    { id: string; data: ChangeUserRoleInput }
  >({
    mutationFn: ({ id, data }) => changeUserRole(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_USERS_QUERY_KEY] });
      toast.success(result.message);
    },
    onError: (error) => {
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to change user role";
      toast.error(errorMsg);
    },
  });
}
