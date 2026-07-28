"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previous) => !previous);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <header className="bg-surface-white w-full h-16 border-b border-outline-variant z-50 shrink-0">
      <div className="flex justify-between items-center px-4 md:px-8 max-w-[1280px] mx-auto h-full">
        <Link href="/" className="text-xl font-bold text-primary hover:opacity-80 transition-opacity">
          SwiftShip
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex gap-8 items-center">
          <Link
            href="#"
            className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
          >
            Find Jobs
          </Link>
          <Link
            href="#"
            className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
          >
            Post Delivery
          </Link>
          <Link
            href="#"
            className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
          >
            How it Works
          </Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex gap-3 items-center">
          <Link
            href="/login"
            className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-95 cursor-pointer"
          >
            Post a Job
          </Link>
        </div>

        {/* Mobile: Login + Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-on-surface-variant font-medium px-3 py-2 hover:text-primary transition-colors"
          >
            Login
          </Link>
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
            <Link
              href="#"
              onClick={handleCloseMobileMenu}
              className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
            >
              Find Jobs
            </Link>
            <Link
              href="#"
              onClick={handleCloseMobileMenu}
              className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
            >
              Post Delivery
            </Link>
            <Link
              href="#"
              onClick={handleCloseMobileMenu}
              className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
            >
              How it Works
            </Link>
            <div className="pt-3 pb-1">
              <Link
                href="/register"
                onClick={handleCloseMobileMenu}
                className="w-full flex items-center justify-center bg-primary text-on-primary h-12 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer"
              >
                Post a Job
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
