# Infra Web

`infra-control` 的前端工作区，当前基于 `nax-admin` 脚手架扩展。项目默认对接 NAX API 的 `/api/v1`，提供服务器、服务、域名、续费、线路画像、生成任务、配置管理和生成物查看等运维控制台页面。

交接和使用文档：

```text
docs/handoff.md       前端交接文档
docs/user-manual.md   前端使用说明书
docs/nax-api-handoff.md 历史后端适配记录
```

## Stack

- React / Vite / TypeScript
- Tailwind CSS / shadcn/ui-style primitives / Lucide React
- React Router / TanStack Query / TanStack Table
- React Hook Form / Zod / Zustand / Axios
- i18next / Apache ECharts

## Built-in Admin API Modules

- Auth: login, logout, token injection, refresh cookie, 401 redirect
- RBAC: route guard and `PermissionGate`
- Users: list, create, edit, delete, role binding
- Roles: list, create, edit, delete, permission binding
- Permissions: read-only permission dictionary
- Settings: list and update typed setting values
- Data dictionaries: dictionary CRUD, item CRUD, localized display labels
- Audit logs: list and filter audit records
- Files: list and upload files

## Routes

- `/login`
- `/dashboard`
- `/infra/hosts`
- `/infra/services`
- `/infra/billing`
- `/infra/domains`
- `/infra/network-profiles`
- `/infra/actions`
- `/infra/inventory`
- `/infra/generated`
- `/infra/discovery`
- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/settings`
- `/admin/dictionaries`
- `/admin/audit-logs`
- `/admin/files`
- `/examples/table`
- `/examples/form`
- `/examples/detail`
- `/examples/wizard`
- `/403`
- `/404`

## Backend Contract

Default API base:

```env
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
```

The backend response envelope is:

```json
{
  "success": true,
  "data": {},
  "message": "ok",
  "requestId": "req_xxx"
}
```

Paged endpoints return:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## Development

```bash
npm install
npm run dev
```

Default backend seed account:

```text
admin@example.com
ChangeMe123!
```

Mock mode is opt-in:

```env
VITE_USE_MOCK=true
```

## Smoke Test

Start the frontend and backend first, then run:

```bash
npm run smoke
```

Optional environment variables:

```env
SMOKE_BASE_URL=http://127.0.0.1:5181
SMOKE_ACCOUNT=admin@example.com
SMOKE_PASSWORD=ChangeMe123!
```

The smoke test verifies login and these reusable routes:

- `/dashboard`
- `/infra/hosts`
- `/infra/services`
- `/infra/billing`
- `/infra/domains`
- `/infra/network-profiles`
- `/infra/actions`
- `/infra/inventory`
- `/infra/generated`
- `/infra/discovery`
- `/admin/users`
- `/admin/roles`
- `/admin/permissions`
- `/admin/settings`
- `/admin/dictionaries`
- `/admin/audit-logs`
- `/admin/files`
- `/examples/table`

## Template Reuse

For a new project:

1. Keep `src/lib/api.ts`, `src/store/auth.ts`, layouts, guards, and shared components.
2. Keep `/admin/*` if the backend uses the same scaffold API.
3. Copy `/examples/*` to your own feature folder and replace mock data with business API calls.
4. Add business routes in `src/app/router.tsx`.
5. Add navigation items in `src/components/layout/AppSidebar.tsx`.
6. Add typed API functions under `src/features/<module>/api.ts`.
7. Add a route marker to `scripts/smoke.mjs` for each critical business page.

Recommended business module shape:

```text
src/features/orders/
  api.ts
  types.ts
src/pages/orders/
  OrdersPage.tsx
  OrderDetailPage.tsx
```

The API layer should return unwrapped `data` values from `src/lib/api.ts`, not raw Axios responses.

## Login Background

登录背景图放在：

```text
public/images/login/
```

可以通过 `src/config/app.ts` 或环境变量替换：

```env
VITE_LOGIN_BACKGROUND=/images/login/login-bg-cloud-city.png
```

## Build

```bash
npm run typecheck
npm run lint
npm run build
```

## Docker

```bash
docker compose up --build
```

The included nginx config serves the SPA and proxies `/api/v1/*` to:

```text
http://host.docker.internal:3000/api/v1/*
```

When deploying with a different backend host, update `nginx.conf` or provide your own reverse proxy.
