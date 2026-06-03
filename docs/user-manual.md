# infra-web 使用说明书

## 1. 登录

访问前端：

```text
http://127.0.0.1:5174
```

默认账号：

```text
admin@example.com
ChangeMe123!
```

登录后进入 `/dashboard`。

## 2. 运维总览

页面：

```text
/dashboard
```

用于查看：

- 服务器数量。
- 服务数量。
- 续费资产数量。
- 域名数量。
- 线路画像数量。
- 有限流量机器数量。
- 公开服务数量。
- 关键续费项数量。

数据来自 `nax-api` 的：

```text
GET /api/v1/infra/overview
```

## 3. 查看资产

服务器：

```text
/infra/hosts
```

服务：

```text
/infra/services
```

续费资产：

```text
/infra/billing
```

域名：

```text
/infra/domains
```

线路画像：

```text
/infra/network-profiles
```

这些页面是只读视图。需要修改数据时进入配置管理。

## 4. 配置管理

页面：

```text
/infra/inventory
```

可编辑：

```text
plugins
hosts
services
billing
integrations
domains
network
komari
network-probes
alerts
```

操作流程：

1. 选择左侧配置项。
2. 使用简单表单或高级 YAML 编辑。
3. 点击保存。
4. 等待后端校验和生成完成。
5. 保存成功后，前端会提示已自动刷新正式生成物。

保存失败时，按页面错误信息修正 YAML。后端会尝试恢复保存前备份。

## 5. 生成任务

页面：

```text
/infra/actions
```

常用按钮：

```text
插件状态
校验示例台账
初始化本地配置
生成 Demo
正式生成
拉取 Komari
生成合并预览
确认合并
Uptime Kuma 预览
Uptime Kuma 应用
Wallos 预览
Wallos 应用
新机初始化
接管巡检
退役检查
应用退役
```

运行后页面会展示：

- exit code。
- 执行命令。
- stdout / stderr。
- 预计更新的产物。
- 最近审计记录。

## 6. 高风险确认

这些动作需要输入确认令牌：

```text
确认合并
Uptime Kuma 应用
Wallos 应用
应用退役
```

令牌格式：

```text
CONFIRM:merge-apply
CONFIRM:sync-uptime-kuma-apply
CONFIRM:sync-wallos-apply
CONFIRM:retire-apply:HOST_ID
CONFIRM:retire-apply-force:HOST_ID
```

输入错误时确认按钮不可点击。

## 7. 发现合并

页面：

```text
/infra/discovery
```

建议流程：

1. 点击拉取 Komari。
2. 点击生成合并预览。
3. 查看合并预览内容。
4. 确认无误后输入 `CONFIRM:merge-apply`。
5. 点击确认应用。

确认合并会修改 `infra-control` 的本地 inventory，并刷新生成物。

## 8. 查看生成物

页面：

```text
/infra/generated
```

可查看：

```text
Komari 发现结果
合并预览
Ansible inventory
网络报告
续费报告
Uptime Kuma plan
Uptime Kuma sync preview
Uptime Kuma sync state
Wallos plan
Wallos sync preview
Wallos sync state
Wallos CSV
Adopt 巡检索引
Bootstrap 初始化索引
Semaphore task plan
退役检查报告
退役检查索引
退役应用结果
Web 数据包
```

如果生成物不存在，回到生成任务页运行正式生成或对应 preview。

## 9. 管理后台

用户管理：

```text
/admin/users
```

角色管理：

```text
/admin/roles
```

权限字典：

```text
/admin/permissions
```

审计日志：

```text
/admin/audit-logs
```

文件管理：

```text
/admin/files
```

给运维用户授权时，重点检查：

```text
infra:read
infra:write
infra:run
```

## 10. Mock 模式

开发或演示时可启用：

```env
VITE_USE_MOCK=true
```

mock 模式下：

- 不依赖真实 `nax-api` 的 infra 接口。
- 页面会使用 `src/features/infra/api.ts` 内置 demo 数据。
- 高风险确认仍按同样令牌校验。

不要用 mock 模式判断真实 inventory 状态。

## 11. 常见问题

登录后看不到 infra 页面：

1. 确认用户有 `infra:read` 权限。
2. 确认后端已运行。
3. 确认 `VITE_API_BASE_URL` 指向正确 API。

页面没有真实数据：

1. 确认 `.env` 中 `VITE_USE_MOCK=false`。
2. 确认 `nax-api` 的 `INFRA_DATA_PATH` 正确。
3. 在 `infra-control` 运行正式生成。

保存配置失败：

1. 查看页面错误信息。
2. 修正 YAML 格式或字段引用。
3. 重新保存。

生成任务失败：

1. 查看输出区域的 stderr。
2. 到 `/root/infra-control` 直接运行同一条命令复现。
3. 修正 inventory 后重新执行。
