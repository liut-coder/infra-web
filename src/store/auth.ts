import { create } from "zustand";
import type { AuthSession, UserProfile } from "@/types/auth";

const STORAGE_KEY = "nax-admin-auth";

interface AuthState {
  token: string;
  user?: UserProfile;
  login: (session: AuthSession) => void;
  logout: () => void;
  hydrate: () => void;
  setToken: (token: string) => void;
  setUser: (user: UserProfile) => void;
  hasPermission: (permission?: string | string[]) => boolean;
}

function readSession(): AuthSession | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : undefined;
  } catch {
    return undefined;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: "",
  login: (session) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    set({ token: session.token, user: session.user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: "", user: undefined });
  },
  hydrate: () => {
    const session = readSession();
    if (session) set({ token: session.token, user: session.user });
  },
  setToken: (token) => {
    const current = readSession();
    if (current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, token }));
    }
    set({ token });
  },
  setUser: (user) => {
    const current = readSession();
    if (current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, user }));
    }
    set({ user });
  },
  hasPermission: (permission) => {
    if (!permission) return true;
    const user = get().user;
    if (!user) return false;
    if (user.permissions.includes("*")) return true;
    const required = Array.isArray(permission) ? permission : [permission];
    return required.every((item) => user.permissions.includes(item));
  },
}));

export function getAuthToken() {
  return useAuthStore.getState().token || readSession()?.token || "";
}

export function updateAccessToken(token: string) {
  useAuthStore.getState().setToken(token);
}

export function logout() {
  useAuthStore.getState().logout();
}
