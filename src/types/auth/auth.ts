// auth.ts - Types for the auth domain

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: "poster" | "driver" | "admin";
}

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: "poster" | "driver" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
}

export interface GetMeResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}

export interface RefreshTokenResponse {
  message: string;
}

export interface JwtAccessPayload {
  userId: string;
  role: "poster" | "driver" | "admin";
}

export interface JwtRefreshPayload {
  userId: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}
