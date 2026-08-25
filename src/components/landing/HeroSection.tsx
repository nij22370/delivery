"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { RoleType } from "./LandingPage";
import ThreeCanvas from "./ThreeCanvas";
import { useAuth } from "@/hooks/useAuth";

interface HeroSectionProps {
  activeRole: RoleType;
}

export default function HeroSection({ activeRole }: HeroSectionProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const userRole = user?.role;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;
      const card = cardRef.current;
      const rect = card.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;
      
      // Calculate rotation based on cursor distance from center of the card
      const rotateX = -((e.clientY - cardY) / (rect.height / 2)) * 10;
      const rotateY = ((e.clientX - cardX) / (rect.width / 2)) * 10;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
    };

    const handleMouseLeave = () => {
      if (!cardRef.current) return;
      cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 relative z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[580px]">
        {/* Left Column: Hero Content */}
        <div className="lg:col-span-6 space-y-6 flex flex-col items-start text-left">
          {activeRole === "poster" && (
            <>
              <div className="inline-flex items-center gap-2 bg-surface-container-high/50 border border-outline-variant/30 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#05A357] animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
                  Active Delivery Network
                </span>
              </div>
              <h1 className="font-headline-xl text-4xl md:text-5xl font-black text-on-surface tracking-tighter leading-tight">
                Your Parcel, <br />
                <span className="text-primary font-bold">Our Priority.</span>
                <br />
                Fast, Secure, 3D-Tracked.
              </h1>
              <p className="font-body-lg text-lg text-on-surface-variant max-w-lg leading-relaxed">
                Experience the next generation of logistics. SwiftShip provides high-performance tracking and seamless delivery management for high-volume posters.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                {isLoggedIn && userRole === "poster" ? (
                  <>
                    <Link
                      href="/post-job"
                      className="bg-primary text-on-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      Post a New Job
                    </Link>
                    <Link
                      href="/dashboard"
                      className="bg-surface-container hover:bg-surface-container-high text-on-surface px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 border border-outline-variant transition-colors hover:scale-105 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">dashboard</span>
                      Poster Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/post-job"
                      className="bg-primary text-on-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">local_shipping</span>
                      Post a Delivery
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="bg-surface-container hover:bg-surface-container-high text-on-surface px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 border border-outline-variant transition-colors hover:scale-105 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">info</span>
                      How it Works
                    </Link>
                  </>
                )}
              </div>
            </>
          )}

          {activeRole === "driver" && (
            <div className="glass-panel rounded-xl p-8 md:p-12 flex flex-col gap-6 relative overflow-hidden">
              {/* Decorative blue top accent line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
              <div className="inline-flex items-center gap-2 bg-surface-container-high/50 border border-outline-variant/30 px-3 py-1 rounded-full w-fit">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
                  Now Recruiting
                </span>
              </div>
              <h1 className="font-headline-xl text-4xl md:text-5xl font-black text-on-surface tracking-tighter leading-tight">
                Drive Your Way.<br />
                <span className="text-primary font-bold">Earn More</span> with Every Mile.
              </h1>
              <p className="font-body-lg text-lg text-on-surface-variant max-w-lg leading-relaxed">
                Join the high-performance logistics ecosystem. Get access to premium loads, instant payouts, and state-of-the-art routing technology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                {isLoggedIn && userRole === "driver" ? (
                  <>
                    <Link
                      href="/jobs/browse"
                      className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(39,110,241,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      Browse Jobs
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </Link>
                    <Link
                      href="/driver/earnings"
                      className="bg-surface-white hover:bg-surface-container-low text-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 border border-outline-variant hover:border-primary transition-colors hover:scale-105 active:scale-95 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[20px]">payments</span>
                      View Earnings
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/register"
                      className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(39,110,241,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                    >
                      Register to Drive
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </Link>
                    <Link
                      href="#driver-perks"
                      className="bg-surface-white hover:bg-surface-container-low text-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 border border-outline-variant hover:border-primary transition-colors hover:scale-105 active:scale-95 shadow-sm"
                    >
                      Driver Benefits
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}

          {activeRole === "admin" && (
            <>
              <div className="inline-flex items-center space-x-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-1.5 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] animate-pulse" />
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-[11px] font-bold">
                  System Health: Optimal
                </span>
              </div>
              <h1 className="font-headline-xl text-4xl md:text-5xl font-black text-on-surface tracking-tighter leading-tight">
                The Pulse of Your Network. <br />
                <span className="text-primary font-bold">Full Visibility, Total Control.</span>
              </h1>
              <p className="font-body-lg text-lg text-on-surface-variant max-w-lg leading-relaxed">
                Command the logistics grid with real-time operational oversight. Resolve disputes, verify high-value freight, and analyze global fleet metrics from a single, high-performance interface.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
                <Link
                  href="/admin"
                  className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  <span>Go to Control Panel</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <Link
                  href="#platform-insights"
                  className="bg-surface-container-lowest border border-outline-variant text-on-surface px-8 py-3.5 rounded-lg font-label-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors hover:scale-105 active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">data_usage</span>
                  <span>View Live Metrics</span>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Parallax 3D Card HUD Scene */}
        <div className="lg:col-span-6 flex items-center justify-center h-[420px] md:h-[500px] relative">
          <div
            ref={cardRef}
            className="w-full h-full rounded-2xl overflow-hidden glass-panel border border-outline-variant/30 transition-all duration-300 ease-out z-10 bg-surface-container-lowest flex flex-col items-center justify-center shadow-lg relative transform-gpu"
          >
            {/* Dynamic WebGL Canvas using ThreeJS */}
            <div className="absolute inset-0 z-0">
              {activeRole === "poster" && <ThreeCanvas key="parcel" type="parcel" />}
              {activeRole === "driver" && <ThreeCanvas key="truck" type="truck" />}
              {activeRole === "admin" && <ThreeCanvas key="network" type="network" />}
            </div>

            {/* Base Grid Effect inside Card */}
            <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-surface-container-high/15 pointer-events-none z-10" />

            {/* Poster HUD Elements */}
            {activeRole === "poster" && (
              <>
                <div className="absolute top-4 right-4 bg-surface-white/95 backdrop-blur-md px-3 py-1.5 rounded text-primary font-mono text-xs border border-primary/20 shadow-sm z-20">
                  #PKG-8902-X
                </div>
                <div className="absolute bottom-4 left-4 bg-surface-white/95 backdrop-blur-md px-3 py-1.5 rounded text-[#05A357] font-mono text-xs border border-[#05A357]/20 flex items-center gap-2 shadow-sm z-20">
                  <span className="material-symbols-outlined text-[14px]">sensors</span>
                  SCANNING...
                </div>
              </>
            )}

            {/* Driver HUD Elements */}
            {activeRole === "driver" && (
              <>
                <div className="absolute top-4 right-4 bg-surface-white/95 backdrop-blur-md px-3 py-2 rounded-md border border-primary/30 flex items-center gap-2 shadow-sm z-20">
                  <span className="material-symbols-outlined text-primary text-[16px] animate-pulse">satellite_alt</span>
                  <span className="font-label-sm text-label-sm text-primary font-mono text-[11px] font-bold">LIVE TRACKING ACTIVE</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-surface-white/95 backdrop-blur-md px-4 py-3 rounded-lg border border-outline-variant/30 max-w-[200px] shadow-sm z-20">
                  <div className="text-on-surface-variant font-label-sm text-[11px] font-bold mb-1 uppercase tracking-wider">Current Rate</div>
                  <div className="text-primary font-headline-md text-2xl font-bold">NPR 220<span className="text-sm text-on-surface-variant font-normal">/km</span></div>
                </div>
              </>
            )}

            {/* Admin HUD Elements */}
            {activeRole === "admin" && (
              <>
                <div className="absolute top-4 right-4 bg-surface-container-lowest/80 backdrop-blur-sm border border-outline-variant/50 rounded-md p-3 text-right shadow-sm z-20">
                  <div className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider">ACTIVE NODES</div>
                  <div className="font-headline-md text-2xl font-bold text-on-surface">4,281</div>
                </div>
                <div className="absolute bottom-4 left-4 bg-surface-container-lowest/80 backdrop-blur-sm border border-outline-variant/50 rounded-lg p-4 shadow-sm z-20 min-w-[200px]">
                  <div className="font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider mb-1">NETWORK LOAD</div>
                  <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: "78%" }}></div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-on-surface-variant mt-1.5">78% Capacity</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </section>
  );
}
