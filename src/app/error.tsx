"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/format";

const BRAND_NAME = "SwiftShip";
const ERROR_TITLE = "Oops! Something went wrong";
const ERROR_DESCRIPTION =
  "We're having some trouble loading this page right now. It might be a temporary connection issue or a small hiccup in our system. Don't worry, your shipments are safe!";
const DEFAULT_ERROR_CODE = "ERR_SWIFT_502_X";

const SUPPORT_HREF = "mailto:support@swiftship.com";
const STATUS_PAGE_HREF = "https://status.swiftship.com";
const HELP_CENTER_HREF = "/support";
const COPYRIGHT_TEXT = "© 2024 SwiftShip Logistics Solutions. All rights reserved.";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard", isActive: true },
  { href: "/jobs/browse", icon: "package_2", label: "Shipments", isActive: false },
  { href: "/jobs/browse", icon: "location_on", label: "Tracking", isActive: false },
  { href: "/driver/earnings", icon: "analytics", label: "Analytics", isActive: false },
  { href: "/driver/verification", icon: "settings", label: "Settings", isActive: false },
] as const;

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

function formatRoleLabel(role?: string): string {
  if (role === "admin") return "Logistics Admin";
  if (role === "driver") return "Verified Driver";
  if (role === "poster") return "Logistics Poster";
  return "Guest User";
}

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const initials = user ? getInitials(displayName) : "G";
  const roleLabel = formatRoleLabel(user?.role);

  useEffect(() => {
    console.error("Application Error Boundary caught error:", error);
  }, [error]);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previousState) => !previousState);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    try {
      reset();
    } finally {
      setTimeout(() => {
        setIsResetting(false);
      }, 1000);
    }
  }, [reset]);

  const errorCode = error?.digest || DEFAULT_ERROR_CODE;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-on-background">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={handleCloseMobileMenu}
          className="fixed inset-0 z-40 bg-black/40 md:hidden cursor-pointer backdrop-blur-xs"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header with Delivery Truck Icon */}
        <div className="p-6 flex items-center gap-2.5">
          <Link href="/" className="text-primary flex items-center shrink-0">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'wght' 300" }}>
              local_shipping
            </span>
          </Link>
          <Link href="/" className="text-xl font-bold tracking-tight text-on-surface">
            {BRAND_NAME}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleCloseMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                item.isActive
                  ? "bg-primary-fixed text-on-primary-fixed-variant font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={item.isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Dynamic Logged-in User Profile Card */}
        <div className="p-4 border-t border-outline-variant">
          {isAuthLoading ? (
            <div className="flex items-center gap-3 p-2 animate-pulse">
              <div className="size-10 rounded-full bg-surface-container-high shrink-0" />
              <div className="flex flex-col gap-1 flex-1">
                <div className="h-3 w-20 bg-surface-container-high rounded" />
                <div className="h-2.5 w-14 bg-surface-container-high rounded" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container-high transition-colors">
              <div className="size-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-on-surface truncate">{displayName}</span>
                <span className="text-xs text-outline truncate">{roleLabel}</span>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 p-2 rounded-lg text-primary hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-xl">login</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-on-surface">Sign In</span>
                <span className="text-xs text-outline">Access account</span>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-background relative">
        {/* Top Header */}
        <header className="h-16 border-b border-outline-variant bg-surface-container-lowest flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              type="button"
              onClick={handleToggleMobileMenu}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="relative w-full max-w-md hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search shipments, containers, or assets..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-[#e11900] rounded-full border-2 border-surface-white" />
            </button>
            <button
              type="button"
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors cursor-pointer"
              aria-label="Help"
            >
              <span className="material-symbols-outlined text-xl">help_outline</span>
            </button>
          </div>
        </header>

        {/* Central Error View */}
        <main className="flex-1 flex flex-col items-center justify-start md:justify-center overflow-y-auto p-4 sm:p-6 md:p-8 text-center">
          <div className="relative z-10 max-w-2xl w-full flex flex-col items-center py-2 md:py-4 my-auto">
            {/* Error Cloud Off Icon Illustration */}
            <div className="mb-4 md:mb-6 p-6 sm:p-8 rounded-full bg-[#ffeae7] text-[#e11900] transition-all duration-300 hover:scale-105 shrink-0">
              <span
                className="material-symbols-outlined text-6xl sm:text-7xl md:text-8xl"
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                cloud_off
              </span>
            </div>

            {/* Typography */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface mb-2 tracking-tight">
              {ERROR_TITLE}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-outline mb-6 max-w-lg leading-relaxed">
              {ERROR_DESCRIPTION}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 px-8 bg-primary text-on-primary font-semibold rounded-xl hover:bg-surface-tint active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-70 group"
              >
                <span
                  className={`material-symbols-outlined text-lg ${
                    isResetting ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"
                  }`}
                >
                  refresh
                </span>
                <span>{isResetting ? "Reloading..." : "Refresh Page"}</span>
              </button>
              <a
                href={SUPPORT_HREF}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 px-8 bg-surface-container-highest text-on-surface font-semibold rounded-xl hover:bg-secondary-container active:scale-95 transition-all border border-outline-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                <span>Contact Support</span>
              </a>
            </div>

            {/* 3 Information Cards Grid */}
            <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full text-left">
              <a
                href={STATUS_PAGE_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border border-outline-variant rounded-xl bg-surface-container-lowest hover:border-primary/50 transition-colors cursor-pointer block"
              >
                <div className="text-primary mb-2">
                  <span className="material-symbols-outlined text-2xl">vaccines</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">System Status</h4>
                <p className="text-xs text-outline">Check our live status page for outages.</p>
              </a>

              <a
                href={HELP_CENTER_HREF}
                className="p-4 border border-outline-variant rounded-xl bg-surface-container-lowest hover:border-primary/50 transition-colors cursor-pointer block"
              >
                <div className="text-primary mb-2">
                  <span className="material-symbols-outlined text-2xl">menu_book</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Help Center</h4>
                <p className="text-xs text-outline">Browse articles and troubleshooting guides.</p>
              </a>

              <div className="p-4 border border-outline-variant rounded-xl bg-surface-container-lowest">
                <div className="text-primary mb-2">
                  <span className="material-symbols-outlined text-2xl">terminal</span>
                </div>
                <h4 className="text-sm font-bold text-on-surface mb-1">Error Code</h4>
                <p className="text-xs text-outline font-mono truncate">{errorCode}</p>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="h-12 px-6 sm:px-8 border-t border-outline-variant bg-surface-container-low flex items-center justify-between text-xs text-outline shrink-0">
          <div>{COPYRIGHT_TEXT}</div>
          <div className="flex gap-4">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
