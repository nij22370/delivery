// authApi.ts - Plain async functions for auth domain (no React/TanStack imports)
import api from '../../api';
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  GetMeResponse,
  LogoutResponse,
  RefreshTokenResponse
} from '@/types/auth/auth';

export async function loginUser(data: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
}

export async function registerUser(data: RegisterPayload): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>('/auth/register', data);
  return response.data;
}

export async function logoutUser(): Promise<LogoutResponse> {
  const response = await api.post<LogoutResponse>('/auth/logout');
  return response.data;
}

export async function getMe(): Promise<GetMeResponse> {
  const response = await api.get<GetMeResponse>('/auth/me');
  return response.data;
}

export async function refreshToken(): Promise<RefreshTokenResponse> {
  const response = await api.post<RefreshTokenResponse>('/auth/refresh');
  return response.data;
}
