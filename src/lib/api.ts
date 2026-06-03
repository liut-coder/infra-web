import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";
import { appConfig } from "@/config/app";
import { getAuthToken, logout, updateAccessToken } from "@/store/auth";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  requestId?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PageResult<T> {
  items: T[];
  pagination: PageMeta;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  q?: string;
}

export class ApiClientError extends Error {
  code: string;
  status?: number;
  requestId?: string;

  constructor(
    message: string,
    options: { code?: string; status?: number; requestId?: string } = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code || "API_ERROR";
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Request-Id"] =
    crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorEnvelope>) => {
    const status = error.response?.status;
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const url = originalRequest?.url || "";
    const canRefresh =
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/refresh");

    if (canRefresh) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken();
        const token = await refreshPromise;
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };
        return apiClient(originalRequest);
      } catch {
        logout();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      } finally {
        refreshPromise = null;
      }
    }

    if (status === 401) {
      logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(toApiError(error));
  },
);

async function refreshAccessToken() {
  const response =
    await apiClient.post<ApiEnvelope<{ accessToken: string; user?: unknown }>>(
      "/auth/refresh",
    );
  const token = response.data.data.accessToken;
  updateAccessToken(token);
  return token;
}

function toApiError(error: AxiosError<ApiErrorEnvelope>) {
  const data = error.response?.data;
  return new ApiClientError(
    data?.error?.message || error.message || "Request failed",
    {
      code: data?.error?.code,
      status: error.response?.status,
      requestId: data?.requestId,
    },
  );
}

function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success) {
    throw new ApiClientError(envelope.message || "Request failed");
  }
  return envelope.data;
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig) {
  const response = await apiClient.get<ApiEnvelope<T>>(url, config);
  return unwrap(response.data);
}

export async function apiPost<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  const response = await apiClient.post<ApiEnvelope<T>>(url, body, config);
  return unwrap(response.data);
}

export async function apiPatch<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  const response = await apiClient.patch<ApiEnvelope<T>>(url, body, config);
  return unwrap(response.data);
}

export async function apiPut<T, TBody = unknown>(
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig,
) {
  const response = await apiClient.put<ApiEnvelope<T>>(url, body, config);
  return unwrap(response.data);
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig) {
  const response = await apiClient.delete<ApiEnvelope<T>>(url, config);
  return unwrap(response.data);
}

export function createCrudApi<TEntity, TCreate, TUpdate = Partial<TCreate>>(
  basePath: string,
) {
  return {
    list: (params?: ListQuery) =>
      apiGet<PageResult<TEntity>>(basePath, { params }),
    get: (id: string) => apiGet<TEntity>(`${basePath}/${id}`),
    create: (body: TCreate) => apiPost<TEntity, TCreate>(basePath, body),
    update: (id: string, body: TUpdate) =>
      apiPatch<TEntity, TUpdate>(`${basePath}/${id}`, body),
    remove: (id: string) => apiDelete<{ deleted: true }>(`${basePath}/${id}`),
  };
}

export function asErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "操作失败";
}

export type ApiClient = AxiosInstance;
