"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useTable,
  tableFeatures,
  createColumnHelper,
  createCoreRowModel,
  createSortedRowModel,
  createPaginatedRowModel,
  flexRender,
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  functionalUpdate,
  type ColumnDef,
  type TableFeatures,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { JOB_STATUS } from "@/types/job";
import { formatShortDate } from "@/utils/format";
import { apiFetch } from "@/utils/apiFetch";

const MY_ACTIVE_IDS_ENDPOINT = "/api/jobs/my-active-ids";
const JOBS_ENDPOINT = "/api/jobs";
const JOBS_PATH = "/jobs";
const TRACK_SUFFIX = "/track";
const PAGE_SIZE = 10;
const COL_COUNT = 5;

const STATUS_BADGE_CLASSES: Record<string, string> = {
  [JOB_STATUS.ACCEPTED]: "bg-primary/10 text-primary",
  [JOB_STATUS.IN_TRANSIT]: "bg-warning-amber/10 text-warning-amber",
};

const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  coreRowModel: createCoreRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

interface ActiveJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
  driverId: string | null;
  createdAt: string;
}

interface MyActiveIdsResponse {
  jobIds: string[];
}

interface JobDetailResponse {
  job: ActiveJob;
}

interface TrackingRow {
  jobId: string;
  fullId: string;
  route: string;
  status: string;
  date: string;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function StatusBadge({ status }: { status: string }) {
  const className =
    STATUS_BADGE_CLASSES[status] ?? "bg-surface-container text-secondary";
  const label = status === JOB_STATUS.IN_TRANSIT ? "In Transit" : "Accepted";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${className}`}>
      {label}
    </span>
  );
}

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (!isSorted)
    return (
      <span className="material-symbols-outlined text-sm text-on-surface-variant opacity-40 select-none">
        unfold_more
      </span>
    );
  return (
    <span className="material-symbols-outlined text-sm text-primary select-none">
      {isSorted === "asc" ? "arrow_upward" : "arrow_downward"}
    </span>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-outline-variant">
      {Array.from({ length: COL_COUNT }).map((_, idx) => (
        <td key={idx} className="px-6 py-4">
          <div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" />
        </td>
      ))}
    </tr>
  );
}

async function fetchActiveJobs(): Promise<ActiveJob[]> {
  const idsResponse = await apiFetch(MY_ACTIVE_IDS_ENDPOINT);
  if (!idsResponse.ok) throw new Error("Failed to fetch active job IDs");
  const idsData = (await idsResponse.json()) as MyActiveIdsResponse;
  if (!idsData.jobIds || idsData.jobIds.length === 0) return [];

  const jobResponses = await Promise.all(
    idsData.jobIds.map((jobId) => apiFetch(`${JOBS_ENDPOINT}/${jobId}`))
  );

  const jobs: ActiveJob[] = [];
  for (const response of jobResponses) {
    if (response.ok) {
      const data = (await response.json()) as JobDetailResponse;
      if (data.job) jobs.push(data.job);
    }
  }
  return jobs;
}

const trackingColHelper = createColumnHelper<typeof TABLE_FEATURES, TrackingRow>();

function buildTrackingColumns(
  onDetailsClick: (fullId: string) => void
) {
  return [
    trackingColHelper.accessor("jobId", {
      header: "Job ID",
      enableSorting: false,
      cell: (info) => (
        <span className="font-bold text-primary">#{info.getValue()}</span>
      ),
    }),
    trackingColHelper.accessor("route", {
      header: "Route",
      cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
    }),
    trackingColHelper.accessor("status", {
      header: "Status",
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    trackingColHelper.accessor("date", {
      header: "Date",
      cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
    }),
    trackingColHelper.display({
      id: "open",
      header: "Actions",
      enableSorting: false,
      cell: (info) => {
        const fullId = info.row.original.fullId;

        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Link
              href={`/jobs/${fullId}/chat`}
              title="Chat with poster"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-container-high rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
            </Link>
            <button
              type="button"
              aria-label={`Open tracking details for job ${info.row.original.jobId}`}
              onClick={(e) => {
                e.stopPropagation();
                onDetailsClick(fullId);
              }}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-container transition-colors cursor-pointer group px-2 py-1 bg-primary/10 rounded-md"
            >
              <span>Track</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        );
      },
    }),
  ] as const;
}

export default function DriverTrackingList() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const {
    data: activeJobs,
    isLoading,
    isError,
  } = useQuery<ActiveJob[], Error>({
    queryKey: ["tracking-active-jobs-driver"],
    queryFn: fetchActiveJobs,
    staleTime: 30_000,
  });

  // Auto-redirect if driver has exactly 1 active shipment to track!
  useEffect(() => {
    if (activeJobs && activeJobs.length === 1 && activeJobs[0]) {
      router.replace(`${JOBS_PATH}/${activeJobs[0]._id}${TRACK_SUFFIX}`);
    }
  }, [activeJobs, router]);

  const tableRows = useMemo<TrackingRow[]>(() => {
    if (!activeJobs) return [];
    return activeJobs.map((job) => ({
      jobId: job._id.slice(-6).toUpperCase(),
      fullId: job._id,
      route: `${formatShortAddress(job.pickupAddress)} → ${formatShortAddress(job.dropoffAddress)}`,
      status: job.status,
      date: formatShortDate(job.createdAt),
    }));
  }, [activeJobs]);

  const handleRowClick = useCallback(
    (fullId: string) => {
      router.push(`${JOBS_PATH}/${fullId}${TRACK_SUFFIX}`);
    },
    [router]
  );

  const handlePrevPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
  }, []);

  const handleNextPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
  }, []);

  const columns = useMemo(
    () => buildTrackingColumns(handleRowClick),
    [handleRowClick]
  );

  const table = useTable({
    features: TABLE_FEATURES,
    data: tableRows,
    columns: columns as unknown as readonly ColumnDef<TableFeatures, RowData>[],
    state: { sorting, pagination },
    onSortingChange: (updater) => setSorting(functionalUpdate(updater, sorting)),
    onPaginationChange: (updater) => setPagination(functionalUpdate(updater, pagination)),
  });

  const total = tableRows.length;
  const totalPages = table.getPageCount();
  const startItem = total === 0 ? 0 : pagination.pageIndex * PAGE_SIZE + 1;
  const endItem = Math.min((pagination.pageIndex + 1) * PAGE_SIZE, total);
  const canGoToPrevPage = pagination.pageIndex > 0;
  const canGoToNextPage = pagination.pageIndex < totalPages - 1;

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-6" />
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <tbody className="divide-y divide-outline-variant">
              {Array.from({ length: 4 }).map((_, idx) => (
                <RowSkeleton key={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <p className="text-error-red font-medium">Failed to load active deliveries.</p>
      </div>
    );
  }

  // If there's exactly 1 active shipment, hide list UI (since useEffect redirects immediately)
  if (activeJobs && activeJobs.length === 1) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Tracking List</h1>
        {tableRows.length > 0 && (
          <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
            {tableRows.length} active
          </span>
        )}
      </div>

      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-6 py-4 whitespace-nowrap ${header.column.getCanSort() ? "cursor-pointer select-none hover:text-on-surface transition-colors" : ""}`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1.5">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon isSorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="p-10 text-center text-secondary">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">
                    location_off
                  </span>
                  No active deliveries to track.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => handleRowClick((row.original as TrackingRow).fullId)}
                  className="hover:bg-surface-container-lowest transition-colors cursor-pointer"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-outline-variant bg-surface-white gap-3">
            <p className="text-xs font-semibold text-secondary">
              Showing {startItem} to {endItem} of {total} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={!canGoToPrevPage}
                className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <span className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
                Page {pagination.pageIndex + 1} of {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={!canGoToNextPage}
                className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Next page"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
