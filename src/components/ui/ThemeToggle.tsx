"use client";

import { useCallback, useMemo } from "react";
import { useThemeStore } from "@/store/themeStore";

const SUN_ICON = "light_mode";
const MOON_ICON = "dark_mode";
const TOOLTIP = "Toggle theme";
const ARIA_LABEL = "Toggle theme";

const ICON_BUTTON_CLASS =
  "flex items-center justify-center w-10 h-10 rounded-full text-secondary " +
  "hover:bg-surface-container-high transition-colors cursor-pointer";

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const isDark = theme === "dark";
  const iconName = useMemo(() => (isDark ? SUN_ICON : MOON_ICON), [isDark]);

  const handleClick = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return (
    <button
      type="button"
      onClick={handleClick}
      title={TOOLTIP}
      aria-label={ARIA_LABEL}
      className={ICON_BUTTON_CLASS}
    >
      <span className="material-symbols-outlined text-xl">{iconName}</span>
    </button>
  );
}
