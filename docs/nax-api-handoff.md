# NAX API Frontend Handoff

> 历史后端适配记录。当前项目级交接请优先看 `docs/handoff.md`，日常使用请看 `docs/user-manual.md`。

Backend repo: `https://github.com/liut-coder/nax-api`
Backend branch: `main`
Latest backend commit when this document was written: `8b3960d`
Swagger: `http://31.57.218.242:3000/docs`
API base: `http://31.57.218.242:3000/api/v1`

Default admin:

```text
account: admin@example.com
password: ChangeMe123!
```

Frontend env for direct cloud-server联调:

```env
VITE_API_BASE_URL=http://31.57.218.242:3000/api/v1
```

## Must Adapt

### 1. User status

Backend now returns and accepts:

```ts
status: "active" | "disabled" | "locked" | "pending"
```

Frontend currently mainly uses `isActive`. Update:

- `src/features/admin/types.ts`
- `src/pages/admin/AdminUsersPage.tsx`
- user create/update payloads
- user filters and status badges

`isActive` still exists for compatibility, but `status` should drive the UI.

### 2. System settings metadata

Settings now include:

```ts
group: string
type: "string" | "number" | "boolean" | "json" | "url" | "color"
isPublic: boolean
isEditable: boolean
```

Update:

- `SettingRecord`
- `UpdateSettingPayload`
- settings table columns
- settings editor form
- group filter

### 3. Dashboard overview

Prefer replacing multiple dashboard count requests with:

```http
GET /api/v1/dashboard/overview
```

Response includes:

- `counts.users`
- `counts.activeUsers`
- `counts.roles`
- `counts.files`
- `recentLogins24h`
- `recentAuditLogs`
- `status`
- `generatedAt`

### 4. Dynamic menus

Backend exposes:

```http
GET /api/v1/auth/menus
GET /api/v1/menus/tree
```

Current frontend sidebar is hardcoded in `src/components/layout/AppSidebar.tsx`.

Recommended next step:

- after login or app bootstrap, call `/auth/menus`
- store menu tree in auth/ui store
- render sidebar from backend menu tree
- keep current hardcoded sidebar as fallback

### 5. Profile and password

New endpoints:

```http
PATCH /api/v1/auth/profile
POST /api/v1/auth/change-password
```

Suggested UI:

- profile drawer or page
- change password modal under header user menu

Payloads:

```ts
PATCH /auth/profile
{
  displayName: string
}

POST /auth/change-password
{
  currentPassword: string
  newPassword: string
}
```

### 6. Files

New endpoints:

```http
POST /api/v1/files/upload
GET /api/v1/files?category=branding
GET /api/v1/public/files/:id
GET /api/v1/files/:id/download
DELETE /api/v1/files/:id
```

Update `AdminFilesPage`:

- add download action
- add delete action with confirm dialog
- add optional category filter, at least `branding` and `attachment`
- invalidate `["admin", "files"]` after delete

### 7. Audit logs

New endpoints:

```http
GET /api/v1/audit-logs/:id
GET /api/v1/audit-logs/export.csv
```

Update `AdminAuditLogsPage`:

- add detail drawer
- add CSV export button
- support date range filters: `createdAtFrom`, `createdAtTo`

### 8. Session management

Current-user session endpoints:

```http
GET /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id
POST /api/v1/auth/logout-all
```

Admin session endpoints:

```http
GET /api/v1/sessions
DELETE /api/v1/sessions/:id
```

Suggested page:

```text
/admin/sessions
permission: session:list
```

### 9. Base info

Public frontend bootstrap endpoint:

```http
GET /api/v1/system/base-info
```

Use it for:

- app title
- login title/subtitle
- logo URL
- admin logo URL
- login background image
- home background image
- favicon
- project description
- copyright
- support URL
- version label
- default theme

Current settings are editable through `/settings` with keys:

- `base.name`
- `base.logoUrl`
- `base.adminName`
- `base.adminLogoUrl`
- `base.loginBackgroundUrl`
- `base.homeBackgroundUrl`
- `base.faviconUrl`
- `base.version`
- `base.loginTitle`
- `base.loginSubtitle`
- `base.projectDescription`
- `base.copyright`
- `base.supportUrl`
- `base.defaultLanguage`
- `base.theme`

### 10. Personalization settings

Add an entry under system settings, for example:

```text
System Settings -> Personalization
permission: setting:list + setting:update
```

Recommended fields:

```ts
type PersonalizationForm = {
  name: string;
  adminName: string;
  logoUrl: string;
  adminLogoUrl: string;
  loginBackgroundUrl: string;
  homeBackgroundUrl: string;
  faviconUrl: string;
  loginTitle: string;
  loginSubtitle: string;
  projectDescription: string;
  copyright: string;
  supportUrl: string;
  theme: {
    primaryColor: string;
    mode: "light" | "dark";
  };
};
```

Branding asset upload flow:

1. Upload with `POST /api/v1/files/upload` using `FormData`.
2. Required form field: `file`.
3. Add metadata fields: `category=branding`, `isPublic=true`.
4. Backend returns `data.id`.
5. Build public URL: `${API_BASE_URL}/public/files/${id}`.
6. Save the URL to the matching setting with `PUT /api/v1/settings/:key`.
7. Re-read `GET /api/v1/system/base-info` and apply the latest values.

Example upload:

```ts
const formData = new FormData();
formData.append("file", file);
formData.append("category", "branding");
formData.append("isPublic", "true");

const uploaded = await api.post("/files/upload", formData);
const publicUrl = `${API_BASE_URL}/public/files/${uploaded.data.id}`;
```

Example setting update:

```http
PUT /api/v1/settings/base.loginBackgroundUrl
Content-Type: application/json

{
  "value": "http://31.57.218.242:3000/api/v1/public/files/<fileId>",
  "group": "base",
  "type": "url",
  "isPublic": true,
  "isEditable": true,
  "description": "Login page background image URL"
}
```

Frontend notes:

- Login page should fetch `/system/base-info` before render, because these fields are public.
- Authenticated layout can use the same base-info response after login.
- Keep a local fallback for logo/title/background so the app remains usable before settings are seeded.
- Favicon update can be done by replacing or creating `<link rel="icon">`.
- Existing generic settings table can remain, but personalization should be a curated form because images/theme need dedicated controls.

## Already Mostly Aligned

These current frontend modules are mostly aligned and need only small verification:

- dictionaries list/detail/item create/update/delete
- users/roles/permissions basic pages
- files list/upload
- audit list
- settings basic key/value editor
- auth login/me/logout

## Query Standard

List endpoints now accept the common query fields:

```ts
page?: number
pageSize?: number
sortBy?: string
sortOrder?: "asc" | "desc"
createdAtFrom?: string
createdAtTo?: string
q?: string
```

Update shared `ListQuery` in `src/lib/api.ts` if any of these fields are missing.

## Backend Permissions Added

New/important permissions:

```text
menu:list
menu:create
menu:update
menu:delete
dictionary:list
dictionary:read
dictionary:create
dictionary:update
dictionary:delete
file:delete
session:list
session:revoke
dashboard:read
generator:preview
```

Frontend route guards should use these permissions.

## Recommended Frontend Work Order

1. Update types and API wrappers.
2. Update user status and settings metadata UI.
3. Switch dashboard to `/dashboard/overview`.
4. Add file download/delete and audit detail/export.
5. Add profile/change-password UI.
6. Add sessions page.
7. Add dynamic sidebar from `/auth/menus`.
8. Add base-info bootstrap for login/app branding.

## Verification Checklist

After frontend changes:

```text
Login works with admin@example.com / ChangeMe123!
Refresh cookie works over HTTP when COOKIE_SECURE=false
Dashboard loads from /dashboard/overview
Sidebar can render /auth/menus or falls back safely
User create/update can set status
Settings can edit group/type/public/editable
Dictionaries can manage items
Files can upload/download/delete
Audit logs can view detail/export CSV
Sessions can list/revoke
Swagger remains available at /docs
```
