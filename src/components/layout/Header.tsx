"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { logoutUser } from "@/api/apis/auth/authApi";
import { getInitials } from "@/utils/format";

const POSTER_ROLE = "poster";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();

  const displayName = user?.name?.trim() || user?.email || "Account";
  const initials = user ? getInitials(displayName) : "";
  const isPoster = user?.role === POSTER_ROLE;
  const isDriver = user?.role === "driver";
  const isAdmin = user?.role === "admin";

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previous) => !previous);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      // Full reload re-runs useAuth (GET /auth/me) so the header reverts to
      // the logged-out state and all client caches are cleared.
      window.location.reload();
    }
  }, []);

  return (
    <header className="bg-surface-white w-full h-16 border-b border-outline-variant z-50 shrink-0">
      <div className="flex justify-between items-center px-4 md:px-8 max-w-[1280px] mx-auto h-full">
        <Link href="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
          SwiftShip
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex gap-8 items-center">
          {(!user || isDriver) && (
            <Link
              href="/jobs/browse"
              className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
            >
              Find Jobs
            </Link>
          )}
          {isDriver && (
            <Link
              href="/driver/earnings"
              className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
            >
              Earnings
            </Link>
          )}
          {(!user || isPoster) && (
            <Link
              href="/post-job"
              className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
            >
              Post Delivery
            </Link>
          )}
          {user && (
            <Link
              href="/disputes"
              className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-lg">gavel</span>
              Disputes
            </Link>
          )}
          <Link
            href="/#how-it-works"
            className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
          >
            How it Works
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex gap-3 items-center">
          {isAuthLoading ? (
            <div
              className="h-9 w-28 animate-pulse rounded-lg bg-surface-container"
              aria-hidden="true"
            />
          ) : user ? (
            <>
              <div className="flex items-center gap-2 pr-3 border-r border-outline-variant/50">
                <div className="w-8 h-8 rounded-full bg-primary-container/15 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{initials}</span>
                </div>
                <span className="text-sm text-on-surface font-medium max-w-[140px] truncate">
                  {displayName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-on-surface-variant font-medium hover:text-error transition-colors cursor-pointer"
              >
                Logout
              </button>
              {isPoster && (
                <Link
                  href="/post-job"
                  className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-95 cursor-pointer"
                >
                  Post a Job
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-on-surface-variant font-medium hover:text-primary-container transition-colors cursor-pointer"
                >
                  Admin Panel
                </Link>
              )}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                href="/post-job"
                className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-95 cursor-pointer"
              >
                Post a Job
              </Link>
            </>
          )}
        </div>

        {/* Mobile: Login/Avatar + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {user ? (
            <div
              className="w-8 h-8 rounded-full bg-primary-container/15 flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
          ) : (
            !isAuthLoading && (
              <Link
                href="/login"
                className="text-sm text-on-surface-variant font-medium px-3 py-2 hover:text-primary transition-colors"
              >
                Login
              </Link>
            )
          )}
          <button
            onClick={handleToggleMobileMenu}
            className="p-2 text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface-white border-b border-outline-variant shadow-md absolute w-full left-0 top-16 z-50">
          <nav className="flex flex-col px-4 py-3 gap-1">
            {(!user || isDriver) && (
              <Link
                href="/jobs/browse"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                Find Jobs
              </Link>
            )}
            {isDriver && (
              <Link
                href="/driver/earnings"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                Earnings
              </Link>
            )}
            {(!user || isPoster) && (
              <Link
                href="/post-job"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                Post Delivery
              </Link>
            )}
            <Link
              href="/#how-it-works"
              onClick={handleCloseMobileMenu}
              className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
            >
              How it Works
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary-container transition-colors"
              >
                Admin Panel
              </Link>
            )}
            {isPoster && (
              <div className="pt-3 pb-1">
                <Link
                  href="/post-job"
                  onClick={handleCloseMobileMenu}
                  className="w-full flex items-center justify-center bg-primary text-on-primary h-12 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer"
                >
                  Post a Job
                </Link>
              </div>
            )}

            {user && (
              <div className="pt-3 pb-1 mt-1 border-t border-outline-variant/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-container/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{displayName}</p>
                    <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 text-sm text-on-surface-variant font-medium hover:text-error transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
