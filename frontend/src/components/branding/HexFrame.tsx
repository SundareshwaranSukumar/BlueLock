import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

interface HexFrameProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "default" | "cyan" | "crit" | "warn" | "ok";
  wide?: boolean;
}

const toneRing: Record<NonNullable<HexFrameProps["tone"]>, string> = {
  default: "",
  cyan: "glow-cyan",
  crit: "glow-crit animate-crit",
  warn: "glow-warn",
  ok: "glow-ok",
};

export function HexFrame({ children, className, tone = "default", wide, ...rest }: HexFrameProps) {
  return (
    <div className={cn("relative gpu", toneRing[tone], className)} {...rest}>
      <div className={cn("absolute inset-0 hex-frame", wide ? "hex-clip-wide" : "hex-clip")} />
      <div className="relative">{children}</div>
    </div>
  );
}

export function HexIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
      <polygon
        points="25,2 75,2 98,50 75,98 25,98 2,50"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <polygon points="40,20 60,20 78,50 60,80 40,80 22,50" fill="currentColor" opacity="0.15" />
    </svg>
  );
}
