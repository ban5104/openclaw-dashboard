import test from "node:test";
import assert from "node:assert/strict";
import { buildPipelineColumns, canTransition, STATE_LABELS } from "@/lib/state-machine";
import type { ContentItem } from "@/types/content";

test("state machine allows approved to ready_to_post", () => {
  assert.equal(canTransition("approved", "ready_to_post"), true);
  assert.equal(canTransition("approved", "posted"), false);
});

test("buildPipelineColumns groups items by state", () => {
  const items: ContentItem[] = [
    {
      id: "1",
      title: "A",
      platform: "linkedin",
      scheduledDate: null,
      campaignTheme: "Theme",
      topic: "Topic",
      state: "planned",
      priority: "normal",
      brief: "Brief",
      hook: "Hook",
      cta: "CTA",
      suggestedTime: null,
      currentVersion: { id: "v1", label: "Version 1", body: "Body", wordCount: 10, hook: "Hook", cta: "CTA", excerpt: "Excerpt" },
      review: { verdict: "REVISE", confidence: "low", reviewer: "Reviewer", createdAt: "Pending" },
      audit: [],
    },
  ];

  const columns = buildPipelineColumns(items);
  const planned = columns.find((column) => column.state === "planned");

  assert.ok(planned);
  assert.equal(planned?.label, STATE_LABELS.planned);
  assert.equal(planned?.items.length, 1);
});
