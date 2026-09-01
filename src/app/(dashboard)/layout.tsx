"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "next-auth/react";
import { logoutUser } from "@/api/apis/auth/authApi";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationProvider from "@/components/providers/NotificationProvider";
import NotificationsPanel, {
  NotificationsBellIcon,
  UnreadBadge,
  useNotificationsBellState,
} from "@/components/ui/NotificationsPanel";

const POSTER_ROLE = "poster";
const DRIVER_ROLE = "driver";
const ADMIN_ROLE = "admin";
const ACTIVE_DELIVERIES_PATH = "/jobs/active";
const BROWSE_JOBS_PATH = "/jobs/browse";
const TRACKING_PATH = "/tracking";
const LOGIN_PATH = "/login";

const ROLE_BADGE_STYLES: Record<string, string> = {
  [DRIVER_ROLE]: "bg-blue-100 text-blue-700",
  [POSTER_ROLE]: "bg-purple-100 text-purple-700",
  [ADMIN_ROLE]: "bg-amber-100 text-amber-700",
};

const ROLE_LABELS: Record<string, string> = {
  [DRIVER_ROLE]: "Driver",
  [POSTER_ROLE]: "Poster",
  [ADMIN_ROLE]: "Admin",
};

interface NavLink {
  href: string;
  icon: string;
  label: string;
  fillIcon?: boolean;
  roles: string[];
}

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", roles: [POSTER_ROLE, DRIVER_ROLE, ADMIN_ROLE] },
  { href: "/jobs/active", icon: "local_shipping", label: "Active Deliveries", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/tracking", icon: "location_on", label: "Tracking", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/jobs/browse", icon: "list_alt", label: "Browse Jobs", roles: [DRIVER_ROLE] },
  { href: "/analytics", icon: "bar_chart", label: "Analytics", roles: [POSTER_ROLE] },
  { href: "/billing", icon: "receipt_long", label: "Billing", roles: [POSTER_ROLE] },
  { href: "/post-job", icon: "add_box", label: "Post Job", roles: [POSTER_ROLE] },
  { href: "/driver/earnings", icon: "payments", label: "Earnings", roles: [DRIVER_ROLE] },
  { href: "/driver/payouts", icon: "account_balance_wallet", label: "Wallet", roles: [DRIVER_ROLE] },
  { href: "/driver/verification", icon: "verified_user", label: "Verification", roles: [DRIVER_ROLE] },
  { href: "/disputes", icon: "gavel", label: "Disputes", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/history", icon: "history", label: "History", roles: [POSTER_ROLE, DRIVER_ROLE, ADMIN_ROLE] },
];



function resolveUserInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();

  const userRole = user?.role;

  const userInitials = useMemo(() => resolveUserInitials(user?.name), [user?.name]);

  const roleBadgeStyle = useMemo(
    () => (userRole ? (ROLE_BADGE_STYLES[userRole] ?? "bg-secondary-container text-secondary") : ""),
    [userRole]
  );

  const roleLabel = useMemo(
    () => (userRole ? (ROLE_LABELS[userRole] ?? userRole) : ""),
    [userRole]
  );

  const visibleNavLinks = useMemo(() => {
    if (isAuthLoading) return NAV_LINKS;
    return NAV_LINKS.filter((link) => link.roles.includes(userRole as string));
  }, [userRole, isAuthLoading]);

  const isActive = useCallback((href: string) => {
    if (href === TRACKING_PATH) {
      return (
        pathname === TRACKING_PATH ||
        (pathname.startsWith("/jobs/") &&
          pathname !== ACTIVE_DELIVERIES_PATH &&
          pathname !== BROWSE_JOBS_PATH)
      );
    }
    if (href === ACTIVE_DELIVERIES_PATH) {
      return (
        pathname === ACTIVE_DELIVERIES_PATH ||
        (pathname.startsWith("/jobs/") && pathname.endsWith("/active"))
      );
    }
    return pathname === href;
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      signOut({ redirect: true, callbackUrl: LOGIN_PATH });
    }
  }, []);

  const { unreadCount } = useNotificationsBellState();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleToggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

  return (
    <NotificationProvider>
    <div className="font-body-md text-body-md text-on-surface antialiased bg-background md:pl-64 pt-16 pb-20 md:pb-0 min-h-screen">
      {/* Unified Top App Bar */}
      <header className="fixed top-0 left-0 md:left-64 right-0 z-50 flex justify-between items-center px-4 md:px-8 h-16 bg-surface-white border-b border-secondary-container">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-primary md:hidden">SwiftShip</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Link
            href="/settings"
            className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </Link>
          <Link
            href="/faq"
            className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="FAQ"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </Link>
          <Link
            href="/support"
            className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Support"
          >
            <span className="material-symbols-outlined text-xl">support_agent</span>
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={handleToggleNotifications}
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
            >
              <NotificationsBellIcon />
              <UnreadBadge count={unreadCount} />
            </button>
            <NotificationsPanel
              isOpen={isNotificationsOpen}
              onClose={handleCloseNotifications}
            />
          </div>
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:text-error-red hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </header>

      {/* Desktop Side Navbar */}
      <nav className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 p-4 bg-surface-white border-r border-secondary-container z-40 transition-all duration-200">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-primary leading-tight">SwiftShip Fleet</h2>
            <p className="text-xs font-semibold text-secondary">Verified Logistics Partner</p>
          </div>
        </div>

        {userRole === POSTER_ROLE && (
          <Link
            href="/post-job"
            className="w-full bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-sm font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors mb-6"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
            New Shipment
          </Link>
        )}

        <ul className="flex flex-col gap-1 flex-grow overflow-y-auto pr-1">
          {visibleNavLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-secondary hover:bg-surface-container-high"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={active || link.fillIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sidebar Footer: profile card */}
        {!isAuthLoading && user && (
          <div className="mt-auto pt-4 border-t border-secondary-container">
            <div className="px-3 py-3 rounded-xl bg-surface-container-low flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface truncate">{user.name}</p>
                <p className="text-xs text-secondary truncate">{user.email}</p>
              </div>
              {userRole && (
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadgeStyle}`}>
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      {/* We don't apply the max-w-[1280px] here so children pages can have edge-to-edge if needed, 
          or they can wrap themselves in max-w-[1280px]. */}
      <div className="w-full h-full">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center px-4 py-2 bg-surface-white border-t border-secondary-container shadow-sm rounded-t-xl transition-colors duration-200">
        <Link href="/dashboard" className="flex flex-col items-center justify-center text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg w-16">
          <span className="material-symbols-outlined mb-1">home</span>
          <span className="text-xs font-semibold">Home</span>
        </Link>
        <Link href="/jobs/active" className="flex flex-col items-center justify-center text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg w-16">
          <span className="material-symbols-outlined mb-1">local_shipping</span>
          <span className="text-xs font-semibold">Active</span>
        </Link>
        {userRole === POSTER_ROLE ? (
          <>
            <Link href="/post-job" className="flex flex-col items-center justify-center text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg w-16">
              <span className="material-symbols-outlined mb-1">add_box</span>
              <span className="text-xs font-semibold">Post Job</span>
            </Link>
            <Link href="/history" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 transition-transform scale-95 active:scale-90 p-2 w-16">
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <span className="text-xs font-semibold">History</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/jobs/browse" className="flex flex-col items-center justify-center text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg w-16">
              <span className="material-symbols-outlined mb-1">list_alt</span>
              <span className="text-xs font-semibold">Browse</span>
            </Link>
            <Link href="/driver/earnings" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 transition-transform scale-95 active:scale-90 p-2 w-16">
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              <span className="text-xs font-semibold">Earnings</span>
            </Link>
          </>
        )}
      </nav>
    </div>
    </NotificationProvider>
  );
}
