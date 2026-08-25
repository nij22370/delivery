"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";

export type RoleType = "poster" | "driver" | "admin";

export default function LandingPage() {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState<RoleType>("poster");

  // Auto-detect logged-in user role on mount or user state change
  useEffect(() => {
    if (user?.role) {
      if (user.role === "poster") {
        setActiveRole("poster");
      } else if (user.role === "driver") {
        setActiveRole("driver");
      } else if (user.role === "admin") {
        setActiveRole("admin");
      }
    }
  }, [user]);

  return (
    <div className="relative min-h-screen bg-background bg-grid-pattern flex flex-col items-center overflow-x-hidden">
      {/* Role Switcher Tabs */}
      <div className="z-20 w-full max-w-7xl px-4 md:px-8 mt-10">
        <div className="flex justify-center md:justify-start">
          <div className="bg-surface-white border border-outline-variant/60 rounded-xl p-1.5 flex gap-1 shadow-sm">
            <button
              onClick={() => setActiveRole("poster")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                activeRole === "poster"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              Businesses & Senders
            </button>
            <button
              onClick={() => setActiveRole("driver")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                activeRole === "driver"
                  ? "bg-[#05A357] text-white shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-[#05A357]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              Couriers & Drivers
            </button>
            <button
              onClick={() => setActiveRole("admin")}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                activeRole === "admin"
                  ? "bg-[#2f3131] text-white shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-black"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">deployed_code</span>
              System Admins
            </button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <HeroSection activeRole={activeRole} />

      {/* Bento Grid Features */}
      <FeaturesSection activeRole={activeRole} />
    </div>
  );
}
