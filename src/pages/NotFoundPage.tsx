import { SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-50 text-primary">
          <SearchX className="h-9 w-9" />
        </div>
        <div className="mt-6 text-6xl font-semibold">404</div>
        <h1 className="mt-4 text-2xl font-semibold">页面不存在</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          请求的页面可能已移动、删除或地址输入错误。
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">返回总览</Link>
        </Button>
      </div>
    </div>
  );
}
