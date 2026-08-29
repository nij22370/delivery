"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/utils/apiFetch";
import { toast } from "sonner";
import { formatTime } from "@/utils/format";
import type { Message, GetMessagesResponse } from "@/types/message/message";

interface ParticipantInfo {
  _id: string;
  name: string;
  email: string;
}

interface AdminMessagePanelProps {
  jobId: string;
  poster: ParticipantInfo;
  driver: ParticipantInfo | null;
}

const POSTER_TAB = "poster" as const;
const DRIVER_TAB = "driver" as const;
const MESSAGES_LIMIT = 50;
const MESSAGE_INPUT_PLACEHOLDER = "Type a message...";
const SEND_BUTTON_LABEL = "Send";
const SENDING_BUTTON_LABEL = "Sending...";
const EMPTY_STATE_LABEL = "No messages yet. Start the conversation.";
const SEND_FAILED_MESSAGE = "Couldn't send message. Please try again.";
const SEND_SUCCESS_MESSAGE = "Message sent";
const ADMIN_SENDER_LABEL = "You";
const LOAD_ERROR_MESSAGE = "Couldn't load messages.";
const RETRY_BUTTON_LABEL = "Retry";
const ENTER_KEY = "Enter";
const MESSAGE_INPUT_ROWS = 2;
const STALE_TIME_MS = 30_000;
const ADMIN_MESSAGES_QUERY_KEY_PREFIX = "adminMessages";
const ADMIN_MESSAGE_ENDPOINT_PREFIX = "/api/jobs/";
const ADMIN_MESSAGE_ENDPOINT_SUFFIX = "/admin-message";

type ActiveTab = "poster" | "driver";
type SendMessagePayload = { recipientId: string; content: string };
type SendMessageResponse = { message: Message };

function getActiveRecipientId(
  activeTab: ActiveTab,
  poster: ParticipantInfo,
  driver: ParticipantInfo | null
): string {
  return activeTab === POSTER_TAB ? poster._id : driver?._id ?? "";
}

function getActiveRecipientName(
  activeTab: ActiveTab,
  poster: ParticipantInfo,
  driver: ParticipantInfo | null
): string {
  return activeTab === POSTER_TAB ? poster.name : driver?.name ?? "";
}

function getMessagesQueryKey(jobId: string, recipientId: string): (string | undefined)[] {
  return [ADMIN_MESSAGES_QUERY_KEY_PREFIX, jobId, recipientId || undefined];
}

function buildAdminMessageUrl(jobId: string, recipientId?: string): string {
  const baseUrl = `${ADMIN_MESSAGE_ENDPOINT_PREFIX}${jobId}${ADMIN_MESSAGE_ENDPOINT_SUFFIX}`;
  if (!recipientId) return baseUrl;
  const params = new URLSearchParams({
    recipientId,
    limit: String(MESSAGES_LIMIT),
  });
  return `${baseUrl}?${params}`;
}

async function fetchAdminMessages(
  jobId: string,
  recipientId: string
): Promise<GetMessagesResponse> {
  const response = await apiFetch(buildAdminMessageUrl(jobId, recipientId));
  if (!response.ok) {
    throw new Error(LOAD_ERROR_MESSAGE);
  }
  return response.json() as Promise<GetMessagesResponse>;
}

async function sendAdminMessage(
  jobId: string,
  recipientId: string,
  content: string
): Promise<SendMessageResponse> {
  const response = await apiFetch(buildAdminMessageUrl(jobId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipientId, content } as SendMessagePayload),
  });
  if (!response.ok) {
    throw new Error(SEND_FAILED_MESSAGE);
  }
  return response.json() as Promise<SendMessageResponse>;
}

function renderSendButtonContent(isSending: boolean): string {
  return isSending ? SENDING_BUTTON_LABEL : SEND_BUTTON_LABEL;
}

function MessageBubble({
  message,
  adminUserId,
  recipientName,
}: {
  message: Message;
  adminUserId: string;
  recipientName: string;
}) {
  const isOwnMessage = message.senderId === adminUserId;
  const senderLabel = isOwnMessage ? ADMIN_SENDER_LABEL : recipientName;
  const formattedTime = formatTime(message.createdAt);

  const alignmentClass = isOwnMessage ? "items-end" : "items-start";
  const bubbleClass = isOwnMessage
    ? "bg-primary/10 border border-primary/20 rounded-tr-none self-end"
    : "bg-surface-container-low border border-outline-variant rounded-tl-none self-start";

  return (
    <div className={`flex flex-col ${alignmentClass}`}>
      <span className="text-[9px] text-secondary mb-0.5">
        {senderLabel} ({formattedTime})
      </span>
      <div
        className={`px-2.5 py-1.5 rounded-lg max-w-[85%] text-on-surface ${bubbleClass}`}
      >
        {message.content}
      </div>
    </div>
  );
}

export default function AdminMessagePanel({
  jobId,
  poster,
  driver,
}: AdminMessagePanelProps) {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(POSTER_TAB);
  const [draftMessage, setDraftMessage] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const adminUserId = user?._id ?? "";

  const recipientId = useMemo(
    () => getActiveRecipientId(activeTab, poster, driver),
    [activeTab, poster, driver]
  );
  const recipientName = useMemo(
    () => getActiveRecipientName(activeTab, poster, driver),
    [activeTab, poster, driver]
  );

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: getMessagesQueryKey(jobId, recipientId),
    queryFn: () => fetchAdminMessages(jobId, recipientId),
    enabled: Boolean(recipientId),
    staleTime: STALE_TIME_MS,
  });

  const messages = useMemo(
    () => messagesData?.messages ?? [],
    [messagesData?.messages]
  );

  const sendMessageMutation = useMutation({
    mutationFn: ({
      recipientId: mutationRecipientId,
      content,
    }: SendMessagePayload) =>
      sendAdminMessage(jobId, mutationRecipientId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getMessagesQueryKey(jobId, recipientId),
      });
      setDraftMessage("");
      toast.success(SEND_SUCCESS_MESSAGE);
    },
    onError: () => {
      toast.error(SEND_FAILED_MESSAGE);
    },
  });

  const isSending = sendMessageMutation.isPending;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleTabChange = useCallback(
    (tab: ActiveTab) => {
      if (tab === activeTab) return;
      if (tab === DRIVER_TAB && !driver) return;
      setActiveTab(tab);
      setDraftMessage("");
    },
    [activeTab, driver]
  );

  const handlePosterTabClick = useCallback(() => {
    handleTabChange(POSTER_TAB);
  }, [handleTabChange]);

  const handleDriverTabClick = useCallback(() => {
    handleTabChange(DRIVER_TAB);
  }, [handleTabChange]);

  const handleDraftChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraftMessage(event.target.value);
    },
    []
  );

  const handleSend = useCallback(() => {
    const content = draftMessage.trim();
    if (!content || isSending || !recipientId || !adminUserId) return;
    void sendMessageMutation.mutate({ recipientId, content });
  }, [draftMessage, isSending, recipientId, adminUserId, sendMessageMutation]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === ENTER_KEY && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleRetry = useCallback(() => {
    void refetchMessages();
  }, [refetchMessages]);

  const isSendDisabled = useMemo(
    () => !draftMessage.trim() || isSending || !recipientId || isAuthLoading,
    [draftMessage, isSending, recipientId, isAuthLoading]
  );

  const isMessageHistoryLoading = isMessagesLoading;
  const isMessageHistoryError = isMessagesError;
  const isMessageHistoryEmpty =
    !isMessageHistoryLoading && !isMessageHistoryError && messages.length === 0;

  const posterTabClassName = [
    "px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer",
    activeTab === POSTER_TAB
      ? "bg-primary text-surface-white border-primary"
      : "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low",
  ].join(" ");

  const driverTabClassName = [
    "px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer",
    activeTab === DRIVER_TAB
      ? "bg-primary text-surface-white border-primary"
      : "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low",
  ].join(" ");

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
        Admin Messages
      </h3>

      <div className="flex gap-2">
        <button type="button" onClick={handlePosterTabClick} className={posterTabClassName}>
          Message Poster
        </button>
        {driver !== null && (
          <button type="button" onClick={handleDriverTabClick} className={driverTabClassName}>
            Message Driver
          </button>
        )}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-col gap-3 h-48 overflow-y-auto shadow-sm text-xs">
        {isMessageHistoryLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material_symbols_outlined text-2xl text-secondary animate-spin">
              progress_activity
            </span>
          </div>
        ) : isMessageHistoryError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="material_symbols_outlined text-2xl text-secondary">
              error_outline
            </span>
            <p className="text-xs text-secondary">{LOAD_ERROR_MESSAGE}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="h-10 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
            >
              {RETRY_BUTTON_LABEL}
            </button>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              adminUserId={adminUserId}
              recipientName={recipientName}
            />
          ))
        )}

        {isMessageHistoryEmpty && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="material_symbols_outlined text-3xl text-secondary">
              forum
            </span>
            <p className="text-xs text-secondary">{EMPTY_STATE_LABEL}</p>
          </div>
        )}

        <div ref={scrollAnchorRef} />
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={draftMessage}
          onChange={handleDraftChange}
          onKeyDown={handleKeyDown}
          disabled={isSending || isAuthLoading}
          placeholder={MESSAGE_INPUT_PLACEHOLDER}
          rows={MESSAGE_INPUT_ROWS}
          className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-sm text-on-surface focus:outline-none focus:border-2 focus:border-primary resize-none max-h-32 min-h-[48px] disabled:opacity-50 placeholder:text-secondary/50 transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isSendDisabled}
          aria-label={SEND_BUTTON_LABEL}
          className="h-12 px-4 bg-primary text-surface-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 flex items-center justify-center"
        >
          {renderSendButtonContent(isSending)}
        </button>
      </div>
    </div>
  );
}
