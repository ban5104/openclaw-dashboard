"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

export function GenerateImageCandidatesButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function generateCandidates() {
    setPending(true);

    try {
      const response = await fetch(`/api/content-items/${itemId}/image-candidates`, {
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
      onClick={() => void generateCandidates()}
      disabled={pending}
      className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
      style={{ background: "rgba(16, 37, 42, 0.06)", color: "var(--text-primary)" }}
    >
      {pending ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1 inline h-4 w-4" />}
      Generate image matches
    </button>
  );
}
