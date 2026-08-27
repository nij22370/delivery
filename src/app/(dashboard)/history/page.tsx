"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { JOB_STATUS } from "@/types/job";
import { formatShortDate } from "@/utils/format";
import { apiFetch } from "@/utils/apiFetch";

const PAGE_SIZE = 10;
const JOBS_ENDPOINT = "/api/jobs";
const STATUS_BADGE_CLASSES: Record<string, string> = {
  [JOB_STATUS.DELIVERED]: "bg-success-green/10 text-success-green",
  [JOB_STATUS.CANCELLED]: "bg-error-container text-error-red",
  [JOB_STATUS.DISPUTED]: "bg-error-container text-error-red",
};

interface HistoryJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  createdAt: string;
  driverId: string | null;
  paymentStatus?: string;
  paymentGateway?: string;
}

interface JobsApiResponse {
  jobs: HistoryJob[];
  total: number;
  page: number;
  totalPages: number;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function StatusBadge({ status }: { status: string }) {
  const className = STATUS_BADGE_CLASSES[status] ?? "bg-surface-container text-on-surface-variant";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${className}`}
    >
      {status}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const displayStatus = status ?? "paid";
  const className =
    displayStatus === "paid"
      ? "bg-success-green/10 text-success-green"
      : "bg-warning-amber/10 text-warning-amber";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${className}`}
    >
      {displayStatus}
    </span>
  );
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="border-b border-outline-variant">
          <td className="p-4"><div className="h-4 bg-surface-container-high rounded w-24 animate-pulse" /></td>
          <td className="p-4"><div className="h-4 bg-surface-container-high rounded w-32 animate-pulse" /></td>
          <td className="p-4"><div className="h-4 bg-surface-container-high rounded w-20 animate-pulse" /></td>
          <td className="p-4 text-right"><div className="h-4 bg-surface-container-high rounded w-16 animate-pulse" /></td>
          <td className="p-4"><div className="h-4 bg-surface-container-high rounded w-12 animate-pulse" /></td>
        </tr>
      ))}
    </>
  );
}

async function fetchJobsByStatus(status: string, page: number): Promise<JobsApiResponse> {
  const params = new URLSearchParams({
    status,
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  const response = await apiFetch(`${JOBS_ENDPOINT}?${params}`);
  if (!response.ok) {
    throw new Error("Failed to load jobs");
  }
  return response.json() as Promise<JobsApiResponse>;
}

export default function HistoryPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const [activeTab, setActiveTab] = useState<"jobs" | "payments">("jobs");
  const [jobsPage, setJobsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);

  const {
    data: deliveredJobs,
    isLoading: isDeliveredLoading,
    isError: isDeliveredError,
  } = useQuery<JobsApiResponse, Error>({
    queryKey: ["history-jobs-delivered", jobsPage],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.DELIVERED, jobsPage),
    enabled: !!user,
    staleTime: 30_000,
  });

  const {
    data: cancelledJobs,
    isLoading: isCancelledLoading,
    isError: isCancelledError,
  } = useQuery<JobsApiResponse, Error>({
    queryKey: ["history-jobs-cancelled", jobsPage],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.CANCELLED, jobsPage),
    enabled: !!user,
    staleTime: 30_000,
  });

  const {
    data: paymentJobs,
    isLoading: isPaymentsLoading,
    isError: isPaymentsError,
  } = useQuery<JobsApiResponse, Error>({
    queryKey: ["history-payments", paymentsPage],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.DELIVERED, paymentsPage),
    enabled: !!user,
    staleTime: 30_000,
  });

  const combinedJobs = useMemo(() => {
    const delivered = deliveredJobs?.jobs ?? [];
    const cancelled = cancelledJobs?.jobs ?? [];
    return [...delivered, ...cancelled].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [deliveredJobs?.jobs, cancelledJobs?.jobs]);

  const isLoadingJobs = isDeliveredLoading || isCancelledLoading;
  const isJobsError = isDeliveredError || isCancelledError;

  const handleTabChange = (tab: "jobs" | "payments") => {
    setActiveTab(tab);
  };

  const handleLoadMoreJobs = () => {
    const totalPages = Math.max(
      deliveredJobs?.totalPages ?? 0,
      cancelledJobs?.totalPages ?? 0
    );
    if ((deliveredJobs && jobsPage < deliveredJobs.totalPages) ||
        (cancelledJobs && jobsPage < cancelledJobs.totalPages) ||
        (!deliveredJobs && !cancelledJobs)) {
      setJobsPage((prev) => prev + 1);
    }
  };

  const handleLoadMorePayments = () => {
    if (paymentJobs && paymentsPage < paymentJobs.totalPages) {
      setPaymentsPage((prev) => prev + 1);
    }
  };

  const paymentRecords = useMemo(() => {
    return (paymentJobs?.jobs ?? []).map((job) => ({
      jobId: job._id,
      amount: job.offeredPrice,
      gateway: job.paymentGateway ?? "bank",
      status: job.paymentStatus ?? "paid",
      date: job.createdAt,
    }));
  }, [paymentJobs?.jobs]);

  const totalPaymentAmount = useMemo(
    () => paymentRecords.reduce((sum, record) => sum + record.amount, 0),
    [paymentRecords]
  );

  const isJobsEmpty = !isLoadingJobs && combinedJobs.length === 0;
  const isPaymentsEmpty = !isPaymentsLoading && paymentRecords.length === 0;

  if (isAuthLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-6" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-on-surface">History</h1>
        <div className="flex gap-2 p-1 bg-surface-container-high rounded-lg">
          <button
            type="button"
            onClick={() => handleTabChange("jobs")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "jobs"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Jobs
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("payments")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "payments"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Payments
          </button>
        </div>
      </div>

      {activeTab === "jobs" && (
        <>
          {isJobsError ? (
            <p className="text-error-red font-medium">Failed to load job history.</p>
          ) : (
            <>
              <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
                    <tr>
                      <th className="px-6 py-4">Job ID</th>
                      <th className="px-6 py-4">Destination</th>
                      <th className="px-6 py-4">Driver</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Price (NPR)</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {isLoadingJobs ? (
                      <TableSkeleton rows={4} />
                    ) : isJobsEmpty ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-secondary">
                          No job history found.
                        </td>
                      </tr>
                    ) : (
                      combinedJobs.map((job) => (
                        <tr key={job._id} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-6 py-4 font-bold text-primary">
                            <Link
                              href={`/jobs/${job._id}`}
                              className="hover:text-primary-container transition-colors cursor-pointer"
                            >
                              #{job._id.slice(-6).toUpperCase()}
                            </Link>
                          </td>
                          <td className="px-6 py-4">
                            {formatShortAddress(job.pickupAddress)} → {formatShortAddress(job.dropoffAddress)}
                          </td>
                          <td className="px-6 py-4 text-secondary">
                            {job.driverId ? `#${job.driverId.slice(-6).toUpperCase()}` : " —"}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={job.status} />
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">
                            {job.offeredPrice.toLocaleString("en-NP")}
                          </td>
                          <td className="px-6 py-4 text-secondary">
                            {formatShortDate(job.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isJobsEmpty &&
               deliveredJobs && jobsPage < deliveredJobs.totalPages && (
                <button
                  type="button"
                  onClick={handleLoadMoreJobs}
                  className="mt-6 px-6 py-3 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:bg-primary-container/90 transition-colors cursor-pointer"
                >
                  Load More
                </button>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "payments" && (
        <>
          {!isPaymentsEmpty && (
            <div className="bg-surface-container-low rounded-xl px-6 py-4 mb-4 flex justify-between items-center">
              <p className="text-sm text-secondary font-medium">Total Paid</p>
              <p className="text-xl font-bold text-on-surface">
                NPR {totalPaymentAmount.toLocaleString("en-NP")}
              </p>
            </div>
          )}
          {isPaymentsError ? (
            <p className="text-error-red font-medium">Failed to load payment history.</p>
          ) : (
            <>
              <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
                    <tr>
                      <th className="px-6 py-4">Job ID</th>
                      <th className="px-6 py-4 text-right">Amount (NPR)</th>
                      <th className="px-6 py-4">Gateway</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {isPaymentsLoading ? (
                      <TableSkeleton rows={4} />
                    ) : isPaymentsEmpty ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-secondary">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      paymentRecords.map((record) => (
                        <tr key={record.jobId} className="hover:bg-surface-container-lowest transition-colors">
                          <td className="px-6 py-4 font-bold text-primary">
                            #{record.jobId.slice(-6).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-on-surface">
                            {record.amount.toLocaleString("en-NP")}
                          </td>
                          <td className="px-6 py-4 capitalize">{record.gateway}</td>
                          <td className="px-6 py-4">
                            <PaymentStatusBadge status={record.status} />
                          </td>
                          <td className="px-6 py-4 text-secondary">
                            {formatShortDate(record.date)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {!isPaymentsEmpty &&
               paymentJobs && paymentsPage < paymentJobs.totalPages && (
                <button
                  type="button"
                  onClick={handleLoadMorePayments}
                  className="mt-6 px-6 py-3 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:bg-primary-container/90 transition-colors cursor-pointer"
                >
                  Load More
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
