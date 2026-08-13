// jobsApi.ts - TanStack Query hooks for jobs domain
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createJob,
  fetchUnreadCounts,
  markJobMessagesRead,
} from '../../apis/jobs/jobApi';
import type { CreateJobPayload, CreateJobResponse } from '@/types/jobs/jobs';
import type { UnreadCountsByJob } from '@/types/message/message';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { getBackendErrorMessage } from '@/lib/errorResponse';

const UNREAD_COUNTS_QUERY_KEY = 'unread-counts';
const UNREAD_COUNTS_STALE_TIME_MS = 30_000;

export function useJobCreate() {
  const queryClient = useQueryClient();

  return useMutation<CreateJobResponse, AxiosError, CreateJobPayload>({
    mutationFn: createJob,
    onSuccess: (data) => {
      // Invalidate jobs list queries if needed
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job created successfully');
      // Note: Page-level redirect should happen in the component using this hook
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'Failed to create job');
      toast.error(message);
    }
  });
}

export function useUnreadCounts() {
  return useQuery<UnreadCountsByJob>({
    queryKey: [UNREAD_COUNTS_QUERY_KEY],
    queryFn: fetchUnreadCounts,
    staleTime: UNREAD_COUNTS_STALE_TIME_MS,
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markJobMessagesRead,
    onSuccess: (_data, jobId) => {
      // Zero out this job's unread count without a refetch — never invalidate.
      queryClient.setQueryData<UnreadCountsByJob>(
        [UNREAD_COUNTS_QUERY_KEY],
        (current) => {
          if (!current || !(jobId in current)) return current;
          return { ...current, [jobId]: 0 };
        }
      );
    },
  });
}