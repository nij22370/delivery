"use client";

import { useAuth } from "@/hooks/useAuth";

interface AdminHeaderProps {
  title?: string;
  onToggleMobile?: () => void;
}

export default function AdminHeader({
  title = "Platform Overview",
  onToggleMobile,
}: AdminHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 md:left-64 right-0 z-30 h-16 bg-surface-white border-b border-outline-variant flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3">
        {onToggleMobile && (
          <button
            type="button"
            onClick={onToggleMobile}
            className="p-2 rounded-lg text-secondary hover:bg-surface-container md:hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}
        <h1 className="text-lg md:text-xl font-bold text-on-surface tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          className="relative flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error-red" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-on-surface leading-tight">
              {user?.name || "Admin User"}
            </p>
            <p className="text-[10px] font-semibold text-secondary uppercase tracking-wider">
              {user?.role || "admin"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
