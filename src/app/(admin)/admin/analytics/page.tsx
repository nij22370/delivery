"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAdminAnalytics } from "@/api/hooks/admin/adminAnalyticsApi";
import { formatNpr } from "@/utils/format";
import type { RecentActivityItem, PaymentMethodBreakdown } from "@/types/admin/adminAnalytics";

const CARD_STYLES =
  "bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm";

const CHART_GRID_COLOR = "#eeeeee";
const CHART_TEXT_COLOR = "#737786";
const CHART_GMV_COLOR = "#b1c5ff";
const CHART_REVENUE_COLOR = "#0055cd";
const TAKE_RATE = 0.15;
const TAKE_RATE_DISPLAY = "15.0%";

const GATEWAY_DISPLAY_NAMES: Record<string, string> = {
  esewa: "eSewa",
  khalti: "Khalti",
  bank: "Bank Transfer",
};

const GATEWAY_COLORS: Record<string, string> = {
  esewa: "bg-success-green",
  khalti: "bg-primary",
  bank: "bg-secondary",
};

const STATUS_VARIANT_STYLES: Record<string, string> = {
  success:
    "bg-success-green/10 text-success-green border-success-green/20",
  warning:
    "bg-warning-amber/10 text-warning-amber border-warning-amber/20",
  error: "bg-error-red/10 text-error-red border-error-red/20",
  primary: "bg-primary/10 text-primary border-primary/20",
  neutral:
    "bg-surface-container-high text-secondary border-outline-variant",
};

const STATUS_ICON_STYLES: Record<string, string> = {
  success: "text-success-green bg-success-green/10",
  warning: "text-warning-amber bg-warning-amber/10",
  error: "text-error-red bg-error-red/10",
  primary: "text-primary bg-primary/10",
  neutral: "text-secondary bg-surface-container-high",
};

const HOTSPOT_ZONES = [
  { name: "Thamel", percent: 24 },
  { name: "Lalitpur", percent: 18 },
  { name: "Bhaktapur", percent: 12 },
] as const;

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-inverse-surface text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs backdrop-blur-md flex flex-col gap-1.5">
      <p className="font-bold text-[10px] text-gray-300 border-b border-white/10 pb-1 mb-0.5">
        {label}
      </p>
      {payload.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-400 font-medium">{item.name}:</span>
          <span className="font-bold text-white ml-auto">
            {formatNpr(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentMethodRow({
  paymentMethod,
}: {
  paymentMethod: PaymentMethodBreakdown;
}) {
  const displayName =
    GATEWAY_DISPLAY_NAMES[paymentMethod.gateway] ?? paymentMethod.gateway;
  const colorClass = GATEWAY_COLORS[paymentMethod.gateway] ?? "bg-secondary";

  return (
    <div>
      <div className="flex justify-between items-center text-xs font-semibold mb-1">
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClass} shrink-0`} />
          {displayName}
        </span>
        <span className="text-secondary">{paymentMethod.percent}%</span>
      </div>
      <div className="w-full bg-surface-container rounded-full h-2">
        <div
          className={`${colorClass} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${paymentMethod.percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: RecentActivityItem }) {
  const variantStyle =
    STATUS_VARIANT_STYLES[activity.statusVariant] ?? STATUS_VARIANT_STYLES.neutral;
  const iconStyle =
    STATUS_ICON_STYLES[activity.statusVariant] ?? STATUS_ICON_STYLES.neutral;

  return (
    <tr className="hover:bg-surface-bright transition-colors">
      <td className="px-6 py-4 flex items-center gap-2">
        <span
          className={`material-symbols-outlined text-sm ${iconStyle} p-1.5 rounded-full`}
        >
          {activity.icon}
        </span>
        {activity.event}
      </td>
      <td className="px-6 py-4 font-mono font-bold text-secondary">
        {activity.entityId}
      </td>
      <td className="px-6 py-4">
        <span
          className={`${variantStyle} px-2 py-0.5 rounded border font-bold uppercase text-[9px]`}
        >
          {activity.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right text-secondary">
        {activity.timeAgo}
      </td>
    </tr>
  );
}

export default function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminAnalytics();

  const jobsPerDay = useMemo(() => data?.jobsPerDay ?? [], [data?.jobsPerDay]);
  const gmv = data?.gmv ?? 0;
  const totalJobsDelivered = data?.totalJobsDelivered ?? 0;
  const pendingVerificationsCount = data?.pendingVerificationsCount ?? 0;
  const paymentMethodBreakdown = useMemo(
    () => data?.paymentMethodBreakdown ?? [],
    [data?.paymentMethodBreakdown]
  );
  const recentActivity = useMemo(
    () => data?.recentActivity ?? [],
    [data?.recentActivity]
  );

  const averageOrderValue = useMemo(
    () => (totalJobsDelivered > 0 ? gmv / totalJobsDelivered : 0),
    [gmv, totalJobsDelivered]
  );

  const platformRevenue = useMemo(() => gmv * TAKE_RATE, [gmv]);
  const averageCommission = useMemo(
    () => averageOrderValue * TAKE_RATE,
    [averageOrderValue]
  );

  // Derive average price for chart GMV estimation per day
  const averagePrice = useMemo(
    () => (totalJobsDelivered > 0 ? gmv / totalJobsDelivered : 0),
    [gmv, totalJobsDelivered]
  );

  const chartData = useMemo(() => {
    return jobsPerDay.map((item) => {
      const dailyGmv = item.count * averagePrice;
      const dailyRevenue = dailyGmv * TAKE_RATE;
      return {
        label: formatDateLabel(item.date),
        "Total GMV": Math.round(dailyGmv),
        "Platform Revenue": Math.round(dailyRevenue),
      };
    });
  }, [jobsPerDay, averagePrice]);

  const hasPaymentData = paymentMethodBreakdown.length > 0;
  const hasActivityData = recentActivity.length > 0;

  const renderEmptyPaymentState = useCallback(
    () => (
      <p className="text-xs text-secondary text-center py-4">
        No payment data available yet.
      </p>
    ),
    []
  );

  const renderEmptyActivityState = useCallback(
    () => (
      <tr>
        <td colSpan={4} className="px-6 py-8 text-center text-secondary text-xs">
          No recent activity to display.
        </td>
      </tr>
    ),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
            Platform Analytics Dashboard
          </h2>
          <p className="text-xs text-secondary mt-0.5">
            Monitor transaction volumes, platform revenue, and network health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-4 rounded-lg border border-outline-variant text-xs font-bold text-secondary hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-base">
              picture_as_pdf
            </span>
            Export PDF
          </button>
          <button className="h-10 px-4 rounded-lg bg-primary-container text-on-primary-container hover:bg-surface-tint hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-base">
              calendar_month
            </span>
            Schedule Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className={CARD_STYLES}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Total GMV (NPR)
            </p>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-lg">
                payments
              </span>
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-surface-container-high rounded animate-pulse" />
            ) : (
              formatNpr(gmv)
            )}
          </p>
          <div className="flex items-center gap-1 text-success-green font-bold text-[10px] mt-2">
            <span className="material-symbols-outlined text-sm">
              trending_up
            </span>
            +12.5% vs last month
          </div>
        </div>

        {/* Platform Revenue */}
        <div className={CARD_STYLES}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Platform Revenue
            </p>
            <div className="p-2 bg-success-green/10 rounded-lg text-success-green">
              <span className="material-symbols-outlined text-lg">
                account_balance_wallet
              </span>
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-surface-container-high rounded animate-pulse" />
            ) : (
              formatNpr(platformRevenue)
            )}
          </p>
          <div className="flex items-center gap-1 text-success-green font-bold text-[10px] mt-2">
            <span className="material-symbols-outlined text-sm">
              trending_up
            </span>
            +14.2% vs last month
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className={CARD_STYLES}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Average Order Value (AOV)
            </p>
            <div className="p-2 bg-warning-amber/10 rounded-lg text-warning-amber">
              <span className="material-symbols-outlined text-lg">
                receipt_long
              </span>
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface">
            {isLoading ? (
              <span className="inline-block w-24 h-7 bg-surface-container-high rounded animate-pulse" />
            ) : (
              formatNpr(averageOrderValue)
            )}
          </p>
          <div className="flex items-center gap-1 text-success-green font-bold text-[10px] mt-2">
            <span className="material-symbols-outlined text-sm">
              trending_up
            </span>
            +3.2% vs last week
          </div>
        </div>

        {/* Platform Take Rate */}
        <div className={CARD_STYLES}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
              Platform Take Rate
            </p>
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span className="material-symbols-outlined text-lg">
                percent
              </span>
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface">
            {TAKE_RATE_DISPLAY}
          </p>
          <div className="flex items-center gap-1 text-secondary font-bold text-[10px] mt-2">
            <span className="material-symbols-outlined text-sm">
              trending_flat
            </span>
            Stable vs last quarter
          </div>
        </div>
      </div>

      {/* Main Content Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Chart + Extra metrics */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* GMV vs Revenue Chart */}
          <div className={CARD_STYLES}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-on-surface">
                Platform Growth: GMV vs Revenue (30 Days)
              </h3>
              <button className="text-primary font-bold text-xs hover:underline cursor-pointer">
                Detailed Report
              </button>
            </div>

            <div className="h-72 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={CHART_GRID_COLOR}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: CHART_TEXT_COLOR }}
                      axisLine={{ stroke: CHART_GRID_COLOR }}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: CHART_TEXT_COLOR }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatAxisValue}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: "rgba(39, 110, 241, 0.02)" }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, paddingBottom: 15 }}
                    />
                    <Bar
                      dataKey="Total GMV"
                      fill={CHART_GMV_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      dataKey="Platform Revenue"
                      fill={CHART_REVENUE_COLOR}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-surface-container-low/40 rounded-lg border border-dashed border-outline-variant">
                  <span className="material-symbols-outlined text-4xl text-secondary mb-2">
                    show_chart
                  </span>
                  <p className="text-sm font-semibold text-on-surface">
                    No data available
                  </p>
                  <p className="text-xs text-secondary mt-1">
                    System transactions will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Split & Avg Commission */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue by Payment Method — real data */}
            <div className={CARD_STYLES}>
              <h4 className="text-xs font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
                Revenue by Payment Method
              </h4>
              <div className="flex flex-col gap-4">
                {hasPaymentData
                  ? paymentMethodBreakdown.map((method) => (
                      <PaymentMethodRow
                        key={method.gateway}
                        paymentMethod={method}
                      />
                    ))
                  : renderEmptyPaymentState()}
              </div>
            </div>

            {/* Average Commission */}
            <div className={`${CARD_STYLES} flex flex-col justify-between`}>
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wider">
                  Average Commission per Job
                </h4>
                <p className="text-[10px] text-secondary">
                  Derived from the platform {TAKE_RATE_DISPLAY} take rate
                </p>
              </div>
              <div className="my-4">
                <p className="text-3xl font-black text-primary">
                  {isLoading ? (
                    <span className="inline-block w-28 h-8 bg-surface-container-high rounded animate-pulse" />
                  ) : (
                    formatNpr(averageCommission)
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1 text-success-green font-bold text-[10px]">
                <span className="material-symbols-outlined text-sm">
                  trending_up
                </span>
                +4.1% vs last week
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3: Widgets */}
        <div className="flex flex-col gap-6">
          {/* Needs Attention — real pending count */}
          <div className="bg-primary text-white border border-primary rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[180px]">
            <div className="z-10">
              <h3 className="text-base font-bold mb-1">Needs Attention</h3>
              <p className="text-xs opacity-90 leading-relaxed mb-4">
                You have{" "}
                <span className="font-bold">
                  {pendingVerificationsCount}
                </span>{" "}
                driver verification request
                {pendingVerificationsCount !== 1 ? "s" : ""} pending review.
              </p>
            </div>
            <div className="z-10">
              <Link
                href="/admin/verification"
                className="h-10 px-4 bg-surface-white text-primary font-bold text-xs rounded-lg inline-flex items-center justify-center transition-colors hover:bg-surface-container-low cursor-pointer"
              >
                Review Now
                <span className="material-symbols-outlined text-sm ml-1">
                  arrow_forward
                </span>
              </Link>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-10 text-white pointer-events-none">
              <span className="material-symbols-outlined text-[140px]">
                shield_person
              </span>
            </div>
          </div>

          {/* Demand Hotspots */}
          <div className={CARD_STYLES}>
            <h3 className="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">
              Demand Hotspots
            </h3>

            <div className="bg-surface-container-low rounded-lg p-4 mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-2xl">
                location_on
              </span>
              <div>
                <p className="text-xs font-bold text-on-surface">
                  Kathmandu Valley
                </p>
                <p className="text-[10px] text-secondary">
                  Highest activity volume location
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                Top Dispatch Zones
              </p>
              {HOTSPOT_ZONES.map((zone, zoneIndex) => (
                <div key={zone.name}>
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-on-surface">
                      {zoneIndex + 1}. {zone.name}
                    </span>
                    <span className="text-primary">{zone.percent}%</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1 mt-1">
                    <div
                      className="bg-primary h-1 rounded-full"
                      style={{ width: `${zone.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Area: Recent Activity Log Table — real data */}
      <div className={CARD_STYLES}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-on-surface">
            Recent Activity
          </h3>
          <button className="text-secondary hover:text-on-surface transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">
              filter_list
            </span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary uppercase font-semibold border-b border-outline-variant">
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-medium">
              {hasActivityData
                ? recentActivity.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))
                : renderEmptyActivityState()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
