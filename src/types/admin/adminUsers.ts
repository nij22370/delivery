// adminUsers.ts - Types for the admin user management domain

export type AdminUserRole = "poster" | "driver" | "admin";
export type AdminUserStatusFilter = "all" | "active" | "suspended";
export type AdminUserRoleFilter = "all" | "poster" | "driver" | "admin";

export interface AdminUserItem {
  _id: string;
  userCode: string;
  name: string;
  email: string;
  role: AdminUserRole;
  isSuspended: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserStats {
  totalUsers: number;
  totalPosters: number;
  totalDrivers: number;
  totalSuspended: number;
}

export interface AdminUsersQuery {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminUsersResponse {
  success: boolean;
  data: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: AdminUserStats;
}

export interface SuspendUserInput {
  isSuspended?: boolean;
}

export interface SuspendUserResponse {
  success: boolean;
  message: string;
  data: AdminUserItem;
}

export interface ChangeUserRoleInput {
  role: "poster" | "driver";
}

export interface ChangeUserRoleResponse {
  success: boolean;
  message: string;
  data: AdminUserItem;
}
