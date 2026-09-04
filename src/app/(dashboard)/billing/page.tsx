"use client";

import { useState, useMemo, useCallback } from "react";
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { formatNpr, formatShortDate } from "@/utils/format";
import { usePaymentHistory } from "@/api/hooks/payments/paymentHistoryApi";
import type {
  PaymentTransactionItem,
  PopulatedJobOnTransaction,
} from "@/types/payments/paymentHistory";

const TRACK_SUFFIX = "/track";
const PAGE_SIZE = 10;
const CHART_STROKE_COLOR = "#276ef1";
const CHART_FILL_COLOR = "#276ef1";
const BADGE_TEXT = "PAID";
const BADGE_CLASS = "bg-success-green/10 text-success-green";
const PAYMENT_HISTORY_FETCH_LIMIT = 50;

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

interface BillingRow {
  jobId: string;
  fullId: string;
  route: string;
  amount: number;
  date: string;
}

interface SpendingPoint {
  label: string;
  amount: number;
}

function formatShortAddress(address: string): string {
  return address.split(",")[0] ?? address;
}

function getPopulatedJob(
  jobId: PaymentTransactionItem["jobId"]
): PopulatedJobOnTransaction | null {
  if (typeof jobId === "string") return null;
  return jobId ?? null;
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
      {Array.from({ length: rows }, (_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-outline-variant">
          {Array.from({ length: cols }, (_, colIdx) => (
            <td key={colIdx} className="px-6 py-4">
              <div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const billingColHelper = createColumnHelper<typeof TABLE_FEATURES, BillingRow>();

const BILLING_COLUMNS = [
  billingColHelper.accessor("jobId", {
    header: "Job ID",
    enableSorting: false,
    cell: (info) => (
      <Link
        href={`/jobs/${info.row.original.fullId}${TRACK_SUFFIX}`}
        className="font-bold text-primary hover:text-primary-container transition-colors cursor-pointer"
      >
        #{info.getValue()}
      </Link>
    ),
  }),
  billingColHelper.accessor("route", {
    header: "Route",
    cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
  }),
  billingColHelper.display({
    id: "status",
    header: "Status",
    enableSorting: false,
    cell: () => (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${BADGE_CLASS}`}>
        {BADGE_TEXT}
      </span>
    ),
  }),
  billingColHelper.accessor("amount", {
    header: "Amount (NPR)",
    cell: (info) => (
      <span className="font-semibold text-on-surface text-right block">
        {info.getValue().toLocaleString("en-NP")}
      </span>
    ),
  }),
  billingColHelper.accessor("date", {
    header: "Date",
    cell: (info) => <span className="text-secondary">{info.getValue()}</span>,
  }),
] as const;

const BILLING_COL_COUNT = BILLING_COLUMNS.length;

interface SpendingTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function SpendingTooltip({ active, payload, label }: SpendingTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-on-surface text-surface-white rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-0.5">{label}</p>
      <p>NPR {payload[0]?.value?.toLocaleString("en-NP")}</p>
    </div>
  );
}

function buildSpendingData(transactions: PaymentTransactionItem[]): SpendingPoint[] {
  return transactions
    .slice()
    .sort(
      (a, b) =>
        new Date(a.processedAt).getTime() - new Date(b.processedAt).getTime()
    )
    .map((tx) => ({
      label: formatShortDate(tx.processedAt),
      amount: tx.amount,
    }));
}

export default function BillingPage() {
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const handlePrevPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }));
  }, []);

  const handleNextPage = useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }));
  }, []);

  const {
    data: paymentsData,
    isLoading,
    isError,
  } = usePaymentHistory({
    page: 1,
    limit: PAYMENT_HISTORY_FETCH_LIMIT,
    enabled: !!user,
  });

  const transactions = useMemo(
    () => paymentsData?.transactions ?? [],
    [paymentsData?.transactions]
  );

  const totalSpent = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const billingRows = useMemo<BillingRow[]>(
    () =>
      transactions.map((tx) => {
        const job = getPopulatedJob(tx.jobId);
        const fullId = job?._id ?? (typeof tx.jobId === "string" ? tx.jobId : "");
        const route = job
          ? `${formatShortAddress(job.pickupAddress)} → ${formatShortAddress(job.dropoffAddress)}`
          : "—";
        return {
          jobId: fullId ? fullId.slice(-6).toUpperCase() : "—",
          fullId,
          route,
          amount: tx.amount,
          date: formatShortDate(tx.processedAt),
        };
      }),
    [transactions]
  );

  const spendingData = useMemo(() => buildSpendingData(transactions), [transactions]);

  const table = useTable({
    features: TABLE_FEATURES,
    data: billingRows,
    columns: BILLING_COLUMNS as unknown as readonly ColumnDef<TableFeatures, RowData>[],
    state: { sorting, globalFilter, pagination },
    onSortingChange: (updater) => setSorting(functionalUpdate(updater, sorting)),
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleGlobalFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setGlobalFilter(e.target.value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    },
    []
  );

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startItem = filteredCount === 0 ? 0 : pagination.pageIndex * PAGE_SIZE + 1;
  const endItem = Math.min((pagination.pageIndex + 1) * PAGE_SIZE, filteredCount);
  const canGoToPrevPage = pagination.pageIndex > 0;
  const canGoToNextPage = pagination.pageIndex < pageCount - 1;

  if (isAuthLoading || isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen flex flex-col gap-6">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="bg-primary-container rounded-xl p-6 shadow-lg animate-pulse h-24" />
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 h-48 animate-pulse" />
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <tbody className="divide-y divide-outline-variant">
                <TableSkeleton cols={BILLING_COL_COUNT} rows={5} />
              </tbody>
            </table>
          </div>
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
        <p className="text-primary-fixed/60 text-xs mt-1">{transactions.length} paid deliveries</p>
      </div>

      {spendingData.length > 1 && (
        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm p-6 flex flex-col gap-3">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Spending Trend</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingData} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="billingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_FILL_COLOR} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_FILL_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#424654" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#424654" }}
allowDecimals={false} width={40} />
                <Tooltip content={<SpendingTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={CHART_STROKE_COLOR}
                  strokeWidth={2.5}
                  fill="url(#billingGrad)"
                  dot={{ r: 4, fill: CHART_STROKE_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_STROKE_COLOR }}
                  isAnimationActive
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-1">
          <div className="relative flex-1 max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
text-on-surface-variant text-lg select-none">search</span>
            <input
              type="text"
              placeholder="Search billing records..."
              value={globalFilter}
              onChange={handleGlobalFilterChange}
              className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-low border border-outline-variant
rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary
transition-colors"
            />
          </div>
          <span className="text-xs text-secondary">{filteredCount} record{filteredCount !== 1 ? "s" : ""}</span>
        </div>

        <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-container-low text-secondary uppercase font-semibold text-xs border-b
border-outline-variant">
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
                  <td colSpan={BILLING_COL_COUNT} className="p-10 text-center text-secondary">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant block
mb-2">receipt_long</span>
                    No billing records found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-lowest transition-colors">
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
          </div>

          {filteredCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-outline-variant
bg-surface-white gap-3">
              <p className="text-xs font-semibold text-secondary">
                Showing {startItem} to {endItem} of {filteredCount} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={!canGoToPrevPage}
                  className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant
text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed
cursor-pointer"
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <span className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
                  Page {pagination.pageIndex + 1} of {pageCount === 0 ? 1 : pageCount}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={!canGoToNextPage}
                  className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant
text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed
cursor-pointer"
                  aria-label="Next page"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
