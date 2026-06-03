import {
  GridComponent,
  TooltipComponent,
  type GridComponentOption,
  type TooltipComponentOption,
} from "echarts/components";
import { LineChart, type LineSeriesOption } from "echarts/charts";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

echarts.use([GridComponent, TooltipComponent, LineChart, CanvasRenderer]);

type ECOption = echarts.ComposeOption<
  GridComponentOption | TooltipComponentOption | LineSeriesOption
>;

export function ChartCard({
  title,
  option,
}: {
  title: string;
  option: ECOption;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [option]);

  return (
    <Card className="p-5">
      <div className="mb-4 text-base font-semibold">{title}</div>
      <div ref={ref} className="h-[260px] w-full" />
    </Card>
  );
}
