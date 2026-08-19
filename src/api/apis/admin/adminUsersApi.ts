// adminUsersApi.ts - Plain async functions for admin users domain
import api from "../../api";
import type {
  AdminUsersQuery,
  AdminUsersResponse,
  SuspendUserInput,
  SuspendUserResponse,
  ChangeUserRoleInput,
  ChangeUserRoleResponse,
} from "@/types/admin/adminUsers";

const ADMIN_USERS_ENDPOINT = "/admin/users";

export async function getAdminUsers(query: AdminUsersQuery): Promise<AdminUsersResponse> {
  const params: Record<string, string> = {};
  if (query.role !== undefined && query.role !== "all") params.role = query.role;
  if (query.status !== undefined && query.status !== "all") params.status = query.status;
  if (query.search !== undefined && query.search.trim()) params.search = query.search.trim();
  if (query.page !== undefined) params.page = String(query.page);
  if (query.limit !== undefined) params.limit = String(query.limit);

  const response = await api.get<AdminUsersResponse>(ADMIN_USERS_ENDPOINT, { params });
  return response.data;
}

export async function toggleSuspendUser(
  id: string,
  data?: SuspendUserInput
): Promise<SuspendUserResponse> {
  const response = await api.patch<SuspendUserResponse>(
    `${ADMIN_USERS_ENDPOINT}/${id}/suspend`,
    data || {}
  );
  return response.data;
}

export async function changeUserRole(
  id: string,
  data: ChangeUserRoleInput
): Promise<ChangeUserRoleResponse> {
  const response = await api.patch<ChangeUserRoleResponse>(
    `${ADMIN_USERS_ENDPOINT}/${id}/role`,
    data
  );
  return response.data;
}
