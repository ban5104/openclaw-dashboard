"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";

export function CollectAnalyticsButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function collectAnalytics() {
    setPending(true);

    try {
      const response = await fetch("/api/analytics/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentItemId: itemId,
        }),
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void collectAnalytics()}
      disabled={pending}
      className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
      style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-primary)" }}
    >
      {pending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <BarChart3 className="mr-1 inline h-4 w-4" />}
      Collect analytics
    </button>
  );
}
