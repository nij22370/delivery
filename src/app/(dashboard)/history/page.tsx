"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import DriverHistory from "@/components/history/DriverHistory";
import PosterHistory from "@/components/history/PosterHistory";
import AdminHistory from "@/components/history/AdminHistory";

export default function HistoryPage() {
  const { user, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse mb-6" />
        <div className="h-10 w-full bg-surface-container-high rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "admin") {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <AdminHistory />
      </div>
    );
  }

  if (user.role === "driver") {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <DriverHistory />
      </div>
    );
  }

  // Fallback to poster role view
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
      <PosterHistory />
    </div>
  );
}
