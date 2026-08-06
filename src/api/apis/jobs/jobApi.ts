// jobApi.ts - Plain async functions for jobs domain (no React/TanStack imports)
import api from '../../api';
import type { CreateJobPayload, CreateJobResponse } from '@/types/jobs/jobs';

const POST_JOB_ENDPOINT = '/jobs';

export async function createJob(data: CreateJobPayload): Promise<CreateJobResponse> {
  const response = await api.post<CreateJobResponse>(POST_JOB_ENDPOINT, data);
  return response.data;
}