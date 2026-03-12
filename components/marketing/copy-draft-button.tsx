"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyDraftButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
      style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : "Copy text"}
    </button>
  );
}
