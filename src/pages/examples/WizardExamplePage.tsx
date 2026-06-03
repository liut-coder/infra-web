import { ArrowLeft, ArrowRight, CheckCircle2, FileCode2, Play, Server } from "lucide-react";
import { useMemo, useState } from "react";
import { GlassPage, GlassPanel } from "@/components/shared/Glass";
import { PageContainer } from "@/components/shared/PageContainer";
import { PageHeader } from "@/components/shared/PageHeader";
import { StepHeader } from "@/components/shared/StepHeader";
import { SummaryPanel } from "@/components/shared/SummaryPanel";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const steps = ["选择来源", "确认节点", "生成预览", "应用闭环"];

const panels = [
  {
    title: "选择来源",
    description: "从 Komari API、手工 YAML 或导入文件开始。",
    options: ["Komari API", "YAML 高级模式", "CSV 导入"],
  },
  {
    title: "确认节点",
    description: "新节点默认 observed，已有节点默认只刷新事实字段。",
    options: ["control-01", "front-02", "us-01"],
  },
  {
    title: "生成预览",
    description: "生成 merge preview、监控计划和续费报告，不写入生产配置。",
    options: ["hosts.merge-preview.yml", "monitors.plan.yml", "renewals.md"],
  },
  {
    title: "应用闭环",
    description: "确认后备份 inventory，写审计日志，并刷新 web 数据包。",
    options: ["备份 inventory", "写入审计", "刷新生成物"],
  },
];

export function WizardExamplePage() {
  const [current, setCurrent] = useState(0);
  const active = panels[current];
  const completed = useMemo(() => steps.slice(0, current), [current]);

  return (
    <GlassPage>
      <PageContainer>
        <PageHeader
          title="编排流程工作台"
          description="把发现、审核、生成和应用拆成可确认的步骤，适合作为高风险动作的统一体验。"
          actions={<StatusBadge tone="info">preview mode</StatusBadge>}
        />
        <div className="mt-6">
          <StepHeader steps={steps} current={current} />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-950">{active.title}</div>
                <div className="mt-1 text-sm text-slate-500">{active.description}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-md bg-white/80 text-blue-600 shadow-sm ring-1 ring-blue-100">
                {current < 2 ? <Server className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {active.options.map((item, index) => (
                <button
                  key={item}
                  className={cn(
                    "rounded-md border border-white/70 bg-white/55 p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-md",
                    index === 0 && "border-blue-100 bg-white/90",
                  )}
                >
                  <div className="font-medium text-slate-950">{item}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    {index === 0 ? "推荐路径，保留人工确认。" : "可作为补充输入。"}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-white/70 pt-5">
              <Button
                variant="secondary"
                className="bg-white/70"
                disabled={current === 0}
                onClick={() => setCurrent((value) => value - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                上一步
              </Button>
              <Button
                className="border border-blue-100 bg-white text-blue-700 shadow-sm hover:bg-white/85"
                onClick={() =>
                  setCurrent((value) => Math.min(value + 1, steps.length - 1))
                }
              >
                {current === steps.length - 1 ? <Play className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {current === steps.length - 1 ? "开始应用" : "下一步"}
              </Button>
            </div>
          </GlassPanel>
          <div className="grid h-fit gap-5">
            <SummaryPanel
              title="流程摘要"
              items={[
                { label: "来源", value: "Komari API" },
                { label: "新节点策略", value: "observed" },
                { label: "已有节点", value: "刷新事实字段" },
                { label: "风险级别", value: current === 3 ? "需要确认" : "预览安全" },
              ]}
            />
            <GlassPanel className="p-5">
              <div className="mb-4 text-base font-semibold text-slate-950">已完成</div>
              <div className="space-y-3">
                {(completed.length ? completed : ["等待开始"]).map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    {item}
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        </div>
      </PageContainer>
    </GlassPage>
  );
}
