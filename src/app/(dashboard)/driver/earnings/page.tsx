"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useEarnings } from "@/hooks/useEarnings";
import { useDriverPayouts } from "@/api/hooks/drivers/payoutsApi";
import SummaryCards from "@/components/earnings/SummaryCards";
import EarningsChart from "@/components/earnings/EarningsChart";
import RecentTransactions from "@/components/earnings/RecentTransactions";
import PayoutInfoCard from "@/components/earnings/PayoutInfoCard";
import SupportCard from "@/components/earnings/SupportCard";
import { getInitials } from "@/utils/format";
import type { EarningsRange } from "@/types/earnings";

const DRIVER_ROLE = "driver";
const DASHBOARD_PATH = "/dashboard";
const DEFAULT_RANGE: EarningsRange = "week";

export default function DriverEarningsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const [selectedRange, setSelectedRange] = useState<EarningsRange>(DEFAULT_RANGE);

  useEffect(() => {
    if (!isAuthLoading && user?.role !== DRIVER_ROLE) {
      router.replace(DASHBOARD_PATH);
    }
  }, [isAuthLoading, user, router]);

  const isDriver = !isAuthLoading && user?.role === DRIVER_ROLE;
  const driverId = isDriver ? user._id : null;

  const currentRangeQuery = useEarnings(driverId, selectedRange);
  const weekQuery = useEarnings(driverId, "week");
  const allTimeQuery = useEarnings(driverId, "all-time");
  const payoutsQuery = useDriverPayouts(Boolean(isDriver));

  const isLoading =
    isAuthLoading ||
    (Boolean(driverId) &&
      (currentRangeQuery.isLoading ||
        weekQuery.isLoading ||
        payoutsQuery.isLoading));

  const totalEarned = useMemo(() => {
    if (typeof payoutsQuery.data?.totalEarned === "number") {
      return payoutsQuery.data.totalEarned;
    }
    return allTimeQuery.data?.summary.totalAmount ?? 0;
  }, [payoutsQuery.data?.totalEarned, allTimeQuery.data?.summary.totalAmount]);

  const weekAmount = useMemo(
    () => weekQuery.data?.summary.totalAmount ?? 0,
    [weekQuery.data?.summary.totalAmount]
  );

  const pendingPayout = useMemo(
    () => payoutsQuery.data?.pendingPayout ?? 0,
    [payoutsQuery.data?.pendingPayout]
  );

  const userInitials = useMemo(() => {
    return user?.name ? getInitials(user.name) : "DR";
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Top Header Bar */}
      <header className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
            Earnings
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Overview of your performance, revenue, and Nepali gateway payouts
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">
              notifications
            </span>
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden border border-surface-variant bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-sm">
            <span>{userInitials}</span>
          </div>
        </div>
      </header>

      {/* 12-Column Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8-Column Area: Summary Cards + Chart + Recent Transactions */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <SummaryCards
            totalEarned={totalEarned}
            weekAmount={weekAmount}
            pendingPayout={pendingPayout}
          />

          <EarningsChart
            data={currentRangeQuery.data?.breakdown}
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />

          <RecentTransactions
            payouts={payoutsQuery.data?.payouts}
            isLoading={payoutsQuery.isLoading}
          />
        </div>

        {/* Right 4-Column Area: Payout Information + Need Help / Support */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <PayoutInfoCard />
          <SupportCard />
        </div>
      </div>
    </main>
  );
}
