"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useAdminDisputes, useResolveJobDispute } from "@/api/hooks/admin/adminDisputesApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatShortDate, formatNpr, formatTime } from "@/utils/format";
import ResolveDisputeModal from "@/components/admin/ResolveDisputeModal";
import type { DisputedJobItem, ResolveJobInput } from "@/types/admin/adminDisputes";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const MESSAGES_LIMIT = 50;

export default function AdminDisputesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "review" | "info">("all");
  const [internalSelectedDispute, setInternalSelectedDispute] = useState<DisputedJobItem | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPreset, setModalPreset] = useState<{
    resolvedStatus: ResolveJobInput["resolvedStatus"];
    payoutStatus: ResolveJobInput["payoutStatus"];
  }>({
    resolvedStatus: "posted",
    payoutStatus: "paid",
  });

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const { data, isLoading } = useAdminDisputes({
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: PAGE_SIZE,
  });

  const resolveMutation = useResolveJobDispute();

  const disputes = useMemo(() => data?.data || [], [data?.data]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  const filteredDisputes = useMemo(() => {
    return disputes.filter((dispute) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "review") return dispute.driver !== null;
      if (statusFilter === "info") return dispute.driver === null;
      return true;
    });
  }, [disputes, statusFilter]);

  const selectedDispute = useMemo(() => {
    if (filteredDisputes.length === 0) return null;
    const stillExists = filteredDisputes.some((d) => d._id === internalSelectedDispute?._id);
    return stillExists ? internalSelectedDispute : filteredDisputes[0];
  }, [filteredDisputes, internalSelectedDispute]);

  const handleSelectDispute = useCallback((dispute: DisputedJobItem) => {
    setInternalSelectedDispute(dispute);
  }, []);

  const { data: messagesData } = useQuery({
    queryKey: ["adminDisputeMessages", selectedDispute?._id],
    queryFn: async () => {
      if (!selectedDispute) return { messages: [] };
      const response = await fetch(`/api/jobs/${selectedDispute._id}/messages?limit=${MESSAGES_LIMIT}`);
      if (!response.ok) {
        throw new Error("Failed to load messages");
      }
      return response.json();
    },
    enabled: Boolean(selectedDispute),
    staleTime: 30_000,
  });

  const messages = messagesData?.messages ?? [];

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleOpenResolve = useCallback((resolvedStatus: ResolveJobInput["resolvedStatus"], payoutStatus: ResolveJobInput["payoutStatus"]) => {
    setModalPreset({ resolvedStatus, payoutStatus });
    setIsModalOpen(true);
  }, []);

  const handleCloseResolve = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleConfirmResolve = useCallback(
    (resolveData: { resolvedStatus: "posted" | "cancelled"; note: string; payoutStatus?: "paid" | "failed" }) => {
      if (!selectedDispute) return;
      resolveMutation.mutate(
        { jobId: selectedDispute._id, data: resolveData },
        {
          onSuccess: () => {
            setIsModalOpen(false);
            setInternalSelectedDispute(null);
          },
        }
      );
    },
    [resolveMutation, selectedDispute]
  );

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const startItem = useMemo(() => (currentPage - 1) * PAGE_SIZE + 1, [currentPage]);
  const endItem = useMemo(() => Math.min(currentPage * PAGE_SIZE, total), [currentPage, total]);

  const timelineEvents = useMemo(() => {
    if (!selectedDispute) return [];
    const events: { time: string; label: string; description: string; color: string }[] = [];

    if (selectedDispute.acceptedAt) {
      events.push({
        time: formatTime(selectedDispute.acceptedAt),
        label: "Job Accepted",
        description: `Driver accepted the job`,
        color: "bg-primary",
      });
    }

    if (selectedDispute.inTransitAt) {
      events.push({
        time: formatTime(selectedDispute.inTransitAt),
        label: "Picked Up",
        description: `Driver started transit from ${selectedDispute.pickupAddress}`,
        color: "bg-success-green",
      });
    }

    if (selectedDispute.deliveredAt) {
      events.push({
        time: formatTime(selectedDispute.deliveredAt),
        label: "Delivered",
        description: `Job marked as delivered at ${selectedDispute.dropoffAddress}`,
        color: "bg-success-green",
      });
    }

    events.push({
      time: formatTime(selectedDispute.disputedAt || selectedDispute.updatedAt),
      label: `Dispute Filed by ${selectedDispute.flaggedBy}`,
      description: selectedDispute.disputeReason,
      color: "bg-error-red",
    });

    return events;
  }, [selectedDispute]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search disputes by ID, User, or Job..."
              className="w-full h-12 pl-10 pr-4 rounded-lg border border-outline-variant bg-surface-white text-sm focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <button className="text-secondary hover:bg-surface-container-low transition-all p-2 rounded-full active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-secondary hover:bg-surface-container-low transition-all p-2 rounded-full active:scale-95 cursor-pointer hidden md:block">
            <span className="material-symbols-outlined">help</span>
          </button>
          <button className="font-semibold text-sm text-primary hover:text-primary-fixed-dim transition-colors cursor-pointer hidden sm:block">
            Support
          </button>
        </div>
      </div>

      {/* Main Content Area: Split View */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-190px)]">
        {/* Left Side: Active Disputes Queue Panel */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-on-surface">Active Disputes</h2>
            <span className="bg-surface-container-high text-on-surface-variant font-bold text-xs px-2.5 py-1 rounded-full">
              {total} Pending
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 pb-1 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                statusFilter === "all"
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              All Active
            </button>
            <button
              onClick={() => setStatusFilter("review")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                statusFilter === "review"
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Under Review
            </button>
            <button
              onClick={() => setStatusFilter("info")}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                statusFilter === "info"
                  ? "bg-primary-container text-on-primary-container border-primary"
                  : "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low"
              }`}
            >
              Pending Info
            </button>
          </div>

          {/* Queue List */}
          <div className="flex flex-col gap-3 overflow-y-auto max-h-[600px] pr-1">
            {isLoading && (
              <div className="p-8 text-center text-secondary">
                <span className="material-symbols-outlined text-3xl animate-spin text-primary">
                  progress_activity
                </span>
                <p className="mt-2 text-xs font-semibold">Loading disputes...</p>
              </div>
            )}

            {!isLoading && filteredDisputes.length === 0 && (
              <div className="p-12 text-center text-secondary bg-surface-white border border-outline-variant rounded-xl shadow-sm">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2 block">
                  gavel
                </span>
                <p className="font-bold text-on-surface">No matching disputes</p>
                <p className="text-xs mt-1">Try resetting filters or search query.</p>
              </div>
            )}

            {!isLoading &&
              filteredDisputes.map((dispute) => {
                const isSelected = selectedDispute?._id === dispute._id;
                const isUnderReview = dispute.driver !== null;
                return (
                  <div
                    key={dispute._id}
                    onClick={() => handleSelectDispute(dispute)}
                    className={`bg-surface-white rounded-xl p-4 cursor-pointer shadow-sm relative transition-all border-2 ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/10"
                        : "border-outline-variant hover:border-outline transition-colors"
                    }`}
                  >
                    {dispute.flaggedBy === "poster" && (
                      <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-error-red"></div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono font-bold text-sm text-on-surface">{dispute.jobCode}</span>
                      <span
                        className={`font-semibold text-xs px-2 py-0.5 rounded ${
                          isUnderReview
                            ? "bg-warning-amber/10 text-warning-amber border border-warning-amber/20"
                            : "bg-surface-container-high text-secondary border border-outline-variant"
                        }`}
                      >
                        {isUnderReview ? "Under Review" : "Pending Info"}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mb-3">Job ID: {dispute._id.slice(-6).toUpperCase()}</p>
                    <div className="flex justify-between items-center border-t border-outline-variant pt-3">
                      <div>
                        <p className="text-xs text-on-surface font-bold truncate max-w-[150px]">
                          {dispute.disputeReason}
                        </p>
                        <p className="text-[10px] text-secondary mt-0.5">
                          {dispute.poster.name} vs. {dispute.driver ? dispute.driver.name : "Unassigned"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs font-bold text-on-surface">{formatNpr(dispute.offeredPrice)}</span>
                        <span className="text-[10px] text-secondary">
                          {formatShortDate(dispute.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border border-outline-variant rounded-xl flex items-center justify-between bg-surface-white shadow-sm">
              <span className="text-[10px] font-semibold text-secondary">
                {startItem}-{endItem} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center w-7 h-7 rounded border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="text-[10px] font-bold text-primary px-2">
                  {currentPage}/{totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="flex items-center justify-center w-7 h-7 rounded border border-outline-variant text-secondary hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Detailed Investigation Panel */}
        <div className="flex-1 bg-surface-white border border-outline-variant rounded-xl flex flex-col shadow-sm overflow-hidden min-h-[500px]">
          {selectedDispute ? (
            <div className="flex flex-col h-full justify-between flex-1">
              {/* Header */}
              <div className="p-6 border-b border-outline-variant bg-surface-bright flex justify-between items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-on-surface">
                      Investigation: {selectedDispute.jobCode}
                    </h2>
                    <span className="bg-warning-amber/10 text-warning-amber font-semibold text-xs px-2.5 py-0.5 rounded-full border border-warning-amber/20">
                      Under Review
                    </span>
                  </div>
                  <p className="text-xs text-secondary">
                    Related Job: <span className="text-primary font-mono">{selectedDispute._id}</span> • Flagged {formatShortDate(selectedDispute.createdAt)}
                  </p>
                </div>
                <button className="text-secondary hover:text-on-surface p-2 rounded-full hover:bg-surface-container-low transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-xl">more_vert</span>
                </button>
              </div>

              {/* Scrollable details */}
              <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 max-h-[500px]">
                {/* Parties Involved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-outline-variant rounded-lg p-4 flex items-center gap-4 bg-surface-container-lowest shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
                      P
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Poster (Sender)</p>
                      <p className="font-semibold text-sm text-on-surface truncate">{selectedDispute.poster.name}</p>
                      <p className="text-[11px] text-secondary truncate">{selectedDispute.poster.email}</p>
                    </div>
                    <button className="bg-surface-container-high text-on-surface p-2 rounded-lg hover:bg-outline-variant transition-colors cursor-pointer" title="Contact Poster">
                      <span className="material-symbols-outlined text-base">chat</span>
                    </button>
                  </div>

                  <div className="border border-outline-variant rounded-lg p-4 flex items-center gap-4 bg-surface-container-lowest shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-warning-amber/10 text-warning-amber flex items-center justify-center font-bold text-base">
                      D
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-secondary uppercase tracking-wider">Driver (Courier)</p>
                      <p className="font-semibold text-sm text-on-surface truncate">
                        {selectedDispute.driver ? selectedDispute.driver.name : "Unassigned"}
                      </p>
                      <p className="text-[11px] text-secondary truncate">
                        {selectedDispute.driver ? selectedDispute.driver.email : "N/A"}
                      </p>
                    </div>
                    {selectedDispute.driver && (
                      <button className="bg-surface-container-high text-on-surface p-2 rounded-lg hover:bg-outline-variant transition-colors cursor-pointer" title="Contact Driver">
                        <span className="material-symbols-outlined text-base">chat</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Evidence & Claims */}
                <div>
                  <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant pb-2 mb-4">
                    Evidence &amp; Claims
                  </h3>
                  <div className="bg-surface-container-lowest border border-error-red/20 rounded-lg p-4 mb-4 shadow-sm">
                    <p className="text-xs font-bold text-error-red mb-1 capitalize">
                      {selectedDispute.flaggedBy} Claim
                    </p>
                    <p className="text-xs text-on-surface leading-relaxed">
                      &quot;{selectedDispute.disputeReason}&quot;
                    </p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant">
                      <div>
                        <p className="text-[10px] text-secondary">Disputed Amount</p>
                        <p className="text-sm font-bold text-on-surface">{formatNpr(selectedDispute.offeredPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-secondary">Route</p>
                        <p className="text-[10px] font-semibold text-on-surface truncate max-w-[300px]">{selectedDispute.pickupAddress} → {selectedDispute.dropoffAddress}</p>
                      </div>
                    </div>
                  </div>
                  
                 {/* Evidence Image Grid */}
                 <div className="grid grid-cols-3 gap-4">
                   {selectedDispute.evidenceImages.length > 0 ? (
                     selectedDispute.evidenceImages.map((src, idx) => (
                       <div key={idx} className="aspect-square bg-surface-container rounded-lg overflow-hidden border border-outline-variant relative group cursor-zoom-in">
                         <Image src={src} alt={`Evidence ${idx + 1}`} fill className="object-cover" />
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                           <span className="material-symbols-outlined text-white">zoom_in</span>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="col-span-3 text-center text-secondary text-xs py-6 border border-dashed border-outline-variant rounded-lg">
                       No evidence images uploaded for this dispute.
                     </div>
                   )}
                 </div>
                </div>

                {/* Timeline and Chat snippet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Timeline */}
                  <div>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant pb-2 mb-4">
                      Delivery Timeline
                    </h3>
                    <div className="relative border-l border-outline-variant ml-2 pl-4 flex flex-col gap-4 text-xs">
                      {timelineEvents.length > 0 ? (
                        timelineEvents.map((event, idx) => (
                          <div key={idx} className="relative">
                            <div className={`absolute -left-[21px] bg-surface-white border border-outline w-2.5 h-2.5 rounded-full mt-1 ${event.color}`}></div>
                            <p className="text-[10px] text-secondary">{event.time}</p>
                            <p className="text-on-surface font-semibold">{event.label}</p>
                            <p className="text-[11px] text-secondary line-clamp-2">{event.description}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-secondary">No timeline events recorded for this job.</p>
                      )}
                    </div>
                  </div>

                  {/* Chat snippet */}
                  <div>
                    <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant pb-2 mb-4">
                      Chat Transcript Snippet
                    </h3>
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col gap-3 h-40 overflow-y-auto shadow-sm text-xs">
                      {messages.length > 0 ? (
                        messages.map((msg: { _id: string; senderId: string; content: string; createdAt: string }) => {
                          const isDriver = msg.senderId === selectedDispute.driver?._id;
                          return (
                            <div key={msg._id} className={`flex flex-col ${isDriver ? "items-start" : "items-end"}`}>
                              <span className="text-[9px] text-secondary mb-0.5">
                                {isDriver ? (selectedDispute.driver?.name || "Driver") : selectedDispute.poster.name} ({formatTime(msg.createdAt)})
                              </span>
                              <div className={`px-2.5 py-1.5 rounded-lg max-w-[85%] text-on-surface ${
                                isDriver
                                  ? "bg-surface-container-low rounded-tl-none"
                                  : "bg-primary/10 border border-primary/20 rounded-tr-none"
                              }`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-secondary text-center py-8">
                          No messages recorded for this job.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-wrap gap-3 items-center justify-between shrink-0">
                <button
                  onClick={() => handleOpenResolve("posted", "failed")}
                  className="bg-surface-white border border-outline-variant text-secondary hover:bg-surface-container-low font-bold text-xs px-4 py-2 h-10 rounded-lg transition-colors cursor-pointer"
                >
                  Dismiss Dispute
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenResolve("posted", "paid")}
                    className="bg-surface-white border border-outline text-on-surface hover:bg-surface-container-low font-bold text-xs px-4 py-2 h-10 rounded-lg transition-colors cursor-pointer"
                  >
                    Split / Partial
                  </button>
                  <button
                    onClick={() => handleOpenResolve("posted", "paid")}
                    className="bg-on-surface text-surface-white hover:bg-on-surface-variant font-bold text-xs px-4 py-2 h-10 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Pay Driver
                  </button>
                  <button
                    onClick={() => handleOpenResolve("cancelled", "failed")}
                    className="bg-primary-container text-on-primary-container hover:bg-surface-tint hover:text-white font-bold text-xs px-4 py-2 h-10 rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    Refund Poster
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-secondary">
              <span className="material-symbols-outlined text-4xl mb-2">gavel</span>
              <p className="font-bold text-on-surface">No dispute selected</p>
              <p className="text-xs">Choose a dispute card on the left to inspect evidence.</p>
            </div>
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {selectedDispute && (
        <ResolveDisputeModal
          key={`${selectedDispute._id}-${modalPreset.resolvedStatus}-${modalPreset.payoutStatus}`}
          isOpen={isModalOpen}
          isPending={resolveMutation.isPending}
          jobCode={selectedDispute.jobCode}
          onClose={handleCloseResolve}
          onConfirm={handleConfirmResolve}
          initialResolvedStatus={modalPreset.resolvedStatus}
          initialPayoutStatus={modalPreset.payoutStatus}
        />
      )}
    </div>
  );
}
