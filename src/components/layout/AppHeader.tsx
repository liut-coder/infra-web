import {
  ChevronDown,
  HelpCircle,
  Menu,
  Search,
  Settings,
  SunMoon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPalette } from "@/components/shared/CommandPalette";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutSession } from "@/features/auth/api";
import { logout, useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const openMobileSidebar = useUiStore((state) => state.openMobileSidebar);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between gap-3 border-b border-white/70 bg-white/72 px-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-2xl sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        aria-label="打开导航"
        onClick={openMobileSidebar}
      >
        <Menu className="h-4 w-4" />
      </Button>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="relative h-9 min-w-0 flex-1 rounded-md border border-white/70 bg-white/65 pl-9 pr-3 text-left text-sm text-slate-500 shadow-sm transition-all duration-200 hover:bg-white/85 hover:text-slate-700 sm:max-w-[320px]"
      >
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <span className="block truncate">搜索页面、资源或动作</span>
        <span className="absolute right-2 top-1.5 hidden rounded border border-white/80 bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-400 sm:block">
          ⌘K
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2 lg:gap-3">
        <NotificationCenter />
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          <SunMoon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-md px-2 py-1.5 transition hover:bg-white/70">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-white/85 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100">
                {user?.avatar || "NA"}
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium">
                  {user?.name || "Administrator"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.role || "Administrator"}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>个人资料</DropdownMenuItem>
            <DropdownMenuItem>账户设置</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleLogout()}>
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  );
}
async function handleLogout() {
  try {
    await logoutSession();
  } finally {
    logout();
    window.location.href = "/login";
  }
}
