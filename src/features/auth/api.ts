import { appConfig } from "@/config/app";
import { apiGet, apiPost } from "@/lib/api";
import { mockUser } from "@/mocks/data";
import type { AuthSession, UserProfile } from "@/types/auth";

export interface LoginPayload {
  account: string;
  password: string;
}

interface BackendUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  permissions: string[];
}

interface BackendLoginResponse {
  accessToken: string;
  user: BackendUser;
}

function toUserProfile(user: BackendUser): UserProfile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    name: user.displayName || user.username,
    email: user.email,
    role: user.permissions.includes("role:delete") ? "Administrator" : "User",
    permissions: user.permissions,
    avatar: (user.displayName || user.username || "NA")
      .slice(0, 2)
      .toUpperCase(),
  };
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  if (appConfig.useMock) {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return {
      token: `mock-token-${payload.account}`,
      user: {
        ...mockUser,
        email: payload.account.includes("@") ? payload.account : mockUser.email,
        username: payload.account.includes("@")
          ? mockUser.username
          : payload.account,
      },
    };
  }

  const response = await apiPost<BackendLoginResponse, LoginPayload>(
    "/auth/login",
    payload,
  );
  return {
    token: response.accessToken,
    user: toUserProfile(response.user),
  };
}

export async function getCurrentUser(): Promise<UserProfile> {
  if (appConfig.useMock) {
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    return mockUser;
  }

  const user = await apiGet<BackendUser>("/auth/me");
  return toUserProfile(user);
}

export async function logoutSession() {
  if (appConfig.useMock) return { loggedOut: true };
  return apiPost<{ loggedOut: true }>("/auth/logout");
}
