"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/utils/format";

const BRAND_NAME = "SwiftShip";
const ILLUSTRATION_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCsv-7-iDZUP7cj_Tj93dvEqUx00WuiC0OGyNrGITqRpHHPlRS0OdCDv05224AdkDtvMWrBMIuraOYqPhZ8lHilXlCe8zu2uU-wxEBvDMk0vdwV4CGFOjTZujyOL0u5u8kpGlf9aLcoGI7iPqP4eJ3FIeDjOIVqcuJVfzFHolyPw6qVHZOCMbzmya1UotNeqCJH-50FrC_GT-e3cugaJgRHiesGQhSZ312o9ClYFe9M8JNsS1F6PGW3";

const PAGE_TITLE = "Lost in Transit?";
const PAGE_SUBTITLE = "404 - Page Not Found";
const PAGE_DESCRIPTION =
  "The link you followed might be broken, or the shipment data has been moved to a new route. Let's get your navigation back on the right track.";

const DASHBOARD_HREF = "/";
const SUPPORT_HREF = "mailto:support@swiftship.com";
const COPYRIGHT_TEXT = "© 2024 SwiftShip Logistics Inc. All rights reserved.";

const NAV_ITEMS = [
  { href: "/", icon: "dashboard", label: "Dashboard", isActive: false },
  { href: "/jobs/browse", icon: "local_shipping", label: "Shipments", isActive: false },
  { href: "/jobs/browse", icon: "location_on", label: "Tracking", isActive: false },
  { href: "/driver/earnings", icon: "analytics", label: "Analytics", isActive: false },
  { href: "/driver/verification", icon: "settings", label: "Settings", isActive: false },
] as const;

const QUICK_DESTINATIONS = [
  { href: "/jobs/browse", icon: "list_alt", label: "Active Shipments" },
  { href: "/jobs/browse", icon: "map", label: "Fleet Tracker" },
  { href: "/driver/earnings", icon: "description", label: "Billing History" },
] as const;

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "https://status.swiftship.com", label: "System Status" },
] as const;

function formatRoleLabel(role?: string): string {
  if (role === "admin") return "Logistics Admin";
  if (role === "driver") return "Verified Driver";
  if (role === "poster") return "Logistics Poster";
  return "Guest User";
}

export default function NotFound() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const initials = user ? getInitials(displayName) : "G";
  const roleLabel = formatRoleLabel(user?.role);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previousState) => !previousState);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-on-background">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={handleCloseMobileMenu}
          className="fixed inset-0 z-40 bg-black/40 md:hidden cursor-pointer backdrop-blur-xs"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant bg-surface-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Logo & Header with Delivery Truck Icon */}
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

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={handleCloseMobileMenu}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                item.isActive
                  ? "bg-[#e7ebf3] text-primary font-bold"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Dynamic Authenticated User Profile Card */}
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
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-container transition-colors">
              <div className="size-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-on-surface truncate">{displayName}</span>
                <span className="text-xs text-on-surface-variant truncate">{roleLabel}</span>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 p-2 rounded-lg text-primary hover:bg-surface-container transition-colors cursor-pointer"
            >
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-xl">login</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-on-surface">Sign In</span>
                <span className="text-xs text-on-surface-variant">Log into account</span>
              </div>
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-white px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleMobileMenu}
              className="md:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Search tracking ID..."
                className="h-10 w-64 rounded-lg border-none bg-surface-container-low pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Help"
            >
              <span className="material-symbols-outlined text-xl">help</span>
            </button>
          </div>
        </header>

        {/* 404 Central Main Section */}
        <main className="flex flex-1 flex-col items-center overflow-y-auto p-4 sm:p-6 md:p-8 text-center bg-surface">
          <div className="max-w-2xl w-full flex flex-col items-center py-4 md:py-6 my-auto">
            {/* Visual Anchor / 3D Isometric Lost Drone Image */}
            <div className="relative w-full max-w-[440px] md:max-w-[500px] aspect-video mb-6 group shrink-0">
              {/* Atmospheric Background Glow */}
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl scale-95 pointer-events-none" />

              {/* Main Image with full 16:9 widescreen fit */}
              <div className="relative z-10 w-full h-full">
                <Image
                  src={ILLUSTRATION_URL}
                  alt="404 - Lost in Transit delivery illustration"
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>

              {/* Interactive Floating Badges */}
              <div className="absolute top-2 right-2 sm:top-4 sm:right-6 animate-bounce delay-75 z-20 pointer-events-none">
                <span className="material-symbols-outlined text-primary-fixed-dim text-3xl sm:text-4xl opacity-70">
                  package_2
                </span>
              </div>
              <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-6 animate-pulse z-20 pointer-events-none">
                <span className="material-symbols-outlined text-secondary text-4xl sm:text-5xl opacity-40">
                  wrong_location
                </span>
              </div>
            </div>

            {/* Typography */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-on-surface mb-2 tracking-tight">
              {PAGE_TITLE}
            </h1>
            <h2 className="text-lg sm:text-xl font-semibold text-primary mb-3">
              {PAGE_SUBTITLE}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-on-surface-variant mb-6 max-w-lg leading-relaxed">
              {PAGE_DESCRIPTION}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href={DASHBOARD_HREF}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-on-primary transition-all hover:bg-on-primary-fixed-variant hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">home</span>
                <span>Back to Dashboard</span>
              </Link>
              <a
                href={SUPPORT_HREF}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-outline px-8 text-sm font-bold text-on-surface-variant transition-all hover:bg-surface-container hover:text-on-surface active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                <span>Contact Support</span>
              </a>
            </div>

            {/* Suggested Quick Destinations */}
            <div className="mt-8 sm:mt-12 w-full border-t border-outline-variant pt-6 sm:pt-8">
              <p className="text-xs font-semibold text-on-surface-variant mb-4 sm:mb-6 uppercase tracking-wider">
                Quick Destinations
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {QUICK_DESTINATIONS.map((destination) => (
                  <Link
                    key={destination.label}
                    href={destination.href}
                    className="flex items-center gap-2 text-xs sm:text-sm font-medium text-primary hover:underline cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">{destination.icon}</span>
                    <span>{destination.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex h-14 sm:h-16 shrink-0 flex-col sm:flex-row items-center justify-between gap-2 px-6 sm:px-8 bg-surface-white border-t border-outline-variant text-xs text-on-surface-variant">
          <p>{COPYRIGHT_TEXT}</p>
          <div className="flex gap-4 sm:gap-6">
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
