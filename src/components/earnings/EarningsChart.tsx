"use client";

import React, { useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { EarningsBreakdownItem, EarningsRange } from "@/types/earnings";
import { formatNpr } from "@/utils/format";

interface EarningsChartProps {
  data: EarningsBreakdownItem[] | undefined;
  selectedRange: EarningsRange;
  onRangeChange: (range: EarningsRange) => void;
}

const CARD_STYLES =
  "bg-surface-white border border-surface-variant rounded-lg p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow";

const CHART_GRID_COLOR = "#f1f5f9";
const CHART_TEXT_COLOR = "#737786";
const MAX_BAR_WIDTH = 40;

const RANGE_OPTIONS: Array<{ value: EarningsRange; label: string }> = [
  { value: "week", label: "Last 8 Weeks" },
  { value: "month", label: "Last 12 Months" },
  { value: "all-time", label: "All Time" },
];

function formatPeriodLabel(period: string, range: EarningsRange): string {
  if (range === "month") {
    // period is YYYY-MM
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short" });
  }

  if (range === "all-time") {
    return period;
  }

  // default: weekly period (YYYY-MM-DD)
  const date = new Date(period + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatYAxisTick(value: number): string {
  if (value >= 1000) {
    const inK = value / 1000;
    return Number.isInteger(inK) ? `${inK}k` : `${inK.toFixed(1)}k`;
  }
  return value.toString();
}

interface CustomTooltipPayloadItem {
  value: number;
  payload: {
    label: string;
    amount: number;
    jobCount: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;

  return (
    <div className="bg-inverse-surface text-white px-3.5 py-2.5 rounded-lg shadow-xl border border-white/10 text-xs backdrop-blur-md">
      <p className="text-gray-300 font-medium mb-1">{item.label}</p>
      <p className="text-sm font-bold text-white mb-0.5">
        {formatNpr(item.amount)}
      </p>
      <p className="text-[11px] text-blue-300 font-medium">
        {item.jobCount} {item.jobCount === 1 ? "delivery" : "deliveries"}
      </p>
    </div>
  );
}

export default function EarningsChart({
  data,
  selectedRange,
  onRangeChange,
}: EarningsChartProps) {
  const chartData = useMemo(
    () =>
      data?.map((item) => ({
        label: formatPeriodLabel(item.period, selectedRange),
        amount: item.amount,
        jobCount: item.jobCount,
      })) ?? [],
    [data, selectedRange]
  );

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      onRangeChange(event.target.value as EarningsRange);
    },
    [onRangeChange]
  );

  const hasData = chartData.length > 0 && chartData.some((d) => d.amount > 0);

  return (
    <section className={CARD_STYLES}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-background">
            Earnings Overview
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Track your delivery payouts and revenue trends
          </p>
        </div>

        <div className="relative">
          <select
            value={selectedRange}
            onChange={handleSelectChange}
            className="appearance-none bg-surface-container-low hover:bg-surface-container border border-surface-variant rounded-lg font-medium text-xs text-on-surface py-2 pl-3 pr-8 focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer transition-colors"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              barCategoryGap="25%"
            >
              <defs>
                <linearGradient id="earningsBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#276ef1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0055cd" stopOpacity={0.85} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="4 4"
                stroke={CHART_GRID_COLOR}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: CHART_TEXT_COLOR, fontWeight: 500 }}
                axisLine={{ stroke: CHART_GRID_COLOR }}
                tickLine={false}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_TEXT_COLOR }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatYAxisTick}
                dx={-4}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(0, 85, 205, 0.04)", radius: 6 }}
              />
              <Bar
                dataKey="amount"
                fill="url(#earningsBarGrad)"
                radius={[6, 6, 0, 0]}
                maxBarSize={MAX_BAR_WIDTH}
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-surface-container-low/40 rounded-lg border border-dashed border-surface-variant">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50 mb-2">
              bar_chart
            </span>
            <p className="text-sm font-semibold text-on-surface">
              No earnings data for this period
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Completed deliveries will appear in your breakdown chart.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
