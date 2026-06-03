# infra-web 交接文档

## 1. 项目定位

`infra-web` 是 `infra-control` 的前端控制台，基于 `nax-admin` 脚手架扩展。

当前三仓分工：

```text
infra-control   inventory 事实源、脚本、生成物、同步状态
nax-api         认证、RBAC、审计、infra-control 白名单 API
infra-web       运维控制台前端
```

前端只通过 `nax-api` 访问数据，不直接读取 YAML、不直接执行脚本。

## 2. 当前能力

已实现页面：

```text
/dashboard                    运维总览
/infra/hosts                  服务器
/infra/services               服务
/infra/billing                续费资产
/infra/domains                域名
/infra/network-profiles       线路画像
/infra/actions                生成任务
/infra/inventory              配置管理
/infra/generated              生成物
/infra/discovery              发现合并

/admin/users                  用户管理
/admin/roles                  角色管理
/admin/permissions            权限字典
/admin/settings               系统设置
/admin/dictionaries           数据字典
/admin/audit-logs             审计日志
/admin/files                  文件管理
```

Infra 页面能力：

- 展示服务器、服务、续费、域名和线路画像。
- 读取并展示生成物列表和内容。
- 编辑白名单 inventory 文件。
- 保存 inventory 后由后端自动校验并刷新生成物。
- 运行后端白名单动作。
- 高风险动作需要输入确认令牌。
- 查看最近 infra 审计记录。
- mock 模式下可以不启动后端演示页面和 smoke。

## 3. 技术栈

```text
React 18
Vite
TypeScript
Tailwind CSS
React Router
TanStack Query
TanStack Table
React Hook Form
Zod
Zustand
Axios
Lucide React
Apache ECharts
Playwright
```

## 4. 关键配置

环境变量：

```env
VITE_APP_NAME=Infra Control
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
VITE_USE_MOCK=false
VITE_LOGIN_BACKGROUND=/images/login/login-bg-cloud-city.png
```

说明：

- `VITE_API_BASE_URL=/api/v1` 适合本地 Vite 代理和同域 nginx 反代。
- `VITE_API_PROXY_TARGET` 只影响本地 `npm run dev`。
- `VITE_USE_MOCK=true` 时 infra API 使用前端内置 demo fallback，不依赖真实后端。

## 5. 重要目录

```text
src/app/router.tsx                 路由
src/components/layout/AppSidebar.tsx 侧边栏导航
src/features/infra/api.ts          infra API 封装和 mock fallback
src/features/infra/types.ts        infra 类型
src/pages/infra/                   infra 页面
src/lib/api.ts                     Axios、token 注入、refresh、响应解包
src/store/auth.ts                  登录态
scripts/smoke.mjs                  Playwright smoke
nginx.conf                         生产 nginx SPA + API 反代
```

## 6. 本地启动

安装依赖：

```bash
npm install
```

创建 `.env`：

```bash
cp .env.example .env
```

启动后端：

```bash
cd /root/nax-api
npm run dev
```

启动前端：

```bash
cd /root/infra-web
npm run dev
```

默认开发地址：

```text
http://127.0.0.1:5174
```

默认账号：

```text
admin@example.com
ChangeMe123!
```

## 7. 与后端/API 的关系

响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "ok",
  "requestId": "req_xxx"
}
```

前端 `src/lib/api.ts` 会解包 `data`，业务 API 函数应返回业务对象，不返回原始 Axios response。

主要后端接口：

```text
GET /api/v1/infra/overview
GET /api/v1/infra/hosts
GET /api/v1/infra/services
GET /api/v1/infra/billing
GET /api/v1/infra/domains
GET /api/v1/infra/network-profiles
GET /api/v1/infra/generated
GET /api/v1/infra/generated/:name
GET /api/v1/infra/inventory
GET /api/v1/infra/inventory/:name
PUT /api/v1/infra/inventory/:name
GET /api/v1/infra/actions/catalog
POST /api/v1/infra/actions/run
POST /api/v1/infra/retire/apply
```

## 8. 权限边界

前端路由权限：

```text
infra:read    服务器、服务、续费、域名、线路画像、生成物
infra:write   配置管理
infra:run     生成任务、发现合并、退役 apply
```

没有权限时会跳转或展示 403。

## 9. 高风险动作

需要确认令牌：

```text
merge-apply                  CONFIRM:merge-apply
sync-uptime-kuma-apply       CONFIRM:sync-uptime-kuma-apply
sync-wallos-apply            CONFIRM:sync-wallos-apply
retire-apply                 CONFIRM:retire-apply:HOST_ID
retire-apply --force         CONFIRM:retire-apply-force:HOST_ID
```

前端按钮会在确认令牌不匹配时保持禁用。后端仍会再次校验令牌。

## 10. 校验和构建

```bash
npm run typecheck
npm run lint
npm run build
```

运行 smoke 前先启动前端和后端：

```bash
npm run smoke
```

可选变量：

```env
SMOKE_BASE_URL=http://127.0.0.1:5174
SMOKE_ACCOUNT=admin@example.com
SMOKE_PASSWORD=ChangeMe123!
```

smoke 覆盖：

- 登录。
- infra 和 admin 主要路由。
- inventory 保存。
- 生成物查看。
- 高风险确认令牌。
- merge apply。
- retire apply。

## 11. Docker 部署

构建并启动：

```bash
docker compose up --build
```

默认访问：

```text
http://localhost:8080
```

当前 nginx 把 `/api/v1/*` 反代到：

```text
http://host.docker.internal:3000/api/v1/*
```

如果 API 不在宿主机 3000 端口，修改 `nginx.conf` 或换成外部反代。

## 12. 接手检查清单

接手当天建议执行：

```bash
cd /root/infra-web
git status --short --branch
npm install
npm run typecheck
npm run lint
npm run build
```

联调检查：

```bash
cd /root/infra-control
python3 scripts/infra_control.py generate --with network,billing,uptime_kuma,wallos,semaphore,retirement,web

cd /root/nax-api
npm run dev

cd /root/infra-web
npm run dev
```

登录后检查：

```text
/dashboard
/infra/hosts
/infra/actions
/infra/inventory
/infra/generated
```

## 13. 风险点

- `VITE_USE_MOCK=true` 只适合演示和前端开发，不代表真实 inventory。
- 高风险按钮只是前端第一层保护，真正权限和确认在后端。
- `infra:write` 保存后会触发后端 validate/generate，失败时后端会恢复备份。
- Docker 镜像里的 API 地址由 `nginx.conf` 固定，变更后端地址时必须同步修改。
- 侧边栏当前仍是前端硬编码，后续可接 `/auth/menus` 动态菜单。
