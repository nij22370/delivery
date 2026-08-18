"use client";

import React from "react";
import Link from "next/link";

const CARD_CONTAINER_CLASS =
  "bg-surface-white border border-surface-variant rounded-lg p-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow";

export default function PayoutInfoCard() {
  return (
    <aside className={CARD_CONTAINER_CLASS}>
      <div className="flex items-center gap-2.5 mb-4 text-primary">
        <span className="material-symbols-outlined text-2xl">info</span>
        <h3 className="text-lg font-bold text-on-background">
          Payout Information
        </h3>
      </div>

      <div className="space-y-4 text-sm text-on-surface-variant">
        <p className="leading-relaxed">
          SwiftShip processes payouts to Nepali payment gateways manually for
          security verification.
        </p>

        <div className="bg-surface-container-low p-4 rounded-lg border border-surface-variant">
          <h4 className="text-xs font-semibold text-on-background uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">
              schedule
            </span>
            Processing Times
          </h4>
          <ul className="space-y-1.5 text-xs text-on-surface">
            <li className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <span>
                <strong>eSewa / Khalti:</strong> Within 24 hours (Business Days)
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-primary font-bold">•</span>
              <span>
                <strong>Bank Transfer:</strong> 1-2 Business Days
              </span>
            </li>
          </ul>
        </div>

        <p className="text-xs leading-relaxed">
          To ensure timely payouts, please verify your wallet ID or bank details
          in the{" "}
          <Link href="/settings" className="text-primary font-medium hover:underline">
            Settings
          </Link>{" "}
          tab.
        </p>
      </div>

      <Link
        href="/settings"
        className="w-full mt-6 border border-surface-variant bg-surface-white hover:bg-surface-container-low text-on-background font-semibold text-xs md:text-sm py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">
          account_balance
        </span>
        Update Payment Details
      </Link>
    </aside>
  );
}
