"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useVerificationQueue, useApproveRejectDriver } from "@/api/hooks/admin/adminApi";
import { DRIVER_PROFILE_STATUS } from "@/types/driverProfile/driverProfile";
import type { DriverProfileStatus } from "@/types/driverProfile/driverProfile";
import type { AdminTabKey, AdminVerificationProfile } from "@/types/admin/adminVerification";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getInitials, formatAppliedDate } from "@/utils/format";
import { VEHICLE_ICONS } from "@/lib/constants";

// ── Constants ────────────────────────────────────────────────────────────────
const QUEUE_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const COPY_FEEDBACK_MS = 2000;
const USER_ID_PREFIX_LENGTH = 8;

const TABS: AdminTabKey[] = [
  DRIVER_PROFILE_STATUS.PENDING,
  DRIVER_PROFILE_STATUS.APPROVED,
  DRIVER_PROFILE_STATUS.REJECTED,
];

const TAB_LABELS: Record<AdminTabKey, string> = {
  [DRIVER_PROFILE_STATUS.PENDING]: "Pending",
  [DRIVER_PROFILE_STATUS.APPROVED]: "Approved",
  [DRIVER_PROFILE_STATUS.REJECTED]: "Rejected",
};

const STATUS_BADGE_STYLES: Record<DriverProfileStatus, string> = {
  [DRIVER_PROFILE_STATUS.UNVERIFIED]: "bg-surface-container text-on-surface-variant",
  [DRIVER_PROFILE_STATUS.PENDING]: "bg-warning-amber/10 text-warning-amber",
  [DRIVER_PROFILE_STATUS.APPROVED]: "bg-success-green/10 text-success-green",
  [DRIVER_PROFILE_STATUS.REJECTED]: "bg-error-red/10 text-error-red",
};

const DOCUMENTS: Array<{
  label: string;
  key: "licenceDocUrl" | "governmentIdDocUrl" | "insuranceDocUrl";
}> = [
  { label: "License", key: "licenceDocUrl" },
  { label: "Gov ID", key: "governmentIdDocUrl" },
  { label: "Insurance", key: "insuranceDocUrl" },
];

const NAV_ITEMS = [
  { label: "Verifications", icon: "shield", active: true },
  { label: "Active Drivers", icon: "directions_car", active: false },
  { label: "Payouts", icon: "payments", active: false },
  { label: "System Settings", icon: "settings", active: false },
];

// ── Sub-components ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  iconClassName,
  isLoading,
}: {
  label: string;
  value: number;
  icon: string;
  iconClassName: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-surface-white border border-outline-variant rounded-lg p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconClassName}`}>
        <span className="material-symbols-outlined text-2xl">{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
          {label}
        </p>
        {isLoading ? (
          <div className="h-7 w-12 bg-surface-container-high rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-on-surface">{value}</p>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }, (_, columnIndex) => (
        <td key={columnIndex} className="px-6 py-4">
          <div className="h-4 bg-surface-container-high rounded" />
        </td>
      ))}
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminVerificationPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const approveReject = useApproveRejectDriver();

  const [activeTab, setActiveTab] = useState<AdminTabKey>(DRIVER_PROFILE_STATUS.PENDING);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<AdminVerificationProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

  const { data, isLoading } = useVerificationQueue({
    status: activeTab,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: QUEUE_PAGE_SIZE,
  });

  const handleTabChange = useCallback((targetTab: AdminTabKey) => {
    setActiveTab(targetTab);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchInput(event.target.value);
      setCurrentPage(1);
    },
    []
  );

  const handleApprove = useCallback(
    (profileId: string) => {
      approveReject.mutate({ id: profileId, data: { status: DRIVER_PROFILE_STATUS.APPROVED } });
    },
    [approveReject]
  );

  const handleConfirmReject = useCallback(() => {
    if (!rejectTarget) return;
    approveReject.mutate({
      id: rejectTarget._id,
      data: { status: DRIVER_PROFILE_STATUS.REJECTED, reason: rejectReason || undefined },
    });
    setRejectTarget(null);
    setRejectReason("");
  }, [approveReject, rejectTarget, rejectReason]);

  const handleCopyUserId = useCallback((userId: string) => {
    navigator.clipboard.writeText(userId).catch(() => {});
    setCopiedUserId(userId);
    setTimeout(() => setCopiedUserId(null), COPY_FEEDBACK_MS);
  }, []);

  const startItem = useMemo(
    () => (currentPage - 1) * QUEUE_PAGE_SIZE + 1,
    [currentPage]
  );
  const endItem = useMemo(
    () => Math.min(currentPage * QUEUE_PAGE_SIZE, data?.total ?? 0),
    [currentPage, data?.total]
  );

  if (isAuthLoading || (user && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-container-low text-on-surface">
      <aside className="hidden md:flex md:w-56 shrink-0 flex-col bg-surface-white border-r border-outline-variant sticky top-0 h-screen">
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest px-5 pt-6 pb-3">
          Administration
        </p>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={[
                "flex items-center gap-3 px-3 h-12 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                item.active
                  ? "bg-primary-container/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">
              Driver Verifications
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Review and approve driver document submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Total Pending"
              value={data?.totalPending ?? 0}
              icon="pending_actions"
              iconClassName="bg-warning-amber/10 text-warning-amber"
              isLoading={isLoading}
            />
            <StatCard
              label="Total Approved"
              value={data?.totalApproved ?? 0}
              icon="verified"
              iconClassName="bg-success-green/10 text-success-green"
              isLoading={isLoading}
            />
          </div>

          <div className="flex gap-6 border-b border-outline-variant">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={[
                  "h-12 flex items-center -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer",
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                {TAB_LABELS[tab]}
                {tab === DRIVER_PROFILE_STATUS.PENDING && data?.totalPending !== undefined && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-amber/10 text-warning-amber">
                    {data.totalPending}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
              className="w-full h-12 pl-11 pr-4 rounded-lg border border-outline-variant bg-surface-white text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all"
            />
          </div>

          <div className="bg-surface-white border border-outline-variant rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant text-xs text-on-surface-variant uppercase tracking-wide">
                    <th className="px-6 py-4 font-semibold">Applicant</th>
                    <th className="px-6 py-4 font-semibold">Vehicle</th>
                    <th className="px-6 py-4 font-semibold">Date Applied</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">BG Check</th>
                    <th className="px-6 py-4 font-semibold">Documents</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading &&
                    Array.from({ length: 5 }, (_, skeletonIndex) => (
                      <SkeletonRow key={skeletonIndex} />
                    ))}

                  {!isLoading &&
                    data?.data.map((profile) => (
                      <tr
                        key={profile._id}
                        className="border-b border-outline-variant/50 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                              {getInitials(profile.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-on-surface truncate">
                                {profile.name}
                              </p>
                              <p className="text-sm text-on-surface-variant truncate">
                                {profile.email}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleCopyUserId(profile.userId)}
                                className="relative font-mono text-xs bg-surface-container px-2 py-0.5 rounded-full cursor-pointer hover:bg-surface-variant transition-colors mt-1"
                              >
                                {profile.userId.slice(0, USER_ID_PREFIX_LENGTH)}
                                {copiedUserId === profile.userId && (
                                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 text-[10px] font-sans font-medium text-on-primary bg-primary px-2 py-0.5 rounded whitespace-nowrap z-10">
                                    Copied!
                                  </span>
                                )}
                              </button>
                              {profile.rejectionReason && (
                                <p className="text-xs text-error-red italic mt-1">
                                  {profile.rejectionReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-surface-container">
                            <span className="material-symbols-outlined text-[14px]">
                              {VEHICLE_ICONS[profile.vehicleType]}
                            </span>
                            <span className="capitalize">{profile.vehicleType}</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                          {formatAppliedDate(profile.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={[
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold capitalize",
                              STATUS_BADGE_STYLES[profile.status],
                            ].join(" ")}
                          >
                            {profile.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {profile.backgroundCheck.authorized ? (
                            <span className="material-symbols-outlined text-success-green">
                              check_circle
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-error-red">
                              cancel
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {DOCUMENTS.map((doc) => {
                              const docUrl = profile[doc.key];
                              const isSafeUrl =
                                typeof docUrl === "string" &&
                                (docUrl.startsWith("http://") || docUrl.startsWith("https://"));
                              return isSafeUrl ? (
                                <a
                                  key={doc.label}
                                  href={docUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    description
                                  </span>
                                  {doc.label}
                                </a>
                              ) : (
                                <span
                                  key={doc.label}
                                  className="inline-flex items-center gap-1 text-xs text-on-surface-variant opacity-50 cursor-not-allowed"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    description
                                  </span>
                                  {doc.label}
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {activeTab === DRIVER_PROFILE_STATUS.PENDING && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleApprove(profile._id)}
                                disabled={approveReject.isPending}
                                className="px-4 h-12 flex items-center justify-center rounded-lg text-xs font-semibold bg-success-green text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(profile)}
                                disabled={approveReject.isPending}
                                className="px-4 h-12 flex items-center justify-center rounded-lg text-xs font-semibold border border-error-red text-error-red hover:bg-error-container/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {!isLoading && data?.data.length === 0 && (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">
                  shield
                </span>
                <h2 className="text-lg font-semibold text-on-surface mb-2">
                  No {activeTab} applications found
                </h2>
                <p className="text-sm text-on-surface-variant">
                  Try adjusting your search or switching tabs.
                </p>
              </div>
            )}
          </div>

          {!isLoading && data && data.data.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">
                Showing {startItem}-{endItem} of {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => page - 1)}
                  disabled={currentPage === 1}
                  className="px-4 h-12 flex items-center justify-center text-sm font-medium border border-outline-variant rounded-lg bg-surface-white hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => page + 1)}
                  disabled={currentPage === data.totalPages}
                  className="px-4 h-12 flex items-center justify-center text-sm font-medium border border-outline-variant rounded-lg bg-surface-white hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-on-surface mb-1">
              Reject Application
            </h2>
            <p className="text-sm text-on-surface-variant mb-4">{rejectTarget.name}</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Reason for rejection (optional)"
              rows={3}
              className="w-full border border-outline-variant rounded-lg p-4 text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white resize-none mb-5"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="px-4 h-12 flex items-center justify-center rounded-lg text-sm font-medium border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={approveReject.isPending}
                className="px-4 h-12 flex items-center justify-center rounded-lg text-sm font-semibold bg-error-red text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
