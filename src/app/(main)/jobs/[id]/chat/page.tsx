"use client";

import { use, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { JOB_STATUS } from "@/types/job";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { useMarkMessagesRead } from "@/api/hooks/jobs/jobsApi";
import ChatPanel from "@/components/chat/ChatPanel";

import ActiveChatsSidebar from "@/components/chat/ActiveChatsSidebar";

// ── Constants ────────────────────────────────────────────────────────────────
const JOB_DETAIL_QUERY_KEY = "job-detail-for-chat";
const JOB_ENDPOINT_BASE = "/api/jobs";
const CHAT_AVAILABLE_STATUSES: Set<string> = new Set([
  JOB_STATUS.ACCEPTED,
  JOB_STATUS.IN_TRANSIT,
  JOB_STATUS.DELIVERED,
]);

const UNAVAILABLE_MESSAGE = "Chat is available once the job is accepted.";

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupContactName: string;
  dropoffAddress: string;
}

// ── Fetcher ──────────────────────────────────────────────────────────────────
async function fetchJobForChat(jobId: string): Promise<JobDetail> {
  const response = await apiFetch(`${JOB_ENDPOINT_BASE}/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: JobDetail } = await response.json();
  return data.job;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const markMessagesReadMutation = useMarkMessagesRead();

  const {
    data: job,
    isLoading: isJobLoading,
    isError: isJobError,
    error: jobError,
  } = useQuery({
    queryKey: [JOB_DETAIL_QUERY_KEY, id],
    queryFn: () => fetchJobForChat(id),
    retry: false,
    enabled: !isAuthLoading,
  });

  // ── Auth guard: only poster or driver may access ────────────────────────
  const isParticipant = useMemo(
    () =>
      Boolean(
        job &&
          user &&
          (user._id === job.posterId ||
            (job.driverId !== null && user._id === job.driverId))
      ),
    [job, user]
  );

  const isChatAvailable = useMemo(
    () => Boolean(job && CHAT_AVAILABLE_STATUSES.has(job.status)),
    [job]
  );

  // Opening the chat view marks every unread message as read. The mutation
  // updates only the unread-counts cache — the message list cache is untouched.
  useEffect(() => {
    if (!isAuthLoading && user && job && isParticipant && isChatAvailable) {
      markMessagesReadMutation.mutate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading, user, job, id, isParticipant, isChatAvailable]);

  // The poster's display name comes from the pickup contact; the driver's
  // name would need a separate profile fetch, so fall back to "Driver".
  const otherParticipantName = useMemo(() => {
    if (job && user && user._id !== job.posterId) {
      return job.pickupContactName;
    }
    return undefined;
  }, [job, user]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isAuthLoading || isJobLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  // ── Error / Not found ───────────────────────────────────────────────────
  if (isJobError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            error_outline
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Job Not Found</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {jobError instanceof Error ? jobError.message : "This job could not be loaded."}
          </p>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  // ── Not a participant ───────────────────────────────────────────────────
  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="text-center p-8">
          <span className="material-symbols-outlined text-5xl text-error-red mb-4 block">
            lock
          </span>
          <h1 className="text-xl font-semibold text-on-surface mb-2">Not Authorized</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            Only the poster or driver of this job can access the chat.
          </p>
          <Link
            href="/jobs/browse"
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-surface-container-low flex flex-col md:p-6 p-0">
      {isChatAvailable ? (
        <div className="flex flex-1 bg-surface-white border border-secondary-container md:rounded-xl overflow-hidden shadow-sm w-full h-full">
          {/* Active Chats Sidebar (Left Column) */}
          <div className="hidden md:flex flex-col w-80 lg:w-96 border-r border-secondary-container shrink-0 bg-surface-white">
            <ActiveChatsSidebar currentJobId={id} currentUserId={user?._id ?? ""} />
          </div>

          {/* Chat Panel (Right Column) */}
          <div className="flex-1 flex flex-col h-full min-w-0 relative">
            <ChatPanel
              jobId={id}
              currentUserId={user?._id ?? ""}
              otherParticipantName={otherParticipantName}
              jobBackHref={`/jobs/${id}`}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-surface-white border border-secondary-container rounded-xl p-8 text-center max-w-sm w-full">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant block mb-4">
              chat
            </span>
            <p className="text-sm text-on-surface-variant">{UNAVAILABLE_MESSAGE}</p>
            <Link
              href={`/jobs/${id}`}
              className="inline-flex items-center gap-1 mt-4 text-sm text-primary hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Job
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
