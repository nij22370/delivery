"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  useTable,
  tableFeatures,
  createColumnHelper,
  createCoreRowModel,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  flexRender,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  columnFilteringFeature,
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

const PAGE_SIZE = 10;
const JOBS_ENDPOINT = "/api/jobs";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  [JOB_STATUS.DELIVERED]: "bg-success-green/10 text-success-green",
  [JOB_STATUS.CANCELLED]: "bg-error-container text-error-red",
  [JOB_STATUS.DISPUTED]: "bg-error-container text-error-red",
};

const GATEWAY_BADGE_CLASSES: Record<string, { bg: string; text: string; label: string }> = {
  esewa: { bg: "bg-[#60bb46]/10", text: "text-[#60bb46] font-bold", label: "eSewa" },
  khalti: { bg: "bg-[#5c2d91]/10", text: "text-[#5c2d91] font-bold", label: "Khalti" },
  bank: { bg: "bg-primary/10", text: "text-primary font-bold", label: "Bank" },
};

const TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  coreRowModel: createCoreRowModel(),
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

interface HistoryJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  offeredPrice: number;
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

interface JobsTableRow {
  jobId: string;
  fullId: string;
  destination: string;
  driver: string;
  status: string;
  price: number;
  date: string;
}

interface PaymentRecord {
  jobId: string;
  displayJobId: string;
  amount: number;
  gateway: string;
  status: string;
  date: string;
  isDriver: boolean;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function StatusBadge({ status }: { status: string }) {
  const className =
    STATUS_BADGE_CLASSES[status] ?? "bg-surface-container text-on-surface-variant";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${className}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status?: string }) {
  const rawStatus = status ?? "paid";
  const className =
    rawStatus === "paid"
      ? "bg-success-green/10 text-success-green"
      : rawStatus === "failed"
      ? "bg-error-container text-error-red"
      : "bg-warning-amber/10 text-warning-amber";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${className}`}>
      {rawStatus}
    </span>
  );
}

function GatewayBadge({ gateway }: { gateway: string }) {
  const conf = GATEWAY_BADGE_CLASSES[gateway.toLowerCase()] ?? GATEWAY_BADGE_CLASSES.bank;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs tracking-wider ${conf.bg} ${conf.text}`}>
      {conf.label}
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

function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-outline-variant">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-6 py-4">
              <div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" />
            </td>
          ))}
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
  if (!response.ok) throw new Error("Failed to load jobs");
  return response.json() as Promise<JobsApiResponse>;
}

const jobColHelper = createColumnHelper<typeof TABLE_FEATURES, JobsTableRow>();
const payColHelper = createColumnHelper<typeof TABLE_FEATURES, PaymentRecord>();

const JOB_COLUMNS = [
  jobColHelper.accessor("jobId", {
    header: "Job ID",
    enableSorting: false,
    cell: (info) => (
      <Link
        href={`/jobs/${info.row.original.fullId}`}
        className="font-bold text-primary hover:text-primary-container transition-colors cursor-pointer"
      >
        #{info.getValue()}
      </Link>
    ),
  }),
  jobColHelper.accessor("destination", {
    header: "Destination",
    cell: (info) => <span className="text-on-surface">{info.getValue()}</span>,
  }),
  jobColHelper.accessor("driver", {
    header: "Driver",
    cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
  }),
  jobColHelper.accessor("status", {
    header: "Status",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  jobColHelper.accessor("price", {
    header: "Price (NPR)",
    cell: (info) => (
      <span className="font-semibold text-on-surface text-right block">
        {info.getValue().toLocaleString("en-NP")}
      </span>
    ),
  }),
  jobColHelper.accessor("date", {
    header: "Date",
    cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
  }),
  jobColHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => {
      const status = info.row.original.status.toLowerCase();
      const fullId = info.row.original.fullId;

      const isDelivered = status === JOB_STATUS.DELIVERED;
      const isPosted = status === JOB_STATUS.POSTED;
      const isDisputed = status === JOB_STATUS.DISPUTED;

      return (
        <div className="flex items-center gap-1.5">
          {isDelivered && (
            <Link
              href={`/jobs/${fullId}/rate`}
              title="Rate this delivery"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">star</span>
              Rate
            </Link>
          )}

          {isPosted && (
            <Link
              href={`/payment?jobId=${fullId}`}
              title="Pay for this shipment"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">credit_card</span>
              Pay
            </Link>
          )}

          {!isPosted && (
            <Link
              href={`/jobs/${fullId}/chat`}
              title="Open chat"
              className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-container-high rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
            </Link>
          )}

          {!isDisputed && !isPosted && (
            <Link
              href={`/jobs/${fullId}/track`}
              title="Track delivery"
              className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold text-secondary hover:text-primary hover:bg-surface-container-high rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">location_on</span>
            </Link>
          )}

          {!isDisputed && !isPosted && (
            <Link
              href={`/jobs/${fullId}/dispute`}
              title="Report an issue or dispute"
              className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold text-secondary hover:text-error-red hover:bg-error-red/10 rounded-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
            </Link>
          )}
        </div>
      );
    },
  }),
] as const;

const PAYMENT_COLUMNS = [
  payColHelper.accessor("displayJobId", {
    header: "Job ID",
    enableSorting: false,
    cell: (info) => (
      <span className="font-bold text-primary">#{info.getValue()}</span>
    ),
  }),
  payColHelper.accessor("amount", {
    header: "Amount (NPR)",
    cell: (info) => (
      <span className="font-semibold text-on-surface text-right block">
        {info.getValue().toLocaleString("en-NP")}
      </span>
    ),
  }),
  payColHelper.accessor("gateway", {
    header: "Gateway",
    cell: (info) => <GatewayBadge gateway={info.getValue()} />,
  }),
  payColHelper.accessor("status", {
    header: "Status",
    cell: (info) => <PaymentStatusBadge status={info.getValue()} />,
  }),
  payColHelper.accessor("date", {
    header: "Date",
    cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
  }),
] as const;

function DataTableShell({
  colCount,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  filteredCount,
  pageIndex,
  pageCount,
  startItem,
  endItem,
  canGoToPrevPage,
  canGoToNextPage,
  onPrevPage,
  onNextPage,
  isLoading,
  emptyIcon,
  emptyMessage,
  children,
}: {
  colCount: number;
  globalFilter: string;
  onGlobalFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder: string;
  filteredCount: number;
  pageIndex: number;
  pageCount: number;
  startItem: number;
  endItem: number;
  canGoToPrevPage: boolean;
  canGoToNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  isLoading: boolean;
  emptyIcon: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg select-none">search</span>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={onGlobalFilterChange}
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <span className="text-xs text-secondary">{filteredCount} record{filteredCount !== 1 ? "s" : ""}</span>
      </div>
      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          {children}
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <TableSkeleton cols={colCount} rows={5} />
            ) : filteredCount === 0 ? (
              <tr>
                <td colSpan={colCount} className="p-10 text-center text-secondary">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-2">{emptyIcon}</span>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {filteredCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-outline-variant bg-surface-white gap-3">
            <p className="text-xs font-semibold text-secondary">
              Showing {startItem} to {endItem} of {filteredCount} entries
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onPrevPage}
                disabled={!canGoToPrevPage}
                className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous page"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <span className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
                Page {pageIndex + 1} of {pageCount === 0 ? 1 : pageCount}
              </span>
              <button
                type="button"
                onClick={onNextPage}
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

export default function PosterHistory() {
  const [activeTab, setActiveTab] = useState<"jobs" | "payments">("jobs");
  const [jobsGlobalFilter, setJobsGlobalFilter] = useState("");
  const [paymentsGlobalFilter, setPaymentsGlobalFilter] = useState("");

  const { data: deliveredJobs, isLoading: isDeliveredLoading, isError: isDeliveredError } = useQuery<
    JobsApiResponse,
    Error
  >({
    queryKey: ["history-jobs-delivered"],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.DELIVERED, 1),
    staleTime: 30_000,
  });

  const { data: cancelledJobs, isLoading: isCancelledLoading, isError: isCancelledError } = useQuery<
    JobsApiResponse,
    Error
  >({
    queryKey: ["history-jobs-cancelled"],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.CANCELLED, 1),
    staleTime: 30_000,
  });

  const { data: posterPaymentJobsData, isLoading: isPaymentsLoading, isError: isPaymentsError } = useQuery<
    JobsApiResponse,
    Error
  >({
    queryKey: ["history-payments-poster"],
    queryFn: () => fetchJobsByStatus(JOB_STATUS.DELIVERED, 1),
    staleTime: 30_000,
  });

  const jobTableRows = useMemo<JobsTableRow[]>(() => {
    const list = [...(deliveredJobs?.jobs ?? []), ...(cancelledJobs?.jobs ?? [])];
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((job) => ({
        jobId: job._id.slice(-6).toUpperCase(),
        fullId: job._id,
        destination: `${formatShortAddress(job.pickupAddress)} → ${formatShortAddress(job.dropoffAddress)}`,
        driver: job.driverId ? `#${job.driverId.slice(-6).toUpperCase()}` : "—",
        status: job.status,
        price: job.offeredPrice,
        date: formatShortDate(job.createdAt),
      }));
  }, [deliveredJobs?.jobs, cancelledJobs?.jobs]);

  const paymentRecords = useMemo<PaymentRecord[]>(() => {
    return (posterPaymentJobsData?.jobs ?? []).map((job) => ({
      jobId: job._id,
      displayJobId: job._id.slice(-6).toUpperCase(),
      amount: job.offeredPrice,
      gateway: job.paymentGateway ?? "bank",
      status: job.paymentStatus ?? "paid",
      date: formatShortDate(job.createdAt),
      isDriver: false,
    }));
  }, [posterPaymentJobsData?.jobs]);

  const totalPaid = useMemo(
    () => paymentRecords.reduce((sum, r) => sum + r.amount, 0),
    [paymentRecords]
  );

  const [sortingJobs, setSortingJobs] = useState<SortingState>([]);
  const [paginationJobs, setPaginationJobs] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [sortingPayments, setSortingPayments] = useState<SortingState>([]);
  const [paginationPayments, setPaginationPayments] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const tableJobs = useTable({
    features: TABLE_FEATURES,
    data: jobTableRows,
    columns: JOB_COLUMNS as unknown as readonly ColumnDef<TableFeatures, RowData>[],
    state: { sorting: sortingJobs, globalFilter: jobsGlobalFilter, pagination: paginationJobs },
    onSortingChange: (updater) => setSortingJobs(functionalUpdate(updater, sortingJobs)),
    onGlobalFilterChange: setJobsGlobalFilter,
  });

  const tablePayments = useTable({
    features: TABLE_FEATURES,
    data: paymentRecords,
    columns: PAYMENT_COLUMNS as unknown as readonly ColumnDef<TableFeatures, RowData>[],
    state: { sorting: sortingPayments, globalFilter: paymentsGlobalFilter, pagination: paginationPayments },
    onSortingChange: (updater) => setSortingPayments(functionalUpdate(updater, sortingPayments)),
    onGlobalFilterChange: setPaymentsGlobalFilter,
  });

  const jobsFilteredCount = tableJobs.getFilteredRowModel().rows.length;
  const jobsPageCount = tableJobs.getPageCount();
  const jobsStartItem = jobsFilteredCount === 0 ? 0 : paginationJobs.pageIndex * PAGE_SIZE + 1;
  const jobsEndItem = Math.min((paginationJobs.pageIndex + 1) * PAGE_SIZE, jobsFilteredCount);

  const payFilteredCount = tablePayments.getFilteredRowModel().rows.length;
  const payPageCount = tablePayments.getPageCount();
  const payStartItem = payFilteredCount === 0 ? 0 : paginationPayments.pageIndex * PAGE_SIZE + 1;
  const payEndItem = Math.min((paginationPayments.pageIndex + 1) * PAGE_SIZE, payFilteredCount);

  const handleJobsPrev = useCallback(() => setPaginationJobs((p) => ({ ...p, pageIndex: p.pageIndex - 1 })), []);
  const handleJobsNext = useCallback(() => setPaginationJobs((p) => ({ ...p, pageIndex: p.pageIndex + 1 })), []);
  const handleJobsFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setJobsGlobalFilter(e.target.value);
    setPaginationJobs((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const handlePayPrev = useCallback(() => setPaginationPayments((p) => ({ ...p, pageIndex: p.pageIndex - 1 })), []);
  const handlePayNext = useCallback(() => setPaginationPayments((p) => ({ ...p, pageIndex: p.pageIndex + 1 })), []);
  const handlePayFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentsGlobalFilter(e.target.value);
    setPaginationPayments((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const isJobsLoading = isDeliveredLoading || isCancelledLoading;
  const isJobsError = isDeliveredError || isCancelledError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-on-surface">History</h1>
        <div className="flex gap-2 p-1 bg-surface-container-high rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "jobs" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Jobs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "payments" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
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
            <DataTableShell
              colCount={JOB_COLUMNS.length}
              globalFilter={jobsGlobalFilter}
              onGlobalFilterChange={handleJobsFilter}
              searchPlaceholder="Search jobs..."
              filteredCount={jobsFilteredCount}
              pageIndex={paginationJobs.pageIndex}
              pageCount={jobsPageCount}
              startItem={jobsStartItem}
              endItem={jobsEndItem}
              canGoToPrevPage={paginationJobs.pageIndex > 0}
              canGoToNextPage={paginationJobs.pageIndex < jobsPageCount - 1}
              onPrevPage={handleJobsPrev}
              onNextPage={handleJobsNext}
              isLoading={isJobsLoading}
              emptyIcon="inbox"
              emptyMessage="No job history found."
            >
              <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
                {tableJobs.getHeaderGroups().map((g) => (
                  <tr key={g.id}>
                    {g.headers.map((h) => (
                      <th
                        key={h.id}
                        className={`px-6 py-4 whitespace-nowrap ${
                          h.column.getCanSort() ? "cursor-pointer select-none hover:text-on-surface transition-colors" : ""
                        }`}
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanSort() && <SortIcon isSorted={h.column.getIsSorted()} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isJobsLoading &&
                  tableJobs.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </DataTableShell>
          )}
        </>
      )}

      {activeTab === "payments" && (
        <>
          {paymentRecords.length > 0 && (
            <div className="bg-surface-container-low rounded-xl px-6 py-4 flex justify-between items-center">
              <p className="text-sm text-secondary font-medium">Total Paid</p>
              <p className="text-xl font-bold text-on-surface">NPR {totalPaid.toLocaleString("en-NP")}</p>
            </div>
          )}
          {isPaymentsError ? (
            <p className="text-error-red font-medium">Failed to load payment history.</p>
          ) : (
            <DataTableShell
              colCount={PAYMENT_COLUMNS.length}
              globalFilter={paymentsGlobalFilter}
              onGlobalFilterChange={handlePayFilter}
              searchPlaceholder="Search payments..."
              filteredCount={payFilteredCount}
              pageIndex={paginationPayments.pageIndex}
              pageCount={payPageCount}
              startItem={payStartItem}
              endItem={payEndItem}
              canGoToPrevPage={paginationPayments.pageIndex > 0}
              canGoToNextPage={paginationPayments.pageIndex < payPageCount - 1}
              onPrevPage={handlePayPrev}
              onNextPage={handlePayNext}
              isLoading={isPaymentsLoading}
              emptyIcon="receipt_long"
              emptyMessage="No payment records found."
            >
              <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b border-outline-variant">
                {tablePayments.getHeaderGroups().map((g) => (
                  <tr key={g.id}>
                    {g.headers.map((h) => (
                      <th
                        key={h.id}
                        className={`px-6 py-4 whitespace-nowrap ${
                          h.column.getCanSort() ? "cursor-pointer select-none hover:text-on-surface transition-colors" : ""
                        }`}
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {h.column.getCanSort() && <SortIcon isSorted={h.column.getIsSorted()} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {!isPaymentsLoading &&
                  tablePayments.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </DataTableShell>
          )}
        </>
      )}
    </div>
  );
}
