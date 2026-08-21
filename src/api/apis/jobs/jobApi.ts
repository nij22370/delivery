// jobApi.ts - Plain async functions for jobs domain (no React/TanStack imports)
import api from '../../api';
import type { CreateJobPayload, CreateJobResponse } from '@/types/jobs/jobs';
import type {
  UnreadCountsByJob,
  MarkMessagesReadResponse,
} from '@/types/message/message';
import type { MyJobsResponse } from '@/types/jobs/jobs';

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

export interface MyJobsQuery {
  page?: number;
  limit?: number;
}

export async function fetchMyJobs(query: MyJobsQuery = {}): Promise<MyJobsResponse> {
  const params: Record<string, string> = {};
  if (query.page) params.page = String(query.page);
  if (query.limit) params.limit = String(query.limit);

  const response = await api.get<MyJobsResponse>('/jobs', { params });
  return {
    ...response.data,
    jobs: (response.data.jobs ?? []).map((job) => ({
      ...job,
      driver: job.driver ?? undefined,
    })),
  };
}