"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useDriverPayouts } from "@/api/hooks/drivers/payoutsApi";
import { formatNpr, formatShortDate } from "@/utils/format";
import type { DriverPayoutItem } from "@/types/payout/payout";
import { toast } from "sonner";

type EarningsTimeRange = "7d" | "30d" | "90d" | "all";

const EARNINGS_TIME_RANGE_OPTIONS: { value: EarningsTimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "all", label: "All Time" },
];

const DEFAULT_EARNINGS_TIME_RANGE: EarningsTimeRange = "7d";

const DAY_OF_WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const DAYS_PER_WEEK = 7;

interface ChartBucket {
  dayName: string;
  dateStr: string;
  amount: number;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date): Date {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatWeekStartLabel(date: Date): string {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getDate()}`;
}

function getBucketsForRange(timeRange: EarningsTimeRange, today: Date): ChartBucket[] {
  const todayStart = startOfDay(today);
  switch (timeRange) {
    case "7d": {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - (6 - i));
        return {
          dayName: DAY_OF_WEEK_LABELS[d.getDay()],
          dateStr: d.toDateString(),
          amount: 0,
        };
      });
    }
    case "30d": {
      return Array.from({ length: 5 }, (_, i) => {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - (4 - i) * DAYS_PER_WEEK);
        return {
          dayName: `Week ${i + 1}`,
          dateStr: weekStart.toDateString(),
          amount: 0,
        };
      });
    }
    case "90d": {
      return Array.from({ length: 13 }, (_, i) => {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - (12 - i) * DAYS_PER_WEEK);
        return {
          dayName: formatWeekStartLabel(weekStart),
          dateStr: weekStart.toDateString(),
          amount: 0,
        };
      });
    }
    case "all": {
      const months: ChartBucket[] = [];
      const cursor = startOfMonth(todayStart);
      const earliest = new Date(todayStart);
      earliest.setMonth(earliest.getMonth() - 11);
      const walk = new Date(earliest);
      while (walk.getTime() <= cursor.getTime()) {
        months.push({
          dayName: MONTH_LABELS[walk.getMonth()],
          dateStr: startOfMonth(walk).toDateString(),
          amount: 0,
        });
        walk.setMonth(walk.getMonth() + 1);
      }
      return months;
    }
  }
}

function bucketPayoutsForChart(
  payouts: DriverPayoutItem[],
  timeRange: EarningsTimeRange,
  today: Date = new Date()
): ChartBucket[] {
  const buckets = getBucketsForRange(timeRange, today);
  if (buckets.length === 0) return buckets;

  const todayStart = startOfDay(today);

  payouts.forEach((payout) => {
    if (payout.status !== "paid") return;
    const payoutDate = startOfDay(new Date(payout.createdAt));
    if (payoutDate.getTime() > todayStart.getTime()) return;

    const match = findBucketMatch(buckets, payoutDate, timeRange);
    if (match) {
      match.amount += payout.amount || 0;
    }
  });

  return buckets;
}

function findBucketMatch(
  buckets: ChartBucket[],
  payoutDate: Date,
  timeRange: EarningsTimeRange
): ChartBucket | undefined {
  if (timeRange === "7d") {
    return buckets.find((bucket) => new Date(bucket.dateStr).getTime() === payoutDate.getTime());
  }
  if (timeRange === "30d" || timeRange === "90d") {
    const payoutWeekStart = startOfWeek(payoutDate).getTime();
    return buckets.find((bucket) => new Date(bucket.dateStr).getTime() === payoutWeekStart);
  }
  const payoutMonthStart = startOfMonth(payoutDate).getTime();
  return buckets.find(
    (bucket) => new Date(bucket.dateStr).getTime() === payoutMonthStart
  );
}

// Nepali Gateways Logo Colors / Styling
const GATEWAY_CLASSES: Record<string, { bg: string; text: string; label: string }> = {
  esewa: { bg: "bg-[#60bb46]/10", text: "text-[#60bb46] font-bold", label: "eSewa" },
  khalti: { bg: "bg-[#5c2d91]/10", text: "text-[#5c2d91] font-bold", label: "Khalti" },
  bank: { bg: "bg-primary/10", text: "text-primary font-bold", label: "Bank Transfer" },
};

const TXN_STATUS_CLASSES: Record<string, string> = {
  paid: "bg-success-green/10 text-success-green border border-success-green/20",
  pending: "bg-warning-amber/10 text-warning-amber border border-warning-amber/20",
  failed: "bg-error-container text-error-red border border-error-red/20",
};

export default function DriverEarningsDashboard() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const isDriver = !isAuthLoading && user?.role === "driver";
  const [timeRange, setTimeRange] = useState<EarningsTimeRange>(DEFAULT_EARNINGS_TIME_RANGE);

  const { data, isLoading } = useDriverPayouts(isDriver);

  const payouts = useMemo(() => data?.payouts ?? [], [data]);
  const totalEarned = useMemo(() => data?.totalEarned ?? 0, [data]);
  const pendingPayout = useMemo(() => data?.pendingPayout ?? 0, [data]);

  const timeRangeDays: number | null = useMemo(() => {
    switch (timeRange) {
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      case "all": return null;
    }
  }, [timeRange]);

  const payoutsInRange = useMemo(() => {
    if (timeRangeDays === null) return payouts;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - timeRangeDays);
    return payouts.filter((p) => new Date(p.createdAt) >= cutoff);
  }, [payouts, timeRangeDays]);

  // Compute earnings within the selected time range
  const rangeEarnings = useMemo(() => {
    return payoutsInRange
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payoutsInRange]);

  // Compute bucketed earnings for chart based on the selected range.
  // 7d = daily buckets, 30d/90d = weekly buckets, all = monthly buckets.
  const chartData = useMemo(() => {
    return bucketPayoutsForChart(payoutsInRange, timeRange);
  }, [payoutsInRange, timeRange]);

  const maxChartAmount = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.amount));
    return max > 0 ? max : 5000;
  }, [chartData]);

  const handleUpdatePayment = useCallback(() => {
    toast.info("Navigate to Wallet settings to update bank/wallet details.");
  }, []);

  const handleContactSupport = useCallback(() => {
    router.push("/support");
  }, [router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Main Content Area */}
      <main className="w-full max-w-[1280px] mx-auto flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-surface-white border-b border-outline-variant px-8 flex items-center">
          <h1 className="text-lg font-bold text-on-surface">Earnings</h1>
        </header>

        {/* Dashboard Panels */}
        <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* KPI 1: Total Earnings */}
            <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                TOTAL EARNINGS
              </span>
              <p className="text-2xl font-black text-on-surface mt-1">
                {formatNpr(totalEarned)}
              </p>
              <p className="text-[11px] text-secondary mt-1.5">All-time settled earnings</p>
            </div>

            {/* KPI 2: This Week */}
            <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                {timeRange === "all" ? "ALL TIME" : `LAST ${timeRangeDays} DAYS`}
              </span>
              <p className="text-2xl font-black text-primary mt-1">
                {formatNpr(rangeEarnings)}
              </p>
              <div className="flex items-center gap-1 text-success-green text-[10px] font-bold mt-1.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                <span>+15% from previous period</span>
              </div>
            </div>

            {/* KPI 3: Pending Payouts */}
            <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-wider block mb-1">
                PENDING PAYOUTS
              </span>
              <p className="text-2xl font-black text-warning-amber mt-1">
                {formatNpr(pendingPayout)}
              </p>
              <p className="text-[11px] text-secondary mt-1.5">Processing Gateway transfers</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Middle Column (span 2) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Earnings Overview Chart */}
              <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-on-surface">Earnings Overview</h3>
                  <select
                    value={timeRange}
                    onChange={(event) => setTimeRange(event.target.value as EarningsTimeRange)}
                    aria-label="Earnings time range"
                    className="h-9 px-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-semibold text-secondary focus:outline-none cursor-pointer"
                  >
                    {EARNINGS_TIME_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Render Custom dynamic Bar Chart */}
                <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-4 border-b border-outline-variant relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-x-0 top-6 border-t border-dashed border-outline-variant/30 text-[9px] text-secondary/40 text-right pr-2">Max: {maxChartAmount}</div>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-outline-variant/30" />

                  {chartData.map((day) => {
                    const heightPercent = maxChartAmount > 0 ? (day.amount / maxChartAmount) * 100 : 0;
                    return (
                      <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-on-surface text-white text-[10px] font-bold py-1 px-2 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                          {formatNpr(day.amount)}
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                          className={[
                            "w-full rounded-t-lg transition-all duration-300",
                            day.amount > 0 ? "bg-primary hover:bg-primary/80" : "bg-surface-container-high",
                          ].join(" ")}
                        />

                        {/* Label */}
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{day.dayName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions Table */}
              <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="text-sm font-bold text-on-surface">Recent Transactions</h3>
                  <Link href="/driver/payouts" className="text-xs font-bold text-primary hover:underline">
                    View All
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-secondary uppercase font-semibold border-b border-outline-variant">
                        <th className="p-4">Date</th>
                        <th className="p-4">Job ID</th>
                        <th className="p-4">Gateway</th>
                        <th className="p-4">Amount (NPR)</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {isLoading && (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-secondary font-semibold">
                            Loading transactions...
                          </td>
                        </tr>
                      )}

                      {!isLoading && payouts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-secondary">
                            No payout transactions found.
                          </td>
                        </tr>
                      )}

                      {!isLoading &&
                        payouts.slice(0, 4).map((payout: DriverPayoutItem) => {
                          const gw = (payout.gateway || "bank").toLowerCase();
                          const gwConf = GATEWAY_CLASSES[gw] || GATEWAY_CLASSES.bank;
                          const shortId = payout.jobId && typeof payout.jobId !== "string"
                            ? `#SS-${payout.jobId._id.slice(-4).toUpperCase()}`
                            : "#SS-JOB";

                          return (
                            <tr key={payout._id} className="hover:bg-surface-container-lowest transition-colors">
                              <td className="p-4 font-medium text-secondary">
                                {formatShortDate(payout.createdAt)}
                              </td>
                              <td className="p-4 font-bold text-primary">
                                {shortId}
                              </td>
                              <td className="p-4">
                                <span className={["px-2.5 py-0.5 rounded text-[10px] tracking-wider", gwConf.bg, gwConf.text].join(" ")}>
                                  {gwConf.label}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-on-surface">
                                {payout.amount.toLocaleString("en-NP")}
                              </td>
                              <td className="p-4">
                                <span className={["px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border", TXN_STATUS_CLASSES[payout.status] || TXN_STATUS_CLASSES.pending].join(" ")}>
                                  {payout.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (span 1) */}
            <div className="flex flex-col gap-6">
              {/* Payout Info Panel */}
              <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">info</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Payout Information</h4>
                    <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                      SwiftShip processes payouts to Nepal payment gateways manually for security verification.
                    </p>
                  </div>
                </div>

                <div className="border-t border-outline-variant pt-3 flex flex-col gap-3">
                  <h5 className="text-[10px] font-bold text-secondary uppercase tracking-wider">Processing Times</h5>
                  <ul className="flex flex-col gap-2.5 text-[11px]">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#60bb46]" />
                      <span className="text-secondary font-medium">eSewa / Khalti:</span>
                      <strong className="text-on-surface font-semibold ml-auto">Within 24 Hours</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-secondary font-medium">Bank Transfer:</span>
                      <strong className="text-on-surface font-semibold ml-auto">1–2 Business Days</strong>
                    </li>
                  </ul>
                </div>

                <p className="text-[10px] text-secondary leading-relaxed bg-surface-container-low border border-outline-variant p-2.5 rounded-lg">
                  To ensure timely payouts, please verify your wallet ID or bank details in the settings tab.
                </p>

                <button
                  type="button"
                  onClick={handleUpdatePayment}
                  className="w-full h-10 rounded-lg border border-outline-variant text-xs font-bold text-secondary hover:bg-surface-container transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">credit_card</span>
                  Update Payment Details
                </button>
              </div>

              {/* Need Help Panel */}
              <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm flex flex-col gap-4 items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">support_agent</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Need Help?</h4>
                  <p className="text-[11px] text-secondary mt-1 leading-relaxed">
                    Having issues with a recent payout or missing earnings?
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContactSupport}
                  className="w-full h-10 rounded-lg bg-inverse-surface text-inverse-on-surface text-xs font-bold hover:bg-inverse-surface/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
