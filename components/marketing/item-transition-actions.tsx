"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { ContentState } from "@/types/content";

interface TransitionOption {
  value: ContentState;
  label: string;
}

export function ItemTransitionActions({
  itemId,
  transitions,
}: {
  itemId: string;
  transitions: TransitionOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function transitionTo(nextState: ContentState) {
    setPending(nextState);

    try {
      const response = await fetch(`/api/content-items/${itemId}/transition`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to_state: nextState,
          actor: "ben",
          details: { source: "item-detail" },
        }),
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  }

  if (!transitions.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No manual transitions available from this state.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((transition) => (
        <button
          key={transition.value}
          type="button"
          disabled={pending !== null}
          onClick={() => void transitionTo(transition.value)}
          className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-primary)" }}
        >
          {pending === transition.value ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
          Move to {transition.label}
        </button>
      ))}
    </div>
  );
}
