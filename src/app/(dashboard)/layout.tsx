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
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

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
  { href: "/history", icon: "history", label: "History", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/admin/history", icon: "history", label: "History", roles: [ADMIN_ROLE] },
];



function resolveUserInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface ProfileBlockContentProps {
  initials: string;
  name: string;
  email: string;
  roleBadgeStyle: string;
  roleLabel: string;
  compact?: boolean;
}

function ProfileBlockContent({
  initials,
  name,
  email,
  roleBadgeStyle,
  roleLabel,
  compact = false,
}: ProfileBlockContentProps) {
  const avatarClasses = compact
    ? "h-8 w-8 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold"
    : "w-9 h-9 shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold";
  const badgeClasses = compact
    ? "shrink-0 text-xs px-2 py-0.5 rounded-full"
    : "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full";

  return (
    <>
      <div className={avatarClasses}>{initials}</div>
      <div className={compact ? "min-w-0 flex-1 flex flex-col gap-0" : "min-w-0 flex-1"}>
        <p className="truncate text-sm font-semibold text-on-surface">{name}</p>
        <p className="text-xs text-secondary truncate">{email}</p>
      </div>
      {roleLabel && (
        <span className={`${badgeClasses} ${roleBadgeStyle}`}>
          {roleLabel}
        </span>
      )}
    </>
  );
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

  const profileHref = useMemo(() => {
    if (!user || !userRole) return null;
    if (userRole === DRIVER_ROLE) return `/drivers/${user._id}`;
    if (userRole === POSTER_ROLE) return `/posters/${user._id}`;
    if (userRole === ADMIN_ROLE) return "/admin/settings";
    return null;
  }, [user, userRole]);

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  if (!isAuthLoading && userRole === ADMIN_ROLE) {
    return (
      <NotificationProvider>
        <div className="min-h-screen bg-[var(--color-background)] text-on-surface flex flex-col">
          <AdminSidebar
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={handleCloseMobileMenu}
          />
          <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
            <AdminHeader onToggleMobile={handleToggleMobileMenu} />
            <main className="flex-1 mt-16 p-4 pb-20 md:p-8 md:pb-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto">{children}</div>
            </main>
          </div>
        </div>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
    <div className="font-body-md text-body-md text-on-surface antialiased bg-background md:pl-64 pt-16 pb-20 md:pb-0 min-h-screen">
      {/* Unified Top App Bar */}
      <header className="fixed top-0 left-0 md:left-64 right-0 z-50 flex justify-between items-center px-4 md:px-8 h-16 bg-surface-white border-b border-secondary-container">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMobileMenu}
            className="p-2 rounded-lg text-secondary hover:bg-surface-container-high md:hidden cursor-pointer"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <span className="text-2xl font-bold text-primary md:hidden">SwiftShip</span>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2">
          <Link
            href="/settings"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </Link>
          <Link
            href="/faq"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="FAQ"
          >
            <span className="material-symbols-outlined text-xl">help</span>
          </Link>
          <Link
            href="/support"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
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
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:text-error-red hover:bg-surface-container-high transition-colors cursor-pointer"
            aria-label="Logout"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
          </button>
        </div>
      </header>

      {/* Mobile slide-in Sidebar Overlay (supplements the bottom nav) */}
      {isMobileMenuOpen && (
        <div
          onClick={handleCloseMobileMenu}
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in Sidebar */}
      <aside
        className={[
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-surface-white border-r border-secondary-container transition-transform duration-200 ease-in-out md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        aria-label="Mobile navigation"
      >
        {/* Mobile Sidebar Header — compact, with absolute X close button */}
        <div className="relative flex items-center gap-3 py-3 px-4 border-b border-secondary-container shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>local_shipping</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-primary leading-tight truncate">SwiftShip Fleet</h2>
            <p className="text-[11px] font-semibold text-secondary truncate">Verified Logistics Partner</p>
          </div>
          <button
            type="button"
            onClick={handleCloseMobileMenu}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-secondary hover:bg-surface-container-high cursor-pointer"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Mobile Sidebar: New Shipment (poster only) */}
        {userRole === POSTER_ROLE && (
          <div className="px-4 pt-3">
            <Link
              href="/post-job"
              onClick={handleCloseMobileMenu}
              className="w-full bg-primary-container hover:bg-primary-container/90 text-on-primary-container text-sm font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
              New Shipment
            </Link>
          </div>
        )}

        {/* Mobile Sidebar: Nav Links (scrollable region) + More section */}
        <ul className="flex flex-col gap-1 flex-1 overflow-y-auto px-3 py-3">
          {visibleNavLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={handleCloseMobileMenu}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary-container text-on-primary-container font-bold"
                      : "text-secondary hover:bg-surface-container-high"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl shrink-0"
                    style={active || link.fillIcon ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}

          {/* More section divider (subtle) */}
          <li className="mt-2 mb-1 px-3">
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">
              More
            </p>
          </li>

          <li>
            <Link
              href="/settings"
              onClick={handleCloseMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl shrink-0">settings</span>
              Settings
            </Link>
          </li>
          <li>
            <Link
              href="/faq"
              onClick={handleCloseMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl shrink-0">help</span>
              FAQ
            </Link>
          </li>
          <li>
            <Link
              href="/support"
              onClick={handleCloseMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl shrink-0">support_agent</span>
              Support
            </Link>
          </li>
        </ul>

        {/* Mobile Sidebar: Profile Footer (pinned to bottom) */}
        {!isAuthLoading && user && (
          <div className="border-t border-surface-variant py-3 px-4 mt-auto shrink-0">
            {profileHref ? (
              <Link
                href={profileHref}
                onClick={handleCloseMobileMenu}
                aria-label={`Open ${roleLabel || "user"} profile`}
                className="flex items-center gap-3 py-1 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <ProfileBlockContent
                  initials={userInitials}
                  name={user.name}
                  email={user.email}
                  roleBadgeStyle={roleBadgeStyle}
                  roleLabel={roleLabel}
                  compact
                />
              </Link>
            ) : (
              <div className="flex items-center gap-3 py-1">
                <ProfileBlockContent
                  initials={userInitials}
                  name={user.name}
                  email={user.email}
                  roleBadgeStyle={roleBadgeStyle}
                  roleLabel={roleLabel}
                  compact
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                handleCloseMobileMenu();
                handleLogout();
              }}
              className="mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-error-red hover:bg-error-red/10 transition-colors cursor-pointer"
              aria-label="Logout"
            >
              <span className="material-symbols-outlined text-xl shrink-0">logout</span>
              Logout
            </button>
          </div>
        )}
      </aside>

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
            {profileHref ? (
              <Link
                href={profileHref}
                aria-label={`Open ${roleLabel || "user"} profile`}
                className="block px-3 py-3 rounded-xl bg-surface-container-low flex items-center gap-3 hover:bg-surface-container transition-colors cursor-pointer"
              >
                <ProfileBlockContent
                  initials={userInitials}
                  name={user.name}
                  email={user.email}
                  roleBadgeStyle={roleBadgeStyle}
                  roleLabel={roleLabel}
                />
              </Link>
            ) : (
              <div className="px-3 py-3 rounded-xl bg-surface-container-low flex items-center gap-3">
                <ProfileBlockContent
                  initials={userInitials}
                  name={user.name}
                  email={user.email}
                  roleBadgeStyle={roleBadgeStyle}
                  roleLabel={roleLabel}
                />
              </div>
            )}
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
      <nav className="fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center px-4 py-2 pb-[env(safe-area-inset-bottom)] bg-surface-white border-t border-secondary-container shadow-sm rounded-t-xl transition-colors duration-200">
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
            <Link href="/post-job" className="flex flex-1 flex-col items-center justify-center gap-1 text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg">
              <span className="material-symbols-outlined">add_box</span>
              <span className="text-xs text-center font-semibold">Post Job</span>
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
