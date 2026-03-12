import test from "node:test";
import assert from "node:assert/strict";
import { buildLinkedInDraftPayload, hasLinkedInConfig } from "@/lib/platforms/linkedin";
import { buildFacebookDraftPayload, hasFacebookConfig } from "@/lib/platforms/facebook";

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

test("provider config guards reflect missing env", () => {
  const priorLinkedInToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const priorLinkedInOrg = process.env.LINKEDIN_ORG_ID;
  const priorFacebookToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const priorFacebookPage = process.env.FACEBOOK_PAGE_ID;

  delete process.env.LINKEDIN_ACCESS_TOKEN;
  delete process.env.LINKEDIN_ORG_ID;
  delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  delete process.env.FACEBOOK_PAGE_ID;

  assert.equal(hasLinkedInConfig(), false);
  assert.equal(hasFacebookConfig(), false);

  process.env.LINKEDIN_ACCESS_TOKEN = "token";
  process.env.LINKEDIN_ORG_ID = "org";
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = "token";
  process.env.FACEBOOK_PAGE_ID = "page";

  assert.equal(hasLinkedInConfig(), true);
  assert.equal(hasFacebookConfig(), true);

  if (priorLinkedInToken !== undefined) process.env.LINKEDIN_ACCESS_TOKEN = priorLinkedInToken; else delete process.env.LINKEDIN_ACCESS_TOKEN;
  if (priorLinkedInOrg !== undefined) process.env.LINKEDIN_ORG_ID = priorLinkedInOrg; else delete process.env.LINKEDIN_ORG_ID;
  if (priorFacebookToken !== undefined) process.env.FACEBOOK_PAGE_ACCESS_TOKEN = priorFacebookToken; else delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (priorFacebookPage !== undefined) process.env.FACEBOOK_PAGE_ID = priorFacebookPage; else delete process.env.FACEBOOK_PAGE_ID;
});
