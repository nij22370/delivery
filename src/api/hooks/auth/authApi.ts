// authApi.ts - TanStack Query hooks for auth domain
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginUser, registerUser, logoutUser } from '../../apis/auth/authApi';
import type { LoginPayload, LoginResponse, RegisterPayload, RegisterResponse, LogoutResponse } from '@/types/auth/auth';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { getBackendErrorMessage } from '@/lib/errorResponse';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, AxiosError, LoginPayload>({
    mutationFn: loginUser,
    onSuccess: () => {
      // Cookies are handled by the browser automatically.
      // Invalidate queries if necessary, e.g., 'me' query when we add it
      queryClient.invalidateQueries({ queryKey: ['me'] });
      // Redirect is handled by the calling component
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'Login failed');
      toast.error(message);
    }
  });
}

export function useRegister() {
  return useMutation<RegisterResponse, AxiosError, RegisterPayload>({
    mutationFn: registerUser,
    onSuccess: () => {
      toast.success('Registration successful. Please log in.');
      // Redirect is handled by the calling component
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'Registration failed');
      toast.error(message);
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<LogoutResponse, AxiosError, void>({
    mutationFn: logoutUser,
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear();
      toast.success('Logged out successfully');
    },
    onError: (error) => {
      const message = getBackendErrorMessage(error, 'Logout failed');
      toast.error(message);
    }
  });
}
