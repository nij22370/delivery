"use client";

import { RoleType } from "./LandingPage";

interface FeaturesSectionProps {
  activeRole: RoleType;
}

export default function FeaturesSection({ activeRole }: FeaturesSectionProps) {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-8 py-16 z-10">
      {activeRole === "poster" && (
        <div id="how-it-works">
          {/* Section Header */}
          <div className="text-center mb-16 space-y-2">
            <h2 className="font-headline-lg text-3xl font-black text-on-surface tracking-tight">
              Why Choose SwiftShip
            </h2>
            <p className="font-body-md text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              High-tech infrastructure designed specifically for industrial posters needing absolute reliability.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[250px] gap-6">
            {/* Feature 1: Tracking */}
            <div className="md:col-span-8 light-panel rounded-2xl p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-300">
              <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary-container/10 to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col justify-between h-full w-full md:w-2/3">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant mb-4">
                  <span className="material-symbols-outlined text-primary text-[28px]">radar</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mb-2">
                    Real-time 3D Tracking
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Monitor your fleet's exact position on a physical Z-axis map. No more guessing, just absolute spatial awareness.
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-[200px] text-surface-container-high group-hover:text-primary/5 transition-colors duration-300 pointer-events-none transform -rotate-12 select-none">
                map
              </span>
            </div>

            {/* Feature 2: Payments */}
            <div className="md:col-span-4 light-panel rounded-2xl p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-300">
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center border border-outline-variant mb-4">
                  <span className="material-symbols-outlined text-primary text-[28px]">account_balance_wallet</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mb-2">
                    Secure Payments
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Integrated seamlessly with eSewa and Khalti for instant, verifiable transactions directly within the logistics dashboard.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Verified Drivers */}
            <div
              className="md:col-span-12 light-panel rounded-2xl p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-300"
              style={{ background: "linear-gradient(135deg, rgba(39, 110, 241, 0.02) 0%, transparent 100%)" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center h-full">
                <div className="md:col-span-7 flex flex-col justify-center">
                  <div className="inline-block px-3 py-1 bg-surface-container border border-outline-variant/60 rounded-full mb-4 w-fit">
                    <span className="font-label-sm text-[10px] font-bold text-on-surface-variant tracking-widest uppercase">
                      Network Security
                    </span>
                  </div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface mb-2">
                    100% Verified Fleet
                  </h3>
                  <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                    Every driver undergoes strict KYC and performance metrics tracking. Access our high-tier, fully vetted couriers for sensitive cargo and heavy loads.
                  </p>
                </div>

                {/* Abstract UI Graphic */}
                <div className="md:col-span-5 flex gap-4 justify-end items-center h-full relative">
                  <div className="w-44 h-28 bg-surface-white rounded-xl border border-outline-variant/60 p-4 flex flex-col justify-between shadow-md relative transform hover:-translate-y-1 transition-transform duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        AG
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface">Anil Gurung</div>
                        <div className="text-[10px] text-on-surface-variant">Car · Kathmandu</div>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[#05A357]">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant border-t border-outline-variant/30 pt-2 mt-2">
                      <span>Rating: 4.9</span>
                      <span>Trips: 184</span>
                    </div>
                  </div>

                  <div className="w-44 h-28 bg-surface-white rounded-xl border border-outline-variant/60 p-4 flex flex-col justify-between shadow-sm relative transform translate-y-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary font-bold text-xs">
                        SP
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface">Shiva Pandey</div>
                        <div className="text-[10px] text-on-surface-variant">Bike · Lalitpur</div>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-[#05A357]">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-on-surface-variant border-t border-outline-variant/30 pt-2 mt-2">
                      <span>Rating: 4.8</span>
                      <span>Trips: 92</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeRole === "driver" && (
        <div id="driver-perks">
          {/* Section Header */}
          <div className="text-center mb-16 space-y-2">
            <h2 className="font-headline-lg text-3xl font-black text-on-surface tracking-tight inline-block relative">
              Driver Perks
              <div className="absolute -bottom-2 left-0 w-1/2 h-0.5 bg-primary"></div>
            </h2>
            <p className="font-body-md text-on-surface-variant max-w-2xl mx-auto leading-relaxed mt-4">
              Engineered for efficiency. Designed for maximum earnings. Experience the next generation of fleet logistics.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Perk 1 */}
            <div className="glass-panel rounded-2xl p-8 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-300" />
              <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-3">Instant Payouts</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                Get paid within hours of delivery, not weeks. Our automated ledger system clears funds directly to your preferred wallet or bank account.
              </p>
            </div>

            {/* Perk 2 */}
            <div className="glass-panel rounded-2xl p-8 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-300" />
              <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">calendar_month</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-3">Flexible Schedule</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                You're in control. Choose your routes, define your operational hours, and accept loads that fit your lifestyle and vehicle capacity.
              </p>
            </div>

            {/* Perk 3 */}
            <div className="glass-panel rounded-2xl p-8 hover:bg-surface-container-low transition-all duration-300 relative overflow-hidden group">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-300" />
              <div className="w-12 h-12 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">support_agent</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-3">Fleet Support</h3>
              <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
                24/7 dedicated dispatch and support system. We monitor traffic constraints, weather updates, and geofence playback to keep you moving safely.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeRole === "admin" && (
        <div id="platform-insights">
          {/* Section Header */}
          <div className="mb-10 space-y-2">
            <h2 className="font-headline-lg text-3xl font-black text-on-surface tracking-tight">
              Platform Insights
            </h2>
            <p className="font-body-md text-on-surface-variant max-w-2xl leading-relaxed">
              Operational oversight and critical administrative functions.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Analytics */}
            <div className="bg-surface-container-lowest border border-outline-variant/50 shadow-sm rounded-2xl p-6 flex flex-col h-full hover:shadow-md hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-[24px]">monitoring</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">Fleet Analytics</h3>
              <p className="font-body-md text-sm text-on-surface-variant flex-grow mb-6 leading-relaxed">
                Aggregate real-time telemetry from active drivers. Monitor fuel efficiency, route deviations, and delivery density across all operational zones.
              </p>
              <div className="w-full h-24 bg-surface-container-low rounded-lg border border-outline-variant/30 relative overflow-hidden flex items-end p-2 gap-1.5 z-10">
                {/* Mock Bar Chart */}
                <div className="w-full bg-primary/30 rounded-t hover:bg-primary/50 transition-colors duration-200" style={{ height: "30%" }}></div>
                <div className="w-full bg-primary/50 rounded-t hover:bg-primary/70 transition-colors duration-200" style={{ height: "50%" }}></div>
                <div className="w-full bg-primary/40 rounded-t hover:bg-primary/60 transition-colors duration-200" style={{ height: "40%" }}></div>
                <div className="w-full bg-primary rounded-t hover:bg-primary/95 transition-colors duration-200 shadow-sm" style={{ height: "90%" }}></div>
                <div className="w-full bg-primary/70 rounded-t hover:bg-primary/80 transition-colors duration-200" style={{ height: "70%" }}></div>
              </div>
            </div>

            {/* Card 2: Verification Queue */}
            <div className="bg-surface-container-lowest border border-outline-variant/50 shadow-sm rounded-2xl p-6 flex flex-col h-full hover:shadow-md hover:border-primary/30 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-[24px]">rule</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">Verification Queue</h3>
              <p className="font-body-md text-sm text-on-surface-variant flex-grow mb-6 leading-relaxed">
                Review and approve new driver applications and high-value freight manifests. Enforce compliance and maintain network integrity.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">person</span>
                    <span className="font-label-md text-xs font-semibold text-on-surface font-mono">Driver App: DRV-882</span>
                  </div>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary font-label-sm text-[10px] font-bold rounded uppercase">
                    Pending
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant/30">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">inventory_2</span>
                    <span className="font-label-md text-xs font-semibold text-on-surface font-mono">Manifest: MNF-901</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 font-label-sm text-[10px] font-bold rounded uppercase">
                    Requires Review
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Dispute Management */}
            <div className="bg-surface-container-lowest border border-outline-variant/50 shadow-sm rounded-2xl p-6 flex flex-col h-full hover:shadow-md hover:border-primary/30 transition-all duration-300 group md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="material-symbols-outlined text-primary text-[24px]">gavel</span>
              </div>
              <h3 className="font-headline-md text-lg font-bold text-on-surface mb-2">Dispute Management</h3>
              <p className="font-body-md text-sm text-on-surface-variant flex-grow mb-6 leading-relaxed">
                Handle exceptions, delivery delays, and poster-driver conflicts with full audit trails and geofence data playback.
              </p>
              <div className="w-full relative h-24 rounded-lg overflow-hidden border border-outline-variant/30 flex items-center justify-center bg-surface-container-low">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-container to-surface-container-low"></div>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-error-red shadow-[0_0_10px_#ba1a1a] animate-ping"></div>
                <div className="absolute w-2.5 h-2.5 rounded-full bg-error-red"></div>
                <div className="absolute w-32 border-t border-dashed border-error/50 right-1/2 top-1/2 -translate-y-1/2"></div>
                <div className="relative z-10 px-3 py-1 bg-surface-white/90 backdrop-blur border border-error/30 rounded shadow-sm font-label-sm text-[10px] font-bold text-error-red font-mono uppercase tracking-wider">
                  Incident Detected
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
