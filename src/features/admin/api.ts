import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  createCrudApi,
  type ListQuery,
  type PageResult,
} from "@/lib/api";
import { appConfig } from "@/config/app";
import type {
  AuditLogRecord,
  CreateDictionaryItemPayload,
  CreateDictionaryPayload,
  CreateRolePayload,
  CreateUserPayload,
  DictionaryItemRecord,
  DictionaryRecord,
  FileRecord,
  PermissionRecord,
  RoleRecord,
  SettingRecord,
  UpdateDictionaryItemPayload,
  UpdateDictionaryPayload,
  UpdateRolePayload,
  UpdateSettingPayload,
  UpdateUserPayload,
  UserRecord,
} from "./types";

const now = new Date().toISOString();

const demoPermissions: PermissionRecord[] = [
  { id: "perm-user-list", key: "user:list", resource: "user", action: "list", description: "查看用户列表", createdAt: now },
  { id: "perm-user-create", key: "user:create", resource: "user", action: "create", description: "创建用户", createdAt: now },
  { id: "perm-role-list", key: "role:list", resource: "role", action: "list", description: "查看角色列表", createdAt: now },
  { id: "perm-role-create", key: "role:create", resource: "role", action: "create", description: "创建角色", createdAt: now },
  { id: "perm-dict-list", key: "dictionary:list", resource: "dictionary", action: "list", description: "查看数据字典", createdAt: now },
  { id: "perm-setting-list", key: "setting:list", resource: "setting", action: "list", description: "查看系统设置", createdAt: now },
  { id: "perm-infra-read", key: "infra:read", resource: "infra", action: "read", description: "查看 infra-control 数据", createdAt: now },
  { id: "perm-infra-run", key: "infra:run", resource: "infra", action: "run", description: "执行 infra-control 白名单动作", createdAt: now },
];

const demoRoles: RoleRecord[] = [
  {
    id: "role-admin",
    key: "admin",
    name: "Administrator",
    description: "拥有所有后台能力的系统管理员",
    isSystem: true,
    createdAt: now,
    updatedAt: now,
    permissions: demoPermissions,
  },
  {
    id: "role-ops",
    key: "ops",
    name: "Ops Engineer",
    description: "可查看和执行 infra-control 运维闭环",
    isSystem: false,
    createdAt: now,
    updatedAt: now,
    permissions: demoPermissions.filter((item) => item.resource === "infra" || item.action === "list"),
  },
];

const demoUsers: UserRecord[] = [
  {
    id: "user-admin",
    email: "admin@example.com",
    username: "admin",
    displayName: "Administrator",
    isActive: true,
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
    roles: [{ id: "role-admin", key: "admin", name: "Administrator" }],
  },
  {
    id: "user-ops",
    email: "ops@example.com",
    username: "ops",
    displayName: "Ops Engineer",
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
    roles: [{ id: "role-ops", key: "ops", name: "Ops Engineer" }],
  },
];

const demoDictionaries: DictionaryRecord[] = [
  {
    id: "dict-host-state",
    key: "infra.host_state",
    name: "主机状态",
    description: "infra-control 主机生命周期状态",
    isSystem: true,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
    items: [
      { id: "dict-host-new", dictionaryId: "dict-host-state", label: "新建", value: "new", color: "blue", sortOrder: 10, isEnabled: true, meta: {}, createdAt: now, updatedAt: now },
      { id: "dict-host-managed", dictionaryId: "dict-host-state", label: "托管中", value: "managed", color: "green", sortOrder: 20, isEnabled: true, meta: {}, createdAt: now, updatedAt: now },
      { id: "dict-host-draining", dictionaryId: "dict-host-state", label: "退役准备", value: "draining", color: "amber", sortOrder: 30, isEnabled: true, meta: {}, createdAt: now, updatedAt: now },
    ],
  },
  {
    id: "dict-sync-risk",
    key: "infra.action_risk",
    name: "动作风险",
    description: "白名单动作风险等级，用于按钮和确认弹窗",
    isSystem: false,
    isEnabled: true,
    createdAt: now,
    updatedAt: now,
    items: [
      { id: "dict-risk-low", dictionaryId: "dict-sync-risk", label: "低风险", value: "low", color: "green", sortOrder: 10, isEnabled: true, meta: {}, createdAt: now, updatedAt: now },
      { id: "dict-risk-high", dictionaryId: "dict-sync-risk", label: "高风险", value: "high", color: "red", sortOrder: 20, isEnabled: true, meta: { confirmation: true }, createdAt: now, updatedAt: now },
    ],
  },
];

const demoSettings: SettingRecord[] = [
  { id: "setting-api", key: "api.mode", value: "demo-fallback", description: "后端不可用时前端使用本地演示数据", updatedBy: "system", createdAt: now, updatedAt: now },
  { id: "setting-theme", key: "ui.theme", value: "glass", description: "白色毛玻璃控制台主题", updatedBy: "system", createdAt: now, updatedAt: now },
];

const demoAuditLogs: AuditLogRecord[] = [
  {
    id: "audit-infra-run",
    actorUserId: "user-admin",
    action: "run",
    resource: "infra_action",
    resourceId: "discover-komari",
    ipAddress: "127.0.0.1",
    userAgent: "demo",
    metadata: {
      exitCode: 0,
      highRisk: false,
      confirmationProvided: false,
      artifacts: ["generated/komari/hosts.discovered.yml"],
      stdoutTail: "discovered 2 nodes",
    },
    createdAt: now,
  },
  {
    id: "audit-infra-save",
    actorUserId: "user-ops",
    action: "save",
    resource: "infra_inventory",
    resourceId: "hosts",
    ipAddress: "127.0.0.1",
    userAgent: "demo",
    metadata: { file: "inventory/hosts.yml", backupFile: "inventory/hosts.yml.bak-demo", bytes: 4096 },
    createdAt: now,
  },
  {
    id: "audit-infra-retire",
    actorUserId: "user-admin",
    action: "retire_apply",
    resource: "infra_host",
    resourceId: "us-01",
    ipAddress: "127.0.0.1",
    userAgent: "demo",
    metadata: { exitCode: 0, highRisk: true, confirmationProvided: true, artifacts: ["inventory/hosts.yml", "inventory/billing.yml"] },
    createdAt: now,
  },
];

const demoFiles: FileRecord[] = [
  { id: "file-network", originalName: "network.md", storedName: "network.md", mimeType: "text/markdown", sizeBytes: 4096, path: "generated/reports/network.md", uploadedBy: "system", createdAt: now },
  { id: "file-web", originalName: "infra-data.json", storedName: "infra-data.json", mimeType: "application/json", sizeBytes: 12288, path: "generated/web/infra-data.json", uploadedBy: "system", createdAt: now },
];

function pageResult<T extends { id: string }>(items: T[], params?: ListQuery): PageResult<T> {
  const q = params?.q?.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => JSON.stringify(item).toLowerCase().includes(q))
    : items;
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  return {
    items: filtered.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    },
  };
}

async function withDemo<T>(request: () => Promise<T>, fallback: () => T): Promise<T> {
  if (appConfig.useMock) {
    return fallback();
  }

  return await request();
}

export interface HealthStatus {
  status: string;
  uptime: number;
  timestamp: string;
}

export function getHealth() {
  return withDemo(() => apiGet<HealthStatus>("/health/"), () => ({
    status: "demo",
    uptime: 0,
    timestamp: now,
  }));
}

const remoteUsersApi = createCrudApi<UserRecord, CreateUserPayload, UpdateUserPayload>("/users");

export const usersApi = {
  list: (params?: ListQuery) => withDemo(() => remoteUsersApi.list(params), () => pageResult(demoUsers, params)),
  get: (id: string) => withDemo(() => remoteUsersApi.get(id), () => demoUsers.find((item) => item.id === id) ?? demoUsers[0]),
  create: (body: CreateUserPayload) => withDemo(() => remoteUsersApi.create(body), () => ({
    id: `demo-user-${Date.now()}`,
    email: body.email,
    username: body.username,
    displayName: body.displayName,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    roles: demoRoles.filter((role) => body.roleIds.includes(role.id)).map(({ id, key, name }) => ({ id, key, name })),
  })),
  update: (id: string, body: UpdateUserPayload) => withDemo(() => remoteUsersApi.update(id, body), () => ({
    ...(demoUsers.find((item) => item.id === id) ?? demoUsers[0]),
    ...body,
    updatedAt: now,
  })),
  remove: (id: string) => withDemo(() => remoteUsersApi.remove(id), () => ({ deleted: true as const })),
};

const remoteRolesApi = createCrudApi<RoleRecord, CreateRolePayload, UpdateRolePayload>("/roles");

export const rolesApi = {
  list: (params?: ListQuery) => withDemo(() => remoteRolesApi.list(params), () => pageResult(demoRoles, params)),
  get: (id: string) => withDemo(() => remoteRolesApi.get(id), () => demoRoles.find((item) => item.id === id) ?? demoRoles[0]),
  create: (body: CreateRolePayload) => withDemo(() => remoteRolesApi.create(body), () => ({
    id: `demo-role-${Date.now()}`,
    key: body.key,
    name: body.name,
    description: body.description,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
    permissions: demoPermissions.filter((item) => body.permissionIds.includes(item.id)),
  })),
  update: (id: string, body: UpdateRolePayload) => withDemo(() => remoteRolesApi.update(id, body), () => ({
    ...(demoRoles.find((item) => item.id === id) ?? demoRoles[0]),
    ...body,
    updatedAt: now,
  })),
  remove: (id: string) => withDemo(() => remoteRolesApi.remove(id), () => ({ deleted: true as const })),
};

const remoteDictionariesApi = createCrudApi<DictionaryRecord, CreateDictionaryPayload, UpdateDictionaryPayload>("/dictionaries");

export const dictionariesApi = {
  list: (params?: ListQuery) => withDemo(() => remoteDictionariesApi.list(params), () => pageResult(demoDictionaries, params)),
  get: (id: string) => withDemo(() => remoteDictionariesApi.get(id), () => demoDictionaries.find((item) => item.id === id) ?? demoDictionaries[0]),
  create: (body: CreateDictionaryPayload) => withDemo(() => remoteDictionariesApi.create(body), () => ({
    id: `demo-dict-${Date.now()}`,
    key: body.key,
    name: body.name,
    description: body.description,
    isEnabled: body.isEnabled,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
    items: [],
  })),
  update: (id: string, body: UpdateDictionaryPayload) => withDemo(() => remoteDictionariesApi.update(id, body), () => ({
    ...(demoDictionaries.find((item) => item.id === id) ?? demoDictionaries[0]),
    ...body,
    updatedAt: now,
  })),
  remove: (id: string) => withDemo(() => remoteDictionariesApi.remove(id), () => ({ deleted: true as const })),
};

export function listDictionaries(
  params?: ListQuery & { enabled?: boolean },
): Promise<PageResult<DictionaryRecord>> {
  return withDemo(() => apiGet<PageResult<DictionaryRecord>>("/dictionaries", { params }), () => {
    const filtered = params?.enabled == null
      ? demoDictionaries
      : demoDictionaries.filter((item) => item.isEnabled === params.enabled);
    return pageResult(filtered, params);
  });
}

export function getDictionaryByKey(key: string) {
  return withDemo(() => apiGet<DictionaryRecord>(`/dictionaries/key/${key}`), () => demoDictionaries.find((item) => item.key === key) ?? demoDictionaries[0]);
}

export function createDictionaryItem(
  dictionaryId: string,
  body: CreateDictionaryItemPayload,
) {
  return withDemo(
    () => apiPost<DictionaryItemRecord, CreateDictionaryItemPayload>(`/dictionaries/${dictionaryId}/items`, body),
    () => ({
      id: `demo-dict-item-${Date.now()}`,
      dictionaryId,
      label: body.label,
      value: body.value,
      color: body.color,
      sortOrder: body.sortOrder,
      isEnabled: body.isEnabled,
      meta: body.meta,
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export function updateDictionaryItem(
  itemId: string,
  body: UpdateDictionaryItemPayload,
) {
  return withDemo(
    () => apiPatch<DictionaryItemRecord, UpdateDictionaryItemPayload>(`/dictionaries/items/${itemId}`, body),
    () => ({
      id: itemId,
      dictionaryId: "demo",
      label: body.label ?? "Demo",
      value: body.value ?? "demo",
      color: body.color,
      sortOrder: body.sortOrder ?? 0,
      isEnabled: body.isEnabled ?? true,
      meta: body.meta ?? {},
      createdAt: now,
      updatedAt: now,
    }),
  );
}

export function deleteDictionaryItem(itemId: string) {
  return withDemo(() => apiDelete<{ deleted: true }>(`/dictionaries/items/${itemId}`), () => ({ deleted: true }));
}

export function listPermissions(
  params?: ListQuery & { resource?: string },
): Promise<PageResult<PermissionRecord>> {
  return withDemo(() => apiGet<PageResult<PermissionRecord>>("/permissions", { params }), () => {
    const filtered = params?.resource
      ? demoPermissions.filter((item) => item.resource === params.resource)
      : demoPermissions;
    return pageResult(filtered, params);
  });
}

export function listSettings(
  params?: ListQuery,
): Promise<PageResult<SettingRecord>> {
  return withDemo(() => apiGet<PageResult<SettingRecord>>("/settings", { params }), () => pageResult(demoSettings, params));
}

export function updateSetting(key: string, body: UpdateSettingPayload) {
  return withDemo(() => apiPut<SettingRecord, UpdateSettingPayload>(`/settings/${key}`, body), () => ({
    id: `setting-${key}`,
    key,
    value: body.value,
    description: body.description ?? "Demo setting",
    updatedBy: "demo",
    createdAt: now,
    updatedAt: now,
  }));
}

export function listAuditLogs(
  params?: ListQuery & {
    actorUserId?: string;
    resource?: string;
    action?: string;
  },
): Promise<PageResult<AuditLogRecord>> {
  return withDemo(() => apiGet<PageResult<AuditLogRecord>>("/audit-logs", { params }), () => {
    const filtered = demoAuditLogs.filter((item) => {
      if (params?.actorUserId && item.actorUserId !== params.actorUserId) return false;
      if (params?.resource && item.resource !== params.resource) return false;
      if (params?.action && item.action !== params.action) return false;
      return true;
    });
    return pageResult(filtered, params);
  });
}

export function listFiles(params?: ListQuery): Promise<PageResult<FileRecord>> {
  return withDemo(() => apiGet<PageResult<FileRecord>>("/files", { params }), () => pageResult(demoFiles, params));
}

export function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return withDemo(() => apiPost<FileRecord, FormData>("/files/upload", formData), () => ({
    id: `demo-file-${Date.now()}`,
    originalName: file.name,
    storedName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    path: `demo/${file.name}`,
    uploadedBy: "demo",
    createdAt: now,
  }));
}
