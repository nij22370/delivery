"use client";

import { useCallback, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import type { JobVehicleType } from "@/types/job";

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_PAGE_QUERY_KEY = "payment-job";
const PAYMENT_GATEWAYS = [
  { id: "esewa", name: "eSewa", logo: "/images/phase6-payments/esewa-logo.png" },
  { id: "khalti", name: "Khalti", logo: "/images/phase6-payments/khalti-logo.png" },
] as const;
const PLATFORM_FEE_RATE = 0.1;
const POSTER_ROLE = "poster";

type GatewayId = (typeof PAYMENT_GATEWAYS)[number]["id"];

// ── Types ─────────────────────────────────────────────────────────────────────
interface PaymentJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  offeredPrice: number;
  vehicleType: JobVehicleType;
  status: string;
  driverId: string | null;
  paymentStatus?: string;
}

interface InitiatePaymentResult {
  method: "redirect" | "form";
  url: string;
  params?: Record<string, string>;
}

// ── Fetchers ──────────────────────────────────────────────────────────────────
async function fetchJob(jobId: string): Promise<PaymentJob> {
  const response = await apiFetch(`/api/jobs/${jobId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: PaymentJob } = await response.json();
  return data.job;
}

async function initiatePayment(jobId: string, gateway: GatewayId): Promise<InitiatePaymentResult> {
  const response = await apiFetch("/api/payments/initiate", {
    method: "POST",
    body: JSON.stringify({ jobId, gateway }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Failed to initiate payment.");
  }
  return response.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────
function GatewayCard({
  gateway,
  isSelected,
  isDisabled,
  onSelect,
}: {
  gateway: (typeof PAYMENT_GATEWAYS)[number];
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (id: GatewayId) => void;
}) {
  const handleClick = useCallback(() => {
    onSelect(gateway.id);
  }, [gateway.id, onSelect]);

  return (
    <button
      id={`btn-gateway-${gateway.id}`}
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={`relative w-full border-2 rounded-xl p-6 flex flex-col items-center gap-3 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-outline-variant bg-surface-white hover:border-primary/40 hover:bg-surface-container-low"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? "border-primary bg-primary" : "border-outline-variant bg-surface-white"
        }`}
      >
        {isSelected && (
          <span className="material-symbols-outlined text-on-primary text-sm" style={{ fontSize: "14px" }}>
            check
          </span>
        )}
      </div>

      {/* Logo */}
      <div className="w-14 h-14 bg-surface-white border border-outline-variant rounded-full overflow-hidden flex items-center justify-center shadow-sm">
        <img
          src={gateway.logo}
          alt={`${gateway.name} logo`}
          className="w-full h-full object-contain p-2"
        />
      </div>

      <span className="text-sm font-semibold text-on-surface">{gateway.name}</span>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-8 bg-surface-container-high rounded w-64" />
          <div className="h-4 bg-surface-container rounded w-48" />
          <div className="h-6 bg-surface-container-high rounded w-40 mt-6" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-36 bg-surface-container rounded-xl" />
            <div className="h-36 bg-surface-container rounded-xl" />
          </div>
        </div>
        <div className="h-80 bg-surface-container rounded-xl" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function PaymentPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId") ?? "";
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [selectedGateway, setSelectedGateway] = useState<GatewayId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isPoster = !isAuthLoading && user?.role === POSTER_ROLE;

  const { data: job, isLoading, isError, error } = useQuery({
    queryKey: [PAYMENT_PAGE_QUERY_KEY, jobId],
    queryFn: () => fetchJob(jobId),
    enabled: !!jobId && !isAuthLoading,
    retry: false,
  });

  const platformFee = useMemo(
    () => (job ? job.offeredPrice * PLATFORM_FEE_RATE : 0),
    [job]
  );

  const shortJobId = useMemo(
    () => (job ? `SS-${job._id.slice(-6).toUpperCase()}` : ""),
    [job]
  );

  const initiatePaymentMutation = useMutation({
    mutationFn: ({ gateway }: { gateway: GatewayId }) =>
      initiatePayment(jobId, gateway),
    onSuccess: (result: InitiatePaymentResult) => {
      if (result.method === "redirect") {
        window.location.href = result.url;
      } else if (result.method === "form" && result.params) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = result.url;
        form.style.display = "none";
        Object.entries(result.params).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
      }
    },
    onError: () => {
      setIsSubmitting(false);
    },
  });

  const handleSelectGateway = useCallback((gateway: GatewayId) => {
    setSelectedGateway(gateway);
  }, []);

  const handlePayNow = useCallback(async () => {
    if (!selectedGateway || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await initiatePaymentMutation.mutateAsync({ gateway: selectedGateway });
    } catch {
      // error handled by mutation
    }
  }, [selectedGateway, isSubmitting, initiatePaymentMutation]);

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!jobId) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Missing Job ID</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            No job was specified for payment.
          </p>
          <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low py-12 px-4 md:px-8">
        <div className="max-w-[1100px] mx-auto">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Found</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {error instanceof Error ? error.message : "This job could not be loaded."}
          </p>
          <Link href="/dashboard" className="text-sm font-semibold text-primary hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (job.paymentStatus === "paid") {
    router.replace(`/jobs/${job._id}`);
    return null;
  }

  const isPending = isSubmitting || initiatePaymentMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F3F3F3] py-10 px-4 md:px-8">
      <div className="max-w-[1100px] mx-auto">
        {/* Back link */}
        <Link
          href={`/jobs/${job._id}`}
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors mb-8 cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Job
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* ── Left: Gateway picker ──────────────────────────────────────── */}
          <div className="lg:col-span-2 bg-surface-white rounded-2xl shadow-sm border border-outline-variant p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-on-surface mb-2">Secure Payment</h1>
              <p className="text-secondary text-base">
                Select a payment method to confirm job{" "}
                <span className="font-semibold text-on-surface">#{shortJobId}</span>.
              </p>
            </div>

            {/* Gateway cards */}
            <h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-widest mb-4">
              Payment Method
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {PAYMENT_GATEWAYS.map((gateway) => (
                <GatewayCard
                  key={gateway.id}
                  gateway={gateway}
                  isSelected={selectedGateway === gateway.id}
                  isDisabled={isPending}
                  onSelect={handleSelectGateway}
                />
              ))}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-3 bg-success-green/8 border border-success-green/20 rounded-xl p-4">
              <span
                className="material-symbols-outlined text-success-green text-xl mt-0.5 shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                lock
              </span>
              <p className="text-label-sm text-secondary leading-relaxed">
                Secure, encrypted payments via Nepal&apos;s leading gateways. Your financial
                information is never stored on SwiftShip servers.
              </p>
            </div>

            {/* Error */}
            {initiatePaymentMutation.isError && (
              <div className="mt-4 p-3 text-sm text-error-red bg-error-container border border-error-red/30 rounded-lg">
                {initiatePaymentMutation.error instanceof Error
                  ? initiatePaymentMutation.error.message
                  : "Failed to initiate payment. Please try again."}
              </div>
            )}
          </div>

          {/* ── Right: Job summary ────────────────────────────────────────── */}
          <div className="bg-surface-white rounded-2xl shadow-sm border border-outline-variant p-6 sticky top-24">
            <h2 className="text-lg font-bold text-on-surface mb-5">Job Summary</h2>

            {/* Job ID */}
            <div className="flex justify-between items-center mb-5 pb-5 border-b border-outline-variant">
              <span className="text-sm text-secondary">Job ID</span>
              <span className="text-sm font-bold text-on-surface">#{shortJobId}</span>
            </div>

            {/* Route */}
            <div className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-surface-container-highest space-y-5 mb-6">
              {/* Pickup */}
              <div className="relative">
                <div className="absolute -left-7 top-1 w-3.5 h-3.5 rounded-full bg-surface-white border-2 border-primary" />
                <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest mb-0.5">
                  Pickup
                </p>
                <p className="text-sm font-semibold text-on-surface">
                  {job.pickupAddress.split(",")[0]}
                </p>
                <p className="text-xs text-secondary">
                  {job.pickupAddress.split(",").slice(1).join(",").trim()}
                </p>
              </div>
              {/* Dropoff */}
              <div className="relative">
                <div className="absolute -left-7 top-1 w-3.5 h-3.5 rounded-full bg-surface-white border-2 border-tertiary-container" />
                <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest mb-0.5">
                  Dropoff
                </p>
                <p className="text-sm font-semibold text-on-surface">
                  {job.dropoffAddress.split(",")[0]}
                </p>
                <p className="text-xs text-secondary">
                  {job.dropoffAddress.split(",").slice(1).join(",").trim()}
                </p>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="border-t border-outline-variant pt-5 space-y-3 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Delivery Fee</span>
                <span className="text-sm text-on-surface">
                  {job.offeredPrice.toLocaleString("en-NP")} NPR
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Platform Fee</span>
                <span className="text-sm text-on-surface">
                  {platformFee.toLocaleString("en-NP")} NPR
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="bg-[#F0F4FF] rounded-xl px-4 py-3 flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">
                Total to Pay
              </span>
              <span className="text-2xl font-bold text-primary">
                {job.offeredPrice.toLocaleString("en-NP")} NPR
              </span>
            </div>

            {/* Pay Now button */}
            <button
              id="btn-pay-now"
              type="button"
              onClick={handlePayNow}
              disabled={!selectedGateway || isPending}
              className="w-full h-14 bg-primary text-on-primary rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-container transition-colors flex items-center justify-center gap-2 shadow-sm mb-3 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">
                    progress_activity
                  </span>
                  Processing…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">payment</span>
                  Pay Now
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-secondary">
              By proceeding, you agree to our{" "}
              <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3F3F3] flex items-center justify-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">
            progress_activity
          </span>
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  );
}
