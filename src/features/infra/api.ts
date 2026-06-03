import { apiGet, apiPost, apiPut } from "@/lib/api";
import { appConfig } from "@/config/app";
import type {
  InfraAction,
  InfraActionCatalogItem,
  InfraBillingAsset,
  InfraCommandAction,
  InfraCommandResult,
  InfraDomain,
  InfraGeneratedFile,
  InfraGeneratedFileSummary,
  InfraGeneratedName,
  InfraHost,
  InfraInventoryFile,
  InfraInventoryName,
  InfraInventorySaveResult,
  InfraNetworkProfile,
  InfraOverview,
  InfraService,
} from "./types";

const now = new Date().toISOString();

const demoHosts: InfraHost[] = [
  { id: "control-01", hostname: "control-01", public_ip: "203.0.113.10", vpn_ip: "10.8.0.1", region: "hk", provider: "example-provider", role: "control", state: "managed", network_profile: "control-01-cn", traffic: { type: "limited", monthly_limit_gb: 400 } },
  { id: "us-01", hostname: "us-01", public_ip: "198.51.100.20", vpn_ip: "10.8.0.2", region: "us", provider: "example-provider", role: "origin", state: "adopted", network_profile: "us-01-cn", traffic: { type: "unlimited" } },
  { id: "front-02", hostname: "front-02", public_ip: "203.0.113.22", region: "sg", provider: "demo-cloud", role: "front", state: "observed", network_profile: "front-02-cn", traffic: { type: "limited", monthly_limit_gb: 800 } },
];

const demoServices: InfraService[] = [
  { id: "uptime-kuma", host: "control-01", type: "docker", category: "monitoring", state: "managed", visibility: "vpn_only", url: "https://status-admin.example.com", description: "服务可用性和证书监控" },
  { id: "wallos", host: "control-01", type: "docker", category: "billing", state: "managed", visibility: "vpn_only", url: "https://billing.example.com", description: "VPS / 域名 / 订阅续费管理" },
  { id: "static-files", host: "us-01", type: "nginx", category: "origin", state: "adopted", visibility: "public", url: "https://dl.example.com", description: "下载和静态资源节点" },
];

const demoBilling: InfraBillingAsset[] = [
  { id: "control-01", type: "vps", provider: "example-provider", linked_host: "control-01", cost: 12, currency: "USD", cycle: "monthly", renewal_date: "2026-06-20", importance: "critical", action: "review_before_renew" },
  { id: "us-01", type: "vps", provider: "example-provider", linked_host: "us-01", cost: 8, currency: "USD", cycle: "monthly", renewal_date: "2026-06-12", importance: "normal", action: "auto_renew" },
  { id: "example.com", type: "domain", provider: "cloudflare", cost: 10, currency: "USD", cycle: "yearly", renewal_date: "2027-01-05", importance: "critical", action: "auto_renew" },
];

const demoDomains: InfraDomain[] = [
  {
    id: "example.com",
    provider: "cloudflare",
    renewal_date: "2027-01-05",
    importance: "critical",
    records: {
      admin: { type: "CNAME", target: "control-01", visibility: "vpn_only" },
      monitor: { type: "CNAME", target: "control-01", visibility: "vpn_only" },
      dl: { type: "A", target: "us-01", visibility: "public" },
    },
  },
];

const demoNetworkProfiles: InfraNetworkProfile[] = [
  { id: "control-01-cn", host: "control-01", provider: "example-provider", region: "hk", line_type: "premium", bandwidth_mbps: 100, traffic_limit_gb: 400, score: { china_access: 85, global_access: 70, stability: 80, cost_effective: 60 } },
  { id: "us-01-cn", host: "us-01", provider: "example-provider", region: "us", line_type: "standard", bandwidth_mbps: 1000, traffic_limit_gb: null, score: { china_access: 45, global_access: 80, stability: 60, cost_effective: 75 } },
];

const inventoryNames: InfraInventoryName[] = ["plugins", "hosts", "services", "billing", "integrations", "domains", "network", "komari", "network-probes", "alerts"];

const demoArtifacts = [
  "generated/komari/hosts.discovered.yml",
  "generated/demo/ansible/inventory.ini",
  "generated/demo/reports",
  "generated/demo/uptime-kuma/monitors.plan.yml",
  "generated/demo/wallos/subscriptions.plan.yml",
  "generated/demo/wallos/subscriptions.csv",
  "generated/demo/web/infra-data.json",
];

const formalGenerateArtifacts = [
  "generated/ansible/inventory.ini",
  "generated/reports",
  "generated/uptime-kuma/monitors.plan.yml",
  "generated/wallos/subscriptions.plan.yml",
  "generated/wallos/subscriptions.csv",
  "generated/semaphore/tasks.plan.yml",
  "generated/retirement/index.yml",
  "generated/web/infra-data.json",
];

const retireApplyArtifacts = [
  "generated/retirement/last-apply.yml",
  "inventory/hosts.yml",
  "inventory/billing.yml",
  ...formalGenerateArtifacts,
];

const actionCatalog: InfraActionCatalogItem[] = [
  { key: "status", title: "插件状态", description: "查看 infra-control 当前插件开关。", group: "准备", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "plugins"], artifacts: [] },
  { key: "validate", title: "校验示例台账", description: "运行 inventory 示例数据交叉校验。", group: "准备", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "validate"], artifacts: [] },
  { key: "bootstrap", title: "初始化本地配置", description: "从示例复制缺失的 inventory 本地配置。", group: "准备", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "bootstrap", "--plugins", "all"], artifacts: [] },
  { key: "demo", title: "生成 Demo", description: "刷新 generated/demo 下的报告和 Web 数据包。", group: "生成", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "demo"], artifacts: demoArtifacts },
  { key: "generate", title: "正式生成", description: "按当前 inventory 和临时插件生成正式输出。", group: "生成", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "generate", "--with", "network,billing,uptime_kuma,wallos,semaphore,retirement,web"], artifacts: formalGenerateArtifacts },
  { key: "discover-komari", title: "拉取 Komari", description: "只读调用 Komari API，刷新 hosts.discovered.yml。", group: "准备", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "discover-komari"], artifacts: ["generated/komari/hosts.discovered.yml"] },
  { key: "merge-preview", title: "生成合并预览", description: "只写 generated/merge，不修改 inventory。", group: "生成", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "merge-hosts"], artifacts: ["generated/merge/hosts.merge-preview.yml"] },
  { key: "merge-apply", title: "确认合并", description: "备份写入 hosts.yml，必要时初始化 network.yml，随后校验并刷新正式生成物。", group: "生成", highRisk: true, confirmationRequired: true, confirmationToken: "CONFIRM:merge-apply", command: ["python3", "scripts/infra_control.py", "merge-hosts", "--apply"], artifacts: ["inventory/hosts.yml", "inventory/network.yml", ...formalGenerateArtifacts] },
  { key: "sync-uptime-kuma-preview", title: "Uptime Kuma 预览", description: "生成监控同步预览，不写入外部状态。", group: "同步", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "sync", "uptime-kuma", "preview"], artifacts: ["generated/uptime-kuma/sync-preview.yml"] },
  { key: "sync-uptime-kuma-apply", title: "Uptime Kuma 应用", description: "应用到本地同步状态，保留人工删除边界。", group: "同步", highRisk: true, confirmationRequired: true, confirmationToken: "CONFIRM:sync-uptime-kuma-apply", command: ["python3", "scripts/infra_control.py", "sync", "uptime-kuma", "apply"], artifacts: ["generated/uptime-kuma/sync-preview.yml", "runtime/sync-state/uptime-kuma.yml"] },
  { key: "sync-wallos-preview", title: "Wallos 预览", description: "生成订阅同步预览，不回写 inventory。", group: "同步", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "sync", "wallos", "preview"], artifacts: ["generated/wallos/sync-preview.yml"] },
  { key: "sync-wallos-apply", title: "Wallos 应用", description: "应用到本地同步状态，回写 wallos_id，随后校验并刷新正式生成物。", group: "同步", highRisk: true, confirmationRequired: true, confirmationToken: "CONFIRM:sync-wallos-apply", command: ["python3", "scripts/infra_control.py", "sync", "wallos", "apply"], artifacts: ["generated/wallos/sync-preview.yml", "runtime/sync-state/wallos.yml", "inventory/billing.yml", ...formalGenerateArtifacts] },
  { key: "bootstrap-new", title: "新机初始化", description: "生成新机器 bootstrap 计划和脚本，不直接接管远端。", group: "生命周期", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "bootstrap-new"], artifacts: ["generated/bootstrap/index.yml"] },
  { key: "adopt-scan", title: "接管巡检", description: "生成旧机器只读巡检计划，不执行远程命令。", group: "生命周期", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "adopt-scan"], artifacts: ["generated/adopt/index.yml"] },
  { key: "retire-check", title: "退役检查", description: "生成退役阻塞项和取消续费建议，不改 inventory。", group: "生命周期", highRisk: false, confirmationRequired: false, confirmationToken: null, command: ["python3", "scripts/infra_control.py", "retire-check"], artifacts: ["generated/retirement/index.yml", "generated/reports/retirement.md"] },
];

const inventoryExamples: Record<InfraInventoryName, string> = {
  plugins: "plugins:\n  core:\n    enabled: true\n    description: inventory validation and Ansible inventory\n  komari:\n    enabled: true\n    description: pull Komari nodes into discovered hosts\n",
  hosts: "hosts:\n  control-01:\n    hostname: control-01\n    public_ip: 203.0.113.10\n    vpn_ip: 10.8.0.1\n    region: hk\n    provider: example-provider\n    role: control\n    state: managed\n    network_profile: control-01-cn\n    traffic:\n      type: limited\n      monthly_limit_gb: 400\n    access:\n      ssh_user: ops\n      ssh_port: 22\n      management: vpn_only\n  us-01:\n    hostname: us-01\n    public_ip: 198.51.100.20\n    vpn_ip: 10.8.0.2\n    region: us\n    provider: example-provider\n    role: origin\n    state: adopted\n    traffic:\n      type: unlimited\n",
  services: "services:\n  uptime-kuma:\n    host: control-01\n    type: docker\n    category: monitoring\n    state: managed\n    visibility: vpn_only\n    url: https://status-admin.example.com\n    monitor:\n      enabled: true\n      type: http\n      target: https://status-admin.example.com\n",
  billing: "assets:\n  control-01:\n    type: vps\n    provider: example-provider\n    linked_host: control-01\n    cost: 12\n    currency: USD\n    cycle: monthly\n    renewal_date: 2026-06-20\n    importance: critical\n    action: review_before_renew\n",
  integrations: "integrations:\n  uptime_kuma:\n    adapter: local_state\n    base_url: http://127.0.0.1:3001\n    api_token_env: UPTIME_KUMA_API_TOKEN\n    state_file: runtime/sync-state/uptime-kuma.yml\n    preview_file: generated/uptime-kuma/sync-preview.yml\n  wallos:\n    adapter: local_state\n    base_url: http://127.0.0.1:8282\n    api_token_env: WALLOS_API_TOKEN\n    state_file: runtime/sync-state/wallos.yml\n    preview_file: generated/wallos/sync-preview.yml\n",
  domains: "domains:\n  example.com:\n    provider: cloudflare\n    renewal_date: 2027-01-05\n    importance: critical\n    records:\n      admin:\n        type: CNAME\n        target: control-01\n        visibility: vpn_only\n      dl:\n        type: A\n        target: us-01\n        visibility: public\n",
  network: "network_profiles:\n  control-01-cn:\n    host: control-01\n    provider: example-provider\n    region: hk\n    line_type: premium\n    bandwidth_mbps: 100\n    traffic_limit_gb: 400\n    best_for:\n      - front\n      - api_gateway\n    score:\n      china_access: 85\n      global_access: 70\n      stability: 80\n      cost_effective: 60\n",
  komari: "komari:\n  endpoint: https://monitor.example.com\n  api_key_env: KOMARI_API_KEY\n  output: generated/komari/hosts.discovered.yml\n  discovery:\n    include_raw: true\n    default_state: observed\n    default_access:\n      ssh_user: ops\n      ssh_port: 22\n      management: vpn_only\n  merge:\n    update_existing_facts: true\n    overwrite_managed_fields: false\n",
  "network-probes": "version: 1\nhost:\n  id: front-01\n  profile_name: good-cn-front\n  region: hk\n  provider: example-provider\npolicy:\n  protocol: tcp_ping\n  forbid_icmp: true\ndefaults:\n  attempts: 5\n  timeout_seconds: 2.0\n  interval_seconds: 0.2\n  port: 80\nprobes:\n  china_telecom:\n    - name: ct-example\n      host: replace-after-reading-zstaticcdn.example\n      port: 80\n      enabled: false\n",
  alerts: "telegram:\n  enabled: true\n  bot_token_env: TELEGRAM_BOT_TOKEN\n  chat_id_env: TELEGRAM_CHAT_ID\n  parse_mode: HTML\nroutes:\n  default:\n    channel: telegram\n    severity:\n      - warning\n      - critical\nevents:\n  service_down:\n    enabled: true\n    message: \"服务不可用\"\n",
};

const demoInventoryContents: Record<InfraInventoryName, string> = { ...inventoryExamples };

const generatedDefinitions: Array<{ name: InfraGeneratedName; label: string; file: string; content: string }> = [
  { name: "komari-discovery", label: "Komari 发现结果", file: "generated/komari/hosts.discovered.yml", content: `metadata:\n  source: komari\n  generated_at: ${now}\nhosts:\n  front-02:\n    hostname: front-02\n    region: sg\n    provider: demo-cloud\n    role: front\n    state: observed\n` },
  { name: "merge-preview", label: "合并预览", file: "generated/merge/hosts.merge-preview.yml", content: "actions:\n  - add front-02 from komari\n  - update control-01 facts\ncreated:\n  - front-02\nupdated:\n  - control-01\nskipped: []\n" },
  { name: "ansible-inventory", label: "Ansible inventory", file: "generated/ansible/inventory.ini", content: "[all]\ncontrol-01 ansible_host=10.8.0.1\nus-01 ansible_host=10.8.0.2\n" },
  { name: "network-report", label: "网络报告", file: "generated/reports/network.md", content: "# 网络报告\n\n- control-01-cn: 中国访问 85，适合入口和控制面。\n- us-01-cn: 中国访问 45，适合源站和静态资源。\n" },
  { name: "renewals-report", label: "续费报告", file: "generated/reports/renewals.md", content: "# 续费报告\n\n| 资产 | 日期 | 动作 |\n| --- | --- | --- |\n| control-01 | 2026-06-20 | review_before_renew |\n" },
  { name: "uptime-kuma-plan", label: "Uptime Kuma plan", file: "generated/uptime-kuma/monitors.plan.yml", content: "monitors:\n  uptime-kuma:\n    type: http\n    url: https://status-admin.example.com\n" },
  { name: "uptime-kuma-sync-preview", label: "Uptime Kuma sync preview", file: "generated/uptime-kuma/sync-preview.yml", content: "changes:\n  - create monitor static-files\n" },
  { name: "uptime-kuma-sync-state", label: "Uptime Kuma sync state", file: "runtime/sync-state/uptime-kuma.yml", content: "monitors:\n  static-files:\n    id: uk-demo-static-files\n    name: static-files\n    type: http\nmetadata:\n  source: infra-control\n  adapter: local-state\n" },
  { name: "wallos-plan", label: "Wallos plan", file: "generated/wallos/subscriptions.plan.yml", content: "subscriptions:\n  control-01:\n    cost: 12\n    currency: USD\n" },
  { name: "wallos-sync-preview", label: "Wallos sync preview", file: "generated/wallos/sync-preview.yml", content: "changes:\n  - update subscription control-01\n" },
  { name: "wallos-sync-state", label: "Wallos sync state", file: "runtime/sync-state/wallos.yml", content: "subscriptions:\n  control-01:\n    id: wa-demo-control-01\n    name: control-01\nmetadata:\n  source: infra-control\n  adapter: local-state\n" },
  { name: "wallos-csv", label: "Wallos CSV", file: "generated/wallos/subscriptions.csv", content: "name,cost,currency,cycle\ncontrol-01,12,USD,monthly\n" },
  { name: "adopt-index", label: "Adopt 巡检索引", file: "generated/adopt/index.yml", content: "hosts:\n  control-01:\n    report: generated/adopt/control-01/summary.md\n" },
  { name: "bootstrap-index", label: "Bootstrap 初始化索引", file: "generated/bootstrap/index.yml", content: "hosts:\n  control-01:\n    script: generated/bootstrap/control-01/bootstrap.sh\n" },
  { name: "semaphore-plan", label: "Semaphore task plan", file: "generated/semaphore/tasks.plan.yml", content: "tasks:\n  - name: generate reports\n    playbook: infra-control.yml\n" },
  { name: "retirement-report", label: "退役检查报告", file: "generated/reports/retirement.md", content: "# 退役检查\n\nus-01 当前仍关联 static-files，建议先迁移服务。\n" },
  { name: "retirement-index", label: "退役检查索引", file: "generated/retirement/index.yml", content: "hosts:\n  us-01:\n    blockers:\n      - static-files\n" },
  { name: "retirement-last-apply", label: "退役应用结果", file: "generated/retirement/last-apply.yml", content: "metadata:\n  source: infra-control\n  type: retire-apply\nhost: us-01\nprevious_state: draining\nnew_state: retired\nupdated_billing_assets:\n  - us-01\n" },
  { name: "web-data", label: "Web 数据包", file: "generated/web/infra-data.json", content: JSON.stringify({ metadata: { generated_at: now, source: "demo-fallback" }, hosts: demoHosts }, null, 2) },
];

const extraActionArtifacts: Partial<Record<InfraCommandAction, string[]>> = {
  "retire-apply": retireApplyArtifacts,
};

const extraGeneratedProducers: Partial<Record<InfraGeneratedName, InfraCommandAction[]>> = {
  "network-report": ["retire-apply"],
  "renewals-report": ["retire-apply"],
  "retirement-report": ["retire-apply"],
  "retirement-last-apply": ["retire-apply"],
  "web-data": ["retire-apply"],
};

function assertDemoActionConfirmation(action: InfraAction, confirmation?: string) {
  const catalogItem = actionCatalog.find((item) => item.key === action);
  if (!catalogItem?.confirmationRequired) return;
  if (!catalogItem.confirmationToken || confirmation !== catalogItem.confirmationToken) {
    throw new Error(`确认令牌不匹配：${action}`);
  }
}

function assertDemoRetirementConfirmation(host: string, force: boolean, confirmation: string) {
  const expected = `CONFIRM:retire-apply${force ? "-force" : ""}:${host}`;
  if (!host || confirmation !== expected) {
    throw new Error(`确认令牌不匹配：retire-apply:${host || "unknown"}`);
  }
}

async function withDemo<T>(request: () => Promise<T>, fallback: () => T): Promise<T> {
  if (appConfig.useMock) {
    return fallback();
  }

  return await request();
}

function demoOverview(): InfraOverview {
  return {
    metadata: { generatedAt: now, source: "demo-fallback", dataPath: "generated/demo/web/infra-data.json" },
    stats: {
      hosts: demoHosts.length,
      services: demoServices.length,
      billingAssets: demoBilling.length,
      domains: demoDomains.length,
      networkProfiles: demoNetworkProfiles.length,
      limitedTrafficHosts: demoHosts.filter((item) => item.traffic?.type === "limited").length,
      publicServices: demoServices.filter((item) => item.visibility === "public").length,
      criticalRenewals: demoBilling.filter((item) => item.importance === "critical").length,
    },
    hosts: demoHosts,
    services: demoServices,
    billing: demoBilling,
    domains: demoDomains,
    networkProfiles: demoNetworkProfiles,
  };
}

function demoActionResult(action: InfraCommandResult["action"]): InfraCommandResult {
  const highRisk = ["merge-apply", "sync-uptime-kuma-apply", "sync-wallos-apply", "retire-apply"].includes(action);
  const catalogItem = actionCatalog.find((item) => item.key === action);
  return {
    action,
    command: ["python3", "scripts/infra_control.py", action],
    cwd: "/root/infra-control",
    exitCode: 0,
    stdout: `demo fallback executed ${action}\nartifacts refreshed\n`,
    stderr: "",
    startedAt: now,
    finishedAt: new Date().toISOString(),
    highRisk,
    confirmationRequired: highRisk,
    artifacts: catalogItem?.artifacts ?? extraActionArtifacts[action] ?? formalGenerateArtifacts,
  };
}

function demoInventoryFile(name: InfraInventoryName): InfraInventoryFile {
  const content = demoInventoryContents[name] ?? inventoryExamples[name];
  return {
    name,
    localFile: `/root/infra-control/inventory/${name === "alerts" ? "alerts.local.yml" : `${name}.yml`}`,
    exampleFile: `/root/infra-control/inventory/${name}.example.yml`,
    exists: true,
    exampleExists: true,
    content,
    exampleContent: content,
  };
}

function artifactMatchesGeneratedFile(artifact: string, generatedFile: string) {
  return artifact === generatedFile || generatedFile.startsWith(`${artifact.replace(/\/$/, "")}/`);
}

function demoGeneratedSummary(item: (typeof generatedDefinitions)[number]): InfraGeneratedFileSummary {
  const catalogProducers = actionCatalog
    .filter((action) => action.artifacts.some((artifact) => artifactMatchesGeneratedFile(artifact, item.file)))
    .map((action) => action.key);
  return {
    name: item.name,
    label: item.label,
    file: `/root/infra-control/${item.file}`,
    exists: true,
    bytes: new Blob([item.content]).size,
    updatedAt: now,
    producers: [...catalogProducers, ...(extraGeneratedProducers[item.name] ?? [])],
  };
}

export function getInfraOverview() {
  return withDemo(() => apiGet<InfraOverview>("/infra/overview"), demoOverview);
}

export function listInfraHosts() {
  return withDemo(() => apiGet<InfraHost[]>("/infra/hosts"), () => demoHosts);
}

export function listInfraServices() {
  return withDemo(() => apiGet<InfraService[]>("/infra/services"), () => demoServices);
}

export function listInfraBillingAssets() {
  return withDemo(() => apiGet<InfraBillingAsset[]>("/infra/billing"), () => demoBilling);
}

export function listInfraDomains() {
  return withDemo(() => apiGet<InfraDomain[]>("/infra/domains"), () => demoDomains);
}

export function listInfraNetworkProfiles() {
  return withDemo(() => apiGet<InfraNetworkProfile[]>("/infra/network-profiles"), () => demoNetworkProfiles);
}

export function listInfraActionCatalog() {
  return withDemo(() => apiGet<InfraActionCatalogItem[]>("/infra/actions/catalog"), () => actionCatalog);
}

export function runInfraAction(action: InfraAction, confirmation?: string) {
  return withDemo(
    () =>
      apiPost<InfraCommandResult, { action: InfraAction; confirmation?: string }>(
        "/infra/actions/run",
        { action, confirmation },
        { timeout: 120_000 },
    ),
    () => {
      assertDemoActionConfirmation(action, confirmation);
      return demoActionResult(action);
    },
  );
}

export function applyInfraRetirement(host: string, force: boolean, confirmation: string) {
  return withDemo(
    () =>
      apiPost<InfraCommandResult, { host: string; force: boolean; confirmation: string }>(
        "/infra/retire/apply",
        { host, force, confirmation },
        { timeout: 120_000 },
      ),
    () => {
      assertDemoRetirementConfirmation(host, force, confirmation);
      return {
        ...demoActionResult("retire-apply"),
        command: ["python3", "scripts/infra_control.py", "retire-apply", "--host", host, ...(force ? ["--force"] : [])],
        stdout: `demo fallback retired ${host}\nconfirmation provided: true\n`,
        highRisk: true,
        confirmationRequired: true,
        artifacts: retireApplyArtifacts,
      };
    },
  );
}

export function listInventoryNames() {
  return withDemo(() => apiGet<InfraInventoryName[]>("/infra/inventory"), () => inventoryNames);
}

export function getInventoryFile(name: InfraInventoryName) {
  return withDemo(() => apiGet<InfraInventoryFile>(`/infra/inventory/${name}`), () => demoInventoryFile(name));
}

export function saveInventoryFile(name: InfraInventoryName, content: string) {
  const file = `/root/infra-control/inventory/${name === "alerts" ? "alerts.local.yml" : `${name}.yml`}`;
  return withDemo(
    () => apiPut<InfraInventorySaveResult, { content: string }>(`/infra/inventory/${name}`, { content }),
    () => {
      demoInventoryContents[name] = content;
      return {
        name,
        file,
        backupFile: `${file}.bak-demo`,
        bytes: new Blob([content]).size,
        validation: demoActionResult("validate"),
        generation: demoActionResult("generate"),
      };
    },
  );
}

export function validateInfraInventory() {
  return runInfraAction("validate");
}

export function generateInfraOutputs() {
  return runInfraAction("generate");
}

export function listGeneratedFiles() {
  return withDemo(() => apiGet<InfraGeneratedFileSummary[]>("/infra/generated"), () => generatedDefinitions.map(demoGeneratedSummary));
}

export function getGeneratedFile(name: InfraGeneratedName) {
  return withDemo(() => apiGet<InfraGeneratedFile>(`/infra/generated/${name}`), () => {
    const item = generatedDefinitions.find((definition) => definition.name === name) ?? generatedDefinitions[0];
    return { ...demoGeneratedSummary(item), content: item.content };
  });
}
