import { zodResolver } from "@hookform/resolvers/zod";
import { Github, Lock, Mail, SunMoon } from "lucide-react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { login } from "@/features/auth/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app";
import { asErrorMessage } from "@/lib/api";
import { changeLanguage } from "@/locales/i18n";
import { useAuthStore } from "@/store/auth";
import { useUiStore } from "@/store/ui";

const schema = z.object({
  account: z.string().min(1, "请输入账号或邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const saveSession = useAuthStore((state) => state.login);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      account: "admin@example.com",
      password: "ChangeMe123!",
    },
  });
  const redirectTo =
    (location.state as { from?: string } | null)?.from || "/dashboard";

  async function onSubmit(values: LoginForm) {
    try {
      const session = await login(values);
      saveSession(session);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      form.setError("root", { message: asErrorMessage(error) });
    }
  }

  return (
    <div className="relative grid w-full max-w-[540px] rounded-2xl border border-white/70 bg-white/78 p-12 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl">
      <div className="mb-8 flex items-center gap-3">
        <img src={appConfig.logoMark} alt="" className="h-10 w-10" />
        <div className="text-2xl font-semibold">
          Nax <span className="text-blue-600">Admin</span>
        </div>
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-950">欢迎回来</h1>
        <p className="mt-2 text-sm text-slate-500">
          进入 infra-control 白色玻璃控制台
        </p>
      </div>

      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="account" className="text-slate-700">账号或邮箱</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="account"
              className="border-white/70 bg-white/65 pl-9"
              placeholder="请输入用户名或邮箱"
              {...form.register("account")}
            />
          </div>
          {form.formState.errors.account ? (
            <div className="text-xs text-red-600">
              {form.formState.errors.account.message}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-slate-700">密码</Label>
            <button type="button" className="text-xs font-medium text-blue-600">
              忘记密码?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              className="border-white/70 bg-white/65 pl-9"
              type="password"
              placeholder="请输入密码"
              {...form.register("password")}
            />
          </div>
          {form.formState.errors.password ? (
            <div className="text-xs text-red-600">
              {form.formState.errors.password.message}
            </div>
          ) : null}
        </div>

        <Button className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "登录中" : "登录"}
        </Button>
        {form.formState.errors.root ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {form.formState.errors.root.message}
          </div>
        ) : null}
      </form>

      <div className="my-7 flex items-center gap-3 text-xs text-slate-500">
        <div className="h-px flex-1 bg-white/80" />
        或使用以下方式登录
        <div className="h-px flex-1 bg-white/80" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" className="border-white/70 bg-white/65">
          <Github className="h-4 w-4" />
          GitHub
        </Button>
        <Button variant="secondary" className="border-white/70 bg-white/65">
          <span className="font-semibold text-[#4285f4]">G</span>
          Google
        </Button>
      </div>

      <div className="mt-6 text-center text-sm text-slate-500">
        还没有账号?{" "}
        <button className="font-medium text-blue-600">立即注册</button>
      </div>

      <div className="absolute -top-14 right-0 flex gap-2 xl:hidden">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => changeLanguage("zh")}
          className="border-white/70 bg-white/72"
        >
          简体中文
        </Button>
        <Button
          variant="secondary"
          size="icon"
          type="button"
          onClick={toggleTheme}
          className="border-white/70 bg-white/72"
        >
          <SunMoon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
