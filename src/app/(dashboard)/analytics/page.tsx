"use client";

import { useMemo } from "react";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePosterSummary } from "@/api/hooks/posters/posterDashboardApi";
import { usePaymentHistoryAggregate } from "@/api/hooks/payments/paymentHistoryApi";
import { formatNpr } from "@/utils/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const CHART_PRIMARY_COLOR = "#276ef1";
const CHART_HOVER_COLOR = "#1a56c4";
const CHART_GRID_COLOR = "#e8e8f0";
const AREA_STROKE_COLOR = "#276ef1";
const AREA_FILL_COLOR = "#276ef1";

const WEEK_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

interface ChartBarItem {
  label: string;
  count: number;
}

interface EfficiencyPoint {
  week: string;
  value: number;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-on-surface text-surface-white rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>{payload[0]?.value} jobs</p>
    </div>
  );
}

interface AreaTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function AreaTooltip({ active, payload, label }: AreaTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-on-surface text-surface-white rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>{payload[0]?.value}% efficiency</p>
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
        <p className="text-secondary font-medium text-sm uppercase tracking-wider">
          {label}
        </p>
        <span className="material-symbols-outlined text-secondary">{icon}</span>
      </div>
      <p className="text-on-surface text-3xl font-black">{value}</p>
    </div>
  );
}

function buildEfficiencyPoints(trend: number[]): EfficiencyPoint[] {
  return trend.map((value, idx) => ({
    week: WEEK_LABELS[idx] ?? `W${idx + 1}`,
    value,
  }));
}

export default function AnalyticsPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const posterId = user?._id ?? null;

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = usePosterSummary(posterId);

  const {
    data: paymentAggregate,
    isLoading: isPaymentAggregateLoading,
  } = usePaymentHistoryAggregate(Boolean(posterId));

  const stats = summaryData?.data?.stats;
  const totalSpent = paymentAggregate?.totalAmount ?? 0;

  const chartData = useMemo<ChartBarItem[]>(() => {
    if (!stats) return [];
    return [
      { label: "Posted", count: stats.pending },
      { label: "Accepted", count: 0 },
      { label: "In Transit", count: 0 },
      { label: "Delivered", count: stats.completed },
      { label: "Cancelled", count: stats.cancelled },
    ];
  }, [stats]);

  const efficiencyPoints = useMemo<EfficiencyPoint[]>(
    () => (stats ? buildEfficiencyPoints(stats.efficiencyTrend) : []),
    [stats]
  );

  const totalJobs = useMemo(() => {
    if (!stats) return 0;
    return stats.active + stats.pending + stats.completed + stats.cancelled;
  }, [stats]);

  const maxBarCount = useMemo(
    () => Math.max(...chartData.map((d) => d.count), 1),
    [chartData]
  );

  if (isAuthLoading || isSummaryLoading || isPaymentAggregateLoading) {
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
        <AnalyticsCard
          label="Total Spent"
          value={formatNpr(totalSpent)}
          icon="payments"
        />
        <AnalyticsCard
          label="Total Jobs"
          value={String(totalJobs)}
          icon="receipt_long"
        />
        <AnalyticsCard
          label="Completed"
          value={String(stats.completed)}
          icon="task_alt"
        />
        <AnalyticsCard
          label="Cancelled"
          value={String(stats.cancelled)}
          icon="cancel"
        />
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Jobs by Status
          </h3>
          <span className="text-xs text-secondary">{totalJobs} total</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
              barCategoryGap="35%"
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={CHART_PRIMARY_COLOR}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={CHART_HOVER_COLOR}
                    stopOpacity={0.8}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
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
                domain={[0, maxBarCount + 1]}
                width={28}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(39,110,241,0.06)" }} />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
              >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={
                      entry.count === maxBarCount && maxBarCount > 0
                        ? "url(#barGrad)"
                        : CHART_PRIMARY_COLOR
                    }
                    fillOpacity={entry.count === 0 ? 0.25 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Efficiency Trend
          </h3>
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            {stats.efficiencyScore}% avg
          </span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={efficiencyPoints}
              margin={{ top: 5, right: 8, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="efficiencyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={AREA_FILL_COLOR}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor={AREA_FILL_COLOR}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="week"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#424654" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#424654" }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                width={36}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={AREA_STROKE_COLOR}
                strokeWidth={2.5}
                fill="url(#efficiencyGrad)"
                dot={{ r: 4, fill: AREA_STROKE_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: AREA_STROKE_COLOR }}
                isAnimationActive
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-secondary">
          Active hubs: {stats.activeHubsCount} in {stats.activeHubsLocation}
        </p>
      </div>
    </div>
  );
}
