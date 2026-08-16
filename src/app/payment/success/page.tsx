import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Constants ─────────────────────────────────────────────────────────────────
const GATEWAY_LABELS: Record<string, string> = {
  khalti: "Khalti",
  esewa: "eSewa",
};

function formatPaymentDate(date: Date): string {
  return date.toLocaleString("en-NP", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    pidx?: string;
    data?: string;
    jobId?: string;
    gateway?: string;
    amount?: string;
    verified?: string;
  }>;
}) {
  const params = await searchParams;
  const { pidx, data, jobId, gateway, amount, verified } = params;

  // 1. Gateway return with Khalti pidx -> redirect to server verification route
  if (pidx) {
    redirect(`/api/payments/khalti/verify?pidx=${encodeURIComponent(pidx)}`);
  }

  // 2. Gateway return with eSewa data -> redirect to server verification route
  if (data) {
    redirect(`/api/payments/esewa/verify?data=${encodeURIComponent(data)}`);
  }

  // 3. Verified state -> Render Payment Successful screen (Image 3)
  if (verified === "true" && jobId) {
    const shortJobId = jobId.length > 6 ? `SS-${jobId.slice(-4).toUpperCase()}` : jobId;
    const gatewayLabel = (gateway && GATEWAY_LABELS[gateway.toLowerCase()]) || gateway || "Online";
    const amountVal = amount ? parseFloat(amount) : null;
    const formattedDate = formatPaymentDate(new Date());

    return (
      <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans">
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="bg-surface-white rounded-2xl shadow-sm border border-outline-variant/40 p-8 md:p-10 max-w-md w-full flex flex-col items-center text-center">
            {/* Green Checkmark Badge */}
            <div className="w-16 h-16 rounded-full bg-success-green/15 flex items-center justify-center mb-6">
              <span
                className="material-symbols-outlined text-success-green text-[36px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-on-surface mb-3 tracking-tight">
              Payment<br />Successful
            </h1>
            <p className="text-sm text-secondary mb-8 leading-relaxed max-w-xs">
              Your payment has been verified. The driver has been notified and is on their way.
            </p>

            {/* Details Box */}
            <div className="w-full border border-outline-variant/60 rounded-xl overflow-hidden mb-8 text-sm">
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline-variant/60">
                <span className="text-secondary">Job ID</span>
                <span className="font-semibold text-on-surface">#{shortJobId}</span>
              </div>
              {amountVal !== null && (
                <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline-variant/60">
                  <span className="text-secondary">Amount Paid</span>
                  <span className="font-semibold text-on-surface">
                    {amountVal.toLocaleString("en-NP")} NPR
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline-variant/60">
                <span className="text-secondary">Payment Gateway</span>
                <span className="font-semibold text-on-surface">{gatewayLabel}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3.5">
                <span className="text-secondary">Date</span>
                <span className="font-semibold text-on-surface">{formattedDate}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <Link
                href={`/jobs/${jobId}/track`}
                id="btn-track-delivery"
                className="w-full h-12 bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors cursor-pointer shadow-sm"
              >
                Track Delivery
              </Link>
              <Link
                href={`/jobs/${jobId}`}
                id="btn-download-receipt"
                className="w-full h-12 border border-outline-variant text-on-surface rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Download Receipt
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-outline-variant/40 bg-surface-white">
          <div className="max-w-[1280px] mx-auto px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-secondary">
            <span className="font-bold text-on-surface">SwiftShip Logistics Nepal</span>
            <span>© 2024 SwiftShip Logistics Nepal. All rights reserved.</span>
            <div className="flex gap-6 text-xs">
              <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Help Center</span>
              <span className="hover:text-primary cursor-pointer transition-colors">Contact Us</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Fallback if accessed directly without parameters
  redirect("/dashboard");
}