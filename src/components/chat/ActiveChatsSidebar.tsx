"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useMemo } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { JOB_STATUS } from "@/types/job";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useUnreadCounts } from "@/api/hooks/jobs/jobsApi";

// ── Types ────────────────────────────────────────────────────────────────────
interface JobListItem {
  _id: string;
  status: string;
  pickupContactName: string;
  dropoffContactName: string;
  updatedAt?: string;
  posterId: string;
}

interface ActiveChatsSidebarProps {
  currentJobId: string;
  currentUserId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatJobRef(jobId: string): string {
  return `#SS-${jobId.slice(-4).toUpperCase()}`;
}

const ACTIVE_STATUSES: Set<string> = new Set([JOB_STATUS.ACCEPTED, JOB_STATUS.IN_TRANSIT]);

// ── Component ────────────────────────────────────────────────────────────────
export default function ActiveChatsSidebar({
  currentJobId,
  currentUserId,
}: ActiveChatsSidebarProps) {
  const { user } = useAuthGuard();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: unreadCounts } = useUnreadCounts();

  const isDriver = user?.role === "driver";

  // Fetch all jobs for the user. 
  // If driver, pass driverId=me to get their claimed jobs.
  const queryUrl = isDriver ? "/api/jobs?driverId=me&limit=50" : "/api/jobs?limit=50";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["active-chats", user?._id],
    queryFn: async () => {
      const res = await apiFetch(queryUrl);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json() as Promise<{ jobs: JobListItem[] }>;
    },
    enabled: !!user,
  });

  // Filter and format the jobs
  const activeChats = useMemo(() => {
    if (!data?.jobs) return [];
    let chats = data.jobs.filter((job) => ACTIVE_STATUSES.has(job.status));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      chats = chats.filter((job) => {
        const name = (isDriver ? job.pickupContactName : "Driver").toLowerCase();
        const ref = formatJobRef(job._id).toLowerCase();
        return name.includes(q) || ref.includes(q);
      });
    }

    return chats;
  }, [data, searchQuery, isDriver]);

  return (
    <div className="flex flex-col h-full bg-surface-white">
      {/* Header */}
      <div className="p-4 md:p-6 pb-2">
        <h2 className="text-headline-md font-bold text-on-surface mb-4">Active Chats</h2>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[20px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface py-2.5 pl-10 pr-4 rounded-xl border border-secondary-container focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none text-sm placeholder:text-secondary-fixed-dim"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 md:px-4 py-2 flex flex-col gap-1 chat-scroll">
        {isLoading ? (
          <div className="py-8 text-center text-secondary">
            <span className="material-symbols-outlined animate-spin text-2xl">
              progress_activity
            </span>
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-secondary text-sm">
            Failed to load chats.
          </div>
        ) : activeChats.length === 0 ? (
          <div className="py-8 text-center text-secondary text-sm">
            No active chats found.
          </div>
        ) : (
          activeChats.map((job) => {
            const isActive = job._id === currentJobId;
            const unreadCount = unreadCounts?.[job._id] ?? 0;
            // Posters see "Driver", Drivers see the pickup contact name (Poster)
            const participantName = isDriver ? job.pickupContactName : "Driver";
            const initials = getInitials(participantName);
            const jobRef = formatJobRef(job._id);

            // Use the job's last updated time instead of a dummy time
            let timeLabel = "";
            if (job.updatedAt) {
              const date = new Date(job.updatedAt);
              const isToday = new Date().toDateString() === date.toDateString();
              timeLabel = isToday
                ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }

            // Since we don't fetch the last message for all jobs, show the actual job status as the preview
            const formattedStatus = job.status
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
            const previewMsg = `Status: ${formattedStatus}`;

            return (
              <Link
                key={job._id}
                href={`/jobs/${job._id}/chat`}
                className={`flex gap-3 p-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-primary-container/20 border border-primary-container/30"
                    : "hover:bg-surface-container-low border border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                      isActive ? "bg-primary text-white border-primary" : "bg-primary-fixed border-secondary-container text-primary"
                    }`}
                  >
                    <span className="text-sm font-bold">{initials}</span>
                  </div>
                  {/* Status dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success-green border-2 border-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-on-surface truncate flex-1">
                      {participantName}
                    </h3>
                    {unreadCount !== 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {unreadCount}
                      </span>
                    )}
                    {timeLabel && (
                      <span
                        className={`text-[11px] shrink-0 ${
                          isActive ? "text-primary font-semibold" : "text-secondary"
                        }`}
                      >
                        {timeLabel}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs truncate mb-1.5 ${
                      isActive ? "text-on-surface font-medium" : "text-secondary"
                    }`}
                  >
                    {previewMsg}
                  </p>
                  <p className="text-[11px] text-secondary-fixed-dim font-medium">
                    Job {jobRef}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
