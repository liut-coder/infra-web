import { create } from "zustand";

type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
}

function initialTheme(): Theme {
  if (localStorage.getItem("nax-theme") === "dark") return "dark";
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("nax-theme", theme);
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  sidebarCollapsed: false,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    applyTheme(next);
    set({ theme: next });
  },
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

export function initTheme() {
  applyTheme(useUiStore.getState().theme);
}
