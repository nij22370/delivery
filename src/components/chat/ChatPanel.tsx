"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { EmojiClickData } from "emoji-picker-react";
import type PusherJs from "pusher-js";
import type { Channel } from "pusher-js";
import { apiFetch } from "@/utils/apiFetch";
import {
  formatMessageTime,
  getChatDateLabel,
  isSameCalendarDay,
} from "@/utils/format";
import type { GetMessagesResponse, Message } from "@/types/message/message";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="w-[300px] h-[350px] bg-surface-white border border-secondary-container rounded-xl flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
    </div>
  ),
});

// ── Constants ────────────────────────────────────────────────────────────────
const MESSAGES_QUERY_KEY_PREFIX = "messages";
const MESSAGES_ENDPOINT_BASE = "/api/jobs";
const NEW_MESSAGE_EVENT = "new-message";
const PRIVATE_CHANNEL_PREFIX = "private-job-";

const TEMP_ID_PREFIX = "temp-";
const ENTER_KEY = "Enter";

const OWN_SENDER_LABEL = "You";
const FALLBACK_OTHER_SENDER_LABEL = "Driver";
const FALLBACK_ROLE_LABEL = "Driver";
const MESSAGE_INPUT_PLACEHOLDER = "Type a message...";
const SEND_BUTTON_LABEL = "Send message";
const RETRY_BUTTON_LABEL = "Retry";
const EMPTY_CHAT_LABEL = "No messages yet. Say hello!";
const MESSAGES_LOAD_ERROR_MESSAGE = "Couldn't load messages.";
const SEND_FAILED_MESSAGE = "Couldn't send message. Please try again.";

const SEND_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;
const READ_RECEIPT_ICON_STYLE = { fontVariationSettings: "'wght' 600" } as const;
const TEXTAREA_GROW_STYLE = { fieldSizing: "content" } as const;

const TYPING_DOT_DELAYS = [0, 150, 300] as const;

const EMPTY_MESSAGES: Message[] = [];

// ── Types ────────────────────────────────────────────────────────────────────
interface ChatPanelProps {
  jobId: string;
  currentUserId: string;
  otherParticipantName?: string;
  jobBackHref?: string;
  isTyping?: boolean;
  participantPhone?: string;
}

interface NewMessagePayload {
  messageId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface PostMessageResponse {
  message: Message;
}

interface MessageRenderItem {
  key: string;
  dateDividerLabel: string | null;
  message: Message;
}

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  otherParticipantName?: string;
}

interface MessageInputProps {
  value: string;
  isSending: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onSendMedia: (file: File) => void;
}

interface ChatHeaderProps {
  title: string;
  jobId: string;
  jobBackHref?: string;
  onCall?: () => void;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function getInitialsFromName(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function isMediaUrl(content: string): boolean {
  if (!content) return false;
  return (
    content.startsWith("http://") ||
    content.startsWith("https://") ||
    content.startsWith("data:image/")
  );
}

function formatJobRef(jobId: string): string {
  return `#${jobId.slice(-6).toUpperCase()}`;
}

function getMessagesQueryKey(jobId: string): string[] {
  return [MESSAGES_QUERY_KEY_PREFIX, jobId];
}

function getMessageChannelName(jobId: string): string {
  return `${PRIVATE_CHANNEL_PREFIX}${jobId}`;
}

async function fetchMessages(jobId: string): Promise<GetMessagesResponse> {
  const response = await apiFetch(`${MESSAGES_ENDPOINT_BASE}/${jobId}/messages`);
  if (!response.ok) {
    throw new Error(MESSAGES_LOAD_ERROR_MESSAGE);
  }
  const data: GetMessagesResponse = await response.json();
  return data;
}

function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort((firstMessage, secondMessage) =>
    firstMessage.createdAt.localeCompare(secondMessage.createdAt)
  );
}

function withAppendedMessage(messages: Message[], message: Message): Message[] {
  // The server echoes the sender's own message back over Pusher, so skip any
  // message id that already exists in the list to avoid duplicates.
  const alreadyExists = messages.some(
    (existingMessage) => existingMessage._id === message._id
  );
  if (alreadyExists) return messages;
  return sortMessagesChronologically([...messages, message]);
}

function withTempReplaced(
  messages: Message[],
  tempId: string,
  replacement: Message
): Message[] {
  return sortMessagesChronologically([
    ...messages.filter(
      (message) => message._id !== tempId && message._id !== replacement._id
    ),
    replacement,
  ]);
}

function withTempRemoved(messages: Message[], tempId: string): Message[] {
  return messages.filter((message) => message._id !== tempId);
}

function shouldShowDateDivider(
  currentMessage: Message,
  previousMessage: Message | null
): boolean {
  if (previousMessage === null) return true;
  return !isSameCalendarDay(currentMessage.createdAt, previousMessage.createdAt);
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

// ── Sub-components ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  currentUserId,
  otherParticipantName,
}: MessageBubbleProps) {
  const isOwnMessage = message.senderId === currentUserId;
  const senderLabel = isOwnMessage
    ? OWN_SENDER_LABEL
    : (otherParticipantName ?? FALLBACK_OTHER_SENDER_LABEL);
  const formattedTime = formatMessageTime(message.createdAt);
  const hasReadReceipt = isOwnMessage && message.readAt !== null;
  const initials = isOwnMessage ? "" : getInitialsFromName(senderLabel);
  const isMedia = isMediaUrl(message.content);

  const handleMediaClick = useCallback(() => {
    window.open(message.content, "_blank", "noopener,noreferrer");
  }, [message.content]);

  if (isOwnMessage) {
    return (
      <div className="flex items-end gap-3 self-end max-w-[85%] md:max-w-[70%] flex-row-reverse">
        <div className="flex flex-col gap-1 items-end">
          <div className="flex items-baseline gap-2 mr-1">
            <span className="text-[11px] text-secondary">{formattedTime}</span>
            <span className="text-label-sm font-bold text-on-surface">{OWN_SENDER_LABEL}</span>
          </div>
          <div className="bg-primary text-on-primary p-3 rounded-2xl rounded-br-sm shadow-[0_1px_2px_rgba(39,110,241,0.2)]">
            {isMedia ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.content}
                alt="Shared attachment"
                className="max-w-[240px] max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleMediaClick}
              />
            ) : (
              <p className="font-body-md text-body-md break-words whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          {hasReadReceipt && (
            <div className="flex items-center gap-1 mt-0.5 text-secondary">
              <span
                className="material-symbols-outlined text-[14px] text-primary"
                style={READ_RECEIPT_ICON_STYLE}
              >
                done_all
              </span>
              <span className="text-[10px] font-label-sm">Read</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 self-start max-w-[85%] md:max-w-[70%]">
      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0 hidden sm:flex">
        <span className="text-[11px] font-bold text-primary">{initials}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2 ml-1">
          <span className="text-label-sm font-bold text-on-surface">{senderLabel}</span>
          <span className="text-[11px] text-secondary">{formattedTime}</span>
        </div>
        <div className="bg-surface-white border border-secondary-container p-3 rounded-2xl rounded-bl-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {isMedia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.content}
              alt="Shared attachment"
              className="max-w-[240px] max-h-60 rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleMediaClick}
            />
          ) : (
            <p className="font-body-md text-body-md text-on-surface break-words whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-2">
      <span className="px-3 py-1 bg-surface-container-highest text-secondary text-label-sm rounded-full border border-secondary-container">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 self-start max-w-[85%] md:max-w-[70%] opacity-50">
      <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center flex-shrink-0 hidden sm:flex">
        <span className="material-symbols-outlined text-[16px] text-primary">person</span>
      </div>
      <div className="bg-surface-white border border-secondary-container px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center h-10">
        {TYPING_DOT_DELAYS.map((delayMilliseconds) => (
          <span
            key={delayMilliseconds}
            className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce"
            style={
              delayMilliseconds > 0
                ? { animationDelay: `${delayMilliseconds}ms` }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

function ChatHeader({ title, jobId, jobBackHref, onCall }: ChatHeaderProps) {
  const initials = getInitialsFromName(title);
  const jobRef = formatJobRef(jobId);

  return (
    <div className="h-16 border-b border-secondary-container bg-surface-white flex items-center justify-between px-4 md:px-6 flex-shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.02)] z-10">
      <div className="flex items-center gap-3 md:gap-4">
        {jobBackHref && (
          <Link
            href={jobBackHref}
            className="md:hidden p-2 -ml-2 text-secondary hover:bg-surface-container-low rounded-full transition-colors cursor-pointer"
            aria-label="Back to job"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        )}
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary-fixed flex items-center justify-center border border-secondary-container flex-shrink-0">
          <span className="text-sm font-bold text-primary">{initials}</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-label-md md:text-headline-md font-bold text-on-surface">{title}</h2>
            <span className="px-2 py-0.5 bg-surface-container-high text-secondary text-label-sm rounded">
              {FALLBACK_ROLE_LABEL}
            </span>
          </div>
          <div className="flex items-center gap-2 text-secondary mt-0.5">
            <span className="text-label-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success-green inline-block" />
              Active Now
            </span>
            <span className="text-xs text-secondary-fixed-dim">•</span>
            {jobBackHref ? (
              <Link
                href={jobBackHref}
                className="text-label-sm text-primary hover:underline hover:text-surface-tint cursor-pointer"
              >
                Job {jobRef}
              </Link>
            ) : (
              <span className="text-label-sm text-primary">Job {jobRef}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCall}
          className="p-2 text-secondary hover:bg-surface-container-low rounded-full transition-colors hidden sm:block cursor-pointer"
          title="Call"
          aria-label="Call participant"
        >
          <span className="material-symbols-outlined">call</span>
        </button>
        {jobBackHref && (
          <Link
            href={jobBackHref}
            className="p-2 text-secondary hover:bg-surface-container-low rounded-full transition-colors cursor-pointer"
            title="Job details"
            aria-label="Job details"
          >
            <span className="material-symbols-outlined">info</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function MessageInput({ value, isSending, onChange, onSend, onSendMedia }: MessageInputProps) {
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === ENTER_KEY && !event.shiftKey) {
        event.preventDefault();
        onSend();
      }
    },
    [onSend]
  );

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        onSendMedia(files[0]);
      }
      if (event.target) {
        event.target.value = "";
      }
    },
    [onSendMedia]
  );

  const handleToggleEmojiPicker = useCallback(() => {
    setIsEmojiPickerOpen((prev) => !prev);
  }, []);

  const handleSelectEmoji = useCallback(
    (emojiData: EmojiClickData) => {
      onChange(value + emojiData.emoji);
      setIsEmojiPickerOpen(false);
    },
    [onChange, value]
  );

  return (
    <div className="p-4 bg-surface-white border-t border-secondary-container flex-shrink-0 z-10">
      <div className="flex items-end gap-2 max-w-4xl mx-auto w-full relative">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          aria-label="Upload media"
        />

        <button
          type="button"
          onClick={handleAttachClick}
          disabled={isSending}
          className="p-3 text-secondary hover:bg-surface-container-low hover:text-primary rounded-full transition-colors flex-shrink-0 mb-1 border border-transparent hover:border-secondary-container cursor-pointer disabled:opacity-50"
          aria-label="Attach file"
          title="Attach file"
        >
          <span className="material-symbols-outlined">attach_file</span>
        </button>

        <div className="flex-1 relative">
          {isEmojiPickerOpen && (
            <div className="absolute right-0 bottom-full mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden">
              <EmojiPicker
                onEmojiClick={handleSelectEmoji}
                width={320}
                height={400}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          <textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder={MESSAGE_INPUT_PLACEHOLDER}
            rows={1}
            style={TEXTAREA_GROW_STYLE}
            className="w-full bg-surface py-3 pl-4 pr-12 border border-secondary-container rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none resize-none max-h-32 min-h-[48px] font-body-md placeholder:text-secondary-fixed-dim disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleToggleEmojiPicker}
            className="absolute right-2 bottom-2 p-1.5 text-secondary hover:text-primary rounded-full transition-colors cursor-pointer"
            aria-label="Emoji"
            title="Emoji"
          >
            <span className="material-symbols-outlined text-[20px]">mood</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSend}
          disabled={isSending}
          aria-label={SEND_BUTTON_LABEL}
          className="w-12 h-12 bg-primary hover:bg-surface-tint text-on-primary rounded-full shadow-[0_4px_12px_rgba(39,110,241,0.2)] active:scale-95 flex items-center justify-center flex-shrink-0 mb-0.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <span
            className="material-symbols-outlined group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            style={SEND_ICON_STYLE}
          >
            send
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ChatPanel({
  jobId,
  currentUserId,
  otherParticipantName,
  jobBackHref,
  isTyping = false,
  participantPhone = "+977-9801234567",
}: ChatPanelProps) {
  const queryClient = useQueryClient();
  const [draftMessage, setDraftMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messageListEndRef = useRef<HTMLDivElement>(null);

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: getMessagesQueryKey(jobId),
    queryFn: () => fetchMessages(jobId),
    retry: false,
  });

  const messages = useMemo(
    () => messagesData?.messages ?? EMPTY_MESSAGES,
    [messagesData]
  );

  const chatHeaderTitle = otherParticipantName ?? FALLBACK_OTHER_SENDER_LABEL;

  const handleCall = useCallback(() => {
    window.location.href = `tel:${participantPhone}`;
  }, [participantPhone]);

  const messageRenderItems = useMemo<MessageRenderItem[]>(() => {
    const items: MessageRenderItem[] = [];
    messages.forEach((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const dateDividerLabel = shouldShowDateDivider(message, previousMessage)
        ? getChatDateLabel(message.createdAt)
        : null;
      items.push({ key: message._id, dateDividerLabel, message });
    });
    return items;
  }, [messages]);

  const handleNewMessage = useCallback(
    (payload: unknown) => {
      if (!isNewMessagePayload(payload)) return;

      const incomingMessage: Message = {
        _id: payload.messageId,
        jobId,
        senderId: payload.senderId,
        recipientId: payload.senderId === currentUserId ? "" : currentUserId,
        content: payload.content,
        readAt: null,
        createdAt: payload.createdAt,
      };

      queryClient.setQueryData<GetMessagesResponse>(
        getMessagesQueryKey(jobId),
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            messages: withAppendedMessage(currentData.messages, incomingMessage),
          };
        }
      );
    },
    [currentUserId, jobId, queryClient]
  );

  const handleDraftChange = useCallback((value: string) => {
    setDraftMessage(value);
    setSendError(null);
  }, []);

  const handleRetryMessages = useCallback(() => {
    refetchMessages();
  }, [refetchMessages]);

  const handleSendMessage = useCallback(
    async (directContent?: string) => {
      const content = (typeof directContent === "string" ? directContent : draftMessage).trim();
      if (!content || isSending) return;

      const tempMessage: Message = {
        _id: `${TEMP_ID_PREFIX}${Date.now()}`,
        jobId,
        senderId: currentUserId,
        recipientId: "",
        content,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      setIsSending(true);
      setSendError(null);
      if (!directContent) {
        setDraftMessage("");
      }

      queryClient.setQueryData<GetMessagesResponse>(
        getMessagesQueryKey(jobId),
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            messages: withAppendedMessage(currentData.messages, tempMessage),
          };
        }
      );

      try {
        const response = await apiFetch(`${MESSAGES_ENDPOINT_BASE}/${jobId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error(SEND_FAILED_MESSAGE);
        }

        const data: PostMessageResponse = await response.json();
        queryClient.setQueryData<GetMessagesResponse>(
          getMessagesQueryKey(jobId),
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              messages: withTempReplaced(currentData.messages, tempMessage._id, data.message),
            };
          }
        );
      } catch (error: unknown) {
        queryClient.setQueryData<GetMessagesResponse>(
          getMessagesQueryKey(jobId),
          (currentData) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              messages: withTempRemoved(currentData.messages, tempMessage._id),
            };
          }
        );
        setSendError(error instanceof Error ? error.message : SEND_FAILED_MESSAGE);
      } finally {
        setIsSending(false);
      }
    },
    [currentUserId, draftMessage, isSending, jobId, queryClient]
  );

  const handleSendMedia = useCallback(
    async (file: File) => {
      if (isSending) return;

      setIsSending(true);
      setSendError(null);

      try {
        const formData = new FormData();
        formData.append("files", file);

        const uploadResponse = await apiFetch(`/api/jobs/${jobId}/evidence`, {
          method: "POST",
          body: formData,
        });

        if (uploadResponse.ok) {
          const data: { data?: { uploaded?: string[] } } = await uploadResponse.json();
          const fileUrl = data.data?.uploaded?.[0];
          if (fileUrl) {
            await handleSendMessage(fileUrl);
            return;
          }
        }

        // Fallback: if server upload not enabled/failed, preview as Data URL
        const reader = new FileReader();
        reader.onload = async (e) => {
          const result = e.target?.result;
          if (typeof result === "string") {
            await handleSendMessage(result);
          }
        };
        reader.readAsDataURL(file);
      } catch (err: unknown) {
        setSendError(
          err instanceof Error ? err.message : "Failed to upload file."
        );
      } finally {
        setIsSending(false);
      }
    },
    [isSending, jobId, handleSendMessage]
  );

  // Subscribe to the job's private channel. Incoming messages update only the
  // React Query cache, so the list refreshes without a refetch or revalidation.
  useEffect(() => {
    const channelName = getMessageChannelName(jobId);
    let pusherClientRef: PusherJs | null = null;
    let channel: Channel | null = null;

    import("@/lib/pusherClient").then(({ pusherClient }) => {
      pusherClientRef = pusherClient;
      channel = pusherClient.subscribe(channelName);
      channel.bind(NEW_MESSAGE_EVENT, handleNewMessage);
    });

    return () => {
      if (channel && pusherClientRef) {
        channel.unbind_all();
        pusherClientRef.unsubscribe(channelName);
      }
    };
  }, [handleNewMessage, jobId]);

  // Keep the newest message in view whenever the message list changes.
  useEffect(() => {
    messageListEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-surface-white w-full">
      <ChatHeader
        title={chatHeaderTitle}
        jobId={jobId}
        jobBackHref={jobBackHref}
        onCall={handleCall}
      />

      <div className="flex-1 overflow-y-auto chat-scroll bg-[#F9FAFB] p-4 md:p-6 flex flex-col gap-6">
        {isMessagesLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-secondary animate-spin">
              progress_activity
            </span>
          </div>
        ) : isMessagesError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span className="material-symbols-outlined text-3xl text-secondary">
              error_outline
            </span>
            <p className="text-sm text-secondary">{MESSAGES_LOAD_ERROR_MESSAGE}</p>
            <button
              type="button"
              onClick={handleRetryMessages}
              className="h-10 px-4 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
            >
              {RETRY_BUTTON_LABEL}
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-4xl text-secondary">
              forum
            </span>
            <p className="text-sm text-secondary">{EMPTY_CHAT_LABEL}</p>
          </div>
        ) : (
          messageRenderItems.map((item) => (
            <Fragment key={item.key}>
              {item.dateDividerLabel !== null && (
                <DateDivider label={item.dateDividerLabel} />
              )}
              <MessageBubble
                message={item.message}
                currentUserId={currentUserId}
                otherParticipantName={otherParticipantName}
              />
            </Fragment>
          ))
        )}

        {!isMessagesLoading && !isMessagesError && isTyping && <TypingIndicator />}

        <div ref={messageListEndRef} />
      </div>

      {sendError !== null && (
        <p className="flex items-center gap-1.5 px-4 pb-2 bg-surface-white text-xs text-error-red">
          <span className="material-symbols-outlined text-[14px]">error_outline</span>
          {sendError}
        </p>
      )}

      <MessageInput
        value={draftMessage}
        isSending={isSending}
        onChange={handleDraftChange}
        onSend={() => handleSendMessage()}
        onSendMedia={handleSendMedia}
      />
    </div>
  );
}
