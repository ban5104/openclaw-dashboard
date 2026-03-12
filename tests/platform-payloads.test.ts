import test from "node:test";
import assert from "node:assert/strict";
import { buildLinkedInDraftPayload } from "@/lib/platforms/linkedin";
import { buildFacebookDraftPayload } from "@/lib/platforms/facebook";

test("linkedin payload stays draft-only", () => {
  const payload = buildLinkedInDraftPayload({
    headline: "Headline",
    body: "Body",
    organizationId: "123",
  });

  assert.equal(payload.lifecycleState, "DRAFT");
  assert.equal(payload.author, "urn:li:organization:123");
});

test("facebook payload stays unpublished", () => {
  const payload = buildFacebookDraftPayload({
    body: "Body",
    pageId: "456",
  });

  assert.equal(payload.published, false);
  assert.equal(payload.page_id, "456");
});
