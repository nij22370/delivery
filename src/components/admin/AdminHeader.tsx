"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { signOut } from "next-auth/react";
import { logoutUser } from "@/api/apis/auth/authApi";
import ThemeToggle from "@/components/ui/ThemeToggle";
import NotificationsPanel, {
  NotificationsBellIcon,
  UnreadBadge,
  useNotificationsBellState,
} from "@/components/ui/NotificationsPanel";

interface AdminHeaderProps {
  title?: string;
  onToggleMobile?: () => void;
}

export default function AdminHeader({
  title = "Platform Overview",
  onToggleMobile,
}: AdminHeaderProps) {
  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      signOut({ redirect: true, callbackUrl: "/login" });
    }
  }, []);

  return (
    <HeaderContent
      title={title}
      onToggleMobile={onToggleMobile}
      onLogout={handleLogout}
    />
  );
}

interface HeaderContentProps {
  title: string;
  onToggleMobile?: () => void;
  onLogout: () => void;
}

function HeaderContent({ title, onToggleMobile, onLogout }: HeaderContentProps) {
  const { unreadCount } = useNotificationsBellState();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleToggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

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

      <div className="flex items-center gap-2 md:gap-3">
        <Link
          href="/admin/settings"
          className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </Link>
        <Link
          href="/faq"
          className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="FAQ"
        >
          <span className="material-symbols-outlined text-xl">help</span>
        </Link>
        <Link
          href="/support"
          className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Support"
        >
          <span className="material-symbols-outlined text-xl">support_agent</span>
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleNotifications}
            className="relative flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
          >
            <NotificationsBellIcon />
            <UnreadBadge count={unreadCount} />
          </button>
          <NotificationsPanel
            isOpen={isNotificationsOpen}
            onClose={handleCloseNotifications}
          />
        </div>
        <ThemeToggle />
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center w-10 h-10 rounded-full text-secondary hover:text-error-red hover:bg-surface-container transition-colors cursor-pointer"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </header>
  );
}
