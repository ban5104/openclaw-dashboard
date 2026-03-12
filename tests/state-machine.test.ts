import test from "node:test";
import assert from "node:assert/strict";
import { buildPipelineColumns, canTransition, STATE_LABELS } from "@/lib/state-machine";
import type { ContentItem } from "@/types/content";

test("state machine allows approved to publishing_draft", () => {
  assert.equal(canTransition("approved", "publishing_draft"), true);
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
      currentVersion: { id: "v1", label: "Version 1", wordCount: 10, hook: "Hook", cta: "CTA", excerpt: "Excerpt" },
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
