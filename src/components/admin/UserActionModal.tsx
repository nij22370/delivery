"use client";

import { useState, useCallback } from "react";
import type { AdminUserItem } from "@/types/admin/adminUsers";
import { formatShortDate } from "@/utils/format";

interface UserActionModalProps {
  user: AdminUserItem;
  mode: "details" | "suspend" | "role";
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirmSuspend: (userId: string, isSuspended: boolean) => void;
  onConfirmRoleChange: (userId: string, newRole: "poster" | "driver") => void;
}

export default function UserActionModal({
  user,
  mode,
  isOpen,
  isPending,
  onClose,
  onConfirmSuspend,
  onConfirmRoleChange,
}: UserActionModalProps) {
  const [selectedRole, setSelectedRole] = useState<"poster" | "driver">(
    user.role === "driver" ? "poster" : "driver"
  );

  const handleSuspendConfirm = useCallback(() => {
    onConfirmSuspend(user._id, !user.isSuspended);
  }, [user._id, user.isSuspended, onConfirmSuspend]);

  const handleRoleConfirm = useCallback(() => {
    onConfirmRoleChange(user._id, selectedRole);
  }, [user._id, selectedRole, onConfirmRoleChange]);

  const handleRoleSelect = useCallback((role: "poster" | "driver") => {
    setSelectedRole(role);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface-white rounded-xl shadow-xl border border-outline-variant p-6 flex flex-col gap-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              {mode === "details"
                ? "account_circle"
                : mode === "suspend"
                ? user.isSuspended
                  ? "lock_open"
                  : "block"
                : "swap_horiz"}
            </span>
            <h3 className="text-lg font-bold text-on-surface">
              {mode === "details"
                ? "User Details"
                : mode === "suspend"
                ? user.isSuspended
                  ? "Restore User Account"
                  : "Suspend User Account"
                : "Change User Role"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-secondary hover:bg-surface-container cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* DETAILS MODE */}
        {mode === "details" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-on-surface truncate">{user.name}</h4>
                <p className="text-xs text-secondary truncate">{user.email}</p>
                <p className="text-[11px] font-mono text-primary font-semibold mt-0.5">
                  {user.userCode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <p className="text-secondary font-semibold uppercase tracking-wider mb-1">Role</p>
                <p className="font-bold text-on-surface capitalize">{user.role}</p>
              </div>
              <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <p className="text-secondary font-semibold uppercase tracking-wider mb-1">Status</p>
                <p
                  className={[
                    "font-bold",
                    user.isSuspended ? "text-error-red" : "text-success-green",
                  ].join(" ")}
                >
                  {user.isSuspended ? "Suspended" : "Active"}
                </p>
              </div>
              <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <p className="text-secondary font-semibold uppercase tracking-wider mb-1">Joined</p>
                <p className="font-bold text-on-surface">{formatShortDate(user.createdAt)}</p>
              </div>
              <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-lg">
                <p className="text-secondary font-semibold uppercase tracking-wider mb-1">
                  User ID
                </p>
                <p className="font-mono text-[11px] text-secondary truncate">{user._id}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 h-12 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* SUSPEND / RESTORE MODE */}
        {mode === "suspend" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">
              Are you sure you want to {user.isSuspended ? "restore" : "suspend"}{" "}
              <strong className="text-on-surface">{user.name}</strong> ({user.email})?
            </p>

            <div
              className={[
                "p-3 rounded-lg border text-xs flex items-start gap-2",
                user.isSuspended
                  ? "bg-success-green/10 border-success-green/30 text-success-green"
                  : "bg-error-container/20 border-error-red/30 text-error-red",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">
                {user.isSuspended ? "check_circle" : "warning"}
              </span>
              <p>
                {user.isSuspended
                  ? "Restoring this account will re-enable all login access and marketplace permissions immediately."
                  : "Suspended users are immediately blocked from all authenticated API requests and marketplace actions."}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 h-12 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendConfirm}
                disabled={isPending}
                className={[
                  "px-5 h-12 rounded-lg text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm",
                  user.isSuspended
                    ? "bg-success-green hover:bg-success-green/90"
                    : "bg-error-red hover:bg-error-red/90",
                ].join(" ")}
              >
                {isPending && (
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                )}
                {user.isSuspended ? "Confirm Restore" : "Confirm Suspend"}
              </button>
            </div>
          </div>
        )}

        {/* ROLE CHANGE MODE */}
        {mode === "role" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">
              Update role for <strong className="text-on-surface">{user.name}</strong>.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                Select New Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect("poster")}
                  className={[
                    "flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-bold transition-all cursor-pointer",
                    selectedRole === "poster"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined text-lg">add_box</span>
                  Poster
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect("driver")}
                  className={[
                    "flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-bold transition-all cursor-pointer",
                    selectedRole === "driver"
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low",
                  ].join(" ")}
                >
                  <span className="material-symbols-outlined text-lg">directions_car</span>
                  Driver
                </button>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-secondary">
              <p>
                Switching role will adjust the user&apos;s UI dashboard and marketplace permissions.
                Admin role is strictly immutable and cannot be assigned.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 h-12 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRoleConfirm}
                disabled={isPending || selectedRole === user.role}
                className="px-5 h-12 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isPending && (
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                )}
                Save Role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
