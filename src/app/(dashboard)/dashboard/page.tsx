"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePosterSummary } from "@/api/hooks/posters/posterDashboardApi";
import { useMyJobs } from "@/api/hooks/jobs/jobsApi";
import { formatNpr } from "@/utils/format";
import { JOB_STATUS } from "@/types/job";

const ADMIN_ROLE = "admin";
const POSTER_ROLE = "poster";
const DRIVER_ROLE = "driver";

const ADMIN_REDIRECT = "/admin";
const DRIVER_REDIRECT = "/driver/earnings";

const PAGE_SIZE = 4;

function CardSkeleton() {
  return (
    <div className="bg-surface-white border border-outline-variant rounded-xl p-6 animate-pulse">
      <div className="h-4 w-24 bg-surface-container-high rounded mb-4" />
      <div className="h-8 w-16 bg-surface-container-high rounded" />
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  [JOB_STATUS.POSTED]: "bg-surface-container text-on-surface-variant",
  [JOB_STATUS.ACCEPTED]: "bg-primary/10 text-primary",
  [JOB_STATUS.IN_TRANSIT]: "bg-primary/10 text-primary",
  [JOB_STATUS.DELIVERED]: "bg-success-green/10 text-success-green",
  [JOB_STATUS.CANCELLED]: "bg-error-red/10 text-error-red",
};

interface PosterDashboardContentProps {
  posterId: string;
  posterName?: string;
}

function PosterDashboardContent({ posterId, posterName }: PosterDashboardContentProps) {
  const { data: summaryData, isLoading: isSummaryLoading, isError: isSummaryError } = usePosterSummary(posterId);
  const { data: jobsData, isLoading: isJobsLoading } = useMyJobs({ page: 1, limit: PAGE_SIZE });
  const stats = summaryData?.data?.stats;
  const recentJobs = jobsData?.jobs ?? [];

  if (isSummaryLoading || isJobsLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-5 flex flex-col gap-6 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (isSummaryError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-screen">
        <span className="material-symbols-outlined text-5xl text-error-red mb-4">error_outline</span>
        <h2 className="text-xl font-semibold text-on-surface mb-2">Unable to load dashboard</h2>
        <p className="text-sm text-secondary">Something went wrong while fetching your summary.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-5 flex flex-col gap-8 min-h-screen bg-[#f8f9fc]">
      {/* Top Header Navigation Bar inside content area */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#e7ebf3] px-4 py-3 bg-white/50 backdrop-blur-md sticky top-0 z-30 rounded-xl mb-2 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-[#0d121c]">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined !text-xl">local_shipping</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-[#0d121c] text-xl font-black leading-none tracking-tight">SwiftShip</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary leading-none mt-1">
                  Logistics Portal
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-4 items-center">
          <div className="hidden md:flex items-center gap-2">
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="flex items-center justify-center rounded-lg h-10 w-10 bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface cursor-pointer">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm ring-2 ring-primary/20 shrink-0">
            {posterName?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
        </div>
      </header>

      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-on-surface text-4xl font-black leading-tight tracking-[-0.033em]">
          Welcome back, {posterName ?? "Alex"}!
        </h1>
        <p className="text-secondary text-lg font-normal">
          Here&apos;s the current pulse of your delivery network today.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Jobs */}
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-secondary font-medium text-sm uppercase tracking-wider">Active Jobs</p>
            <span className="material-symbols-outlined text-primary">local_shipping</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-on-surface text-3xl font-black">{stats.active}</p>
            <span className="flex items-center gap-1 text-success-green text-xs font-bold px-2 py-0.5 bg-success-green/10 rounded-full">
              <span className="material-symbols-outlined !text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              ON-TIME
            </span>
          </div>
        </div>

        {/* Pending Acceptance */}
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white shadow-sm border-2 border-warning-amber/30 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-secondary font-medium text-sm uppercase tracking-wider">Pending Acceptance</p>
            <span className="material-symbols-outlined text-warning-amber" style={{ fontVariationSettings: "'FILL' 1" }}>
              pending_actions
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-on-surface text-3xl font-black">{stats.pending}</p>
            <span className="flex items-center gap-1 text-error-red text-xs font-bold px-2 py-0.5 bg-error-red/10 rounded-full animate-pulse">
              <span className="material-symbols-outlined !text-xs">priority_high</span>
              ATTENTION
            </span>
          </div>
        </div>

        {/* Completed Jobs */}
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-secondary font-medium text-sm uppercase tracking-wider">Completed Jobs</p>
            <span className="material-symbols-outlined text-secondary">task_alt</span>
          </div>
          <p className="text-on-surface text-3xl font-black">{stats.completed}</p>
          <p className="text-secondary text-xs">All-time lifetime deliveries</p>
        </div>

        {/* Total Spent */}
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start">
            <p className="text-primary-fixed/80 font-medium text-sm uppercase tracking-wider">Total Spent</p>
            <span className="material-symbols-outlined text-primary-fixed">payments</span>
          </div>
          <p className="text-white text-3xl font-black">{formatNpr(stats.totalSpent)}</p>
          <p className="text-primary-fixed/60 text-xs font-medium">Sum of completed jobs</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Deliveries Table */}
        <div className="lg:col-span-2 flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-on-surface text-xl font-bold">Recent Deliveries</h2>
            <Link href="/history" className="text-primary text-sm font-bold hover:underline cursor-pointer">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-secondary text-xs uppercase font-bold tracking-widest border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3">Job ID</th>
                  <th className="px-6 py-3">Driver</th>
                  <th className="px-6 py-3">Destination</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentJobs.length === 0 && !isJobsLoading && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-secondary">
                      No recent deliveries yet.
                    </td>
                  </tr>
                )}
                {recentJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4 mono text-sm font-bold text-on-surface">
                      #SW-{job._id.slice(-4).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined !text-sm">person</span>
                        </div>
                        <span className="text-sm font-medium">{job.driver?.name ?? "Unassigned"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary truncate max-w-[200px]">
                      {job.dropoffAddress}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-[11px] font-black rounded-full uppercase tracking-tighter ${
                          STATUS_BADGE[job.status] ?? "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {job.status === "in_transit"
                          ? "In Transit"
                          : job.status === "posted"
                          ? "Posted"
                          : job.status === "accepted"
                          ? "Accepted"
                          : job.status === "delivered"
                          ? "Delivered"
                          : job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold">
                      {formatNpr(job.offeredPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-outline-variant p-6">
            <h2 className="text-on-surface text-xl font-bold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              <Link
                href="/post-job"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary text-on-primary rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all group cursor-pointer"
              >
                <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">add_box</span>
                Post a New Delivery
              </Link>
              <Link
                href="/history"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface-container-high text-on-surface rounded-xl font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined">receipt_long</span>
                View Billing History
              </Link>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-outline-variant text-on-surface rounded-xl font-bold hover:bg-surface-container-low transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined">support_agent</span>
                Contact Support
              </button>
            </div>
          </div>

          {/* Logistics Map Card */}
          <div className="relative bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden aspect-[4/3] group">
            <div
              className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: "url('/images/admin/kathmandu-map.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 to-transparent flex flex-col justify-end p-6">
              <p className="text-white text-sm font-bold uppercase tracking-widest opacity-80">
                Live Network ({stats.activeHubsCount} {stats.activeHubsCount === 1 ? "Hub" : "Hubs"})
              </p>
              <h3 className="text-white text-lg font-black">
                Active Hubs: {stats.activeHubsLocation}
              </h3>
            </div>
          </div>

          {/* Mini Analytics / Efficiency Score */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 relative overflow-hidden">
            <div className="flex flex-col relative z-10">
              <p className="text-secondary text-sm font-medium">Efficiency Score</p>
              <p className="text-on-surface text-2xl font-black">
                {stats.efficiencyScore ?? 98.4}%
              </p>
              <div className="mt-4 flex items-end gap-1 h-12">
                {(stats.efficiencyTrend ?? [40, 55, 45, 70, 60, 95]).map((val, idx) => {
                  const opacityClass =
                    idx === 5
                      ? "bg-primary"
                      : idx === 4
                      ? "bg-primary/60"
                      : idx === 3
                      ? "bg-primary/50"
                      : idx === 2
                      ? "bg-primary/40"
                      : idx === 1
                      ? "bg-primary/30"
                      : "bg-primary/20";
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-t ${opacityClass}`}
                      style={{ height: `${val}%` }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full blur-2xl"></div>
          </div>
        </div>
      </div>

      {/* Footer Info (Minimal) */}
      <footer className="border-t border-outline-variant pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-secondary text-xs font-medium mt-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined !text-sm">verified_user</span>
          SwiftShip Secure Enterprise Portal v4.2
        </div>
        <div className="flex gap-6">
          <a className="hover:text-primary transition-colors" href="#">
            System Status
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            API Documentation
          </a>
          <a className="hover:text-primary transition-colors" href="#">
            Logistics Standards
          </a>
        </div>
      </footer>
    </div>
  );
}

function DriverDashboardContent() {
  const quickLinks = [
    { href: "/driver/earnings", icon: "payments", label: "Earnings" },
    { href: "/driver/payouts", icon: "account_balance_wallet", label: "Payouts" },
    { href: "/driver/verification", icon: "shield", label: "Verification" },
    { href: "/jobs/browse", icon: "list_alt", label: "Browse Jobs" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {quickLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center gap-3 cursor-pointer"
        >
          <div className="p-3 bg-primary/10 rounded-lg text-primary">
            <span className="material-symbols-outlined text-2xl">{link.icon}</span>
          </div>
          <p className="text-sm font-semibold text-on-surface">{link.label}</p>
        </a>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  useEffect(() => {
    if (!isAuthLoading) {
      if (user?.role === ADMIN_ROLE) {
        router.replace(ADMIN_REDIRECT);
      } else if (user?.role === DRIVER_ROLE) {
        router.replace(DRIVER_REDIRECT);
      }
    }
  }, [isAuthLoading, user, router]);

  if (isAuthLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-5 flex flex-col gap-6 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (user?.role === POSTER_ROLE) {
    return <PosterDashboardContent posterId={user._id} posterName={user.name} />;
  }

  if (user?.role === DRIVER_ROLE) {
    return <DriverDashboardContent />;
  }

  return null;
}
