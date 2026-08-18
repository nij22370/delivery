"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import type { DriverPayoutItem } from "@/types/payout/payout";
import { formatCurrency } from "@/utils/format";

interface RecentTransactionsProps {
  payouts: DriverPayoutItem[] | undefined;
  isLoading?: boolean;
}

const SECTION_CONTAINER_CLASS =
  "bg-surface-white border border-surface-variant rounded-lg overflow-hidden hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow";

const TABLE_HEADER_ROW_CLASS =
  "bg-surface-container-low font-semibold text-xs text-on-surface-variant uppercase tracking-wider";

const TABLE_CELL_CLASS = "p-4 text-sm";

const MAX_DISPLAY_COUNT = 5;

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getJobIdDisplay(jobId: DriverPayoutItem["jobId"]): {
  display: string;
  href: string;
} {
  if (typeof jobId === "object" && jobId?._id) {
    return {
      display: `#SWF-${jobId._id.slice(-4).toUpperCase()}`,
      href: `/jobs/${jobId._id}`,
    };
  }
  if (typeof jobId === "string" && jobId.length > 0) {
    return {
      display: `#SWF-${jobId.slice(-4).toUpperCase()}`,
      href: `/jobs/${jobId}`,
    };
  }
  return { display: "#SWF-0000", href: "#" };
}

function renderGatewayBadge(gateway: string) {
  const normalized = gateway?.toLowerCase();
  if (normalized === "esewa") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-[#60BB46] flex items-center justify-center text-white text-[11px] font-bold">
          e
        </span>
        <span className="font-medium text-on-surface">eSewa</span>
      </div>
    );
  }
  if (normalized === "khalti") {
    return (
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-[#5C2D91] flex items-center justify-center text-white text-[11px] font-bold">
          K
        </span>
        <span className="font-medium text-on-surface">Khalti</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded bg-surface-variant flex items-center justify-center text-on-surface-variant text-[11px] font-bold">
        -
      </span>
      <span className="font-medium text-on-surface">Bank</span>
    </div>
  );
}

function renderStatusBadge(status: string) {
  const normalized = status?.toLowerCase();
  if (normalized === "paid") {
    return (
      <span className="inline-block px-2.5 py-1 rounded bg-success-green/10 text-success-green text-xs font-semibold">
        Paid
      </span>
    );
  }
  if (normalized === "processing" || normalized === "initiated") {
    return (
      <span className="inline-block px-2.5 py-1 rounded bg-[#F5A623]/15 text-[#D97706] text-xs font-semibold">
        Processing
      </span>
    );
  }
  if (normalized === "failed") {
    return (
      <span className="inline-block px-2.5 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-1 rounded bg-surface-variant text-on-surface-variant text-xs font-semibold">
      Pending
    </span>
  );
}

export default function RecentTransactions({
  payouts,
  isLoading = false,
}: RecentTransactionsProps) {
  const displayedPayouts = useMemo(() => {
    if (!payouts) return [];
    return payouts.slice(0, MAX_DISPLAY_COUNT);
  }, [payouts]);

  return (
    <section className={SECTION_CONTAINER_CLASS}>
      <div className="p-6 border-b border-surface-variant flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-on-background">
            Recent Transactions
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Latest payout records and delivery disbursements
          </p>
        </div>
        <Link
          href="/driver/payouts"
          className="text-primary font-semibold text-xs md:text-sm hover:underline cursor-pointer transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            <span className="material-symbols-outlined animate-spin text-2xl text-primary mb-2">
              progress_activity
            </span>
            <p>Loading transactions...</p>
          </div>
        ) : displayedPayouts.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={TABLE_HEADER_ROW_CLASS}>
                <th className={TABLE_CELL_CLASS}>Date</th>
                <th className={TABLE_CELL_CLASS}>Job ID</th>
                <th className={TABLE_CELL_CLASS}>Gateway</th>
                <th className={`${TABLE_CELL_CLASS} text-right`}>Amount (NPR)</th>
                <th className={`${TABLE_CELL_CLASS} text-center`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant text-on-background">
              {displayedPayouts.map((payout) => {
                const { display, href } = getJobIdDisplay(payout.jobId);
                return (
                  <tr
                    key={payout._id}
                    className="hover:bg-surface-bright/70 transition-colors"
                  >
                    <td className={`${TABLE_CELL_CLASS} text-on-surface`}>
                      {formatDate(payout.createdAt)}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <Link
                        href={href}
                        className="text-on-surface-variant hover:text-primary font-medium hover:underline cursor-pointer"
                      >
                        {display}
                      </Link>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {renderGatewayBadge(payout.gateway)}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right font-semibold`}>
                      {formatCurrency(payout.amount)}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-center`}>
                      {renderStatusBadge(payout.status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-2">
              receipt_long
            </span>
            <p className="text-sm font-medium text-on-surface">
              No recent transactions found
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              Your completed deliveries and payouts will be listed here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
