"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuthGuard();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.role !== "admin") {
      router.replace("/");
    }
  }, [user, isLoading, router]);

  const handleToggleMobile = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  if (isLoading || (user && user.role !== "admin")) {
    return (
      <div className="min-h-screen bg-surface-container-low flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
        <p className="text-sm font-medium text-secondary">Verifying admin access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-on-surface flex flex-col">
      <AdminSidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={handleCloseMobile}
      />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <AdminHeader onToggleMobile={handleToggleMobile} />
        <main className="flex-1 mt-16 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
