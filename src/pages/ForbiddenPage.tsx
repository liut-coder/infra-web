import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-orange-50 text-primary">
          <ShieldX className="h-9 w-9" />
        </div>
        <div className="mt-6 text-6xl font-semibold">403</div>
        <h1 className="mt-4 text-2xl font-semibold">没有访问权限</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          当前账号没有访问该页面所需的权限。
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">返回总览</Link>
        </Button>
      </div>
    </div>
  );
}
