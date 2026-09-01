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

const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const [isResetting, setIsResetting] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Guest";
  const initials = user ? getInitials(displayName) : "G";

  useEffect(() => {
    console.error("Application Error Boundary caught error:", error);
  }, [error]);

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
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-background relative">
        {/* Top Header */}
        <header className="h-16 border-b border-outline_variant bg-surface-white flex items-center justify-between px-4 md:px-8 shrink-0">
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
              <span className="material-symbols-outlined text-xl">help_outline</span>
            </button>
            {isAuthLoading ? (
              <div className="size-10 rounded-full bg-surface-container-high animate-pulse shrink-0" />
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

        {/* Central Error View */}
        <main className="flex-1 flex flex-col items-center justify-start md:justify-center overflow-y-auto p-4 sm:p-6 md:p-8 text-center">
          <div className="relative z-10 max-w-2xl w-full flex flex-col items-center py-2 md:py-4 my-auto">
            {/* Error Cloud Off Icon Illustration */}
            <div className="mb-4 md:mb-6 p-6 sm:p-8 rounded-full bg-error-container text-error-red transition-all duration-300 hover:scale-105 shrink-0">
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
