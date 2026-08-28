"use client";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import DriverTrackingList from "@/components/tracking/DriverTrackingList";
import PosterTrackingList from "@/components/tracking/PosterTrackingList";

export default function TrackingPage() {
  const { user, isLoading } = useAuthGuard();

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
        <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "driver") {
    return <DriverTrackingList />;
  }

  // Fallback to poster role view
  return <PosterTrackingList />;
}
