import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  Copy,
  FileCode2,
  Globe2,
  HardDrive,
  Network,
  Plus,
  Radar,
  Save,
  Server,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { GlassBackdrop, GlassPage, GlassPanel } from "@/components/shared/Glass";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  getInventoryFile,
  listInventoryNames,
  saveInventoryFile,
} from "@/features/infra/api";
import type { InfraInventoryName } from "@/features/infra/types";
import { cn } from "@/lib/cn";

type EditorMode = "simple" | "advanced";

const labels: Record<InfraInventoryName, string> = {
  plugins: "插件",
  hosts: "服务器",
  services: "服务",
  billing: "续费",
  integrations: "外部面板",
  domains: "域名",
  network: "线路画像",
  komari: "Komari",
  "network-probes": "线路探针",
  alerts: "告警",
};

const pluginLabels: Record<string, string> = {
  core: "核心",
  komari: "Komari",
  services: "服务",
  domains: "域名",
  network: "线路画像",
  billing: "续费",
  uptime_kuma: "Uptime Kuma",
  wallos: "Wallos",
  telegram: "Telegram",
  semaphore: "Semaphore",
  retirement: "退役",
  web: "Web 数据",
};

const simpleEditorMeta: Record<
  InfraInventoryName,
  {
    icon: React.ReactNode;
    summary: string;
  }
> = {
  plugins: {
    icon: <Settings2 className="h-4 w-4" />,
    summary: "控制哪些能力参与生成、同步和报表。",
  },
  hosts: {
    icon: <Server className="h-4 w-4" />,
    summary: "维护节点的角色、地区、访问方式和流量策略。",
  },
  services: {
    icon: <HardDrive className="h-4 w-4" />,
    summary: "登记服务部署位置、访问范围、监控和备份。",
  },
  billing: {
    icon: <CalendarClock className="h-4 w-4" />,
    summary: "维护 VPS、域名和订阅的续费日期与动作。",
  },
  integrations: {
    icon: <Globe2 className="h-4 w-4" />,
    summary: "配置 Uptime Kuma、Wallos 等外部面板的同步入口。",
  },
  domains: {
    icon: <Globe2 className="h-4 w-4" />,
    summary: "维护域名续费和核心 DNS 记录。",
  },
  network: {
    icon: <Network className="h-4 w-4" />,
    summary: "维护线路画像、用途建议和质量评分。",
  },
  komari: {
    icon: <Radar className="h-4 w-4" />,
    summary: "配置 Komari API 发现、默认字段和合并策略。",
  },
  "network-probes": {
    icon: <Radar className="h-4 w-4" />,
    summary: "配置 TCP-Ping 探针目标和默认探测参数。",
  },
  alerts: {
    icon: <Bell className="h-4 w-4" />,
    summary: "配置 Telegram 通知和告警事件开关。",
  },
};

interface PluginConfig {
  name: string;
  enabled: boolean;
  description: string;
}

interface KomariConfig {
  endpoint: string;
  apiKeyEnv: string;
  output: string;
  includeRaw: boolean;
  defaultState: string;
  sshUser: string;
  sshPort: string;
  management: string;
  updateExistingFacts: boolean;
  overwriteManagedFields: boolean;
}

interface IntegrationConfig {
  adapter: string;
  baseUrl: string;
  apiTokenEnv: string;
  stateFile: string;
  previewFile: string;
}

interface IntegrationsConfig {
  uptimeKuma: IntegrationConfig;
  wallos: IntegrationConfig;
}

interface HostConfig {
  id: string;
  hostname: string;
  publicIp: string;
  vpnIp: string;
  region: string;
  provider: string;
  role: string;
  state: string;
  networkProfile: string;
  trafficType: string;
  monthlyLimitGb: string;
  sshUser: string;
  sshPort: string;
  management: string;
}

interface ServiceConfig {
  id: string;
  host: string;
  type: string;
  category: string;
  state: string;
  visibility: string;
  url: string;
  path: string;
  description: string;
  monitorEnabled: boolean;
  monitorType: string;
  monitorTarget: string;
  backupRequired: boolean;
}

interface BillingAssetConfig {
  id: string;
  type: string;
  provider: string;
  linkedHost: string;
  cost: string;
  currency: string;
  cycle: string;
  renewalDate: string;
  importance: string;
  action: string;
}

interface DomainConfig {
  id: string;
  provider: string;
  renewalDate: string;
  importance: string;
  records: Array<{
    id: string;
    type: string;
    target: string;
    visibility: string;
  }>;
}

interface NetworkProfileConfig {
  id: string;
  host: string;
  provider: string;
  region: string;
  lineType: string;
  bandwidthMbps: string;
  trafficLimitGb: string;
  bestFor: string;
  avoidFor: string;
  chinaAccess: string;
  globalAccess: string;
  stability: string;
  costEffective: string;
  notes: string;
}

interface NetworkProbeConfig {
  hostId: string;
  profileName: string;
  region: string;
  provider: string;
  lineType: string;
  bandwidthMbps: string;
  trafficLimitGb: string;
  protocol: string;
  attempts: string;
  timeoutSeconds: string;
  intervalSeconds: string;
  port: string;
  probes: Array<{
    carrier: string;
    name: string;
    host: string;
    port: string;
    enabled: boolean;
  }>;
}

interface AlertsConfig {
  telegramEnabled: boolean;
  botTokenEnv: string;
  chatIdEnv: string;
  parseMode: string;
  defaultSeverities: string;
  events: Array<{
    id: string;
    enabled: boolean;
    message: string;
  }>;
}

const hostDefaults: HostConfig = {
  id: "new-host",
  hostname: "new-host",
  publicIp: "",
  vpnIp: "",
  region: "hk",
  provider: "",
  role: "origin",
  state: "observed",
  networkProfile: "",
  trafficType: "unlimited",
  monthlyLimitGb: "",
  sshUser: "ops",
  sshPort: "22",
  management: "vpn_only",
};

const serviceDefaults: ServiceConfig = {
  id: "new-service",
  host: "",
  type: "docker",
  category: "app",
  state: "observed",
  visibility: "vpn_only",
  url: "",
  path: "",
  description: "",
  monitorEnabled: true,
  monitorType: "http",
  monitorTarget: "",
  backupRequired: false,
};

const billingDefaults: BillingAssetConfig = {
  id: "new-asset",
  type: "vps",
  provider: "",
  linkedHost: "",
  cost: "",
  currency: "USD",
  cycle: "monthly",
  renewalDate: "",
  importance: "normal",
  action: "auto_renew",
};

const domainDefaults: DomainConfig = {
  id: "example.com",
  provider: "cloudflare",
  renewalDate: "",
  importance: "normal",
  records: [],
};

const networkDefaults: NetworkProfileConfig = {
  id: "new-profile",
  host: "",
  provider: "",
  region: "hk",
  lineType: "standard",
  bandwidthMbps: "",
  trafficLimitGb: "",
  bestFor: "origin",
  avoidFor: "",
  chinaAccess: "",
  globalAccess: "",
  stability: "",
  costEffective: "",
  notes: "",
};

const networkProbeDefaults: NetworkProbeConfig = {
  hostId: "front-01",
  profileName: "good-cn-front",
  region: "hk",
  provider: "",
  lineType: "premium",
  bandwidthMbps: "100",
  trafficLimitGb: "400",
  protocol: "tcp_ping",
  attempts: "5",
  timeoutSeconds: "2.0",
  intervalSeconds: "0.2",
  port: "80",
  probes: [
    { carrier: "china_telecom", name: "ct-example", host: "", port: "80", enabled: false },
    { carrier: "china_unicom", name: "cu-example", host: "", port: "80", enabled: false },
    { carrier: "china_mobile", name: "cm-example", host: "", port: "80", enabled: false },
  ],
};

const alertsDefaults: AlertsConfig = {
  telegramEnabled: true,
  botTokenEnv: "TELEGRAM_BOT_TOKEN",
  chatIdEnv: "TELEGRAM_CHAT_ID",
  parseMode: "HTML",
  defaultSeverities: "warning, critical",
  events: [
    { id: "service_down", enabled: true, message: "服务不可用" },
    { id: "host_offline", enabled: true, message: "机器疑似离线" },
    { id: "cert_expiring", enabled: true, message: "证书即将过期" },
    { id: "traffic_limit", enabled: true, message: "流量接近阈值" },
  ],
};

function yamlValue(block: string, key: string, fallback = "") {
  const match = block.match(new RegExp(`^\\s*${key}:\\s*(.*)$`, "m"));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, "") || fallback;
}

function yamlBool(block: string, key: string, fallback = false) {
  const value = yamlValue(block, key, String(fallback)).toLowerCase();
  return value === "true" || value === "yes";
}

function yamlList(block: string, key: string, fallback = "") {
  const match = block.match(new RegExp(`^\\s*${key}:\\n((?:\\s*-\\s*.*\\n?)+)`, "m"));
  if (!match) return fallback;
  return match[1]
    .split("\n")
    .map((line) => line.trim().replace(/^- /, ""))
    .filter(Boolean)
    .join(", ");
}

function yamlNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : "null";
}

function blockEntries(content: string, root: string, indent = 2) {
  const rootBlock = content.match(new RegExp(`^${root}:\\n([\\s\\S]*)`, "m"))?.[1] ?? "";
  return Array.from(
    rootBlock.matchAll(
      new RegExp(`^ {${indent}}([\\w.-]+):\\n([\\s\\S]*?)(?=^ {${indent}}[\\w.-]+:|(?![\\s\\S]))`, "gm"),
    ),
  );
}

function nestedBlock(content: string, key: string, indent = 2) {
  const match = content.match(
    new RegExp(`^\\s{${indent}}${key}:\\n([\\s\\S]*?)(?=^\\s{${indent}}[\\w-]+:|(?![\\s\\S]))`, "m"),
  );
  return match?.[1] ?? "";
}

function childBlock(block: string, key: string, indent = 4) {
  const match = block.match(
    new RegExp(`^\\s{${indent}}${key}:\\n([\\s\\S]*?)(?=^\\s{${indent}}[\\w-]+:|(?![\\s\\S]))`, "m"),
  );
  return match?.[1] ?? "";
}

function replaceScalar(content: string, key: string, value: string) {
  const pattern = new RegExp(`^(\\s*${key}:\\s*).*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, `$1${value}`);
  return `${content.trimEnd()}\n${key}: ${value}\n`;
}

function parsePlugins(content: string): PluginConfig[] {
  const names = Array.from(content.matchAll(/^ {2}([\w-]+):\n([\s\S]*?)(?=^ {2}[\w-]+:|(?![\s\S]))/gm));
  const parsed = names.map((match) => ({
    name: match[1],
    enabled: yamlBool(match[2], "enabled", false),
    description: yamlValue(match[2], "description", pluginLabels[match[1]] || ""),
  }));
  if (parsed.length) return parsed;
  return Object.entries(pluginLabels).map(([name, description]) => ({
    name,
    enabled: name === "core" || name === "komari",
    description,
  }));
}

function buildPluginsYaml(plugins: PluginConfig[]) {
  return [
    "plugins:",
    ...plugins.flatMap((plugin) => [
      `  ${plugin.name}:`,
      `    enabled: ${plugin.name === "core" ? "true" : plugin.enabled}`,
      `    description: ${plugin.description || pluginLabels[plugin.name] || plugin.name}`,
      "",
    ]),
  ].join("\n");
}

function parseKomari(content: string): KomariConfig {
  return {
    endpoint: yamlValue(content, "endpoint", "https://monitor.example.com"),
    apiKeyEnv: yamlValue(content, "api_key_env", "KOMARI_API_KEY"),
    output: yamlValue(content, "output", "generated/komari/hosts.discovered.yml"),
    includeRaw: yamlBool(content, "include_raw", true),
    defaultState: yamlValue(content, "default_state", "observed"),
    sshUser: yamlValue(content, "ssh_user", "ops"),
    sshPort: yamlValue(content, "ssh_port", "22"),
    management: yamlValue(content, "management", "vpn_only"),
    updateExistingFacts: yamlBool(content, "update_existing_facts", true),
    overwriteManagedFields: yamlBool(content, "overwrite_managed_fields", false),
  };
}

function patchKomariYaml(content: string, patch: Partial<KomariConfig>) {
  const base =
    content.trim() ||
    `komari:
  endpoint: https://monitor.example.com
  api_key_env: KOMARI_API_KEY
  output: generated/komari/hosts.discovered.yml

  discovery:
    include_raw: true
    default_state: observed
    default_access:
      ssh_user: ops
      ssh_port: 22
      management: vpn_only

  merge:
    update_existing_facts: true
    overwrite_managed_fields: false
`;
  let next = base;
  if (patch.endpoint !== undefined) next = replaceScalar(next, "endpoint", patch.endpoint);
  if (patch.apiKeyEnv !== undefined) next = replaceScalar(next, "api_key_env", patch.apiKeyEnv);
  if (patch.output !== undefined) next = replaceScalar(next, "output", patch.output);
  if (patch.includeRaw !== undefined) next = replaceScalar(next, "include_raw", String(patch.includeRaw));
  if (patch.defaultState !== undefined) next = replaceScalar(next, "default_state", patch.defaultState);
  if (patch.sshUser !== undefined) next = replaceScalar(next, "ssh_user", patch.sshUser);
  if (patch.sshPort !== undefined) next = replaceScalar(next, "ssh_port", patch.sshPort);
  if (patch.management !== undefined) next = replaceScalar(next, "management", patch.management);
  if (patch.updateExistingFacts !== undefined) {
    next = replaceScalar(next, "update_existing_facts", String(patch.updateExistingFacts));
  }
  if (patch.overwriteManagedFields !== undefined) {
    next = replaceScalar(next, "overwrite_managed_fields", String(patch.overwriteManagedFields));
  }
  return next.endsWith("\n") ? next : `${next}\n`;
}

function parseIntegration(block: string, defaults: IntegrationConfig): IntegrationConfig {
  return {
    adapter: yamlValue(block, "adapter", defaults.adapter),
    baseUrl: yamlValue(block, "base_url", defaults.baseUrl),
    apiTokenEnv: yamlValue(block, "api_token_env", defaults.apiTokenEnv),
    stateFile: yamlValue(block, "state_file", defaults.stateFile),
    previewFile: yamlValue(block, "preview_file", defaults.previewFile),
  };
}

function parseIntegrations(content: string): IntegrationsConfig {
  return {
    uptimeKuma: parseIntegration(nestedBlock(content, "uptime_kuma"), {
      adapter: "local_state",
      baseUrl: "http://127.0.0.1:3001",
      apiTokenEnv: "UPTIME_KUMA_API_TOKEN",
      stateFile: "runtime/sync-state/uptime-kuma.yml",
      previewFile: "generated/uptime-kuma/sync-preview.yml",
    }),
    wallos: parseIntegration(nestedBlock(content, "wallos"), {
      adapter: "local_state",
      baseUrl: "http://127.0.0.1:8282",
      apiTokenEnv: "WALLOS_API_TOKEN",
      stateFile: "runtime/sync-state/wallos.yml",
      previewFile: "generated/wallos/sync-preview.yml",
    }),
  };
}

function buildIntegrationsYaml(config: IntegrationsConfig) {
  const item = (name: string, value: IntegrationConfig) => [
    `  ${name}:`,
    `    adapter: ${value.adapter}`,
    `    base_url: ${value.baseUrl}`,
    `    api_token_env: ${value.apiTokenEnv}`,
    `    state_file: ${value.stateFile}`,
    `    preview_file: ${value.previewFile}`,
  ];
  return [
    "integrations:",
    ...item("uptime_kuma", config.uptimeKuma),
    "",
    ...item("wallos", config.wallos),
    "",
  ].join("\n");
}

function parseHosts(content: string): HostConfig[] {
  const entries = blockEntries(content, "hosts");
  if (!entries.length) return [hostDefaults];
  return entries.map((entry) => {
    const block = entry[2];
    const traffic = childBlock(block, "traffic");
    const access = childBlock(block, "access");
    return {
      ...hostDefaults,
      id: entry[1],
      hostname: yamlValue(block, "hostname", entry[1]),
      publicIp: yamlValue(block, "public_ip"),
      vpnIp: yamlValue(block, "vpn_ip"),
      region: yamlValue(block, "region", hostDefaults.region),
      provider: yamlValue(block, "provider"),
      role: yamlValue(block, "role", hostDefaults.role),
      state: yamlValue(block, "state", hostDefaults.state),
      networkProfile: yamlValue(block, "network_profile"),
      trafficType: yamlValue(traffic, "type", "unlimited"),
      monthlyLimitGb: yamlValue(traffic, "monthly_limit_gb"),
      sshUser: yamlValue(access, "ssh_user", "ops"),
      sshPort: yamlValue(access, "ssh_port", "22"),
      management: yamlValue(access, "management", "vpn_only"),
    };
  });
}

function buildHostsYaml(hosts: HostConfig[]) {
  return [
    "hosts:",
    ...hosts.flatMap((host) => [
      `  ${host.id}:`,
      `    hostname: ${host.hostname || host.id}`,
      `    public_ip: ${host.publicIp || "null"}`,
      `    vpn_ip: ${host.vpnIp || "null"}`,
      `    region: ${host.region || "unknown"}`,
      `    provider: ${host.provider || "unknown"}`,
      `    role: ${host.role || "origin"}`,
      `    state: ${host.state || "observed"}`,
      `    network_profile: ${host.networkProfile || "null"}`,
      "    traffic:",
      `      type: ${host.trafficType || "unlimited"}`,
      ...(host.trafficType === "limited" ? [`      monthly_limit_gb: ${yamlNull(host.monthlyLimitGb)}`] : []),
      "    access:",
      `      ssh_user: ${host.sshUser || "ops"}`,
      `      ssh_port: ${host.sshPort || "22"}`,
      `      management: ${host.management || "vpn_only"}`,
      "",
    ]),
  ].join("\n");
}

function parseServices(content: string): ServiceConfig[] {
  const entries = blockEntries(content, "services");
  if (!entries.length) return [serviceDefaults];
  return entries.map((entry) => {
    const block = entry[2];
    const monitor = childBlock(block, "monitor");
    const backup = childBlock(block, "backup");
    return {
      ...serviceDefaults,
      id: entry[1],
      host: yamlValue(block, "host"),
      type: yamlValue(block, "type", "docker"),
      category: yamlValue(block, "category", "app"),
      state: yamlValue(block, "state", "observed"),
      visibility: yamlValue(block, "visibility", "vpn_only"),
      url: yamlValue(block, "url"),
      path: yamlValue(block, "path"),
      description: yamlValue(block, "description"),
      monitorEnabled: yamlBool(monitor, "enabled", true),
      monitorType: yamlValue(monitor, "type", "http"),
      monitorTarget: yamlValue(monitor, "target", yamlValue(block, "url")),
      backupRequired: yamlBool(backup, "required", false),
    };
  });
}

function buildServicesYaml(services: ServiceConfig[]) {
  return [
    "services:",
    ...services.flatMap((service) => [
      `  ${service.id}:`,
      `    host: ${service.host || "null"}`,
      `    type: ${service.type || "docker"}`,
      `    category: ${service.category || "app"}`,
      `    state: ${service.state || "observed"}`,
      `    visibility: ${service.visibility || "vpn_only"}`,
      `    url: ${service.url || "null"}`,
      `    path: ${service.path || "null"}`,
      `    description: ${service.description || ""}`,
      "    monitor:",
      `      enabled: ${service.monitorEnabled}`,
      `      type: ${service.monitorType || "http"}`,
      `      target: ${service.monitorTarget || service.url || "null"}`,
      "    backup:",
      `      required: ${service.backupRequired}`,
      "",
    ]),
  ].join("\n");
}

function parseBilling(content: string): BillingAssetConfig[] {
  const entries = blockEntries(content, "assets");
  if (!entries.length) return [billingDefaults];
  return entries.map((entry) => {
    const block = entry[2];
    return {
      ...billingDefaults,
      id: entry[1],
      type: yamlValue(block, "type", "vps"),
      provider: yamlValue(block, "provider"),
      linkedHost: yamlValue(block, "linked_host"),
      cost: yamlValue(block, "cost"),
      currency: yamlValue(block, "currency", "USD"),
      cycle: yamlValue(block, "cycle", "monthly"),
      renewalDate: yamlValue(block, "renewal_date"),
      importance: yamlValue(block, "importance", "normal"),
      action: yamlValue(block, "action", "auto_renew"),
    };
  });
}

function buildBillingYaml(assets: BillingAssetConfig[]) {
  return [
    "assets:",
    ...assets.flatMap((asset) => [
      `  ${asset.id}:`,
      `    type: ${asset.type || "vps"}`,
      `    provider: ${asset.provider || "unknown"}`,
      `    linked_host: ${asset.linkedHost || "null"}`,
      `    cost: ${yamlNull(asset.cost)}`,
      `    currency: ${asset.currency || "USD"}`,
      `    cycle: ${asset.cycle || "monthly"}`,
      `    renewal_date: ${asset.renewalDate || "null"}`,
      `    importance: ${asset.importance || "normal"}`,
      `    action: ${asset.action || "auto_renew"}`,
      "    wallos_id: null",
      "",
    ]),
  ].join("\n");
}

function parseDomains(content: string): DomainConfig[] {
  const entries = blockEntries(content, "domains");
  if (!entries.length) return [domainDefaults];
  return entries.map((entry) => {
    const block = entry[2];
    const records = Array.from(
      childBlock(block, "records").matchAll(/^ {6}([\w.-]+):\n([\s\S]*?)(?=^ {6}[\w.-]+:|(?![\s\S]))/gm),
    ).map((record) => ({
      id: record[1],
      type: yamlValue(record[2], "type", "A"),
      target: yamlValue(record[2], "target"),
      visibility: yamlValue(record[2], "visibility", "public"),
    }));
    return {
      ...domainDefaults,
      id: entry[1],
      provider: yamlValue(block, "provider", "cloudflare"),
      renewalDate: yamlValue(block, "renewal_date"),
      importance: yamlValue(block, "importance", "normal"),
      records,
    };
  });
}

function buildDomainsYaml(domains: DomainConfig[]) {
  return [
    "domains:",
    ...domains.flatMap((domain) => [
      `  ${domain.id}:`,
      `    provider: ${domain.provider || "cloudflare"}`,
      `    renewal_date: ${domain.renewalDate || "null"}`,
      `    importance: ${domain.importance || "normal"}`,
      "    records:",
      ...(domain.records.length
        ? domain.records.flatMap((record) => [
            `      ${record.id}:`,
            `        type: ${record.type || "A"}`,
            `        target: ${record.target || "null"}`,
            `        visibility: ${record.visibility || "public"}`,
          ])
        : ["      root:", "        type: A", "        target: null", "        visibility: public"]),
      "",
    ]),
  ].join("\n");
}

function parseNetwork(content: string): NetworkProfileConfig[] {
  const entries = blockEntries(content, "network_profiles");
  if (!entries.length) return [networkDefaults];
  return entries.map((entry) => {
    const block = entry[2];
    const score = childBlock(block, "score");
    const route = childBlock(block, "route");
    return {
      ...networkDefaults,
      id: entry[1],
      host: yamlValue(block, "host"),
      provider: yamlValue(block, "provider"),
      region: yamlValue(block, "region", "hk"),
      lineType: yamlValue(block, "line_type", "standard"),
      bandwidthMbps: yamlValue(block, "bandwidth_mbps"),
      trafficLimitGb: yamlValue(block, "traffic_limit_gb"),
      bestFor: yamlList(block, "best_for", "origin"),
      avoidFor: yamlList(block, "avoid_for", ""),
      chinaAccess: yamlValue(score, "china_access"),
      globalAccess: yamlValue(score, "global_access"),
      stability: yamlValue(score, "stability"),
      costEffective: yamlValue(score, "cost_effective"),
      notes: yamlValue(route, "notes"),
    };
  });
}

function listYaml(value: string, indent: string) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items.map((item) => `${indent}- ${item}`) : [`${indent}- origin`];
}

function buildNetworkYaml(profiles: NetworkProfileConfig[]) {
  return [
    "# 线路画像示例。实际结果可以由 scripts/network_probe.py 生成后人工确认再合并。",
    "",
    "network_profiles:",
    ...profiles.flatMap((profile) => [
      `  ${profile.id}:`,
      `    host: ${profile.host || "null"}`,
      `    provider: ${profile.provider || "unknown"}`,
      `    region: ${profile.region || "unknown"}`,
      `    line_type: ${profile.lineType || "standard"}`,
      `    bandwidth_mbps: ${yamlNull(profile.bandwidthMbps)}`,
      `    traffic_limit_gb: ${yamlNull(profile.trafficLimitGb)}`,
      "    best_for:",
      ...listYaml(profile.bestFor, "      "),
      "    avoid_for:",
      ...listYaml(profile.avoidFor || "none", "      "),
      "    route:",
      "      outbound: tcp_probe_only",
      "      return: unknown",
      `      notes: ${profile.notes || "待补充"}`,
      "    score:",
      `      china_access: ${yamlNull(profile.chinaAccess)}`,
      `      global_access: ${yamlNull(profile.globalAccess)}`,
      `      stability: ${yamlNull(profile.stability)}`,
      `      cost_effective: ${yamlNull(profile.costEffective)}`,
      `    last_tested_at: ${new Date().toISOString().slice(0, 10)}`,
      "",
    ]),
  ].join("\n");
}

function parseNetworkProbe(content: string): NetworkProbeConfig {
  const hostBlock = nestedBlock(content, "host", 0);
  const policyBlock = nestedBlock(content, "policy", 0);
  const defaultsBlock = nestedBlock(content, "defaults", 0);
  const probesBlock = nestedBlock(content, "probes", 0);
  const probes = ["china_telecom", "china_unicom", "china_mobile"].flatMap((carrier) => {
    const block = childBlock(probesBlock, carrier, 2);
    const match = block.match(/-\s+name:\s*(.*)\n([\s\S]*?)(?=\n\s*-\s+name:|(?![\s\S]))/m);
    if (!match) return networkProbeDefaults.probes.filter((probe) => probe.carrier === carrier);
    return [
      {
        carrier,
        name: match[1].trim(),
        host: yamlValue(match[2], "host"),
        port: yamlValue(match[2], "port", "80"),
        enabled: yamlBool(match[2], "enabled", false),
      },
    ];
  });
  return {
    ...networkProbeDefaults,
    hostId: yamlValue(hostBlock, "id", "front-01"),
    profileName: yamlValue(hostBlock, "profile_name", "good-cn-front"),
    region: yamlValue(hostBlock, "region", "hk"),
    provider: yamlValue(hostBlock, "provider"),
    lineType: yamlValue(hostBlock, "line_type", "premium"),
    bandwidthMbps: yamlValue(hostBlock, "bandwidth_mbps", "100"),
    trafficLimitGb: yamlValue(hostBlock, "traffic_limit_gb", "400"),
    protocol: yamlValue(policyBlock, "protocol", "tcp_ping"),
    attempts: yamlValue(defaultsBlock, "attempts", "5"),
    timeoutSeconds: yamlValue(defaultsBlock, "timeout_seconds", "2.0"),
    intervalSeconds: yamlValue(defaultsBlock, "interval_seconds", "0.2"),
    port: yamlValue(defaultsBlock, "port", "80"),
    probes,
  };
}

function buildNetworkProbeYaml(config: NetworkProbeConfig) {
  const carriers = ["china_telecom", "china_unicom", "china_mobile"];
  return [
    "# 三网 TCP-Ping 探针配置示例。",
    "version: 1",
    "",
    "host:",
    `  id: ${config.hostId || "front-01"}`,
    `  profile_name: ${config.profileName || "good-cn-front"}`,
    `  region: ${config.region || "hk"}`,
    `  provider: ${config.provider || "unknown"}`,
    `  line_type: ${config.lineType || "premium"}`,
    `  bandwidth_mbps: ${yamlNull(config.bandwidthMbps)}`,
    `  traffic_limit_gb: ${yamlNull(config.trafficLimitGb)}`,
    "",
    "policy:",
    `  protocol: ${config.protocol || "tcp_ping"}`,
    "  forbid_icmp: true",
    "  source_hint_url: https://zstaticcdn.com/",
    "  direction: outbound_to_probe",
    '  node_pattern_ipv4: "{provinceCode}-{carrierCode}-v4.ip.zstaticcdn.com:80"',
    '  node_pattern_ipv6: "{provinceCode}-{carrierCode}-v6.ip.zstaticcdn.com:80"',
    "  note: 仅检测当前执行机到三网 TCP 探针的 TCP 连接质量，不代表完整反向入站质量。",
    "",
    "defaults:",
    `  attempts: ${config.attempts || "5"}`,
    `  timeout_seconds: ${config.timeoutSeconds || "2.0"}`,
    `  interval_seconds: ${config.intervalSeconds || "0.2"}`,
    `  port: ${config.port || "80"}`,
    "",
    "probes:",
    ...carriers.flatMap((carrier) => {
      const probe = config.probes.find((item) => item.carrier === carrier) ?? {
        carrier,
        name: carrier,
        host: "",
        port: config.port,
        enabled: false,
      };
      return [
        `  ${carrier}:`,
        `    - name: ${probe.name || carrier}`,
        `      host: ${probe.host || "replace-after-reading-zstaticcdn.example"}`,
        `      port: ${probe.port || config.port || "80"}`,
        `      enabled: ${probe.enabled}`,
        "",
      ];
    }),
  ].join("\n");
}

function parseAlerts(content: string): AlertsConfig {
  const telegram = nestedBlock(content, "telegram", 0);
  const routes = nestedBlock(content, "routes", 0);
  const defaultRoute = childBlock(routes, "default", 2);
  const events = blockEntries(content, "events").map((entry) => ({
    id: entry[1],
    enabled: yamlBool(entry[2], "enabled", true),
    message: yamlValue(entry[2], "message"),
  }));
  return {
    ...alertsDefaults,
    telegramEnabled: yamlBool(telegram, "enabled", true),
    botTokenEnv: yamlValue(telegram, "bot_token_env", "TELEGRAM_BOT_TOKEN"),
    chatIdEnv: yamlValue(telegram, "chat_id_env", "TELEGRAM_CHAT_ID"),
    parseMode: yamlValue(telegram, "parse_mode", "HTML"),
    defaultSeverities: yamlList(defaultRoute, "severity", "warning, critical"),
    events: events.length ? events : alertsDefaults.events,
  };
}

function buildAlertsYaml(config: AlertsConfig) {
  return [
    "# 告警配置示例。",
    "",
    "telegram:",
    `  enabled: ${config.telegramEnabled}`,
    `  bot_token_env: ${config.botTokenEnv || "TELEGRAM_BOT_TOKEN"}`,
    `  chat_id_env: ${config.chatIdEnv || "TELEGRAM_CHAT_ID"}`,
    `  parse_mode: ${config.parseMode || "HTML"}`,
    "",
    "routes:",
    "  default:",
    "    channel: telegram",
    "    severity:",
    ...listYaml(config.defaultSeverities || "warning, critical", "      "),
    "",
    "events:",
    ...config.events.flatMap((event) => [
      `  ${event.id}:`,
      `    enabled: ${event.enabled}`,
      `    message: "${event.message || event.id}"`,
    ]),
    "",
  ].join("\n");
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 border-white/80 bg-white/75 text-slate-800 shadow-sm backdrop-blur placeholder:text-slate-400 focus:border-blue-200 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-slate-500">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 border-white/80 bg-white/75 text-slate-800 shadow-sm backdrop-blur focus:border-blue-200 focus:ring-blue-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EditorShell({
  title,
  description,
  count,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  count?: number;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/75 bg-white/60 p-4 shadow-sm backdrop-blur-xl">
        <div>
          <div className="font-medium text-slate-950">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        </div>
        <div className="flex items-center gap-2">
          {typeof count === "number" ? <StatusBadge tone="info">{count} items</StatusBadge> : null}
          {onAdd ? (
            <Button type="button" size="sm" variant="secondary" onClick={onAdd} className="border-white/80 bg-white/75 shadow-sm">
              <Plus className="h-4 w-4" />
              新增
            </Button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function ItemPanel({
  title,
  subtitle,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/75 bg-white/68 p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-950">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {onRemove ? (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label="删除" className="text-slate-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-[84px] items-center justify-between gap-4 rounded-md border border-white/75 bg-white/68 p-4 shadow-sm backdrop-blur-xl">
      <div>
        <div className="font-medium text-slate-950">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function PluginsEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const plugins = parsePlugins(content);
  const update = (name: string, enabled: boolean) => {
    onChange(buildPluginsYaml(plugins.map((item) => (item.name === name ? { ...item, enabled } : item))));
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {plugins.map((plugin) => (
        <ToggleRow
          key={plugin.name}
          title={pluginLabels[plugin.name] || plugin.name}
          description={plugin.description}
          checked={plugin.name === "core" || plugin.enabled}
          disabled={plugin.name === "core"}
          onCheckedChange={(checked) => update(plugin.name, checked)}
        />
      ))}
    </div>
  );
}

function CollectionEditor<T extends { id: string }>({
  items,
  onChange,
  build,
  createItem,
  title,
  description,
  renderItem,
}: {
  items: T[];
  onChange: (content: string) => void;
  build: (items: T[]) => string;
  createItem: () => T;
  title: string;
  description: string;
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const commit = (next: T[]) => onChange(build(next));
  return (
    <EditorShell
      title={title}
      description={description}
      count={items.length}
      onAdd={() => commit([...items, createItem()])}
    >
      <div className="grid gap-4">
        {items.map((item, index) => (
          <ItemPanel
            key={`${item.id}-${index}`}
            title={item.id || `item-${index + 1}`}
            subtitle={index === 0 ? "主配置" : undefined}
            onRemove={items.length > 1 ? () => commit(items.filter((_, itemIndex) => itemIndex !== index)) : undefined}
          >
            {renderItem(item, index, (patch) =>
              commit(items.map((value, itemIndex) => (itemIndex === index ? { ...value, ...patch } : value))),
            )}
          </ItemPanel>
        ))}
      </div>
    </EditorShell>
  );
}

function HostsEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const hosts = parseHosts(content);
  return (
    <CollectionEditor
      items={hosts}
      onChange={onChange}
      build={buildHostsYaml}
      createItem={() => ({ ...hostDefaults, id: `host-${hosts.length + 1}`, hostname: `host-${hosts.length + 1}` })}
      title="服务器台账"
      description="简洁模式适合维护主字段；Komari 回填的系统事实字段建议留给高级模式查看。"
      renderItem={(host, _index, update) => (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="ID" value={host.id} onChange={(id) => update({ id, hostname: host.hostname || id })} />
            <Field label="Hostname" value={host.hostname} onChange={(hostname) => update({ hostname })} />
            <Field label="公网 IP" value={host.publicIp} onChange={(publicIp) => update({ publicIp })} />
            <Field label="VPN IP" value={host.vpnIp} onChange={(vpnIp) => update({ vpnIp })} />
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <Field label="地区" value={host.region} onChange={(region) => update({ region })} />
            <Field label="服务商" value={host.provider} onChange={(provider) => update({ provider })} />
            <SelectField
              label="角色"
              value={host.role}
              onChange={(role) => update({ role })}
              options={[
                { value: "control", label: "控制节点" },
                { value: "front", label: "入口节点" },
                { value: "origin", label: "源站" },
                { value: "storage", label: "存储" },
              ]}
            />
            <SelectField
              label="状态"
              value={host.state}
              onChange={(state) => update({ state })}
              options={[
                { value: "observed", label: "Observed" },
                { value: "adopted", label: "Adopted" },
                { value: "managed", label: "Managed" },
                { value: "retired", label: "Retired" },
              ]}
            />
            <Field label="线路画像" value={host.networkProfile} onChange={(networkProfile) => update({ networkProfile })} />
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            <SelectField
              label="流量类型"
              value={host.trafficType}
              onChange={(trafficType) => update({ trafficType })}
              options={[
                { value: "unlimited", label: "不限流量" },
                { value: "limited", label: "限流量" },
              ]}
            />
            <Field label="月流量 GB" value={host.monthlyLimitGb} onChange={(monthlyLimitGb) => update({ monthlyLimitGb })} type="number" />
            <Field label="SSH 用户" value={host.sshUser} onChange={(sshUser) => update({ sshUser })} />
            <Field label="SSH 端口" value={host.sshPort} onChange={(sshPort) => update({ sshPort })} type="number" />
            <SelectField
              label="管理方式"
              value={host.management}
              onChange={(management) => update({ management })}
              options={[
                { value: "vpn_only", label: "VPN only" },
                { value: "public", label: "Public" },
                { value: "none", label: "None" },
              ]}
            />
          </div>
        </div>
      )}
    />
  );
}

function ServicesEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const services = parseServices(content);
  return (
    <CollectionEditor
      items={services}
      onChange={onChange}
      build={buildServicesYaml}
      createItem={() => ({ ...serviceDefaults, id: `service-${services.length + 1}` })}
      title="服务台账"
      description="维护服务归属、访问范围，并直接控制是否生成监控和备份关注项。"
      renderItem={(service, _index, update) => (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="服务 ID" value={service.id} onChange={(id) => update({ id })} />
            <Field label="所在节点" value={service.host} onChange={(host) => update({ host })} />
            <Field label="类型" value={service.type} onChange={(type) => update({ type })} />
            <Field label="分类" value={service.category} onChange={(category) => update({ category })} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField
              label="状态"
              value={service.state}
              onChange={(state) => update({ state })}
              options={[
                { value: "observed", label: "Observed" },
                { value: "adopted", label: "Adopted" },
                { value: "managed", label: "Managed" },
                { value: "retired", label: "Retired" },
              ]}
            />
            <SelectField
              label="可见性"
              value={service.visibility}
              onChange={(visibility) => update({ visibility })}
              options={[
                { value: "vpn_only", label: "VPN only" },
                { value: "public", label: "Public" },
                { value: "internal", label: "Internal" },
              ]}
            />
            <Field label="URL" value={service.url} onChange={(url) => update({ url, monitorTarget: service.monitorTarget || url })} />
            <Field label="路径" value={service.path} onChange={(path) => update({ path })} />
          </div>
          <Field label="描述" value={service.description} onChange={(description) => update({ description })} />
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleRow
              title="生成监控"
              description={`${service.monitorType || "http"} -> ${service.monitorTarget || service.url || "未配置"}`}
              checked={service.monitorEnabled}
              onCheckedChange={(monitorEnabled) => update({ monitorEnabled })}
            />
            <ToggleRow
              title="备份关注"
              description="在报表里标记为需要备份。"
              checked={service.backupRequired}
              onCheckedChange={(backupRequired) => update({ backupRequired })}
            />
          </div>
        </div>
      )}
    />
  );
}

function BillingEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const assets = parseBilling(content);
  return (
    <CollectionEditor
      items={assets}
      onChange={onChange}
      build={buildBillingYaml}
      createItem={() => ({ ...billingDefaults, id: `asset-${assets.length + 1}` })}
      title="续费资产"
      description="维护续费日期、成本和续费策略，后续可同步 Wallos。"
      renderItem={(asset, _index, update) => (
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="资产 ID" value={asset.id} onChange={(id) => update({ id })} />
          <SelectField
            label="类型"
            value={asset.type}
            onChange={(type) => update({ type })}
            options={[
              { value: "vps", label: "VPS" },
              { value: "domain", label: "域名" },
              { value: "subscription", label: "订阅" },
            ]}
          />
          <Field label="服务商" value={asset.provider} onChange={(provider) => update({ provider })} />
          <Field label="关联节点" value={asset.linkedHost} onChange={(linkedHost) => update({ linkedHost })} />
          <Field label="续费日" value={asset.renewalDate} onChange={(renewalDate) => update({ renewalDate })} type="date" />
          <Field label="金额" value={asset.cost} onChange={(cost) => update({ cost })} type="number" />
          <Field label="币种" value={asset.currency} onChange={(currency) => update({ currency })} />
          <SelectField
            label="周期"
            value={asset.cycle}
            onChange={(cycle) => update({ cycle })}
            options={[
              { value: "monthly", label: "月付" },
              { value: "yearly", label: "年付" },
              { value: "one_time", label: "一次性" },
            ]}
          />
          <SelectField
            label="重要性"
            value={asset.importance}
            onChange={(importance) => update({ importance })}
            options={[
              { value: "normal", label: "普通" },
              { value: "critical", label: "关键" },
              { value: "low", label: "低" },
            ]}
          />
          <SelectField
            label="动作"
            value={asset.action}
            onChange={(action) => update({ action })}
            options={[
              { value: "auto_renew", label: "自动续费" },
              { value: "review_before_renew", label: "续前复核" },
              { value: "cancel", label: "取消" },
            ]}
          />
        </div>
      )}
    />
  );
}

function DomainsEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const domains = parseDomains(content);
  return (
    <CollectionEditor
      items={domains}
      onChange={onChange}
      build={buildDomainsYaml}
      createItem={() => ({ ...domainDefaults, id: `example-${domains.length + 1}.com` })}
      title="域名与记录"
      description="管理域名续费和关键 DNS 记录，复杂记录可以切到 YAML 微调。"
      renderItem={(domain, index, update) => {
        const updateRecord = (recordIndex: number, patch: Partial<DomainConfig["records"][number]>) => {
          update({
            records: domain.records.map((record, itemIndex) =>
              itemIndex === recordIndex ? { ...record, ...patch } : record,
            ),
          });
        };
        return (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="域名" value={domain.id} onChange={(id) => update({ id })} />
              <Field label="服务商" value={domain.provider} onChange={(provider) => update({ provider })} />
              <Field label="续费日" value={domain.renewalDate} onChange={(renewalDate) => update({ renewalDate })} type="date" />
              <SelectField
                label="重要性"
                value={domain.importance}
                onChange={(importance) => update({ importance })}
                options={[
                  { value: "normal", label: "普通" },
                  { value: "critical", label: "关键" },
                  { value: "low", label: "低" },
                ]}
              />
            </div>
            <div className="rounded-md border border-white/70 bg-white/45 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">DNS 记录</div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-white/70"
                  onClick={() =>
                    update({
                      records: [...domain.records, { id: `record-${domain.records.length + 1}`, type: "A", target: "", visibility: "public" }],
                    })
                  }
                >
                  <Plus className="h-4 w-4" />
                  记录
                </Button>
              </div>
              <div className="grid gap-3">
                {(domain.records.length ? domain.records : [{ id: "root", type: "A", target: "", visibility: "public" }]).map(
                  (record, recordIndex) => (
                    <div key={`${domain.id}-${record.id}-${recordIndex}`} className="grid gap-3 md:grid-cols-[1fr_120px_1fr_140px_40px]">
                      <Field label="名称" value={record.id} onChange={(id) => updateRecord(recordIndex, { id })} />
                      <Field label="类型" value={record.type} onChange={(type) => updateRecord(recordIndex, { type })} />
                      <Field label="目标" value={record.target} onChange={(target) => updateRecord(recordIndex, { target })} />
                      <SelectField
                        label="可见性"
                        value={record.visibility}
                        onChange={(visibility) => updateRecord(recordIndex, { visibility })}
                        options={[
                          { value: "public", label: "Public" },
                          { value: "vpn_only", label: "VPN only" },
                          { value: "internal", label: "Internal" },
                        ]}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => update({ records: domain.records.filter((_, itemIndex) => itemIndex !== recordIndex) })}
                          disabled={!domain.records.length}
                          aria-label={`删除 ${record.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}

function NetworkEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const profiles = parseNetwork(content);
  return (
    <CollectionEditor
      items={profiles}
      onChange={onChange}
      build={buildNetworkYaml}
      createItem={() => ({ ...networkDefaults, id: `profile-${profiles.length + 1}` })}
      title="线路画像"
      description="维护面向调度和人工决策的线路质量摘要，详细探针结果可在 YAML 里保留。"
      renderItem={(profile, _index, update) => (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="画像 ID" value={profile.id} onChange={(id) => update({ id })} />
            <Field label="节点" value={profile.host} onChange={(host) => update({ host })} />
            <Field label="服务商" value={profile.provider} onChange={(provider) => update({ provider })} />
            <Field label="地区" value={profile.region} onChange={(region) => update({ region })} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <SelectField
              label="线路类型"
              value={profile.lineType}
              onChange={(lineType) => update({ lineType })}
              options={[
                { value: "premium", label: "Premium" },
                { value: "standard", label: "Standard" },
                { value: "budget", label: "Budget" },
              ]}
            />
            <Field label="带宽 Mbps" value={profile.bandwidthMbps} onChange={(bandwidthMbps) => update({ bandwidthMbps })} type="number" />
            <Field label="流量上限 GB" value={profile.trafficLimitGb} onChange={(trafficLimitGb) => update({ trafficLimitGb })} type="number" />
            <Field label="备注" value={profile.notes} onChange={(notes) => update({ notes })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="适合用途，逗号分隔" value={profile.bestFor} onChange={(bestFor) => update({ bestFor })} />
            <Field label="避免用途，逗号分隔" value={profile.avoidFor} onChange={(avoidFor) => update({ avoidFor })} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="中国访问" value={profile.chinaAccess} onChange={(chinaAccess) => update({ chinaAccess })} type="number" />
            <Field label="全球访问" value={profile.globalAccess} onChange={(globalAccess) => update({ globalAccess })} type="number" />
            <Field label="稳定性" value={profile.stability} onChange={(stability) => update({ stability })} type="number" />
            <Field label="性价比" value={profile.costEffective} onChange={(costEffective) => update({ costEffective })} type="number" />
          </div>
        </div>
      )}
    />
  );
}

function NetworkProbesEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const config = parseNetworkProbe(content);
  const update = (patch: Partial<NetworkProbeConfig>) => onChange(buildNetworkProbeYaml({ ...config, ...patch }));
  const updateProbe = (index: number, patch: Partial<NetworkProbeConfig["probes"][number]>) =>
    update({
      probes: config.probes.map((probe, itemIndex) => (itemIndex === index ? { ...probe, ...patch } : probe)),
    });

  return (
    <EditorShell
      title="TCP-Ping 探针"
      description="只配置 TCP-Ping，不配置 ICMP；探针地址读取 zstaticcdn 后再填写。"
      count={config.probes.length}
    >
      <div className="grid gap-4">
        <ItemPanel title="目标节点" subtitle="生成 network profile 的基础信息">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="节点 ID" value={config.hostId} onChange={(hostId) => update({ hostId })} />
            <Field label="画像名称" value={config.profileName} onChange={(profileName) => update({ profileName })} />
            <Field label="地区" value={config.region} onChange={(region) => update({ region })} />
            <Field label="服务商" value={config.provider} onChange={(provider) => update({ provider })} />
            <SelectField
              label="线路类型"
              value={config.lineType}
              onChange={(lineType) => update({ lineType })}
              options={[
                { value: "premium", label: "Premium" },
                { value: "standard", label: "Standard" },
                { value: "budget", label: "Budget" },
              ]}
            />
            <Field label="带宽 Mbps" value={config.bandwidthMbps} onChange={(bandwidthMbps) => update({ bandwidthMbps })} type="number" />
            <Field label="流量上限 GB" value={config.trafficLimitGb} onChange={(trafficLimitGb) => update({ trafficLimitGb })} type="number" />
            <Field label="默认端口" value={config.port} onChange={(port) => update({ port })} type="number" />
          </div>
        </ItemPanel>
        <ItemPanel title="探测参数" subtitle="影响单次探测的耗时和容错">
          <div className="grid gap-4 md:grid-cols-4">
            <Field label="协议" value={config.protocol} onChange={(protocol) => update({ protocol })} disabled />
            <Field label="次数" value={config.attempts} onChange={(attempts) => update({ attempts })} type="number" />
            <Field label="超时秒" value={config.timeoutSeconds} onChange={(timeoutSeconds) => update({ timeoutSeconds })} type="number" />
            <Field label="间隔秒" value={config.intervalSeconds} onChange={(intervalSeconds) => update({ intervalSeconds })} type="number" />
          </div>
        </ItemPanel>
        <ItemPanel title="三网节点" subtitle="填写 TCP 探针 host，按运营商独立开关">
          <div className="grid gap-3">
            {config.probes.map((probe, index) => (
              <div key={probe.carrier} className="grid gap-3 rounded-md border border-white/70 bg-white/45 p-3 md:grid-cols-[150px_1fr_110px_120px]">
                <Field label="名称" value={probe.name} onChange={(name) => updateProbe(index, { name })} />
                <Field label="Host" value={probe.host} onChange={(host) => updateProbe(index, { host })} />
                <Field label="端口" value={probe.port} onChange={(port) => updateProbe(index, { port })} type="number" />
                <div className="flex items-end">
                  <ToggleRow
                    title="启用"
                    description={probe.carrier.replace("china_", "")}
                    checked={probe.enabled}
                    onCheckedChange={(enabled) => updateProbe(index, { enabled })}
                  />
                </div>
              </div>
            ))}
          </div>
        </ItemPanel>
      </div>
    </EditorShell>
  );
}

function AlertsEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const config = parseAlerts(content);
  const update = (patch: Partial<AlertsConfig>) => onChange(buildAlertsYaml({ ...config, ...patch }));
  const updateEvent = (index: number, patch: Partial<AlertsConfig["events"][number]>) =>
    update({
      events: config.events.map((event, itemIndex) => (itemIndex === index ? { ...event, ...patch } : event)),
    });

  return (
    <EditorShell
      title="告警配置"
      description="真实 Token 仍然只放环境变量，这里只维护变量名、路由和事件模板。"
      count={config.events.length}
      onAdd={() =>
        update({
          events: [...config.events, { id: `custom_event_${config.events.length + 1}`, enabled: true, message: "自定义告警" }],
        })
      }
    >
      <div className="grid gap-4">
        <ItemPanel title="Telegram 通道">
          <div className="grid gap-4 md:grid-cols-4">
            <ToggleRow
              title="启用 Telegram"
              description="关闭后保留配置但不发送。"
              checked={config.telegramEnabled}
              onCheckedChange={(telegramEnabled) => update({ telegramEnabled })}
            />
            <Field label="Bot Token 环境变量" value={config.botTokenEnv} onChange={(botTokenEnv) => update({ botTokenEnv })} />
            <Field label="Chat ID 环境变量" value={config.chatIdEnv} onChange={(chatIdEnv) => update({ chatIdEnv })} />
            <SelectField
              label="Parse Mode"
              value={config.parseMode}
              onChange={(parseMode) => update({ parseMode })}
              options={[
                { value: "HTML", label: "HTML" },
                { value: "MarkdownV2", label: "MarkdownV2" },
                { value: "plain", label: "Plain" },
              ]}
            />
          </div>
        </ItemPanel>
        <ItemPanel title="默认路由">
          <Field
            label="严重级别，逗号分隔"
            value={config.defaultSeverities}
            onChange={(defaultSeverities) => update({ defaultSeverities })}
          />
        </ItemPanel>
        <ItemPanel title="事件模板">
          <div className="grid gap-3">
            {config.events.map((event, index) => (
              <div key={`${event.id}-${index}`} className="grid gap-3 rounded-md border border-white/70 bg-white/45 p-3 md:grid-cols-[1fr_1fr_130px_40px]">
                <Field label="事件 ID" value={event.id} onChange={(id) => updateEvent(index, { id })} />
                <Field label="消息" value={event.message} onChange={(message) => updateEvent(index, { message })} />
                <div className="flex items-end">
                  <ToggleRow
                    title="启用"
                    description="事件开关"
                    checked={event.enabled}
                    onCheckedChange={(enabled) => updateEvent(index, { enabled })}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update({ events: config.events.filter((_, itemIndex) => itemIndex !== index) })}
                    aria-label={`删除 ${event.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ItemPanel>
      </div>
    </EditorShell>
  );
}

function KomariEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const config = parseKomari(content);
  const update = (patch: Partial<KomariConfig>) => onChange(patchKomariYaml(content, patch));

  return (
    <EditorShell
      title="Komari API 对接"
      description="这里只配置 API 拉取和合并策略，不生成或修改 Komari Agent 命令。"
    >
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Komari 地址" value={config.endpoint} onChange={(endpoint) => update({ endpoint })} />
          <Field label="API Token 环境变量" value={config.apiKeyEnv} onChange={(apiKeyEnv) => update({ apiKeyEnv })} />
          <Field label="发现结果输出" value={config.output} onChange={(output) => update({ output })} />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <SelectField
            label="新节点状态"
            value={config.defaultState}
            onChange={(defaultState) => update({ defaultState })}
            options={[
              { value: "observed", label: "Observed" },
              { value: "adopted", label: "Adopted" },
              { value: "managed", label: "Managed" },
            ]}
          />
          <Field label="SSH 用户" value={config.sshUser} onChange={(sshUser) => update({ sshUser })} />
          <Field label="SSH 端口" value={config.sshPort} onChange={(sshPort) => update({ sshPort })} type="number" />
          <SelectField
            label="管理方式"
            value={config.management}
            onChange={(management) => update({ management })}
            options={[
              { value: "vpn_only", label: "VPN only" },
              { value: "public", label: "Public" },
              { value: "none", label: "None" },
            ]}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ToggleRow
            title="保留原始字段"
            description="未映射字段保留到 komari.raw，方便后续扩展。"
            checked={config.includeRaw}
            onCheckedChange={(includeRaw) => update({ includeRaw })}
          />
          <ToggleRow
            title="刷新事实字段"
            description="同步 source、system、komari、traffic。"
            checked={config.updateExistingFacts}
            onCheckedChange={(updateExistingFacts) => update({ updateExistingFacts })}
          />
          <ToggleRow
            title="强覆盖管理字段"
            description="覆盖 role、state、region、access 等字段。"
            checked={config.overwriteManagedFields}
            onCheckedChange={(overwriteManagedFields) => update({ overwriteManagedFields })}
          />
        </div>
      </div>
    </EditorShell>
  );
}

function IntegrationsEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  const config = parseIntegrations(content);
  const update = (key: keyof IntegrationsConfig, patch: Partial<IntegrationConfig>) =>
    onChange(buildIntegrationsYaml({ ...config, [key]: { ...config[key], ...patch } }));

  const renderPanel = (key: keyof IntegrationsConfig, title: string, value: IntegrationConfig) => (
    <div className="rounded-md border border-white/70 bg-white/55 p-4">
      <div className="mb-4 text-sm font-semibold text-slate-950">{title}</div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Adapter" value={value.adapter} onChange={(adapter) => update(key, { adapter })} />
        <Field label="Base URL" value={value.baseUrl} onChange={(baseUrl) => update(key, { baseUrl })} />
        <Field label="Token 环境变量" value={value.apiTokenEnv} onChange={(apiTokenEnv) => update(key, { apiTokenEnv })} />
        <Field label="State 文件" value={value.stateFile} onChange={(stateFile) => update(key, { stateFile })} />
        <Field label="Preview 文件" value={value.previewFile} onChange={(previewFile) => update(key, { previewFile })} />
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {renderPanel("uptimeKuma", "Uptime Kuma", config.uptimeKuma)}
      {renderPanel("wallos", "Wallos", config.wallos)}
    </div>
  );
}

function SimpleEditor({
  selected,
  content,
  onChange,
}: {
  selected: InfraInventoryName;
  content: string;
  onChange: (content: string) => void;
}) {
  if (selected === "plugins") return <PluginsEditor content={content} onChange={onChange} />;
  if (selected === "hosts") return <HostsEditor content={content} onChange={onChange} />;
  if (selected === "services") return <ServicesEditor content={content} onChange={onChange} />;
  if (selected === "billing") return <BillingEditor content={content} onChange={onChange} />;
  if (selected === "komari") return <KomariEditor content={content} onChange={onChange} />;
  if (selected === "integrations") return <IntegrationsEditor content={content} onChange={onChange} />;
  if (selected === "domains") return <DomainsEditor content={content} onChange={onChange} />;
  if (selected === "network") return <NetworkEditor content={content} onChange={onChange} />;
  if (selected === "network-probes") return <NetworkProbesEditor content={content} onChange={onChange} />;
  if (selected === "alerts") return <AlertsEditor content={content} onChange={onChange} />;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-800">
      这个配置结构比较复杂，当前请使用高级 YAML 模式编辑。后续可以继续为服务器、服务、续费、域名等台账补专用表单。
    </div>
  );
}

function InventoryQuickStats({
  selected,
  content,
}: {
  selected: InfraInventoryName;
  content: string;
}) {
  const stats = useMemo(() => {
    if (selected === "plugins") {
      const plugins = parsePlugins(content);
      return [
        { label: "插件", value: String(plugins.length) },
        { label: "启用", value: String(plugins.filter((item) => item.enabled || item.name === "core").length) },
        { label: "核心", value: plugins.some((item) => item.name === "core") ? "on" : "-" },
      ];
    }
    if (selected === "hosts") {
      const hosts = parseHosts(content);
      return [
        { label: "节点", value: String(hosts.length) },
        { label: "Managed", value: String(hosts.filter((item) => item.state === "managed").length) },
        { label: "限流", value: String(hosts.filter((item) => item.trafficType === "limited").length) },
      ];
    }
    if (selected === "services") {
      const services = parseServices(content);
      return [
        { label: "服务", value: String(services.length) },
        { label: "公网", value: String(services.filter((item) => item.visibility === "public").length) },
        { label: "监控", value: String(services.filter((item) => item.monitorEnabled).length) },
      ];
    }
    if (selected === "billing") {
      const assets = parseBilling(content);
      return [
        { label: "资产", value: String(assets.length) },
        { label: "关键", value: String(assets.filter((item) => item.importance === "critical").length) },
        { label: "复核", value: String(assets.filter((item) => item.action === "review_before_renew").length) },
      ];
    }
    if (selected === "domains") {
      const domains = parseDomains(content);
      return [
        { label: "域名", value: String(domains.length) },
        { label: "记录", value: String(domains.reduce((sum, item) => sum + item.records.length, 0)) },
        { label: "关键", value: String(domains.filter((item) => item.importance === "critical").length) },
      ];
    }
    if (selected === "network") {
      const profiles = parseNetwork(content);
      return [
        { label: "画像", value: String(profiles.length) },
        { label: "Premium", value: String(profiles.filter((item) => item.lineType === "premium").length) },
        { label: "评分", value: String(profiles.filter((item) => item.chinaAccess || item.stability).length) },
      ];
    }
    if (selected === "network-probes") {
      const config = parseNetworkProbe(content);
      return [
        { label: "探针", value: String(config.probes.length) },
        { label: "启用", value: String(config.probes.filter((item) => item.enabled).length) },
        { label: "协议", value: config.protocol || "tcp_ping" },
      ];
    }
    if (selected === "alerts") {
      const config = parseAlerts(content);
      return [
        { label: "事件", value: String(config.events.length) },
        { label: "启用", value: String(config.events.filter((item) => item.enabled).length) },
        { label: "通道", value: config.telegramEnabled ? "on" : "off" },
      ];
    }
    if (selected === "komari") {
      const config = parseKomari(content);
      return [
        { label: "发现", value: config.includeRaw ? "raw" : "mapped" },
        { label: "合并", value: config.updateExistingFacts ? "facts" : "manual" },
        { label: "覆盖", value: config.overwriteManagedFields ? "on" : "off" },
      ];
    }
    return [
      { label: "配置", value: "2" },
      { label: "状态", value: "ready" },
      { label: "模式", value: "visual" },
    ];
  }, [content, selected]);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((item) => (
        <div key={item.label} className="rounded-md border border-white/75 bg-white/62 p-3 shadow-sm backdrop-blur-xl">
          <div className="text-xs text-slate-500">{item.label}</div>
          <div className="mt-1 truncate text-lg font-semibold text-slate-950">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function InfraInventoryPage() {
  const [selected, setSelected] = useState<InfraInventoryName>("plugins");
  const [mode, setMode] = useState<EditorMode>("simple");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  const namesQuery = useQuery({
    queryKey: ["infra", "inventory", "names"],
    queryFn: listInventoryNames,
  });
  const fileQuery = useQuery({
    queryKey: ["infra", "inventory", selected],
    queryFn: () => getInventoryFile(selected),
  });
  const saveMutation = useMutation({
    mutationFn: () => saveInventoryFile(selected, content),
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: ["infra", "inventory", selected] });
      void queryClient.invalidateQueries({ queryKey: ["infra"] });
    },
  });

  useEffect(() => {
    if (fileQuery.data) {
      setContent(fileQuery.data.content || fileQuery.data.exampleContent);
    }
  }, [fileQuery.data]);

  const names = useMemo(
    () => namesQuery.data ?? (Object.keys(labels) as InfraInventoryName[]),
    [namesQuery.data],
  );
  const file = fileQuery.data;
  const selectedMeta = simpleEditorMeta[selected];

  const isBooting = fileQuery.isLoading && !file;
  const isSaving = saveMutation.isPending;

  return (
    <GlassPage>
      <GlassBackdrop />
      <PageContainer className="relative z-10">
        <PageHeader
          title="Inventory 配置"
          description="简洁模式可视化填写常用配置，高级模式直接编辑 YAML。保存前会备份，保存后校验并刷新生成物。"
          actions={
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 rounded-md border border-white/70 bg-white/65 p-1 shadow-sm backdrop-blur-xl">
                {(["simple", "advanced"] as EditorMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded px-3 text-sm transition",
                      mode === item
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"
                        : "text-slate-600 hover:bg-white/75 hover:text-slate-950",
                    )}
                  >
                    {item === "simple" ? <SlidersHorizontal className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
                    {item === "simple" ? "简洁" : "高级"}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={isSaving || fileQuery.isLoading}
                className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "处理中" : "保存"}
              </Button>
            </div>
          }
        />

        <div className="mt-6 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <GlassPanel className="h-fit p-4 xl:sticky xl:top-20">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Configs</div>
              <StatusBadge tone="info">{names.length} files</StatusBadge>
            </div>
            <div className="space-y-1">
              {names.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelected(name)}
                  className={cn(
                    "flex min-h-[64px] w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-all duration-200",
                    selected === name
                      ? "border-blue-100 bg-white/90 text-slate-950 shadow-sm"
                      : "border-transparent text-slate-600 hover:border-white/75 hover:bg-white/72 hover:text-slate-950",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("text-slate-400", selected === name && "text-blue-600")}>
                      {simpleEditorMeta[name]?.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{labels[name]}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400">{simpleEditorMeta[name]?.summary}</span>
                    </span>
                  </span>
                  <span className="text-xs opacity-70">{name}</span>
                </button>
              ))}
            </div>
          </GlassPanel>

          <div className="grid gap-5">
            <GlassPanel className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-base font-semibold text-slate-950">
                    <span className="text-blue-600">{selectedMeta.icon}</span>
                    {labels[selected]} {mode === "simple" ? "简洁配置" : "YAML"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {selectedMeta.summary} · {file?.localFile ?? "loading"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={file?.exists ? "success" : "warning"}>
                    {file?.exists ? "本地文件" : "使用示例"}
                  </StatusBadge>
                  {saveMutation.data ? <StatusBadge tone="info">已保存 {saveMutation.data.bytes} bytes</StatusBadge> : null}
                </div>
              </div>

              <div className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <InventoryQuickStats selected={selected} content={content} />
                <div className="rounded-md border border-white/75 bg-white/62 p-3 shadow-sm backdrop-blur-xl">
                  <div className="text-xs text-slate-500">写入目标</div>
                  <div className="mt-1 truncate text-sm font-medium text-slate-800">{file?.localFile ?? "loading"}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {mode === "simple" ? "可视化编辑会即时同步到底层 YAML。" : "高级模式直接编辑原始 YAML。"}
                  </div>
                </div>
              </div>

              {isBooting ? (
                <LoadingSkeleton />
              ) : mode === "simple" ? (
                <div className="rounded-lg border border-white/75 bg-white/38 p-4 shadow-inner backdrop-blur-xl">
                  <SimpleEditor selected={selected} content={content} onChange={setContent} />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label className="text-sm font-medium text-slate-700" htmlFor="infra-inventory-yaml">
                    Inventory YAML
                  </Label>
                  <Textarea
                    id="infra-inventory-yaml"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    spellCheck={false}
                    className="min-h-[560px] resize-y border-white/75 bg-white/72 font-mono text-xs leading-5 shadow-inner backdrop-blur"
                  />
                </div>
              )}

              {saveMutation.isError ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
                  {(saveMutation.error as Error).message}
                </div>
              ) : null}
              {saveMutation.data?.validation.exitCode === 0 && saveMutation.data?.generation.exitCode === 0 ? (
                <div className="mt-3 rounded-md border border-green-200 bg-green-50/80 p-3 text-sm text-green-700">
                  保存后已自动校验并刷新正式生成物。
                </div>
              ) : null}
              {saveMutation.data && saveMutation.data.validation.exitCode !== 0 ? (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-700">
                  保存后校验失败：{saveMutation.data.validation.stderr || saveMutation.data.validation.stdout}
                </div>
              ) : null}
              {saveMutation.data &&
              saveMutation.data.validation.exitCode === 0 &&
              saveMutation.data.generation.exitCode !== 0 ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-700">
                  保存后校验已通过，但刷新生成物失败：
                  {saveMutation.data.generation.stderr || saveMutation.data.generation.stdout}
                </div>
              ) : null}
              {saveMutation.data?.backupFile ? (
                <div className="mt-3 text-xs text-slate-500">备份文件：{saveMutation.data.backupFile}</div>
              ) : null}
            </GlassPanel>

            <GlassPanel className="p-5">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-950">
                <FileCode2 className="h-4 w-4 text-blue-600" />
                示例内容
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <span>{file?.exampleFile ?? "loading"}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setContent(file?.exampleContent ?? "")}
                  disabled={!file?.exampleContent}
                  className="bg-white/65"
                >
                  <Copy className="h-4 w-4" />
                  使用示例
                </Button>
              </div>
              <pre className="max-h-[360px] overflow-auto rounded-md border border-white/75 bg-white/62 p-4 text-xs leading-5 text-slate-700 shadow-inner backdrop-blur">
                {file?.exampleContent || "暂无示例"}
              </pre>
            </GlassPanel>
          </div>
        </div>
      </PageContainer>
    </GlassPage>
  );
}
