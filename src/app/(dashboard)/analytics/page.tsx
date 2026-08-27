"use client";

import { useMemo } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePosterSummary } from "@/api/hooks/posters/posterDashboardApi";
import { formatNpr } from "@/utils/format";
import { JOB_STATUS } from "@/types/job";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const CHART_BAR_FILL = "#276ef1";

interface ChartBar {
  status: string;
  label: string;
  count: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-on-surface text-surface-container-lowest rounded-lg px-3 py-2 shadow-md border border-outline-variant text-xs">
      <p className="font-semibold">Value</p>
      <p className="text-on-surface">{payload[0]?.value} jobs</p>
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl p-6 bg-surface-white shadow-sm border border-outline-variant animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-3 bg-surface-container-high rounded w-24" />
        <div className="w-5 h-5 bg-surface-container-high rounded" />
      </div>
      <div className="h-8 bg-surface-container-high rounded w-16" />
      <div className="h-3 bg-surface-container-high rounded w-20" />
    </div>
  );
}

function AnalyticsCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl p-6 bg-surface-white shadow-sm border border-outline-variant">
      <div className="flex justify-between items-start">
        <p className="text-secondary font-medium text-sm uppercase tracking-wider">{label}</p>
        <span className="material-symbols-outlined text-secondary">{icon}</span>
      </div>
      <p className="text-on-surface text-3xl font-black">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const posterId = user?._id ?? null;

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = usePosterSummary(posterId);

  const stats = summaryData?.data?.stats;

  const chartData = useMemo<ChartBar[]>(() => {
    if (!stats) return [];
    return [
      { status: JOB_STATUS.POSTED, label: "Posted", count: stats.pending },
      { status: JOB_STATUS.ACCEPTED, label: "Accepted", count: 0 },
      { status: JOB_STATUS.IN_TRANSIT, label: "In Transit", count: 0 },
      { status: JOB_STATUS.DELIVERED, label: "Delivered", count: stats.completed },
      { status: JOB_STATUS.CANCELLED, label: "Cancelled", count: stats.cancelled },
    ];
  }, [stats]);

  const totalJobs = useMemo(() => {
    if (!stats) return 0;
    return stats.active + stats.pending + stats.completed + stats.cancelled;
  }, [stats]);

  const chartDataForRecharts = useMemo(
    () =>
      chartData.map((item) => ({
        label: item.label,
        count: item.count,
      })),
    [chartData]
  );

  if (isAuthLoading || isSummaryLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SummaryCardSkeleton key={idx} />
          ))}
        </div>
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6">
          <div className="h-64 w-full bg-surface-container-high rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isSummaryError || !stats || !posterId) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SummaryCardSkeleton key={idx} />
          ))}
        </div>
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">
              bar_chart
            </span>
            <p className="text-secondary">No analytics data available yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-on-surface">Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard label="Total Spent" value={formatNpr(stats.totalSpent)} icon="payments" />
        <AnalyticsCard label="Total Jobs" value={String(totalJobs)} icon="receipt_long" />
        <AnalyticsCard label="Completed" value={String(stats.completed)} icon="task_alt" />
        <AnalyticsCard label="Cancelled" value={String(stats.cancelled)} icon="cancel" />
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
          Jobs by Status
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartDataForRecharts} margin={{ top: 5, right: 0, left: 0, bottom: 30 }}>
               <XAxis
                 dataKey="label"
                 axisLine={false}
                 tickLine={false}
                 tick={{ fontSize: 11, fill: "#424654" }}
               />
              <YAxis
                axisLine={false}
                tickLine={false}
                 tick={{ fontSize: 11, fill: "#424654" }}
                 allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={CHART_BAR_FILL} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
          Efficiency Trend
        </h3>
        <div className="flex items-end gap-6 h-32">
          {stats.efficiencyTrend.map((value, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="w-full bg-surface-container-high rounded-t-lg" style={{ height: `${value}%` }}>
                <div
                  className="bg-primary rounded-t-lg h-full flex items-end justify-center"
                  style={{ height: `${value}%` }}
                >
                  <span className="text-[9px] font-bold text-on-primary mb-0.5">{value}%</span>
                </div>
              </div>
              <span className="text-[10px] text-secondary mt-1">
                {idx === 0 ? "W1" : idx === 1 ? "W2" : idx === 2 ? "W3" : idx === 3 ? "W4" : idx === 4 ? "W5" : idx === 5 ? "W6" : `W${idx + 1}`}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-secondary">
          Efficiency score: <strong className="text-on-surface">{stats.efficiencyScore}%</strong> ·{" "}
          Active hubs: {stats.activeHubsCount} in {stats.activeHubsLocation}
        </p>
      </div>
    </div>
  );
}
