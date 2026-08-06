// jobsApi.ts - TanStack Query hooks for jobs domain
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob } from '../../apis/jobs/jobApi';
import type { CreateJobPayload, CreateJobResponse } from '@/types/jobs/jobs';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { getBackendErrorMessage } from '@/lib/errorResponse';

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