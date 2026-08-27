"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { JOB_STATUS } from "@/types/job";
import { formatNpr, formatShortDate } from "@/utils/format";
import { apiFetch } from "@/utils/apiFetch";

const JOBS_ENDPOINT = "/api/jobs";
const PAGE_SIZE = 20;
const STATUS_BADGE_CLASSES: Record<string, string> = {
  [JOB_STATUS.DELIVERED]: "bg-success-green/10 text-success-green",
};
const BADGE_TEXT = "PAID";

interface BillingJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
  createdAt: string;
  driverId: string | null;
}

interface JobsApiResponse {
  jobs: BillingJob[];
  total: number;
  page: number;
  totalPages: number;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="border-b border-outline-variant">
          <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-20 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-48 animate-pulse" /></td>
          <td className="px-6 py-4 text-right"><div className="h-4 bg-surface-container-high rounded w-16 animate-pulse" /></td>
          <td className="px-6 py-4"><div className="h-4 bg-surface-container-high rounded w-20 animate-pulse" /></td>
        </tr>
      ))}
    </>
  );
}

async function fetchDeliveredJobs(page: number): Promise<JobsApiResponse> {
  const params = new URLSearchParams({
    status: JOB_STATUS.DELIVERED,
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  const response = await apiFetch(`${JOBS_ENDPOINT}?${params}`);
  if (!response.ok) {
    throw new Error("Failed to load delivered jobs");
  }
  return response.json() as Promise<JobsApiResponse>;
}

export default function BillingPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const {
    data: jobsData,
    isLoading,
    isError,
  } = useQuery<JobsApiResponse, Error>({
    queryKey: ["billing-jobs"],
    queryFn: () => fetchDeliveredJobs(1),
    enabled: !!user,
    staleTime: 30_000,
  });

  const jobs = useMemo(() => jobsData?.jobs ?? [], [jobsData?.jobs]);

  const totalSpent = useMemo(
    () => jobs.reduce((sum, job) => sum + job.offeredPrice, 0),
    [jobs]
  );

  const isJobsEmpty = !isLoading && jobs.length === 0;

  if (isAuthLoading || isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-6" />
        <div className="bg-primary-container text-on-primary-container rounded-xl p-6 shadow-lg mb-6 animate-pulse">
          <div className="h-4 bg-primary-container/30 rounded w-24 mb-2" />
          <div className="h-8 bg-primary-container/30 rounded w-32" />
        </div>
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4 text-right">Amount (NPR)</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              <TableSkeleton rows={4} />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <p className="text-error-red font-medium">Failed to load billing records.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-on-surface">Billing</h1>

      <div className="bg-primary-container text-on-primary-container rounded-xl p-6 shadow-lg shadow-primary/20">
        <p className="text-primary-fixed/80 font-medium text-sm uppercase tracking-wider">Total Spent</p>
        <p className="text-white text-3xl font-black mt-1">{formatNpr(totalSpent)}</p>
        <p className="text-primary-fixed/60 text-xs mt-1">{jobs.length} paid deliveries</p>
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
            <tr>
              <th className="px-6 py-4">Job ID</th>
              <th className="px-6 py-4">Route</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Amount (NPR)</th>
              <th className="px-6 py-4">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isJobsEmpty ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-secondary">
                  No billing records found. No deliveries have been completed yet.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job._id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">
                    <Link
                      href={`/jobs/${job._id}`}
                      className="hover:text-primary-container transition-colors cursor-pointer"
                    >
                      #{job._id.slice(-6).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-secondary">
                    {formatShortAddress(job.pickupAddress)} → {formatShortAddress(job.dropoffAddress)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        STATUS_BADGE_CLASSES[BADGE_TEXT] ?? "bg-surface-container text-secondary"
                      }`}
                    >
                      {BADGE_TEXT}
                    </span>
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
    </div>
  );
}
