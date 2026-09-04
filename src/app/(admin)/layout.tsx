"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import NotificationProvider from "@/components/providers/NotificationProvider";

interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
}

const ADMIN_BOTTOM_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "grid_view" },
  { label: "Jobs", href: "/admin/jobs", icon: "work" },
  { label: "Disputes", href: "/admin/disputes", icon: "shield" },
  { label: "Users", href: "/admin/users", icon: "people" },
];

function isAdminNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
    <NotificationProvider>
      <div className="min-h-screen bg-[var(--color-background)] text-on-surface flex flex-col">
        <AdminSidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={handleCloseMobile}
        />
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
          <AdminHeader onToggleMobile={handleToggleMobile} />
          <main className="flex-1 mt-16 p-4 pb-20 md:p-8 md:pb-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center px-4 py-2 pb-[env(safe-area-inset-bottom)] bg-surface-white border-t border-secondary-container shadow-sm rounded-t-xl transition-colors duration-200">
          {ADMIN_BOTTOM_NAV_ITEMS.map((item) => {
            const active = isAdminNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 transition-transform scale-95 active:scale-90 p-2 rounded-lg ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-secondary hover:bg-surface-container-low"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="text-xs text-center font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </NotificationProvider>
  );
}
