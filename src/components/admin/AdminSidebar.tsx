"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Job Management", href: "/admin/jobs", icon: "work" },
  { label: "Disputes", href: "/admin/disputes", icon: "gavel" },
  { label: "User Management", href: "/admin/users", icon: "people" },
  { label: "Verifications", href: "/admin/verification", icon: "shield" },
];

export default function AdminSidebar({
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = useCallback(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [onCloseMobile]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={[
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-surface-white border-r border-outline-variant transition-transform duration-200 ease-in-out md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">local_shipping</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary tracking-tight leading-none">
                SwiftShip
              </h2>
              <p className="text-[11px] font-semibold text-secondary mt-1 tracking-wide uppercase">
                Admin Console
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-secondary hover:bg-surface-container-high md:hidden cursor-pointer"
              aria-label="Close navigation"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-outline uppercase tracking-wider px-3 mb-1">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={[
                  "flex items-center gap-3 px-4 h-12 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                  isActive
                    ? "bg-primary text-surface-white shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Footer Section */}
        <div className="p-4 border-t border-outline-variant mt-auto">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-low">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-on-surface truncate">Admin System</p>
              <p className="text-[11px] text-secondary truncate">Superadmin Role</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
