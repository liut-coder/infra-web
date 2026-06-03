import { Bell, Globe2, Lock, Palette, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const sections = [
  { label: "基础设置", icon: Globe2 },
  { label: "安全策略", icon: ShieldCheck },
  { label: "通知", icon: Bell },
  { label: "主题", icon: Palette },
  { label: "访问控制", icon: Lock },
];

export function SettingsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="系统设置"
        description="管理全局配置、通知策略和访问控制"
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="p-3">
          {sections.map((item, index) => (
            <button
              key={item.label}
              className={`flex h-10 w-full items-center gap-3 rounded-md border px-3 text-sm transition ${index === 0 ? "border-blue-100 bg-white/90 text-slate-950 shadow-sm" : "border-transparent text-muted-foreground hover:border-white/70 hover:bg-white/70"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </Card>
        <Card className="p-5">
          <div className="mb-5 text-base font-semibold">基础设置</div>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label>站点名称</Label>
              <Input defaultValue="Nax Admin" />
            </div>
            <div className="grid gap-2">
              <Label>默认语言</Label>
              <Select defaultValue="zh">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">简体中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 border-t pt-5">
              {[
                "开启系统通知",
                "启用登录双因子校验",
                "保留最近 90 天审计日志",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item}</div>
                    <div className="text-xs text-muted-foreground">
                      建议生产环境开启。
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t pt-5">
              <Button>保存设置</Button>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
