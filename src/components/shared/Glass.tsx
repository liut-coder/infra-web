import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function GlassPanel({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-lg border border-white/70 bg-white/70 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 ease-out",
        className,
      )}
      {...props}
    />
  );
}

export function GlassButtonSurface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/70 bg-white/65 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out",
        className,
      )}
      {...props}
    />
  );
}

export function GlassPage({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_30rem),linear-gradient(135deg,#f8fafc,#eef4ff)]",
        className,
      )}
      {...props}
    />
  );
}

export function GlassBackdrop({
  className,
  image = "/images/login/login-bg-cloud-city.png",
}: {
  className?: string;
  image?: string;
}) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[420px] bg-cover bg-center opacity-30 saturate-125"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.42),#f8fafc_44%,#eef4ff)]" />
    </div>
  );
}
