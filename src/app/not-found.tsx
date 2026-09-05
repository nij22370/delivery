"use client";

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

const QUICK_DESTINATIONS = [
  { href: "/jobs/browse", icon: "list_alt", label: "Active Shipments" },
  { href: "/jobs/browse", icon: "map", label: "Fleet Tracker" },
  { href: "/driver/earnings", icon: "description", label: "Billing History" },
] as const;

import { STATUS_PAGE_URL } from "@/lib/constants";

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: STATUS_PAGE_URL, label: "System Status" },
] as const;

export default function NotFound() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const initials = user ? getInitials(displayName) : "G";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-on-background">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-white px-4 md:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]">
                local_shipping
              </span>
              <span className="text-xl font-bold text-primary">{BRAND_NAME}</span>
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
            {isAuthLoading ? (
              <div className="size-10 rounded-full bg-surface-container-high shrink-0 animate-pulse" />
            ) : user ? (
              <div className="size-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                {initials}
              </div>
            ) : (
              <Link
                href="/login"
                className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">login</span>
              </Link>
            )}
          </div>
        </header>

        {/* 404 Central Main Section */}
        <main className="flex-1 flex flex-col items-center overflow-y-auto p-4 sm:p-6 md:p-8 text-center bg-surface">
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
