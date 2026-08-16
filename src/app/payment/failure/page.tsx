"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ── Inner page (uses useSearchParams) ────────────────────────────────────────
function PaymentFailureInner() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";
  const amountParam = searchParams.get("amount");
  const reason = searchParams.get("reason") ?? "";

  const shortJobId = jobId.length > 6 ? `SS-${jobId.slice(-6).toUpperCase()}` : jobId;
  const amount = amountParam ? parseFloat(amountParam) : null;

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="bg-surface-white rounded-2xl shadow-md p-8 max-w-md w-full flex flex-col items-center text-center">
          {/* Error icon */}
          <div className="w-16 h-16 rounded-full bg-error-container flex items-center justify-center mb-6">
            <span
              className="material-symbols-outlined text-error-red text-[36px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
          </div>

          <h1 className="text-3xl font-bold text-on-surface mb-2 leading-tight">
            Payment Failed
          </h1>
          <p className="text-sm text-secondary mb-8 leading-relaxed max-w-xs">
            We couldn&apos;t process your payment. This could be due to a{" "}
            <span className="text-primary">connection issue</span> or{" "}
            <span className="text-primary">insufficient funds</span> in your wallet.
          </p>

          {/* Details table */}
          {(jobId || amount !== null) && (
            <div className="w-full border border-outline-variant rounded-xl overflow-hidden mb-8">
              {jobId && (
                <div className="flex justify-between items-center px-5 py-4 border-b border-outline-variant">
                  <span className="text-sm text-secondary">Job ID</span>
                  <span className="text-sm font-semibold text-on-surface">#{shortJobId}</span>
                </div>
              )}
              {amount !== null && (
                <div className="flex justify-between items-center px-5 py-4 border-b border-outline-variant">
                  <span className="text-sm text-secondary">Amount</span>
                  <span className="text-sm font-semibold text-on-surface">
                    {amount.toLocaleString("en-NP")} NPR
                  </span>
                </div>
              )}
              {reason && (
                <div className="flex justify-between items-center px-5 py-4">
                  <span className="text-sm text-secondary">Reason</span>
                  <span className="text-sm font-mono text-on-surface capitalize">
                    {reason.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="w-full flex flex-col gap-3">
            <Link
              href={jobId ? `/payment?jobId=${jobId}` : "/dashboard"}
              id="btn-try-again"
              className="w-full h-12 bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center justify-center hover:bg-primary-container transition-colors cursor-pointer"
            >
              Try Again
            </Link>
            <Link
              href="/dashboard"
              id="btn-contact-support"
              className="w-full h-12 border border-outline-variant text-on-surface rounded-xl text-sm font-medium flex items-center justify-center hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant bg-surface-white">
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-secondary">
          <span className="font-bold text-on-surface">SwiftShip</span>
          <div className="flex gap-6">
            <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Help Center</span>
            <span className="hover:text-primary cursor-pointer transition-colors">Contact Us</span>
          </div>
          <span>© 2024 SwiftShip Logistics Nepal. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function PaymentFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">
            progress_activity
          </span>
        </div>
      }
    >
      <PaymentFailureInner />
    </Suspense>
  );
}