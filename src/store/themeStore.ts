// themeStore.ts - Global theme state. localStorage / document access is
// restricted to client-side actions (initTheme, toggleTheme, setTheme) — the
// store's initial state is always "light" so the server-rendered HTML and
// the client first paint agree, preventing a hydration mismatch.

import { create } from "zustand";

const STORAGE_KEY = "swiftship-theme";
const HTML_THEME_ATTR = "theme";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  initTheme: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readPersistedTheme(): Theme | null {
  if (!isBrowser()) return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // localStorage unavailable (private mode) — fall through.
  }
  return null;
}

function applyTheme(theme: Theme): void {
  if (!isBrowser()) return;
  document.documentElement.dataset[HTML_THEME_ATTR] = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Swallow storage errors (quota / disabled cookies) — in-memory state still
    // reflects the toggle for the current session.
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",
  initTheme: () => {
    const persisted = readPersistedTheme();
    if (persisted && persisted !== get().theme) {
      if (isBrowser()) {
        document.documentElement.dataset[HTML_THEME_ATTR] = persisted;
      }
      set({ theme: persisted });
    } else {
      // Make sure the DOM matches whatever the store says (no-op on first run).
      if (isBrowser()) {
        document.documentElement.dataset[HTML_THEME_ATTR] = get().theme;
      }
    }
  },
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
