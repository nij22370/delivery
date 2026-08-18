"use client";

import React from "react";
import { formatNpr } from "@/utils/format";

interface SummaryCardsProps {
  totalEarned?: number;
  weekAmount?: number;
  pendingPayout?: number;
}

const CARD_CONTAINER_CLASS =
  "bg-surface-white border border-surface-variant rounded-lg p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow";

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2";

const VALUE_CLASS = "text-[2rem] leading-[2.5rem] font-bold";

export default function SummaryCards({
  totalEarned = 0,
  weekAmount = 0,
  pendingPayout = 0,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. Total Earnings */}
      <div className={CARD_CONTAINER_CLASS}>
        <p className={LABEL_CLASS}>Total Earnings</p>
        <h3 className={`${VALUE_CLASS} text-on-background`}>
          {formatNpr(totalEarned)}
        </h3>
      </div>

      {/* 2. This Week */}
      <div className={CARD_CONTAINER_CLASS}>
        <p className={LABEL_CLASS}>This Week</p>
        <h3 className={`${VALUE_CLASS} text-primary`}>
          {formatNpr(weekAmount)}
        </h3>
        <p className="text-xs font-medium text-success-green mt-2 flex items-center gap-1">
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            trending_up
          </span>
          +15% from last week
        </p>
      </div>

      {/* 3. Pending Payouts */}
      <div className={CARD_CONTAINER_CLASS}>
        <p className={LABEL_CLASS}>Pending Payouts</p>
        <h3 className={`${VALUE_CLASS} text-[#F5A623]`}>
          {formatNpr(pendingPayout)}
        </h3>
      </div>
    </div>
  );
}
