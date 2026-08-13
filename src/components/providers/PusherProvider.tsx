"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import { fetchMyActiveJobIds } from "@/api/apis/jobs/jobApi";
import { useAuth } from "@/hooks/useAuth";

const ACTIVE_JOB_IDS_QUERY_KEY = "my-active-job-ids";
const ACTIVE_JOB_IDS_STALE_TIME_MS = 30_000;
const PRIVATE_CHANNEL_PREFIX = "private-job-";
const NEW_MESSAGE_EVENT = "new-message";
const CHAT_PATH_PREFIX = "/jobs/";
const CHAT_PATH_SUFFIX = "/chat";
const EMPTY_JOB_IDS: string[] = [];
const FALLBACK_SENDER_LABEL = "a user";

interface NewMessagePayload {
  messageId: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
}

interface PusherContextValue {
  subscribedJobIds: string[];
}

const PusherContext = createContext<PusherContextValue | null>(null);

function getChannelName(jobId: string): string {
  return `${PRIVATE_CHANNEL_PREFIX}${jobId}`;
}

function getChatPath(jobId: string): string {
  return `${CHAT_PATH_PREFIX}${jobId}${CHAT_PATH_SUFFIX}`;
}

function isNewMessagePayload(value: unknown): value is NewMessagePayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.messageId === "string" &&
    typeof candidate.senderId === "string" &&
    typeof candidate.content === "string" &&
    typeof candidate.createdAt === "string"
  );
}

export function usePusher(): PusherContextValue | null {
  return useContext(PusherContext);
}

export default function PusherProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const { data: activeJobIds = EMPTY_JOB_IDS } = useQuery<string[]>({
    queryKey: [ACTIVE_JOB_IDS_QUERY_KEY, user?._id],
    queryFn: fetchMyActiveJobIds,
    staleTime: ACTIVE_JOB_IDS_STALE_TIME_MS,
    enabled: !!user,
  });

  // Reconcile subscriptions against the latest pathname without re-binding.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Holds the shared client + per-job bindings for the current job set.
  const subscriptionRef = useRef<{
    client: PusherJs | null;
    channels: Map<string, Channel>;
  }>({ client: null, channels: new Map() });

  const handleNewMessage = useCallback(
    (jobId: string) => (payload: unknown) => {
      if (!isNewMessagePayload(payload)) return;

      // The server echoes the sender's own message back over Pusher — never
      // toast for a message you sent yourself.
      if (user && payload.senderId === user._id) return;

      const isOnChatPageForThisJob = pathnameRef.current === getChatPath(jobId);
      if (isOnChatPageForThisJob) return;

      const senderName = payload.senderName ?? FALLBACK_SENDER_LABEL;
      toast(`New message from ${senderName}`);
    },
    [user]
  );

  // Subscribe to every active job's channel with one shared client. The chat
  // page subscribes independently — this provider is purely additive. When the
  // job set changes, stale channels are unsubscribed before new ones attach.
  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    import("@/lib/pusherClient").then(({ pusherClient }) => {
      if (isCancelled) return;

      const { channels } = subscriptionRef.current;
      subscriptionRef.current.client = pusherClient;

      const activeJobIdSet = new Set(activeJobIds);

      channels.forEach((channel, jobId) => {
        if (activeJobIdSet.has(jobId)) return;
        channel.unbind_all();
        pusherClient.unsubscribe(getChannelName(jobId));
        channels.delete(jobId);
      });

      activeJobIds.forEach((jobId) => {
        if (channels.has(jobId)) return;
        const channel = pusherClient.subscribe(getChannelName(jobId));
        channel.bind(NEW_MESSAGE_EVENT, handleNewMessage(jobId));
        channels.set(jobId, channel);
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeJobIds, handleNewMessage, user]);

  // Full teardown only on unmount.
  useEffect(() => {
    const subscription = subscriptionRef.current;
    const { channels } = subscription;
    return () => {
      channels.forEach((channel, jobId) => {
        channel.unbind_all();
        subscription.client?.unsubscribe(getChannelName(jobId));
      });
      channels.clear();
    };
  }, []);

  const contextValue = useMemo<PusherContextValue>(
    () => ({ subscribedJobIds: activeJobIds }),
    [activeJobIds]
  );

  return (
    <PusherContext.Provider value={contextValue}>
      {children}
    </PusherContext.Provider>
  );
}
