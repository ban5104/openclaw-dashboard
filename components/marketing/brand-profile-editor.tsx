"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";

export function BrandProfileEditor({
  slug,
  initialValue,
}: {
  slug: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setSaved(false);

    try {
      const parsed = JSON.parse(value);
      const response = await fetch(`/api/businesses/${slug}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: parsed }),
      });

      if (response.ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[1.4rem] border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">Profile JSON</p>
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={saving}
          className="rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: "var(--text-primary)", color: "#fff8ef" }}
        >
          {saving ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : <Save className="mr-1 inline h-4 w-4" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-3 min-h-80 w-full rounded-[1rem] border p-4 text-sm outline-none"
        style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.65)" }}
      />
    </div>
  );
}
