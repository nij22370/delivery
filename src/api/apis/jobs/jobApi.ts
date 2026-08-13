// jobApi.ts - Plain async functions for jobs domain (no React/TanStack imports)
import api from '../../api';
import type { CreateJobPayload, CreateJobResponse } from '@/types/jobs/jobs';
import type {
  UnreadCountsByJob,
  MarkMessagesReadResponse,
} from '@/types/message/message';

const POST_JOB_ENDPOINT = '/jobs';

export async function createJob(data: CreateJobPayload): Promise<CreateJobResponse> {
  const response = await api.post<CreateJobResponse>(POST_JOB_ENDPOINT, data);
  return response.data;
}

export async function fetchUnreadCounts(): Promise<UnreadCountsByJob> {
  const response = await api.get<UnreadCountsByJob>('/jobs/unread-counts');
  return response.data;
}

export async function markJobMessagesRead(jobId: string): Promise<MarkMessagesReadResponse> {
  const response = await api.patch<MarkMessagesReadResponse>(
    `/jobs/${jobId}/messages/read`
  );
  return response.data;
}

export async function fetchMyActiveJobIds(): Promise<string[]> {
  const response = await api.get<{ jobIds: string[] }>('/jobs/my-active-ids');
  return response.data.jobIds;
}