export interface UserRecord {
  id: string;
  email: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: RoleSummary[];
}

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
}

export interface RoleRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: PermissionRecord[];
}

export interface PermissionRecord {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
  createdAt: string;
}

export interface SettingRecord {
  id: string;
  key: string;
  value: unknown;
  description: string;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface FileRecord {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  path: string;
  uploadedBy?: string | null;
  createdAt: string;
}

export interface DictionaryItemRecord {
  id: string;
  dictionaryId: string;
  label: string;
  value: string;
  color?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DictionaryRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  items?: DictionaryItemRecord[];
}

export interface CreateUserPayload {
  email: string;
  username: string;
  displayName: string;
  password: string;
  roleIds: string[];
}

export interface UpdateUserPayload {
  email?: string;
  username?: string;
  displayName?: string;
  password?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export interface CreateRolePayload {
  key: string;
  name: string;
  description: string;
  permissionIds: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateSettingPayload {
  value: unknown;
  description?: string;
}

export interface CreateDictionaryPayload {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface UpdateDictionaryPayload {
  name?: string;
  description?: string;
  isEnabled?: boolean;
}

export interface CreateDictionaryItemPayload {
  label: string;
  value: string;
  color?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  meta: Record<string, unknown>;
}

export interface UpdateDictionaryItemPayload {
  label?: string;
  value?: string;
  color?: string | null;
  sortOrder?: number;
  isEnabled?: boolean;
  meta?: Record<string, unknown>;
}
