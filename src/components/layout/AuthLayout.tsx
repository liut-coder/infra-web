import { Globe2, Moon, Sun } from "lucide-react";
import { Outlet } from "react-router-dom";
import { appConfig } from "@/config/app";
import { changeLanguage } from "@/locales/i18n";
import { useUiStore } from "@/store/ui";

export function AuthLayout() {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_30rem),linear-gradient(135deg,#f8fafc,#eef4ff)]">
      <img
        src={appConfig.loginBackground}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-35 saturate-50"
      />
      <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" />
      <div className="absolute right-10 top-8 z-10 flex items-center gap-3">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/70 bg-white/72 px-4 text-sm shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white/90"
          onClick={() => changeLanguage("zh")}
        >
          <Globe2 className="h-4 w-4" />
          简体中文
        </button>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/70 bg-white/72 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl transition hover:bg-white/90"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="relative z-10 flex min-h-screen items-center px-10">
        <Outlet />
      </div>
    </div>
  );
}
