"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const POSTER_ROLE = "poster";
const DRIVER_ROLE = "driver";

interface NavLink {
  href: string;
  icon: string;
  label: string;
  fillIcon?: boolean;
  roles: string[];
}

interface FooterLink {
  href: string;
  icon: string;
  label: string;
}

const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/jobs/active", icon: "local_shipping", label: "Active Deliveries", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/post-job", icon: "add_box", label: "Post Job", roles: [POSTER_ROLE] },
  { href: "/driver/earnings", icon: "payments", label: "Earnings", roles: [DRIVER_ROLE] },
  { href: "/driver/payouts", icon: "account_balance_wallet", label: "Wallet", roles: [DRIVER_ROLE] },
  { href: "/driver/verification", icon: "verified_user", label: "Verification", roles: [DRIVER_ROLE] },
  { href: "/disputes", icon: "gavel", label: "Disputes", roles: [POSTER_ROLE, DRIVER_ROLE] },
  { href: "/history", icon: "history", label: "History", roles: [POSTER_ROLE, DRIVER_ROLE] },
];

const FOOTER_LINKS: FooterLink[] = [
  { href: "/settings", icon: "settings", label: "Settings" },
  { href: "/support", icon: "contact_support", label: "Support" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading: isAuthLoading } = useAuth();

  const userRole = user?.role;
  const visibleNavLinks = useMemo(() => {
    if (isAuthLoading) return NAV_LINKS;
    return NAV_LINKS.filter((link) => link.roles.includes(userRole as string));
  }, [userRole, isAuthLoading]);

  const isActive = useCallback((href: string) => {
    return pathname === href;
  }, [pathname]);

  return (
    <div className="font-body-md text-body-md text-on-surface antialiased bg-background md:pl-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
      {/* Mobile Top App Bar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-surface-white border-b border-secondary-container md:hidden">
        <span className="text-2xl font-bold text-primary">SwiftShip</span>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full text-secondary hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 rounded-full text-secondary hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined">help</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold">
            AD
          </div>
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

        <ul className="flex flex-col gap-1 flex-grow">
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

          {/* Mobile: always show Jobs navigation, Desktop: hide jobs since it's in main navigation */}
          <li className="md:hidden">
            <Link
              href="/jobs/browse"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname === "/jobs/browse"
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-secondary hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined">list_alt</span>
              Browse Jobs
            </Link>
          </li>
        </ul>

        <div className="mt-auto pt-4 border-t border-secondary-container">
          <ul className="flex flex-col gap-1">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-secondary hover:bg-surface-container-high transition-all duration-200"
                >
                  <span className="material-symbols-outlined">{link.icon}</span>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
        <Link href="/jobs/browse" className="flex flex-col items-center justify-center text-secondary hover:bg-surface-container-low transition-transform scale-95 active:scale-90 p-2 rounded-lg w-16">
          <span className="material-symbols-outlined mb-1">list_alt</span>
          <span className="text-xs font-semibold">Browse</span>
        </Link>
        <Link href="/driver/dashboard" className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 transition-transform scale-95 active:scale-90 p-2 w-16">
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
          <span className="text-xs font-semibold">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
