import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  placeholder = "搜索",
  children,
  actions,
}: FilterBarProps) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={placeholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        {children}
        {actions ? (
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        ) : null}
        {!actions ? (
          <Button variant="secondary" type="button">
            查询
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
