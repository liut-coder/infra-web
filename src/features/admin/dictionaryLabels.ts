import type { DictionaryItemRecord, DictionaryRecord } from "./types";

const dictionaryNameMap: Record<string, string> = {
  "common.status": "通用状态",
  "user.status": "用户状态",
  "release.channel": "发布渠道",
};

const dictionaryDescriptionMap: Record<string, string> = {
  "common.status": "适用于启用、停用等通用二元状态",
  "user.status": "适用于后台用户账号状态",
  "release.channel": "适用于版本发布和灰度渠道",
};

const itemLabelMap: Record<string, Record<string, string>> = {
  "common.status": {
    enabled: "启用",
    disabled: "停用",
  },
  "user.status": {
    active: "正常",
    inactive: "停用",
    locked: "锁定",
  },
  "release.channel": {
    dev: "开发",
    beta: "测试",
    stable: "稳定",
  },
};

const colorClassMap: Record<string, string> = {
  green: "bg-green-500",
  gray: "bg-zinc-400",
  red: "bg-red-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  yellow: "bg-amber-500",
  purple: "bg-purple-500",
};

export function getDictionaryDisplayName(
  dictionary: Pick<DictionaryRecord, "key" | "name">,
) {
  return dictionaryNameMap[dictionary.key] || dictionary.name;
}

export function getDictionaryDisplayDescription(
  dictionary: Pick<DictionaryRecord, "key" | "description">,
) {
  return (
    dictionaryDescriptionMap[dictionary.key] || dictionary.description || "-"
  );
}

export function getDictionaryItemDisplayLabel(
  dictionaryKey: string,
  item: Pick<DictionaryItemRecord, "value" | "label">,
) {
  return itemLabelMap[dictionaryKey]?.[item.value] || item.label;
}

export function getColorClass(color?: string | null) {
  if (!color) return "bg-zinc-300";
  return colorClassMap[color] || "bg-zinc-300";
}
