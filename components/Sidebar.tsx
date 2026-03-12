"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useOpenClaw } from "@/contexts/OpenClawContext";
import { BusinessSwitcher } from "@/components/marketing/business-switcher";
import { NotificationBadge } from "@/components/marketing/notification-badge";
import type { ContentItem } from "@/types/content";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Clock,
  Cpu,
  LayoutDashboard,
  List,
  Radio,
  ScrollText,
  Settings,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  Zap,
} from "lucide-react";

const VISIBILITY_NAV = [
  { href: "/queue", label: "Queue", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/agents-overview", label: "Agents", icon: Users },
  { href: "/settings", label: "Settings", icon: BriefcaseBusiness },
];

const OPS_NAV = [
  { href: "/agents", label: "OpenClaw Agents", icon: Bot },
  { href: "/sessions", label: "Sessions", icon: List },
  { href: "/models", label: "Models", icon: Cpu },
  { href: "/skills", label: "Skills", icon: Zap },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/cron", label: "Cron", icon: Clock },
  { href: "/config", label: "Config", icon: Settings },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, isConnected } = useOpenClaw();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadQueueCount() {
      try {
        const businessSlug = searchParams.get("business") ?? "nelsonai";
        const response = await fetch(`/api/content-items?business_slug=${businessSlug}&state=ready_to_post`, {
          cache: "no-store",
        });
        const payload = await response.json();
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!cancelled) {
          setQueueCount(items.length);
        }
      } catch {
        if (!cancelled) {
          setQueueCount(0);
        }
      }
    }

    void loadQueueCount();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <aside
      className="hidden w-72 flex-shrink-0 border-r lg:flex lg:flex-col"
      style={{ background: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="border-b px-5 py-5" style={{ borderColor: "var(--border-strong)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--text-muted)" }}>
              Marketing Ops
            </p>
            <h1 className="mt-2 font-display text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Queue Control
            </h1>
          </div>
          <span className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ borderColor: "var(--border)", color: "var(--accent-strong)" }}>
            Spec v2
          </span>
        </div>
        <BusinessSwitcher />
      </div>

      <div className="border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state === "connected" ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : state === "connecting" || state === "authenticating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className="text-[11px] font-medium"
              style={{
                color: isConnected
                  ? "#22c55e"
                  : state === "connecting" || state === "authenticating"
                    ? "#eab308"
                    : "#ef4444",
              }}
            >
              {state === "connected"
                ? "Connected"
                : state === "connecting"
                  ? "Connecting..."
                  : state === "authenticating"
                    ? "Authenticating..."
                    : state === "error"
                      ? "Error"
                      : "Disconnected"}
            </span>
          </div>
          <NotificationBadge count={queueCount} label="Ready-to-post queue" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection title="Visibility" items={VISIBILITY_NAV} pathname={pathname} />
        <NavSection title="OpenClaw Ops" items={OPS_NAV} pathname={pathname} />
      </nav>

      <div className="border-t px-5 py-4 text-xs" style={{ borderColor: "var(--border-strong)", color: "var(--text-secondary)" }}>
        Telegram handles approvals. The dashboard is for queue visibility, scheduling context, and analytics.
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }>;
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors ${isActive ? "font-medium" : "hover:bg-white/5"}`}
              style={
                isActive
                  ? {
                      background: "linear-gradient(135deg, rgba(89, 140, 255, 0.16), rgba(83, 188, 180, 0.14))",
                      color: "var(--text-primary)",
                    }
                  : { color: "var(--text-secondary)" }
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
