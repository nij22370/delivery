"use client";

import { useState, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAdminJobs, useOverrideJobStatus } from "@/api/hooks/admin/adminJobsApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatNpr, formatShortDate } from "@/utils/format";
import StatusOverrideModal from "@/components/admin/StatusOverrideModal";
import type { AdminJobItem, AllowedOverrideStatus } from "@/types/admin/adminJobs";
import { JOB_STATUS, JOB_VEHICLE_TYPE, type JobVehicleType } from "@/types/job";
import { toast } from "sonner";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const PDF_REPORT_TITLE = "Job Management Report";
const PDF_FILE_NAME = "job-management-report.pdf";
const CSV_FILE_NAME = "job-management-report.csv";

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function jobToCsvRow(job: AdminJobItem): string[] {
  return [
    job.jobCode,
    job.status,
    job.poster?.name || "",
    job.poster?.email || "",
    job.driver?.name || "",
    job.driver?.email || "",
    job.pickupAddress,
    job.dropoffAddress,
    formatNpr(job.offeredPrice),
    formatShortDate(job.createdAt),
  ].map(escapeCsvCell);
}

function jobToPdfRow(job: AdminJobItem): (string | number)[][] {
  return [
    [
      job.jobCode,
      job.status,
      job.poster?.name || "N/A",
      job.driver?.name || "N/A",
      `${job.pickupAddress} → ${job.dropoffAddress}`,
      formatNpr(job.offeredPrice),
      formatShortDate(job.createdAt),
    ],
  ];
}

type FilterTabKey = "all" | "in_transit" | "disputed" | "cancelled" | "posted" | "accepted";
type VehicleFilterKey = "all" | JobVehicleType;

const FILTER_TABS: Array<{ key: FilterTabKey; label: string }> = [
  { key: "all", label: "All Jobs" },
  { key: "in_transit", label: "In Transit" },
  { key: "disputed", label: "Disputed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "posted", label: "Posted" },
];

const VEHICLE_OPTIONS: Array<{ key: VehicleFilterKey; label: string }> = [
  { key: "all", label: "All Vehicles" },
  { key: JOB_VEHICLE_TYPE.BICYCLE, label: "Bicycle / Scooter" },
  { key: JOB_VEHICLE_TYPE.CAR, label: "Standard Sedan" },
  { key: JOB_VEHICLE_TYPE.VAN, label: "Cargo Van" },
  { key: JOB_VEHICLE_TYPE.TRUCK, label: "Box Truck" },
];

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: startOfMonth.toISOString().split("T")[0],
    endDate: endOfMonth.toISOString().split("T")[0],
  };
}

function formatDateRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export default function AdminJobManagementPage() {
  const [activeTab, setActiveTab] = useState<FilterTabKey>("all");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJobForOverride, setSelectedJobForOverride] = useState<AdminJobItem | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilterKey>("all");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const { data, isLoading } = useAdminJobs({
    status: activeTab === "all" ? undefined : activeTab,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const overrideStatusMutation = useOverrideJobStatus();

  const handleTabChange = useCallback((tab: FilterTabKey) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleVehicleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setVehicleFilter(e.target.value as VehicleFilterKey);
    setCurrentPage(1);
  }, []);

  const handleToggleDatePicker = useCallback(() => {
    setIsDatePickerOpen((prev) => !prev);
  }, []);

  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange((prev) => ({ ...prev, startDate: e.target.value }));
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange((prev) => ({ ...prev, endDate: e.target.value }));
  }, []);

  const handleOpenOverride = useCallback((job: AdminJobItem) => {
    setSelectedJobForOverride(job);
  }, []);

  const handleCloseOverride = useCallback(() => {
    setSelectedJobForOverride(null);
  }, []);

  const handleConfirmOverride = useCallback(
    (jobId: string, status: AllowedOverrideStatus, reason?: string) => {
      overrideStatusMutation.mutate(
        { id: jobId, data: { status, reason } },
        {
          onSuccess: () => {
            setSelectedJobForOverride(null);
          },
        }
      );
    },
    [overrideStatusMutation]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (data && currentPage < data.totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, data]);

  const stats = data?.stats;
  const rawJobs = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const jobs = useMemo(() => {
    if (vehicleFilter === "all") return rawJobs;
    return rawJobs.filter((job) => job.vehicleType === vehicleFilter);
  }, [rawJobs, vehicleFilter]);

  const handleExport = useCallback(() => {
    if (jobs.length === 0) {
      toast.info("No job records to export.");
      return;
    }

    const headers = [
      "Job ID",
      "Status",
      "Poster Name",
      "Poster Email",
      "Driver Name",
      "Driver Email",
      "Pickup Address",
      "Dropoff Address",
      "Price (NPR)",
      "Created Date",
    ];

    const csvRows = jobs.map(jobToCsvRow);
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

    toast.success(`Exported ${jobs.length} job records to CSV.`);
  }, [jobs]);

  const handleDownloadReport = useCallback(() => {
    if (jobs.length === 0) {
      toast.info("No job records to export.");
      return;
    }

    const doc = new jsPDF();
    doc.text(PDF_REPORT_TITLE, 14, 15);

    const head = [["Job ID", "Status", "Poster", "Driver", "Pickup", "Dropoff", "Price", "Date"]];
    const body = jobs.flatMap(jobToPdfRow);

    autoTable(doc, {
      startY: 25,
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 170] },
    });

    doc.save(PDF_FILE_NAME);
    toast.success(`Generated PDF report of ${jobs.length} jobs.`);
  }, [jobs]);

  const startItem = useMemo(() => (currentPage - 1) * PAGE_SIZE + 1, [currentPage]);
  const endItem = useMemo(() => Math.min(currentPage * PAGE_SIZE, total), [currentPage, total]);

  const dateRangeLabel = useMemo(
    () => formatDateRangeLabel(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate, dateRange.endDate]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Page Title Row */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
          Active Jobs Overview
        </h2>
        <p className="text-sm text-secondary">
          Manage, monitor, and override delivery statuses across the network.
        </p>
      </div>

      {/* Top Filter Controls Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface-white border border-outline-variant rounded-xl p-3 shadow-sm">
        {/* Left: Vehicle Filter + Date Range */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Vehicle Type Dropdown */}
          <div className="relative">
            <select
              value={vehicleFilter}
              onChange={handleVehicleFilterChange}
              className="h-10 pl-3 pr-8 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer appearance-none"
            >
              {VEHICLE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-secondary text-base pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Date Range Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleDatePicker}
              className="flex items-center gap-2 h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-secondary">calendar_today</span>
              <span className="whitespace-nowrap">{dateRangeLabel}</span>
              <span className="material-symbols-outlined text-base text-secondary">expand_more</span>
            </button>

            {isDatePickerOpen && (
              <div className="absolute top-12 left-0 z-30 bg-surface-white border border-outline-variant rounded-xl shadow-lg p-4 flex flex-col gap-3 min-w-[260px]">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={handleStartDateChange}
                    className="h-10 px-3 rounded-lg border border-outline-variant text-sm focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-wider">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={handleEndDateChange}
                    className="h-10 px-3 rounded-lg border border-outline-variant text-sm focus:outline-none focus:border-2 focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleToggleDatePicker}
                  className="h-9 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">description</span>
            Download Report
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Active */}
        <div className="flex flex-col rounded-xl bg-surface-white p-5 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
              TOTAL ACTIVE
            </p>
            <div className="flex w-8 h-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-lg">swap_horiz</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-on-surface">
            {isLoading ? "..." : stats?.totalActive.toLocaleString() ?? "0"}
          </p>
          <div className="flex items-center gap-1 text-success-green mt-2 text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+12% vs last week</span>
          </div>
        </div>

        {/* Stat 2: In Transit */}
        <div className="flex flex-col rounded-xl bg-surface-white p-5 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
              IN TRANSIT
            </p>
            <div className="flex w-8 h-8 items-center justify-center rounded-full bg-surface-container text-on-surface">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-on-surface">
            {isLoading ? "..." : stats?.inTransit.toLocaleString() ?? "0"}
          </p>
          <div className="flex items-center gap-1 text-secondary mt-2 text-xs font-medium">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>Live on route</span>
          </div>
        </div>

        {/* Stat 3: Disputed */}
        <div className="flex flex-col rounded-xl bg-surface-white p-5 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
              DISPUTED / CANCELLED
            </p>
            <div className="flex w-8 h-8 items-center justify-center rounded-full bg-warning-amber/10 text-warning-amber">
              <span className="material-symbols-outlined text-lg">warning</span>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-on-surface">
            {isLoading ? "..." : stats?.disputed.toLocaleString() ?? "0"}
          </p>
          <div className="flex items-center gap-1 text-error-red mt-2 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>Action required on disputes</span>
          </div>
        </div>

        {/* Stat 4: Revenue */}
        <div className="flex flex-col rounded-xl bg-surface-white p-5 shadow-sm border border-outline-variant">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
              TOTAL VOLUME (NPR)
            </p>
            <div className="flex w-8 h-8 items-center justify-center rounded-full bg-success-green/10 text-success-green">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold text-on-surface truncate">
            {isLoading ? "..." : formatNpr(stats?.totalRevenueNpr ?? 0)}
          </p>
          <div className="w-full h-1 bg-surface-container rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-success-green w-3/4 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 border-b border-outline-variant gap-4 bg-surface-container-lowest">
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={[
                  "px-3.5 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer",
                  activeTab === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-secondary hover:text-on-surface hover:bg-surface-white",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search Job ID, Poster, Route..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-outline-variant bg-surface-white text-sm focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary text-xs uppercase font-semibold border-b border-outline-variant">
                <th className="px-6 py-4">Job ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Poster</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-secondary">
                    <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                      progress_activity
                    </span>
                    <p className="mt-2 text-xs font-semibold">Loading jobs data...</p>
                  </td>
                </tr>
              )}

              {!isLoading && jobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-secondary">
                    <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">
                      work_off
                    </span>
                    <p className="font-bold text-on-surface">No jobs found</p>
                    <p className="text-xs mt-1">Try changing filter tabs or search terms.</p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                jobs.map((job) => {
                  const isDisputed = job.status === JOB_STATUS.DISPUTED;
                  const isDelivered = job.status === JOB_STATUS.DELIVERED;
                  const isCancelled = job.status === JOB_STATUS.CANCELLED;

                  return (
                    <tr
                      key={job._id}
                      className={[
                        "hover:bg-surface-container-low/50 transition-colors",
                        isDisputed ? "bg-[#fcfaf5] border-l-4 border-l-warning-amber" : "",
                      ].join(" ")}
                    >
                      {/* Job ID */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-primary font-mono">{job.jobCode}</div>
                        <div className="text-xs text-secondary mt-0.5">
                          {formatShortDate(job.createdAt)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                            job.status === JOB_STATUS.IN_TRANSIT
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : job.status === JOB_STATUS.DELIVERED
                              ? "bg-success-green/10 text-success-green border border-success-green/20"
                              : job.status === JOB_STATUS.DISPUTED
                              ? "bg-warning-amber/10 text-warning-amber border border-warning-amber/20"
                              : job.status === JOB_STATUS.CANCELLED
                              ? "bg-error-red/10 text-error-red border border-error-red/20"
                              : "bg-surface-container text-on-surface border border-outline-variant",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "w-1.5 h-1.5 rounded-full",
                              job.status === JOB_STATUS.IN_TRANSIT
                                ? "bg-primary"
                                : job.status === JOB_STATUS.DELIVERED
                                ? "bg-success-green"
                                : job.status === JOB_STATUS.DISPUTED
                                ? "bg-warning-amber"
                                : job.status === JOB_STATUS.CANCELLED
                                ? "bg-error-red"
                                : "bg-secondary",
                            ].join(" ")}
                          />
                          <span className="capitalize">{job.status}</span>
                        </span>
                      </td>

                      {/* Poster */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-surface-container-high text-xs font-bold text-on-surface flex items-center justify-center shrink-0">
                            {job.poster.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-on-surface">{job.poster.name}</p>
                            <p className="text-[11px] text-secondary">{job.poster.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {job.driver ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                              {job.driver.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-on-surface">{job.driver.name}</p>
                              <div className="flex items-center text-[11px] text-warning-amber font-semibold">
                                <span className="material-symbols-outlined text-[12px]">star</span>
                                <span className="ml-0.5">
                                  {job.driver.ratingAvg ? job.driver.ratingAvg.toFixed(1) : "5.0"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs italic text-secondary font-medium">
                            Awaiting Acceptance
                          </span>
                        )}
                      </td>

                      {/* Route */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-outline shrink-0" />
                            <span className="truncate max-w-[140px] text-secondary">
                              {job.pickupAddress}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <span className="truncate max-w-[140px] text-on-surface font-semibold">
                              {job.dropoffAddress}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-on-surface">
                        {formatNpr(job.offeredPrice)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {!isDelivered && !isCancelled ? (
                          <button
                            type="button"
                            onClick={() => handleOpenOverride(job)}
                            className={[
                              "px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer",
                              isDisputed
                                ? "bg-warning-amber text-white hover:bg-warning-amber/90"
                                : "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant",
                            ].join(" ")}
                          >
                            {isDisputed ? "Resolve" : "Override"}
                          </button>
                        ) : (
                          <span className="text-xs text-secondary opacity-60">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-outline-variant bg-surface-white gap-3">
          <p className="text-xs font-semibold text-secondary">
            Showing {total === 0 ? 0 : startItem} to {endItem} of {total} entries
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Previous page"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>

            <span className="px-3 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="flex items-center justify-center w-8 h-8 rounded border border-outline-variant text-secondary hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Next page"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Override Modal */}
      {selectedJobForOverride && (
        <StatusOverrideModal
          job={selectedJobForOverride}
          isOpen={Boolean(selectedJobForOverride)}
          isPending={overrideStatusMutation.isPending}
          onClose={handleCloseOverride}
          onConfirm={handleConfirmOverride}
        />
      )}
    </div>
  );
}
