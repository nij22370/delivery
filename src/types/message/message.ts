export interface Message {
  _id: string;
  jobId: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface GetMessagesResponse {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type UnreadCountsByJob = Record<string, number>;

export interface MarkMessagesReadResponse {
  ok: boolean;
  markedCount: number;
}
