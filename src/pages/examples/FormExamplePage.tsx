import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { SummaryPanel } from "@/components/shared/SummaryPanel";
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

const schema = z.object({
  name: z.string().min(2, "请输入资源名称"),
  region: z.string().min(1, "请选择区域"),
  type: z.string().min(1, "请选择规格"),
  owner: z.string().email("请输入负责人邮箱"),
  visibility: z.string().min(1, "请选择访问范围"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function FormExamplePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [monitorEnabled, setMonitorEnabled] = useState(true);
  const [backupRequired, setBackupRequired] = useState(true);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "api-gateway-01",
      region: "hk",
      type: "standard",
      owner: "admin@nax.local",
      visibility: "vpn_only",
      description: "生产网关服务，用于外部流量入口。",
    },
  });
  const values = form.watch();

  return (
    <GlassPage>
      <PageContainer>
        <PageHeader
          title="资源接入表单"
          description="把新服务接入 inventory、监控、备份和续费关注，形成单资源闭环。"
          actions={
            <Button variant="secondary" className="bg-white/70" onClick={() => setDrawerOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              高级字段
            </Button>
          }
        />
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <GlassPanel className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950">基础信息</div>
                <div className="mt-1 text-sm text-slate-500">保存后可生成服务台账、监控计划和审计记录。</div>
              </div>
              <StatusBadge tone="info">draft</StatusBadge>
            </div>
            <form
              className="grid gap-5"
              onSubmit={form.handleSubmit(() => setDrawerOpen(true))}
            >
              <div className="grid gap-2">
                <Label>资源名称</Label>
                <Input className="border-white/70 bg-white/65" {...form.register("name")} />
                <FieldError message={form.formState.errors.name?.message} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>区域</Label>
                  <Select
                    value={values.region}
                    onValueChange={(value) =>
                      form.setValue("region", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="border-white/70 bg-white/65">
                      <SelectValue placeholder="请选择区域" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hk">香港 HK</SelectItem>
                      <SelectItem value="sg">新加坡 SG</SelectItem>
                      <SelectItem value="la">洛杉矶 LA</SelectItem>
                      <SelectItem value="jp">东京 JP</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={form.formState.errors.region?.message} />
                </div>
                <div className="grid gap-2">
                  <Label>规格</Label>
                  <Select
                    value={values.type}
                    onValueChange={(value) =>
                      form.setValue("type", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="border-white/70 bg-white/65">
                      <SelectValue placeholder="请选择规格" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="pro">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={form.formState.errors.type?.message} />
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>负责人</Label>
                  <Input className="border-white/70 bg-white/65" {...form.register("owner")} />
                  <FieldError message={form.formState.errors.owner?.message} />
                </div>
                <div className="grid gap-2">
                  <Label>访问范围</Label>
                  <Select
                    value={values.visibility}
                    onValueChange={(value) =>
                      form.setValue("visibility", value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="border-white/70 bg-white/65">
                      <SelectValue placeholder="请选择访问范围" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vpn_only">VPN only</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>描述</Label>
                <Textarea className="border-white/70 bg-white/65" {...form.register("description")} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleCard
                  title="生成监控计划"
                  description="写入 Uptime Kuma plan，等待预览或应用。"
                  checked={monitorEnabled}
                  onCheckedChange={setMonitorEnabled}
                />
                <ToggleCard
                  title="纳入备份关注"
                  description="在生成报告中标记备份责任。"
                  checked={backupRequired}
                  onCheckedChange={setBackupRequired}
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-white/70 pt-5">
                <Button variant="secondary" type="button" className="bg-white/70">
                  重置
                </Button>
                <Button type="submit" className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85">
                  <Save className="h-4 w-4" />
                  保存配置
                </Button>
              </div>
            </form>
          </GlassPanel>
          <div className="grid h-fit gap-5">
            <SummaryPanel
              title="接入摘要"
              items={[
                { label: "名称", value: values.name || "-" },
                { label: "区域", value: values.region || "-" },
                { label: "规格", value: values.type || "-" },
                { label: "负责人", value: values.owner || "-" },
                { label: "监控", value: monitorEnabled ? "生成" : "跳过" },
                { label: "备份", value: backupRequired ? "关注" : "不关注" },
              ]}
            />
            <GlassPanel className="p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                保存后产物
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div>inventory/services.yml</div>
                <div>generated/uptime-kuma/monitors.plan.yml</div>
                <div>audit log: service.create</div>
              </div>
            </GlassPanel>
          </div>
        </div>
        <FormDrawer
          open={drawerOpen}
          title="高级字段"
          description="填写路径、监控目标和变更说明。"
          onClose={() => setDrawerOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="bg-white/70" onClick={() => setDrawerOpen(false)}>
                取消
              </Button>
              <Button className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85" onClick={() => setDrawerOpen(false)}>
                保存
              </Button>
            </div>
          }
        >
          <div className="grid gap-4">
            <Input className="border-white/70 bg-white/65" placeholder="部署路径 /opt/apps/api-gateway" />
            <Input className="border-white/70 bg-white/65" placeholder="监控目标 https://api.example.com/health" />
            <Textarea className="border-white/70 bg-white/65" placeholder="变更说明" />
          </div>
        </FormDrawer>
      </PageContainer>
    </GlassPage>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-white/70 bg-white/55 p-4">
      <div>
        <div className="font-medium text-slate-950">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <div className="text-xs text-red-600">{message}</div> : null;
}
