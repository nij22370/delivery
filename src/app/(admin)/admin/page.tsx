"use client";

import Link from "next/link";
import { useAdminDashboard } from "@/api/hooks/admin/adminDashboardApi";
import { formatNpr } from "@/utils/format";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();
  const kpis = data?.data.kpis;
  const recentActivity = data?.data.recentActivity || [];
  const platformGrowth = data?.data.platformGrowth || [];

  return (
    <div className="flex flex-col gap-8">
      {/* Top Banner / KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: GMV */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Total GMV (NPR)
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-on-surface mt-1">
                {isLoading ? (
                  <span className="inline-block w-24 h-8 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  formatNpr(kpis?.totalGmvNpr ?? 0)
                )}
              </h3>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-success-green text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+{kpis?.gmvGrowthPercent ?? 12.5}% from last month</span>
          </div>
        </div>

        {/* KPI 2: Active Jobs */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Active Jobs
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-on-surface mt-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  kpis?.activeJobsCount.toLocaleString() ?? "0"
                )}
              </h3>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-success-green text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_up</span>
            <span>+{kpis?.activeJobsGrowthPercent ?? 5.2}% from yesterday</span>
          </div>
        </div>

        {/* KPI 3: Active Drivers */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Active Drivers
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-on-surface mt-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  kpis?.activeDriversCount.toLocaleString() ?? "0"
                )}
              </h3>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-warning-amber text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">trending_flat</span>
            <span>Active &amp; verified</span>
          </div>
        </div>

        {/* KPI 4: Pending Verifications */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 relative overflow-hidden group hover:shadow-sm transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Pending Verifications
              </p>
              <h3 className="text-2xl md:text-3xl font-bold text-on-surface mt-1">
                {isLoading ? (
                  <span className="inline-block w-16 h-8 bg-surface-container-high rounded animate-pulse" />
                ) : (
                  kpis?.pendingVerificationsCount.toLocaleString() ?? "0"
                )}
              </h3>
            </div>
            <div className="p-2.5 bg-error-container text-error-red rounded-lg">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-error-red text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">priority_high</span>
            <span>Requires review</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Charts/Activity + Right Bento Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Growth Chart */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Platform Growth (30 Days)</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Delivery fulfillment and platform volume index
                </p>
              </div>
              <span className="text-xs font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full">
                Live Metrics
              </span>
            </div>

            <div className="h-60 w-full min-w-0 overflow-hidden bg-surface-container-low rounded-lg p-4 flex items-end justify-between gap-2 sm:gap-3">
              {platformGrowth.map((point) => (
                <div key={point.day} className="flex-1 min-w-0 flex flex-col items-center gap-1.5 sm:gap-2 h-full justify-end">
                  <div
                    className="w-full max-w-[36px] bg-primary/80 hover:bg-primary rounded-t transition-all duration-300 cursor-pointer group relative"
                    style={{ height: `${point.valuePercent}%` }}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-surface-white border border-outline-variant shadow text-[10px] font-bold px-1.5 py-0.5 rounded transition-opacity pointer-events-none">
                      {point.valuePercent}%
                    </div>
                  </div>
                  <span className="text-[9px] sm:text-[11px] text-secondary font-medium truncate w-full text-center">
                    {point.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Recent Activity</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Real-time events across the logistics marketplace
                </p>
              </div>
              <Link
                href="/admin/jobs"
                className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                View All Jobs
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-secondary text-xs uppercase font-semibold border-b border-outline-variant">
                    <th className="p-4">Event</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-outline-variant">
                  {recentActivity.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-secondary">
                        No recent activity recorded yet.
                      </td>
                    </tr>
                  )}
                  {recentActivity.map((activity) => (
                    <tr
                      key={activity.id}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="p-4 flex items-center gap-3 font-medium text-on-surface">
                        <div className="p-2 bg-primary/10 rounded-full text-primary shrink-0">
                          <span className="material-symbols-outlined text-[18px]">
                            {activity.icon}
                          </span>
                        </div>
                        <span>{activity.event}</span>
                      </td>
                      <td className="p-4 font-mono text-xs text-secondary font-medium">
                        {activity.entityId}
                      </td>
                      <td className="p-4">
                        <span
                          className={[
                            "px-2.5 py-1 text-xs rounded-md font-semibold",
                            activity.statusVariant === "success"
                              ? "bg-success-green/10 text-success-green"
                              : activity.statusVariant === "error"
                              ? "bg-error-red/10 text-error-red"
                              : activity.statusVariant === "warning"
                              ? "bg-warning-amber/10 text-warning-amber"
                              : "bg-surface-container text-on-surface-variant",
                          ].join(" ")}
                        >
                          {activity.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-secondary whitespace-nowrap">
                        {activity.timeAgo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-8">
          {/* Action Center Bento */}
          <div className="bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden shadow-sm">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
                <h3 className="text-lg font-bold">Action Center</h3>
              </div>
              <p className="text-sm text-on-primary/90">
                You have{" "}
                <span className="font-bold underline">
                  {kpis?.pendingVerificationsCount ?? 0} driver verification requests
                </span>{" "}
                pending document review.
              </p>
              <Link
                href="/admin/verification"
                className="bg-surface-white text-primary text-sm font-bold px-4 h-12 rounded-lg hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 shadow cursor-pointer"
              >
                Review Applications
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none text-white">
              <span className="material-symbols-outlined text-[140px]">shield</span>
            </div>
          </div>

          {/* Demand Hotspots */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-on-surface">Demand Hotspots</h3>
              <span className="material-symbols-outlined text-secondary">explore</span>
            </div>

            <div className="h-56 bg-surface-container-low rounded-lg border border-outline-variant p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                <span className="material-symbols-outlined text-2xl">location_on</span>
              </div>
              <h4 className="text-base font-bold text-on-surface">Kathmandu Valley</h4>
              <p className="text-xs text-secondary mt-1 max-w-xs">
                Highest delivery density across Bagmati Province. Central dispatch operational.
              </p>
              <div className="mt-4 flex gap-2">
                <span className="px-2 py-0.5 bg-surface-white border border-outline-variant rounded text-[11px] font-semibold text-secondary">
                  Kathmandu
                </span>
                <span className="px-2 py-0.5 bg-surface-white border border-outline-variant rounded text-[11px] font-semibold text-secondary">
                  Lalitpur
                </span>
                <span className="px-2 py-0.5 bg-surface-white border border-outline-variant rounded text-[11px] font-semibold text-secondary">
                  Bhaktapur
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
