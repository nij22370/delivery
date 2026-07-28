export interface JwtAccessPayload {
  userId: string;
  role: "poster" | "driver" | "admin";
}

export interface JwtRefreshPayload {
  userId: string;
}
