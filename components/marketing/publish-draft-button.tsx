"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Send } from "lucide-react";

export function PublishDraftButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function publishDraft() {
    setPending(true);

    try {
      const response = await fetch(`/api/content-items/${itemId}/publish-draft`, {
        method: "POST",
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
      onClick={() => void publishDraft()}
      disabled={pending}
      className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
      style={{ background: "var(--accent)", color: "#fff8ef" }}
    >
      {pending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Send className="mr-1 inline h-4 w-4" />}
      Create platform draft
    </button>
  );
}
