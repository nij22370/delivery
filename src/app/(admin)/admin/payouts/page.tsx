"use client";

import { useState, useCallback, useMemo } from "react";
import { useAdminPayouts, useOverridePayoutStatus } from "@/api/hooks/admin/adminPayoutsApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatNpr } from "@/utils/format";
import PayoutOverrideModal from "@/components/admin/PayoutOverrideModal";
import PayoutReceiptModal from "@/components/admin/PayoutReceiptModal";
import type { AdminPayoutItem } from "@/types/admin/adminPayouts";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
] as const;

const CSV_FILE_NAME = "payout-management-report.csv";

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function payoutToCsvRow(payout: AdminPayoutItem): string[] {
  return [
    formatDateTime(payout.createdAt),
    payout.driverName,
    payout.driverEmail,
    payout.jobId,
    payout.gatewayTransactionId,
    payout.gateway,
    formatNpr(payout.amount),
    payout.platformFee.toString(),
    payout.status,
    payout.paidAt ? formatDateTime(payout.paidAt) : "",
  ].map(escapeCsvCell);
}

type StatusFilter = (typeof STATUS_OPTIONS)[number]["value"];

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function AdminPayoutsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [daysFilter, setDaysFilter] = useState<string>("30");
  const [searchInput, setSearchInput] = useState("");
  const [selectedPayout, setSelectedPayout] = useState<AdminPayoutItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptPayout, setReceiptPayout] = useState<AdminPayoutItem | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data, isLoading, isError } = useAdminPayouts({
    page: currentPage,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    gateway: gatewayFilter === "all" ? undefined : gatewayFilter,
    days: daysFilter,
    search: debouncedSearch || undefined,
  });

  const overrideMutation = useOverridePayoutStatus();

  const payouts = useMemo(() => data?.data ?? [], [data?.data]);
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const startItem = useMemo(() => (currentPage - 1) * PAGE_SIZE + 1, [currentPage]);
  const endItem = useMemo(() => Math.min(currentPage * PAGE_SIZE, total), [currentPage, total]);

  const handleExportCsv = useCallback(() => {
    if (payouts.length === 0) {
      toast.info("No payout records to export.");
      return;
    }

    const headers = [
      "Date",
      "Driver Name",
      "Driver Email",
      "Job ID",
      "Transaction ID",
      "Gateway",
      "Amount (NPR)",
      "Platform Fee (NPR)",
      "Status",
      "Paid At",
    ];

    const csvRows = payouts.map(payoutToCsvRow);
    const csvContent = [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = CSV_FILE_NAME;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${payouts.length} payout records to CSV.`);
  }, [payouts]);

  const handleOpenOverride = useCallback((payout: AdminPayoutItem) => {
    setSelectedPayout(payout);
    setIsModalOpen(true);
  }, []);

  const handleCloseOverride = useCallback(() => {
    setIsModalOpen(false);
    setSelectedPayout(null);
  }, []);

  const handleOpenReceipt = useCallback((payout: AdminPayoutItem) => {
    setReceiptPayout(payout);
    setIsReceiptOpen(true);
  }, []);

  const handleCloseReceipt = useCallback(() => {
    setIsReceiptOpen(false);
    setReceiptPayout(null);
  }, []);

  const handleConfirmOverride = useCallback(
    (overrideData: { status: "paid" | "failed"; note: string }) => {
      if (!selectedPayout) return;
      overrideMutation.mutate(
        { id: selectedPayout._id, data: overrideData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setSelectedPayout(null);
          },
        }
      );
    },
    [overrideMutation, selectedPayout]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-warning-amber/10 text-warning-amber border border-warning-amber/20";
      case "paid":
        return "bg-success-green/10 text-success-green border border-success-green/20";
      case "failed":
        return "bg-error-red/10 text-error-red border border-error-red/20";
      default:
        return "bg-surface-container text-on-surface-variant";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-surface-white border border-outline-variant rounded-xl p-6 animate-pulse">
              <div className="h-4 w-24 bg-surface-container-high rounded mb-4" />
              <div className="h-8 w-16 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="material-symbols-outlined text-5xl text-error-red mb-4">error_outline</span>
        <h1 className="text-xl font-semibold text-on-surface mb-2">Unable to load payouts</h1>
        <p className="text-sm text-secondary">Something went wrong while fetching payout data.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
            Payout Management
          </h2>
          <p className="text-sm text-secondary mt-0.5">
            Manage and process driver earnings.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="h-10 px-4 bg-surface-white border border-outline-variant text-xs font-bold text-secondary hover:bg-surface-container-low transition-colors flex items-center gap-1.5 cursor-pointer rounded-xl"
        >
          <span className="material-symbols-outlined text-base">download</span>
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Pending Payouts */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-warning-amber">
            <div className="p-2 bg-warning-amber/10 rounded-lg">
              <span className="material-symbols-outlined text-lg fill">hourglass_empty</span>
            </div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Total Pending Payouts
            </h3>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-on-surface">
            {formatNpr(data?.summary?.pendingTotal ?? 0)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-secondary text-xs font-semibold">
            <span>{data?.summary?.pendingCount ?? 0} pending requests</span>
            <span
              className="material-symbols-outlined text-xs text-secondary cursor-help"
              title="Requires manual disbursement via merchant portal"
            >
              info
            </span>
          </div>
        </div>

        {/* Card 2: Total Paid Today */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-success-green">
            <div className="p-2 bg-success-green/10 rounded-lg">
              <span className="material-symbols-outlined text-lg fill">payments</span>
            </div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Total Paid Today
            </h3>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-on-surface">
            {formatNpr(data?.summary?.paidTodayAmount ?? 0)}
          </p>
          <p className="text-xs text-secondary mt-2 font-semibold">
            {data?.summary?.paidTodayCount ?? 0} completed payouts
          </p>
        </div>

        {/* Card 3: Active Disputes */}
        <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-error-red">
            <div className="p-2 bg-error-red/10 rounded-lg">
              <span className="material-symbols-outlined text-lg fill">report</span>
            </div>
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Active Disputes
            </h3>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-on-surface">
            {data?.summary?.activeDisputesCount ?? 0}
          </p>
          <p className="text-xs text-secondary mt-2 font-semibold">
            Requires immediate attention
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-surface-white border border-outline-variant rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Driver Name or Job ID..."
            className="w-full h-12 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-white text-sm focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 transition-all shadow-sm"
          />
        </div>

        {/* Select Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Days range */}
          <select
            value={daysFilter}
            onChange={(e) => {
              setDaysFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-12 px-4 rounded-lg border border-outline-variant bg-surface-white text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer w-full md:w-auto"
          >
            <option value="30">Last 30 Days</option>
            <option value="7">Last 7 Days</option>
            <option value="today">Today</option>
            <option value="all">All-Time</option>
          </select>

          {/* Gateways */}
          <select
            value={gatewayFilter}
            onChange={(e) => {
              setGatewayFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-12 px-4 rounded-lg border border-outline-variant bg-surface-white text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer w-full md:w-auto"
          >
            <option value="all">All Gateways</option>
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
          </select>

          {/* Statuses */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setCurrentPage(1);
            }}
            className="h-12 px-4 rounded-lg border border-outline-variant bg-surface-white text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer w-full md:w-auto"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant text-xs font-semibold text-secondary uppercase">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Driver Name</th>
                <th className="py-4 px-6">Job ID</th>
                <th className="py-4 px-6">Transaction UUID / pidx</th>
                <th className="py-4 px-6">Gateway</th>
                <th className="py-4 px-6 text-right">Amount (NPR)</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {payouts.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-secondary">
                    No payouts found.
                  </td>
                </tr>
              )}
              {payouts.map((payout) => (
                <tr
                  key={payout._id}
                  className="hover:bg-surface-bright transition-colors"
                >
                  {/* Date */}
                  <td className="py-4 px-6 whitespace-nowrap text-xs text-secondary font-medium">
                    {formatDateTime(payout.createdAt)}
                  </td>

                  {/* Driver Name */}
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-on-surface">{payout.driverName}</p>
                      <p className="text-xs text-secondary">{payout.driverEmail}</p>
                    </div>
                  </td>

                  {/* Job ID */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-secondary">
                      #JOB-{payout.jobId.slice(-4).toUpperCase()}
                    </span>
                  </td>

                  {/* Transaction ID */}
                  <td className="py-4 px-6">
                    <code className="bg-surface-container px-2 py-1 rounded text-xs font-mono text-secondary">
                      {payout.gatewayTransactionId.slice(0, 10)}...
                    </code>
                  </td>

                  {/* Gateway */}
                  <td className="py-4 px-6">
                    {payout.gateway === "esewa" ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-success-green rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                          e
                        </div>
                        <span className="text-xs font-semibold text-secondary">eSewa</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                          K
                        </div>
                        <span className="text-xs font-semibold text-secondary">Khalti</span>
                      </div>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="py-4 px-6 whitespace-nowrap font-bold text-on-surface text-right">
                    {payout.amount.toLocaleString("en-NP")}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${getStatusBadge(payout.status)}`}
                    >
                      {payout.status}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-4 px-6 whitespace-nowrap text-right">
                    {payout.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenOverride(payout)}
                        className="bg-primary text-white hover:bg-primary/95 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Process Payout
                      </button>
                    ) : payout.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenOverride(payout)}
                        className="bg-error-red text-white hover:bg-error-red/90 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        Retry
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(payout)}
                        className="text-xs text-primary hover:underline font-bold cursor-pointer"
                      >
                        View Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="p-4 border-t border-outline-variant flex justify-between items-center bg-surface-container-low text-xs font-semibold text-secondary">
          <span>Showing {total === 0 ? 0 : startItem} to {endItem} of {total} entries</span>
          <div className="flex gap-1">
            {/* Prev Page Button */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>

            {/* Page Buttons */}
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-primary text-white"
                      : "border border-outline-variant hover:bg-surface-container text-on-surface"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center border border-outline-variant rounded-lg hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {selectedPayout && (
        <PayoutOverrideModal
          isOpen={isModalOpen}
          isPending={overrideMutation.isPending}
          payoutId={selectedPayout._id}
          onClose={handleCloseOverride}
          onConfirm={handleConfirmOverride}
        />
      )}

      {/* Receipt Modal */}
      <PayoutReceiptModal
        isOpen={isReceiptOpen}
        payout={receiptPayout}
        onClose={handleCloseReceipt}
      />
    </div>
  );
}
