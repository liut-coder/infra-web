export interface InfraOverview {
  metadata: {
    generatedAt: string | null;
    source: string;
    dataPath: string;
  };
  stats: {
    hosts: number;
    services: number;
    billingAssets: number;
    domains: number;
    networkProfiles: number;
    limitedTrafficHosts: number;
    publicServices: number;
    criticalRenewals: number;
  };
  hosts: InfraHost[];
  services: InfraService[];
  billing: InfraBillingAsset[];
  domains: InfraDomain[];
  networkProfiles: InfraNetworkProfile[];
}

export interface InfraHost {
  id: string;
  hostname?: string;
  public_ip?: string;
  vpn_ip?: string;
  region?: string;
  provider?: string;
  role?: string;
  state?: string;
  network_profile?: string;
  traffic?: {
    type?: string;
    monthly_limit_gb?: number;
  };
}

export interface InfraService {
  id: string;
  host?: string;
  type?: string;
  category?: string;
  state?: string;
  visibility?: string;
  url?: string;
  description?: string;
}

export interface InfraBillingAsset {
  id: string;
  type?: string;
  provider?: string;
  linked_host?: string;
  cost?: number;
  currency?: string;
  cycle?: string;
  renewal_date?: string;
  importance?: string;
  action?: string;
}

export interface InfraDomain {
  id: string;
  provider?: string;
  renewal_date?: string;
  importance?: string;
  records?: Record<string, unknown>;
}

export interface InfraNetworkProfile {
  id: string;
  host?: string;
  provider?: string;
  region?: string;
  line_type?: string;
  bandwidth_mbps?: number;
  traffic_limit_gb?: number | null;
  score?: {
    china_access?: number;
    global_access?: number;
    stability?: number;
    cost_effective?: number;
  };
}

export type InfraAction =
  | "status"
  | "bootstrap"
  | "bootstrap-new"
  | "validate"
  | "demo"
  | "generate"
  | "discover-komari"
  | "merge-preview"
  | "merge-apply"
  | "sync-uptime-kuma-preview"
  | "sync-uptime-kuma-apply"
  | "sync-wallos-preview"
  | "sync-wallos-apply"
  | "adopt-scan"
  | "retire-check";

export type InfraCommandAction = InfraAction | "retire-apply";

export interface InfraCommandResult {
  action: InfraCommandAction;
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
  highRisk?: boolean;
  confirmationRequired?: boolean;
  artifacts?: string[];
}

export interface InfraActionCatalogItem {
  key: InfraAction;
  title: string;
  description: string;
  group: "准备" | "生成" | "同步" | "生命周期";
  highRisk: boolean;
  confirmationRequired: boolean;
  confirmationToken: string | null;
  command: string[];
  artifacts: string[];
}

export type InfraInventoryName =
  | "plugins"
  | "hosts"
  | "services"
  | "billing"
  | "integrations"
  | "domains"
  | "network"
  | "komari"
  | "network-probes"
  | "alerts";

export interface InfraInventoryFile {
  name: InfraInventoryName;
  localFile: string;
  exampleFile: string;
  exists: boolean;
  exampleExists: boolean;
  content: string;
  exampleContent: string;
}

export interface InfraInventorySaveResult {
  name: InfraInventoryName;
  file: string;
  backupFile: string | null;
  bytes: number;
  validation: InfraCommandResult;
  generation: InfraCommandResult;
}

export type InfraGeneratedName =
  | "komari-discovery"
  | "merge-preview"
  | "ansible-inventory"
  | "network-report"
  | "renewals-report"
  | "uptime-kuma-plan"
  | "uptime-kuma-sync-preview"
  | "uptime-kuma-sync-state"
  | "wallos-plan"
  | "wallos-sync-preview"
  | "wallos-sync-state"
  | "wallos-csv"
  | "adopt-index"
  | "bootstrap-index"
  | "semaphore-plan"
  | "retirement-report"
  | "retirement-index"
  | "retirement-last-apply"
  | "web-data";

export interface InfraGeneratedFileSummary {
  name: InfraGeneratedName;
  label: string;
  file: string;
  exists: boolean;
  bytes: number;
  updatedAt: string | null;
  producers?: InfraCommandAction[];
}

export interface InfraGeneratedFile extends InfraGeneratedFileSummary {
  content: string;
}
