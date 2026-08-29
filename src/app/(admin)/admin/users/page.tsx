"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useAdminUsers,
  useToggleSuspendUser,
  useChangeUserRole,
} from "@/api/hooks/admin/adminUsersApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatShortDate } from "@/utils/format";
import UserActionModal from "@/components/admin/UserActionModal";
import type { AdminUserItem, AdminUserRoleFilter, AdminUserStatusFilter } from "@/types/admin/adminUsers";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const CSV_FILE_NAME = "user-management-report.csv";

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function userToCsvRow(user: AdminUserItem): string[] {
  return [
    user.userCode,
    user.name,
    user.email,
    user.role,
    user.isSuspended ? "Suspended" : "Active",
    user.createdAt,
  ].map(escapeCsvCell);
}

const ROLE_TABS: Array<{ key: AdminUserRoleFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "poster", label: "Poster" },
  { key: "driver", label: "Driver" },
];

export default function AdminUserManagementPage() {
  const [activeRoleTab, setActiveRoleTab] = useState<AdminUserRoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminUserStatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [modalTargetUser, setModalTargetUser] = useState<AdminUserItem | null>(null);
  const [modalMode, setModalMode] = useState<"details" | "suspend" | "role">("details");

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const { data, isLoading } = useAdminUsers({
    role: activeRoleTab === "all" ? undefined : activeRoleTab,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const toggleSuspendMutation = useToggleSuspendUser();
  const changeRoleMutation = useChangeUserRole();

  const handleRoleTabChange = useCallback((role: AdminUserRoleFilter) => {
    setActiveRoleTab(role);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value as AdminUserStatusFilter);
      setCurrentPage(1);
    },
    []
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

  const users = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const startItem = useMemo(() => (currentPage - 1) * PAGE_SIZE + 1, [currentPage]);
  const endItem = useMemo(() => Math.min(currentPage * PAGE_SIZE, total), [currentPage, total]);

  const handleExportCsv = useCallback(() => {
    if (users.length === 0) {
      toast.info("No user records to export.");
      return;
    }

    const headers = ["User Code", "Name", "Email", "Role", "Status", "Joined"];
    const csvRows = users.map(userToCsvRow);
    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = CSV_FILE_NAME;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${users.length} user records to CSV.`);
  }, [users]);

  const handleOpenDetails = useCallback((user: AdminUserItem) => {
    setModalTargetUser(user);
    setModalMode("details");
  }, []);

  const handleOpenSuspend = useCallback((user: AdminUserItem) => {
    setModalTargetUser(user);
    setModalMode("suspend");
  }, []);

  const handleOpenRoleChange = useCallback((user: AdminUserItem) => {
    setModalTargetUser(user);
    setModalMode("role");
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalTargetUser(null);
  }, []);

  const handleConfirmSuspend = useCallback(
    (userId: string, isSuspended: boolean) => {
      toggleSuspendMutation.mutate(
        { id: userId, data: { isSuspended } },
        {
          onSuccess: () => {
            setModalTargetUser(null);
          },
        }
      );
    },
    [toggleSuspendMutation]
  );

  const handleConfirmRoleChange = useCallback(
    (userId: string, newRole: "poster" | "driver") => {
      changeRoleMutation.mutate(
        { id: userId, data: { role: newRole } },
        {
          onSuccess: () => {
            setModalTargetUser(null);
          },
        }
      );
    },
    [changeRoleMutation]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (data && currentPage < data.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, data]);

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
            User Management
          </h2>
          <p className="text-sm text-secondary mt-1">
            Manage all registered Posters and Drivers in the SwiftShip ecosystem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 h-12 bg-surface-white border border-outline-variant text-on-surface rounded-lg text-sm font-bold hover:bg-surface-container-low transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Controls: Search + Filter Bar */}
      <div className="bg-surface-white border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Search by name or email..."
            className="w-full h-12 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 transition-all shadow-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Role Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">Role:</span>
            <div className="flex bg-surface-container-low p-1 rounded-lg">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleRoleTabChange(tab.key)}
                  className={[
                    "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                    activeRoleTab === tab.key
                      ? "bg-surface-white text-on-surface shadow-sm"
                      : "text-secondary hover:text-on-surface",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-secondary uppercase tracking-wider">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="h-12 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary text-xs uppercase font-semibold border-b border-outline-variant">
                <th className="p-4">User</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Role</th>
                <th className="p-4">Joined</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-secondary">
                    <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                      progress_activity
                    </span>
                    <p className="mt-2 text-xs font-semibold">Loading users directory...</p>
                  </td>
                </tr>
              )}

              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-secondary">
                    <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">
                      person_off
                    </span>
                    <p className="font-bold text-on-surface">No users found</p>
                    <p className="text-xs mt-1">Try adjusting search query or active filters.</p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                users.map((user) => {
                  const isAdmin = user.role === "admin";

                  return (
                    <tr
                      key={user._id}
                      className={[
                        "hover:bg-surface-container-lowest transition-colors",
                        user.isSuspended ? "bg-error-container/10" : "",
                      ].join(" ")}
                    >
                      {/* User Avatar + Name + ID */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-outline-variant">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{user.name}</p>
                            <p className="text-xs font-mono text-secondary mt-0.5">
                              {user.userCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-medium text-on-surface text-sm">{user.email}</p>
                        <p className="text-xs text-secondary mt-0.5">Verified Account</p>
                      </td>

                      {/* Role Badge with Edit */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize",
                              user.role === "poster"
                                ? "bg-primary-container/10 text-primary border border-primary/20"
                                : user.role === "driver"
                                ? "bg-surface-container-high text-on-surface-variant border border-outline-variant"
                                : "bg-warning-amber/10 text-warning-amber border border-warning-amber/20",
                            ].join(" ")}
                          >
                            {user.role}
                          </span>
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenRoleChange(user)}
                              className="p-1 rounded text-secondary hover:bg-surface-container cursor-pointer"
                              title="Change user role"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                edit_note
                              </span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="p-4 whitespace-nowrap text-sm text-secondary font-medium">
                        {formatShortDate(user.createdAt)}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold",
                            user.isSuspended
                              ? "bg-error-container text-error-red border border-error-red/20"
                              : "bg-success-green/10 text-success-green border border-success-green/20",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "w-1.5 h-1.5 rounded-full",
                              user.isSuspended ? "bg-error-red" : "bg-success-green",
                            ].join(" ")}
                          />
                          {user.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(user)}
                            className="px-3 py-1.5 text-xs font-bold text-secondary hover:text-on-surface hover:bg-surface-container rounded-md transition-colors border border-outline-variant cursor-pointer"
                          >
                            Details
                          </button>

                          {!isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleOpenSuspend(user)}
                              className={[
                                "px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer",
                                user.isSuspended
                                  ? "text-success-green bg-success-green/10 hover:bg-success-green/20"
                                  : "text-error-red bg-error-container/30 hover:bg-error-container/60",
                              ].join(" ")}
                            >
                              {user.isSuspended ? "Restore" : "Suspend"}
                            </button>
                          ) : (
                            <span className="text-xs text-secondary italic">Admin</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between bg-surface-white gap-3">
          <span className="text-xs font-semibold text-secondary">
            Showing {total === 0 ? 0 : startItem} to {endItem} of {total} users
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            <span className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {modalTargetUser && (
        <UserActionModal
          user={modalTargetUser}
          mode={modalMode}
          isOpen={Boolean(modalTargetUser)}
          isPending={toggleSuspendMutation.isPending || changeRoleMutation.isPending}
          onClose={handleCloseModal}
          onConfirmSuspend={handleConfirmSuspend}
          onConfirmRoleChange={handleConfirmRoleChange}
        />
      )}
    </div>
  );
}
