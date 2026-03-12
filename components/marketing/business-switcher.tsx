"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { BusinessProfile } from "@/types/content";

export function BusinessSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBusinesses() {
      try {
        const response = await fetch("/api/businesses", { cache: "no-store" });
        const payload = await response.json();

        if (!cancelled) {
          setBusinesses(payload.businesses ?? []);
        }
      } catch {
        if (!cancelled) {
          setBusinesses([]);
        }
      }
    }

    void loadBusinesses();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentBusiness = useMemo(() => {
    const slug = pathname?.startsWith("/brands/")
      ? pathname.split("/")[2]
      : searchParams?.get("business") ?? "nelsonai";
    return businesses.find((business) => business.slug === slug) ?? businesses[0];
  }, [businesses, pathname, searchParams]);

  const hrefFor = (slug: string) => {
    if (pathname?.startsWith("/brands/")) {
      return `/brands/${slug}`;
    }

    const params = new URLSearchParams(searchParams?.toString());
    params.set("business", slug);
    return `${pathname ?? "/queue"}?${params.toString()}`;
  };

  return (
    <div className="relative mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          color: "#f5efe3",
        }}
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Active business</p>
          <p className="mt-1 text-sm font-semibold">{currentBusiness?.name ?? "NelsonAI"}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && businesses.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 rounded-2xl border p-2 shadow-2xl"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "#163037",
          }}
        >
          {businesses.map((business) => (
            <Link
              key={business.slug}
              href={hrefFor(business.slug)}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6"
              style={{ color: "#f5efe3" }}
            >
              <div className="font-medium">{business.name}</div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/45">{business.slug}</div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
