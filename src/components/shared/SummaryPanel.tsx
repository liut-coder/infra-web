import { Card } from "@/components/ui/card";

export function SummaryPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 text-base font-semibold">{title}</div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4 text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-right font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
