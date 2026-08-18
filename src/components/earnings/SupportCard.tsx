"use client";

import React from "react";
import Link from "next/link";

const CARD_CONTAINER_CLASS =
  "bg-surface-white border border-surface-variant rounded-lg p-6 flex flex-col items-center text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-shadow";

export default function SupportCard() {
  return (
    <aside className={CARD_CONTAINER_CLASS}>
      <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center mb-3 text-primary">
        <span className="material-symbols-outlined text-3xl">support_agent</span>
      </div>

      <h4 className="text-lg font-bold text-on-background mb-1">Need Help?</h4>
      <p className="text-xs md:text-sm text-on-surface-variant mb-5 max-w-[260px] leading-relaxed">
        Having issues with a recent payout or missing earnings?
      </p>

      <Link
        href="/support"
        className="w-full bg-on-background hover:bg-black text-white font-semibold text-xs md:text-sm py-3 px-4 rounded-lg transition-colors text-center cursor-pointer"
      >
        Contact Support
      </Link>
    </aside>
  );
}
